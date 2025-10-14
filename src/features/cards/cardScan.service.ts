import crypto from 'crypto';
import { Types } from "mongoose";
import sharp from 'sharp';
import { Card } from "../../database/models/card";
import { IScanHistory, ScanHistory } from "../../database/models/scanHistory";
import { CardRecognitionService } from "../../shared/services/cardRecognition.service";
import { visualSimilarityService } from "../../shared/services/visualSimilarity.service";

// Interfaces for card scanning
export interface CardMatch {
  cardId: string;
  productId: number;
  name: string;
  cleanName?: string;
  setInfo: {
    setName: string;
    setCode?: string;
    groupId: number;
    rarity?: string;
    abbreviation: string;
  };
  confidence: number;
  imageUrl?: string;
  estimatedValue?: number;
  gameType: string;
}

export interface CardScanResult {
  success: boolean;
  matches: CardMatch[];
  requiresSetSelection: boolean;
  scanConfidence: number;
  totalMatches: number;
  method?: string;
  processingTime?: number;
  debug?: any;
}

export interface RecognitionResult {
  cardName: string;
  setCode?: string;
  rarity?: string;
  confidence: number;
  extractedText: string[];
  imageFeatures?: any; // For future ML implementation
}

export interface ScanOptions {
  userPreferences?: {
    preferredSets?: string[];
    priceRange?: { min: number; max: number };
  };
  location?: { lat: number; lng: number };
  maxResults?: number;
}

export interface ScanHistory {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  scannedAt: Date;
  gameType: string;
  recognitionResult: RecognitionResult;
  selectedCard?: Types.ObjectId;
  matches: CardMatch[];
  scanDuration: number; // milliseconds
  confidence: number;
}

export class CardScanService {
  private cardRecognitionService: CardRecognitionService;

  constructor() {
    this.cardRecognitionService = new CardRecognitionService();
  }
  
  /**
   * Main card scanning method
   */
  async scanCard(
    imageBuffer: Buffer,
    gameType: string,
    userId: string,
    options?: ScanOptions
  ): Promise<CardScanResult> {
    const startTime = Date.now();
    const timings = {
      imagePreprocessing: 0,
      ocrExtraction: 0,
      cardMatching: 0,
      confidenceRanking: 0
    };
    
    try {
      // 1. Get image metadata
      const imageInfo = await this.getImageInfo(imageBuffer);
      const imageHash = await this.generateImageHash(imageBuffer);
      
      // 2. Perform card recognition (OCR + pattern matching)
      const recognitionStart = Date.now();
      const recognitionResult = await this.cardRecognitionService.recognizeCard(
        imageBuffer,
        gameType
      );
      timings.ocrExtraction = Date.now() - recognitionStart;
      
      console.log('🔍 Recognition results:', {
        cardName: recognitionResult.cardName,
        setCode: recognitionResult.setCode,
        rarity: recognitionResult.rarity,
        extractedText: recognitionResult.extractedText,
        confidence: recognitionResult.confidence
      });

      // Additional debug for Yu-Gi-Oh specifically
      if (gameType === 'yugioh') {
        console.log('🎴 Yu-Gi-Oh Debug - Extracted text:', recognitionResult.extractedText);
        console.log('🎴 Yu-Gi-Oh Debug - Card name:', recognitionResult.cardName);
        console.log('🎴 Yu-Gi-Oh Debug - Set code:', recognitionResult.setCode);
      }

      // 3. Find potential matches in database
      const matchingStart = Date.now();
      const potentialMatches = await this.findPotentialMatches(
        recognitionResult,
        gameType,
        options
      );
      timings.cardMatching = Date.now() - matchingStart;
      
      console.log(`📊 Found ${potentialMatches.length} potential matches in database`);
      if (potentialMatches.length > 0) {
        console.log('Top 3 matches:', potentialMatches.slice(0, 3).map(m => ({
          name: m.name,
          setCode: m.setInfo?.setCode,
          confidence: 'not calculated yet'
        })));
      }
      
      // 4. Rank matches by confidence
      const rankingStart = Date.now();
      const rankedMatches = await this.rankMatches(
        potentialMatches,
        recognitionResult,
        options
      );
      timings.confidenceRanking = Date.now() - rankingStart;
      
      // 5. Determine if set selection is needed
      const requiresSetSelection = this.shouldRequireSetSelection(rankedMatches);
      
      // 6. Save scan history (enforce freemium limit)
      try {
        const UserModel = (await import('../../database/models/user')).default;
        const ScanHistory = (await import('../../database/models/scanHistory')).ScanHistory;
        const PREMIUM = (await import('../../shared/config/premium.config')).default;
        const { getMessage } = await import('../../shared/constants/messages');
        const AppErrorMod = await import('../../shared/errors/AppError');

        const user = await UserModel.findById(userId);
        if (user && !user.isPremium) {
          const existing = await ScanHistory.countDocuments({ userId: new Types.ObjectId(userId) });
          if (existing >= PREMIUM.SCAN_LIMIT_FREEMIUM) {
            throw new AppErrorMod.default(getMessage('PREMIUM.SCAN_LIMIT_REACHED'), 403);
          }
        }
      } catch (e) {
        // propagate AppError or other errors
        throw e;
      }

      await this.saveScanHistory({
        userId: new Types.ObjectId(userId),
        gameType: gameType as 'pokemon' | 'yugioh' | 'onepiece',
        extractedText: recognitionResult.extractedText,
        ocrConfidence: recognitionResult.confidence,
        recognizedCardName: recognitionResult.cardName,
        recognizedSetCode: recognitionResult.setCode,
        recognizedRarity: recognitionResult.rarity,
        potentialMatches: rankedMatches.map((match, index) => ({
          cardId: new Types.ObjectId(match.cardId),
          confidence: match.confidence,
          rank: index + 1
        })),
        wasAutoSelected: !requiresSetSelection,
        scanDuration: Date.now() - startTime,
        processingSteps: timings,
        imageHash,
        imageSize: imageInfo
      });
      
      return {
        success: true,
        matches: rankedMatches,
        requiresSetSelection,
        scanConfidence: recognitionResult.confidence,
        totalMatches: potentialMatches.length
      };
      
    } catch (error: any) {
      console.error('Card scanning error:', error);
      
      // Save failed scan history (if limit not exceeded)
      try {
        const user = await (await import('../../database/models/user')).default.findById(userId);
        if (user && !user.isPremium) {
          const existing = await (await import('../../database/models/scanHistory')).ScanHistory.countDocuments({ userId: new Types.ObjectId(userId) });
          if (existing >= 10) {
            // Don't save additional failed scan history for freemium users beyond limit
            console.warn('Not saving failed scan history because freemium scan limit reached');
          } else {
            await this.saveScanHistory({
              userId: new Types.ObjectId(userId),
              gameType: gameType as 'pokemon' | 'yugioh' | 'onepiece',
              extractedText: [],
              ocrConfidence: 0,
              potentialMatches: [],
              wasAutoSelected: false,
              scanDuration: Date.now() - startTime,
              processingSteps: timings,
              imageHash: '',
              imageSize: { width: 0, height: 0, fileSize: imageBuffer.length },
              errorMessage: error?.message || 'Unknown error',
              errorStep: 'ocr'
            });
          }
        } else {
          await this.saveScanHistory({
            userId: new Types.ObjectId(userId),
            gameType: gameType as 'pokemon' | 'yugioh' | 'onepiece',
            extractedText: [],
            ocrConfidence: 0,
            potentialMatches: [],
            wasAutoSelected: false,
            scanDuration: Date.now() - startTime,
            processingSteps: timings,
            imageHash: '',
            imageSize: { width: 0, height: 0, fileSize: imageBuffer.length },
            errorMessage: error?.message || 'Unknown error',
            errorStep: 'ocr'
          });
        }
      } catch (e) {
        console.error('Failed to save failed scan history enforcement check:', e);
      }

      throw new Error(`Failed to scan card: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Scan card using visual similarity matching instead of OCR
   */
  async scanCardByVisualSimilarity(
    imageBuffer: Buffer,
    gameType: 'pokemon' | 'yugioh' | 'onepiece',
    userId: string,
    options: {
      maxCandidates?: number;
      minSimilarity?: number;
      maxResults?: number;
    } = {}
  ): Promise<CardScanResult> {
    const startTime = Date.now();
    const timings = {
      imagePreprocessing: 0,
      featureExtraction: 0,
      candidateSearch: 0,
      visualComparison: 0,
      confidenceRanking: 0
    };

    try {
      console.log(`🎨 Starting visual similarity scan for ${gameType}...`);

      // 1. Get image metadata
      const imageInfo = await this.getImageInfo(imageBuffer);
      const imageHash = await this.generateImageHash(imageBuffer);

      // 2. Extract visual features from user's image
      const featureStart = Date.now();
      const userImageFeatures = await visualSimilarityService.extractImageFeatures(imageBuffer);
      timings.featureExtraction = Date.now() - featureStart;

      // 3. Get candidate cards from database (limit to reduce processing time)
      const candidateStart = Date.now();
      const maxCandidates = options.maxCandidates || 500;
      
      // Try to prioritize cards that might have accessible images
      const candidateCards = await Card.find(
        { 
          gameType,
          isActive: true,
          imageUrl: { $exists: true, $ne: null }
        },
        {
          _id: 1,
          productId: 1,
          name: 1,
          cleanName: 1,
          imageUrl: 1,
          gameType: 1,
          categoryId: 1,
          groupId: 1,
          'tcgPlayerPrice.marketPrice': 1,
          'tcgPlayerPrice.lowPrice': 1,
          'tcgPlayerPrice.highPrice': 1
        }
      )
      .sort({ 
        // Prioritize cards with market price (more likely to have accessible images)
        'tcgPlayerPrice.marketPrice': -1,
        productId: 1 
      })
      .limit(maxCandidates)
      .lean();

      timings.candidateSearch = Date.now() - candidateStart;

      console.log(`📊 Found ${candidateCards.length} candidate cards for visual comparison`);

      // Filter out cards with obviously broken image URLs
      const validCandidates = candidateCards.filter(card => {
        const url = card.imageUrl;
        return url && 
               typeof url === 'string' && 
               url.includes('tcgplayer') && 
               (url.includes('.jpg') || url.includes('.png') || url.includes('.webp'));
      });

      console.log(`✅ Filtered to ${validCandidates.length} cards with valid image URLs`);

      // 4. Find visually similar cards
      const visualStart = Date.now();
      const minSimilarity = options.minSimilarity || 0.4;
      const maxResults = options.maxResults || 10;

      const visualMatches = await visualSimilarityService.findSimilarCards(
        userImageFeatures,
        validCandidates.map(card => ({
          _id: card._id.toString(),
          productId: card.productId,
          name: card.name,
          imageUrl: card.imageUrl || '',
          gameType: card.gameType
        })),
        minSimilarity,
        maxResults
      );
      timings.visualComparison = Date.now() - visualStart;

      // 4a. If no visual matches found due to CDN issues, fall back to text search
      if (visualMatches.length === 0) {
        console.log('⚠️ No visual matches found, falling back to text-based search...');
        
        // Try the regular OCR + text matching as fallback
        const fallbackResult = await this.scanCard(imageBuffer, gameType, userId);
        
        if (fallbackResult.matches.length > 0) {
          console.log(`✅ Fallback found ${fallbackResult.matches.length} text-based matches`);
          return {
            ...fallbackResult,
            method: 'visual_fallback_to_text'
          };
        }
      }

      // 5. Convert visual matches to CardMatch format
      const rankingStart = Date.now();
      const cardMatches: CardMatch[] = [];

      for (const visualMatch of visualMatches) {
        const cardData = validCandidates.find(c => c._id.toString() === visualMatch.cardId);
        if (cardData) {
          // Create basic set info from available data
          const setInfo = {
            setName: 'Unknown',
            setCode: 'N/A',
            groupId: cardData.groupId,
            abbreviation: 'N/A'
          };
          
          const estimatedValue = cardData.tcgPlayerPrice?.marketPrice || 
                               cardData.tcgPlayerPrice?.lowPrice || 
                               cardData.tcgPlayerPrice?.highPrice || 0;

          cardMatches.push({
            cardId: visualMatch.cardId,
            productId: visualMatch.productId,
            name: cardData.name,
            cleanName: cardData.cleanName || cardData.name,
            setInfo,
            confidence: visualMatch.similarity, // Use visual similarity as confidence
            imageUrl: visualMatch.imageUrl,
            estimatedValue,
            gameType: visualMatch.gameType as 'pokemon' | 'yugioh' | 'onepiece'
          });
        }
      }

      timings.confidenceRanking = Date.now() - rankingStart;

      // 6. Calculate scan confidence (based on top match similarity)
      const scanConfidence = cardMatches.length > 0 ? cardMatches[0].confidence : 0;

      // 7. Save scan history
      const scanHistoryData = {
        userId: new Types.ObjectId(userId),
        imageMetadata: imageInfo,
        imageHash,
        recognitionMethod: 'visual_similarity' as const,
        scanConfidence,
        extractedText: [], // No text extraction in visual method
        recognizedCardNames: cardMatches.slice(0, 3).map(m => m.name),
        foundMatches: cardMatches.length,
        topMatchConfidence: scanConfidence,
        gameType: gameType as 'pokemon' | 'yugioh' | 'onepiece',
        timings,
        processingTimeMs: Date.now() - startTime
      };

      const scanHistory = await ScanHistory.create(scanHistoryData);

      console.log(`✅ Visual similarity scan completed in ${Date.now() - startTime}ms`);
      console.log(`🎯 Found ${cardMatches.length} matches with top confidence: ${scanConfidence.toFixed(3)}`);

      return {
        success: true,
        matches: cardMatches,
        scanConfidence,
        totalMatches: cardMatches.length,
        requiresSetSelection: cardMatches.length > 1 && cardMatches.filter(m => m.confidence > 0.7).length > 1,
        processingTime: Date.now() - startTime,
        method: 'visual_similarity',
        debug: {
          timings,
          candidatesProcessed: validCandidates.length,
          userImageFeatures: {
            aspectRatio: userImageFeatures.aspectRatio,
            averageColor: userImageFeatures.averageColor,
            brightnessScore: userImageFeatures.brightnessScore,
            edgeScore: userImageFeatures.edgeScore
          }
        }
      };

    } catch (error) {
      console.error('❌ Visual similarity scan failed:', error);
      throw new Error(`Visual similarity scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image metadata
   */
  private async getImageInfo(imageBuffer: Buffer): Promise<{ width: number; height: number; fileSize: number }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        fileSize: imageBuffer.length
      };
    } catch (error) {
      return {
        width: 0,
        height: 0,
        fileSize: imageBuffer.length
      };
    }
  }

  /**
   * Generate perceptual hash for image duplicate detection
   */
  private async generateImageHash(imageBuffer: Buffer): Promise<string> {
    try {
      // Create a simplified hash using image dimensions and a sample of pixels
      const resized = await sharp(imageBuffer)
        .resize(8, 8, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer();
      
      return crypto.createHash('md5').update(resized).digest('hex');
    } catch (error) {
      // Fallback to simple buffer hash
      return crypto.createHash('md5').update(imageBuffer).digest('hex');
    }
  }
  private async recognizeCard(
    imageBuffer: Buffer,
    gameType: string
  ): Promise<RecognitionResult> {
    // TODO: Implement actual OCR/ML recognition
    // For now, return mock data - integrate with Google Vision API, Tesseract, or custom ML model
    
    // Mock OCR extraction
    const extractedText = await this.performOCR(imageBuffer);
    
    // Extract card name and set code from OCR text
    const cardName = this.extractCardName(extractedText, gameType);
    const setCode = this.extractSetCode(extractedText, gameType);
    const rarity = this.extractRarity(extractedText, gameType);
    
    return {
      cardName: cardName || '',
      setCode,
      rarity,
      confidence: 0.8, // Base confidence, adjust based on OCR quality
      extractedText,
      imageFeatures: null // For future ML implementation
    };
  }

  /**
   * Mock OCR implementation - replace with actual OCR service
   */
  private async performOCR(imageBuffer: Buffer): Promise<string[]> {
    // TODO: Integrate with Google Vision API, AWS Textract, or Tesseract
    // For now, return mock extracted text
    return [
      'Monkey.D.Luffy',
      'OP01-003',
      'SR',
      'Straw Hat Crew',
      'Leader'
    ];
  }

  /**
   * Extract card name from OCR text using game-specific patterns
   */
  private extractCardName(extractedText: string[], gameType: string): string {
    // Game-specific name extraction patterns
    const patterns = {
      onepiece: [
        /^([A-Z][a-z]+(?:\.[A-Z])?[a-z]*(?:\s+[A-Z][a-z]*)*)/,
        /([A-Z][a-z]+(?:\.[A-Z][a-z]*)*(?:\s+[A-Z][a-z]*)*)\s*\(/
      ],
      pokemon: [
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)\s+(?:ex|EX|GX|V|VMAX)/
      ],
      yugioh: [
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/
      ]
    };

    const gamePatterns = patterns[gameType as keyof typeof patterns] || patterns.onepiece;
    
    for (const text of extractedText) {
      for (const pattern of gamePatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }
    
    return extractedText[0] || '';
  }

  /**
   * Extract set code from OCR text
   */
  private extractSetCode(extractedText: string[], gameType: string): string | undefined {
    const patterns = {
      onepiece: /OP\d{2}-\d{3}/,
      pokemon: /[A-Z]{2,4}\s*\d{1,3}/,
      yugioh: /[A-Z]{3,5}-[A-Z]{2}\d{3}/
    };

    const pattern = patterns[gameType as keyof typeof patterns];
    if (!pattern) return undefined;

    for (const text of extractedText) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Extract rarity from OCR text
   */
  private extractRarity(extractedText: string[], gameType: string): string | undefined {
    const rarities = {
      onepiece: ['C', 'UC', 'R', 'SR', 'L', 'SEC'],
      pokemon: ['C', 'U', 'R', 'RR', 'RRR', 'SR', 'HR', 'PR'],
      yugioh: ['C', 'R', 'SR', 'UR', 'ScR', 'CR']
    };

    const gameRarities = rarities[gameType as keyof typeof rarities] || [];
    
    for (const text of extractedText) {
      for (const rarity of gameRarities) {
        if (text.includes(rarity)) {
          return rarity;
        }
      }
    }

    return undefined;
  }

  /**
   * Find potential card matches in database with improved fuzzy search
   */
  private async findPotentialMatches(
    recognition: RecognitionResult,
    gameType: string,
    options?: ScanOptions
  ): Promise<CardMatch[]> {
    
    const searchCriteria: any = {
      gameType,
      isActive: true
    };

    // Build more flexible search query
    const nameQueries = [];
    
    if (recognition.cardName) {
      const cleanName = this.cleanCardName(recognition.cardName);
      const words = cleanName.split(' ').filter(word => word.length >= 3);
      
      // Multiple search strategies
      nameQueries.push(
        // Exact matches
        { name: { $regex: this.escapeRegex(recognition.cardName), $options: 'i' } },
        { cleanName: { $regex: this.escapeRegex(cleanName), $options: 'i' } },
        { name: { $regex: this.escapeRegex(cleanName), $options: 'i' } }
      );
      
      // Word-based partial matches
      if (words.length > 0) {
        for (const word of words) {
          if (word.length >= 4) { // Only use longer words
            nameQueries.push(
              { name: { $regex: this.escapeRegex(word), $options: 'i' } },
              { cleanName: { $regex: this.escapeRegex(word), $options: 'i' } }
            );
          }
        }
      }
      
      // Fuzzy matching - remove some characters and try again
      const fuzzyName = cleanName.replace(/[.\-']/g, '').replace(/\s+/g, ' ').trim();
      if (fuzzyName !== cleanName && fuzzyName.length >= 3) {
        nameQueries.push(
          { name: { $regex: this.escapeRegex(fuzzyName), $options: 'i' } },
          { cleanName: { $regex: this.escapeRegex(fuzzyName), $options: 'i' } }
        );
      }
    }

    // Add set code search if detected
    if (recognition.setCode) {
      nameQueries.push(
        { setCode: recognition.setCode },
        { setCode: { $regex: this.escapeRegex(recognition.setCode), $options: 'i' } }
      );
    }

    // If no name found, try broader search with extracted text
    if (nameQueries.length === 0 && recognition.extractedText.length > 0) {
      console.log('⚠️ No card name recognized, trying broader text search...');
      
      for (const text of recognition.extractedText) {
        const words = text.split(/\s+/).filter(word => word.length >= 3);
        for (const word of words) {
          if (/^[A-Z][a-z]+/.test(word)) { // Looks like a proper name
            nameQueries.push(
              { name: { $regex: this.escapeRegex(word), $options: 'i' } },
              { cleanName: { $regex: this.escapeRegex(word), $options: 'i' } }
            );
          }
        }
      }
    }

    // If still no queries, do a broad search for the game type
    if (nameQueries.length === 0) {
      console.log('🔍 No search criteria found, searching for popular cards of type:', gameType);
      
      // Search for most common cards for testing
      const popularCards = {
        onepiece: ['Luffy', 'Zoro', 'Nami', 'Sanji', 'Chopper', 'Robin', 'Franky', 'Brook', 'Ace', 'Law'],
        pokemon: ['Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Mewtwo', 'Mew', 'Eevee'],
        yugioh: ['Blue-Eyes', 'Dark Magician', 'Red-Eyes', 'Exodia']
      };
      
      const popular = popularCards[gameType as keyof typeof popularCards] || [];
      for (const cardName of popular) {
        nameQueries.push(
          { name: { $regex: this.escapeRegex(cardName), $options: 'i' } },
          { cleanName: { $regex: this.escapeRegex(cardName), $options: 'i' } }
        );
      }
      
      // For Yu-Gi-Oh specifically, also search for any cards if OCR failed
      if (gameType === 'yugioh' && nameQueries.length === 0) {
        console.log('🎴 Yu-Gi-Oh OCR failed completely, searching all Yu-Gi-Oh cards');
        // Will search all yugioh cards below
      }
    }

    if (nameQueries.length > 0) {
      searchCriteria.$or = nameQueries;
    } else {
      // Last resort: search all cards of the game type
      console.log('⚠️ Using fallback: searching all cards of type:', gameType);
    }

    // Apply user preferences
    if (options?.userPreferences?.priceRange) {
      const { min, max } = options.userPreferences.priceRange;
      searchCriteria['tcgPlayerPrice.marketPrice'] = {
        $gte: min,
        $lte: max
      };
    }

    const matches = await Card.find(searchCriteria)
      .populate('cardSet')
      .limit(options?.maxResults || 25) // Increased from 15 to 25
      .lean();

    console.log(`🔍 Database search found ${matches.length} potential matches for: "${recognition.cardName}"`);
    
    return matches.map(card => this.mapToCardMatch(card));
  }

  /**
   * Clean card name for better matching
   */
  private cleanCardName(name: string): string {
    return name
      .replace(/\s*\([^)]*\)\s*/g, '') // Remove parentheses content
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Map database card to CardMatch interface
   */
  private mapToCardMatch(card: any): CardMatch {
    return {
      cardId: card._id.toString(),
      productId: card.productId,
      name: card.name,
      cleanName: card.cleanName,
      setInfo: {
        setName: card.cardSet.name,
        setCode: card.setCode,
        groupId: card.groupId,
        rarity: card.rarity,
        abbreviation: card.cardSet.abbreviation
      },
      confidence: 0, // Will be calculated in rankMatches
      imageUrl: card.imageUrl,
      estimatedValue: card.tcgPlayerPrice?.marketPrice || 0,
      gameType: card.gameType
    };
  }

  /**
   * Rank matches by confidence score
   */
  private async rankMatches(
    matches: CardMatch[],
    recognition: any,
    options?: ScanOptions
  ): Promise<CardMatch[]> {
    
    const rankedMatches = matches.map(match => ({
      ...match,
      confidence: this.calculateConfidence(match, recognition, options)
    }));

    // Sort by confidence (highest first)
    rankedMatches.sort((a, b) => b.confidence - a.confidence);

    return rankedMatches;
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(
    match: CardMatch,
    recognition: any,
    options?: ScanOptions
  ): number {
    let confidence = 0.2; // Start with higher base confidence

    // Name similarity (40% weight) - more flexible matching
    const nameSimilarity = this.cardRecognitionService.calculateNameSimilarity(
      recognition.cardName,
      match.cleanName || match.name
    );
    confidence += nameSimilarity * 0.4;
    
    // Additional name matching strategies
    if (recognition.cardName && match.name) {
      const recognizedWords = recognition.cardName.toLowerCase().split(/\s+/);
      const cardWords = match.name.toLowerCase().split(/\s+/);
      
      // Word-based partial matching
      const wordMatches = recognizedWords.filter((word: string) => 
        word.length >= 3 && cardWords.some((cardWord: string) => 
          cardWord.includes(word) || word.includes(cardWord)
        )
      ).length;
      
      if (wordMatches > 0) {
        const wordBonus = (wordMatches / Math.max(recognizedWords.length, cardWords.length)) * 0.2;
        confidence += wordBonus;
      }
    }

    // Set code exact match (30% weight)
    if (recognition.setCode && match.setInfo.setCode === recognition.setCode) {
      confidence += 0.3;
    } else if (recognition.setCode && match.setInfo.setCode?.includes(recognition.setCode)) {
      confidence += 0.2; // Increased partial match bonus
    }

    // Rarity match (10% weight)
    if (recognition.rarity && match.setInfo.rarity === recognition.rarity) {
      confidence += 0.1;
    }

    // User preference bonuses (20% weight total)
    if (options?.userPreferences?.preferredSets) {
      if (options.userPreferences.preferredSets.includes(match.setInfo.setCode || '')) {
        confidence += 0.15; // Increased bonus
      }
    }

    // Recent set bonus and OCR quality bonus
    confidence += 0.1; // Increased default bonus
    
    // OCR confidence bonus
    if (recognition.confidence > 0.8) {
      confidence += 0.1;
    } else if (recognition.confidence > 0.6) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Determine if set selection UI should be shown
   */
  private shouldRequireSetSelection(matches: CardMatch[]): boolean {
    if (matches.length <= 1) return false;
    if (matches.length > 3) return true; // Always show selection for many matches
    
    // Show selection if top match confidence is below threshold
    return matches[0].confidence < 0.95;
  }

  /**
   * Save scan history for analytics and learning
   */
  private async saveScanHistory(scanData: {
    userId: Types.ObjectId;
    gameType: 'pokemon' | 'yugioh' | 'onepiece';
    extractedText: string[];
    ocrConfidence: number;
    recognizedCardName?: string;
    recognizedSetCode?: string;
    recognizedRarity?: string;
    potentialMatches: Array<{
      cardId: Types.ObjectId;
      confidence: number;
      rank: number;
    }>;
    wasAutoSelected: boolean;
    scanDuration: number;
    processingSteps: {
      imagePreprocessing: number;
      ocrExtraction: number;
      cardMatching: number;
      confidenceRanking: number;
    };
    imageHash: string;
    imageSize: {
      width: number;
      height: number;
      fileSize: number;
    };
    selectedCardId?: Types.ObjectId;
    errorMessage?: string;
    errorStep?: 'preprocessing' | 'ocr' | 'matching' | 'selection';
  }): Promise<void> {
    try {
      const scanHistory = new ScanHistory(scanData);
      await scanHistory.save();
      console.log('Scan history saved successfully');
    } catch (error) {
      console.error('Failed to save scan history:', error);
      // Don't throw - scan history is not critical
    }
  }

  /**
   * Fuzzy search for manual card lookup
   */
  async fuzzySearchCards(
    query: string,
    gameType: string,
    options: {
      setCode?: string;
      maxResults?: number;
      includeVariants?: boolean;
    } = {}
  ): Promise<CardMatch[]> {
    
    const searchCriteria: any = {
      gameType,
      isActive: true,
      $or: [
        { name: { $regex: this.escapeRegex(query), $options: 'i' } },
        { cleanName: { $regex: this.escapeRegex(query), $options: 'i' } }
      ]
    };

    if (options.setCode) {
      searchCriteria.setCode = { $regex: this.escapeRegex(options.setCode), $options: 'i' };
    }

    const matches = await Card.find(searchCriteria)
      .populate('cardSet')
      .limit(options.maxResults || 10)
      .lean();

    return matches.map(card => ({
      ...this.mapToCardMatch(card),
      confidence: this.calculateStringSimilarity(card.name, query)
    })).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get recent scan history for user
   */
  async getScanHistory(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      gameType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ scans: IScanHistory[]; total: number; hasMore: boolean }> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const skip = (page - 1) * limit;

      // Build query
      const query: any = { userId: new Types.ObjectId(userId) };

      if (options.gameType) {
        query.gameType = options.gameType;
      }

      if (options.startDate || options.endDate) {
        query.scannedAt = {};
        if (options.startDate) {
          query.scannedAt.$gte = options.startDate;
        }
        if (options.endDate) {
          query.scannedAt.$lte = options.endDate;
        }
      }

      const [scans, total] = await Promise.all([
        ScanHistory.find(query)
          .populate('selectedCardId', 'name imageUrl')
          .populate('potentialMatches.cardId', 'name imageUrl')
          .sort({ scannedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ScanHistory.countDocuments(query)
      ]);

      return {
        scans: scans as IScanHistory[],
        total,
        hasMore: total > skip + limit
      };
    } catch (error) {
      console.error('Failed to get scan history:', error);
      return {
        scans: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Update scan history with user's card selection
   */
  async updateScanHistoryWithSelection(
    userId: string,
    selectedCardId: string,
    scanId?: string
  ): Promise<void> {
    try {
      // Find the most recent scan for this user if scanId not provided
      const query = scanId 
        ? { _id: new Types.ObjectId(scanId) }
        : { userId: new Types.ObjectId(userId) };

      const scanHistory = await ScanHistory.findOne(query)
        .sort({ scannedAt: -1 });

      if (scanHistory) {
        scanHistory.selectedCardId = selectedCardId as any;
        await scanHistory.save();
      }
    } catch (error) {
      console.error('Failed to update scan history with selection:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Add user feedback to scan history for learning
   */
  async addScanFeedback(
    scanId: string,
    wasCorrect: boolean,
    actualCardId?: string
  ): Promise<void> {
    try {
      const scanHistory = await ScanHistory.findById(scanId);
      if (scanHistory) {
        scanHistory.userFeedback = {
          wasCorrect,
          actualCardId: actualCardId as any,
          feedbackAt: new Date()
        };
        await scanHistory.save();
      }
    } catch (error) {
      console.error('Failed to add scan feedback:', error);
    }
  }
}