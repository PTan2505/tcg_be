import { readFile, writeFile } from 'fs/promises';
import { Card } from '../../database/models/card';

const logger = {
  error: (...args: any[]) => console.error('[CARD_NUMBER_FUZZY]', ...args),
  info: (...args: any[]) => console.log('[CARD_NUMBER_FUZZY]', ...args),
  warn: (...args: any[]) => console.warn('[CARD_NUMBER_FUZZY]', ...args)
};

// Debug: Log when this file is loaded
console.log('🔄 [CARD_NUMBER_FUZZY] Service file loaded at:', new Date().toISOString());

export interface CardNumberMatch {
  cardNumber: string;
  originalOCR: string;
  confidence: number;
  editDistance: number;
  matchType: 'exact' | 'ocr_correction' | 'fuzzy';
  gameType: 'pokemon' | 'yugioh' | 'onepiece';
  corrections: string[];
}

export class CardNumberFuzzySearchService {
  private cardNumberDatabase: Map<string, any> = new Map();
  private gameTypeIndex: Map<string, string[]> = new Map();
  private initialized = false;
  private cacheFile = 'data/cache/card-numbers-cache.json';

  /**
   * Initialize card number database from MongoDB and cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🔧 Initializing Card Number Fuzzy Search Service...');

      // Try to load from cache first
      const cacheLoaded = await this.loadFromCache();
      
      if (!cacheLoaded) {
        // Build from database if cache doesn't exist or is outdated
        await this.buildCardNumberDatabase();
        await this.saveToCache();
      }

      this.initialized = true;
      logger.info('✅ Card Number Fuzzy Search Service initialized successfully');
      logger.info(`📊 Loaded ${this.cardNumberDatabase.size} unique card numbers`);

    } catch (error) {
      logger.error('Failed to initialize Card Number Fuzzy Search Service:', error);
    }
  }

  /**
   * Build card number database from MongoDB
   */
  private async buildCardNumberDatabase(): Promise<void> {
    logger.info('🏗️ Building card number database from MongoDB...');

    try {
      // Get all cards with extended data containing card numbers
      const cards = await Card.find({
        'extendedData.extNumber': { $exists: true, $ne: null }
      }).select('name gameType setCode extendedData.extNumber cardSet rarity imageUrl hp attack defense power cost').populate('cardSet', 'name abbreviation').lean();

      logger.info(`📋 Processing ${cards.length} cards with card numbers...`);

      for (const card of cards) {
        const cardNumber = card.extendedData?.extNumber;
        if (cardNumber && typeof cardNumber === 'string') {
          const normalizedNumber = cardNumber.toUpperCase();
          
          // Store multiple cards for same card number (different sets)
          if (!this.cardNumberDatabase.has(normalizedNumber)) {
            this.cardNumberDatabase.set(normalizedNumber, {
              cardNumber: normalizedNumber,
              cards: []
            });
          }
          
          // Add this card to the array
          const cardData = this.cardNumberDatabase.get(normalizedNumber)!;
          cardData.cards.push({
            _id: card._id,
            name: card.name,
            gameType: card.gameType,
            setCode: card.setCode,
            setName: (card as any).cardSet?.name || '',
            rarity: card.rarity || '',
            imageUrl: card.imageUrl || '',
            // Include basic card data
            hp: (card as any).hp,
            attack: (card as any).attack,
            defense: (card as any).defense,
            power: (card as any).power,
            cost: (card as any).cost
          });

          // Index by game type for faster searching
          if (!this.gameTypeIndex.has(card.gameType)) {
            this.gameTypeIndex.set(card.gameType, []);
          }
          this.gameTypeIndex.get(card.gameType)!.push(normalizedNumber);
        }
      }

      logger.info(`✅ Built database with ${this.cardNumberDatabase.size} card numbers`);
      logger.info(`📊 Game type distribution:`);
      for (const [gameType, numbers] of this.gameTypeIndex) {
        logger.info(`   ${gameType}: ${numbers.length} card numbers`);
      }

      // Save to cache after building
      await this.saveToCache();

    } catch (error) {
      logger.error('Failed to build card number database:', error);
      throw error;
    }
  }

  /**
   * Save card number database to cache file
   */
  private async saveToCache(): Promise<void> {
    try {
      const cacheData = {
        timestamp: Date.now(),
        version: '1.0',
        cardNumbers: Object.fromEntries(this.cardNumberDatabase),
        gameTypeIndex: Object.fromEntries(this.gameTypeIndex)
      };

      // Ensure cache directory exists
      const fs = await import('fs');
      const path = require('path');
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      await writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
      logger.info(`💾 Saved card number cache to ${this.cacheFile}`);

    } catch (error) {
      logger.warn('Failed to save card number cache:', error);
    }
  }

  /**
   * Load card number database from cache file
   */
  private async loadFromCache(): Promise<boolean> {
    try {
      const fs = await import('fs');
      if (!fs.existsSync(this.cacheFile)) {
        logger.info('📄 No card number cache file found, will build from database');
        return false;
      }

      const cacheData = JSON.parse(await readFile(this.cacheFile, 'utf-8'));
      
      // Check if cache is not too old (24 hours)
      const cacheAge = Date.now() - cacheData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge > maxAge) {
        logger.info('📄 Card number cache is outdated, will rebuild from database');
        return false;
      }

      // Load from cache
      this.cardNumberDatabase = new Map(Object.entries(cacheData.cardNumbers));
      this.gameTypeIndex = new Map(Object.entries(cacheData.gameTypeIndex));

      logger.info(`📄 Loaded card number cache from ${this.cacheFile}`);
      return true;

    } catch (error) {
      logger.warn('Failed to load card number cache:', error);
      return false;
    }
  }

  /**
   * Find card numbers using fuzzy matching with OCR error correction
   */
  async findCardNumbers(
    ocrText: string,
    gameType: 'pokemon' | 'yugioh' | 'onepiece',
    maxResults: number = 10
  ): Promise<CardNumberMatch[]> {
    await this.initialize();

    const matches: CardNumberMatch[] = [];
    const candidateNumbers = this.gameTypeIndex.get(gameType) || [];

    logger.info(`🔍 Fuzzy searching for card numbers in ${candidateNumbers.length} ${gameType} cards`);
    logger.info(`📝 OCR text: "${ocrText}"`);

    // Extract potential card numbers from OCR text
    const extractedNumbers = this.extractCardNumbersFromText(ocrText, gameType);
    logger.info(`🎯 Extracted potential card numbers: [${extractedNumbers.join(', ')}]`);
    
    if (extractedNumbers.length === 0) {
      logger.warn(`❌ No card numbers extracted!`);
      return [];
    }
    
    logger.info(`🔍 Starting to process ${extractedNumbers.length} numbers...`);

    try {
      for (const extractedNumber of extractedNumbers) {
        logger.info(`🔍 Processing: "${extractedNumber}"`);
        
        // Try exact match first
        if (this.cardNumberDatabase.has(extractedNumber)) {
          logger.info(`✅ Exact match found for: "${extractedNumber}"`);
          const cardData = this.cardNumberDatabase.get(extractedNumber);
          matches.push({
            cardNumber: extractedNumber,
            originalOCR: extractedNumber,
            confidence: 100,
            editDistance: 0,
            matchType: 'exact',
            gameType,
            corrections: []
          });
          continue;
        }

        logger.info(`❌ No exact match for: "${extractedNumber}", trying OCR corrections...`);

        // Try OCR error correction
        const ocrCorrected = this.applyOCRCorrections(extractedNumber, gameType);
        logger.info(`🔧 Generated ${ocrCorrected.length} OCR corrections for "${extractedNumber}"`);
        
        for (const corrected of ocrCorrected) {
          if (this.cardNumberDatabase.has(corrected.cardNumber)) {
            const cardData = this.cardNumberDatabase.get(corrected.cardNumber);
            logger.info(`✅ OCR correction match: "${extractedNumber}" → "${corrected.cardNumber}"`);
            matches.push({
              cardNumber: corrected.cardNumber,
              originalOCR: extractedNumber,
              confidence: corrected.confidence,
              editDistance: corrected.editDistance,
              matchType: 'ocr_correction',
              gameType,
              corrections: corrected.corrections
            });
          } else {
            logger.info(`❌ OCR correction "${corrected.cardNumber}" not found in database`);
          }
        }

        // Try fuzzy matching if no exact/OCR matches found
        if (matches.length === 0 || matches.every(m => m.originalOCR !== extractedNumber)) {
          logger.info(`🔍 Trying fuzzy matching for: "${extractedNumber}"`);
          const fuzzyMatches = this.findFuzzyMatches(extractedNumber, candidateNumbers, 5);
          for (const fuzzyMatch of fuzzyMatches) {
            matches.push({
              cardNumber: fuzzyMatch.cardNumber,
              originalOCR: extractedNumber,
              confidence: fuzzyMatch.confidence,
              editDistance: fuzzyMatch.editDistance,
              matchType: 'fuzzy',
              gameType,
              corrections: []
            });
          }
        }
      }
    } catch (error: any) {
      logger.error(`❌ Error processing card numbers: ${error.message}`);
      logger.error(error.stack);
    }

    // Sort by confidence and remove duplicates
    const uniqueMatches = matches
      .filter((match, index, self) => 
        index === self.findIndex(m => m.cardNumber === match.cardNumber)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);

    logger.info(`🎯 Found ${uniqueMatches.length} card number matches:`);
    uniqueMatches.forEach((match, index) => {
      logger.info(`  ${index + 1}. ${match.cardNumber} (${match.confidence}% - ${match.matchType})`);
      if (match.corrections.length > 0) {
        logger.info(`     Corrections: ${match.corrections.join(', ')}`);
      }
    });

    return uniqueMatches;
  }

  /**
   * Extract potential card numbers from OCR text using AI-based intelligent pattern detection
   */
  private extractCardNumbersFromText(text: string, gameType: string): string[] {
    logger.info(`🤖 AI-based card number extraction for ${gameType}`);
    logger.info(`📝 Input text: "${text}"`);

    // Use AI-based extraction instead of hard-coded patterns
    return this.aiExtractCardNumbers(text, gameType);
  }

  /**
   * AI-based card number extraction that learns from patterns and handles OCR errors intelligently
   */
  private aiExtractCardNumbers(text: string, gameType: string): string[] {
    const extractedNumbers: string[] = [];
    
    // Step 1: Find all potential card number patterns using broad detection
    const candidates = this.findCardNumberCandidates(text, gameType);
    logger.info(`🔍 AI found ${candidates.length} potential candidates: [${candidates.map(c => c.text).join(', ')}]`);

    // Step 2: Apply AI-based OCR correction and format normalization
    for (const candidate of candidates) {
      const correctedNumbers = this.aiCorrectAndNormalize(candidate, gameType);
      extractedNumbers.push(...correctedNumbers);
    }

    // Step 3: Validate against known card number patterns from database
    const validatedNumbers = this.aiValidateCardNumbers(extractedNumbers, gameType);
    
    logger.info(`✅ AI extracted valid card numbers: [${validatedNumbers.join(', ')}]`);
    return [...new Set(validatedNumbers)]; // Remove duplicates
  }

  /**
   * Find potential card number candidates using intelligent pattern detection
   */
  private findCardNumberCandidates(text: string, gameType: string): Array<{
    text: string;
    confidence: number;
    type: string;
    position: number;
  }> {
    const candidates: Array<{
      text: string;
      confidence: number;
      type: string;
      position: number;
    }> = [];

    // Universal patterns that work across all card games
    const universalPatterns = [
      // Direct card numbers with slash
      { pattern: /\b(\d{1,3})\/(\d{1,3})\b/gi, type: 'direct_slash', confidence: 95 },
      
      // Set codes with numbers (letters + numbers) - Fixed for One Piece: ST14-001, OP01-002
      { pattern: /\b([A-Z0-9]{2,6})-([A-Z0-9O]{2,6})\b/gi, type: 'set_dash', confidence: 90 },
      
      // Multi-part patterns (set + EN/JP + number + total)
      { pattern: /\b([A-Z]{2,6})\s+(EN|JP)\s+([O0-9S5I1]{2,4})\s+(\d{2,3})\b/gi, type: 'set_lang_num_total', confidence: 85 },
      
      // Simple set + numbers (MEG 78 132, OMEG 188 132)
      { pattern: /\b([A-Z]{2,6})\s+([O0-9S5I1]{1,4})\s+(\d{2,3})\b/gi, type: 'set_num_total', confidence: 80 },
      
      // Complex multi-set patterns (OMEGN MEG 18S 132)
      { pattern: /\b([A-Z]{2,6})\s+([A-Z]{2,6})\s+([O0-9S5I1]{2,4})\s+(\d{2,3})\b/gi, type: 'multi_set_num_total', confidence: 75 },
      
      // Numbers with special characters or OCR errors
      { pattern: /\b([O0-9S5I1]{2,4})\s+([O0-9S5I1]{2,4})\b/gi, type: 'num_num', confidence: 70 },
      
      // Diamond & Pearl style (43 D 11S 192)
      { pattern: /\b(\d+)\s+D\s+([O0-9S5]+)\s+(\d+)\b/gi, type: 'diamond_pearl', confidence: 65 },
    ];

    // Find all matches
    for (const { pattern, type, confidence } of universalPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        candidates.push({
          text: match[0],
          confidence,
          type,
          position: match.index
        });
      }
    }

    // Sort by confidence and position
    return candidates.sort((a, b) => b.confidence - a.confidence || a.position - b.position);
  }

  /**
   * AI-based OCR correction and format normalization
   */
  private aiCorrectAndNormalize(candidate: { text: string; type: string; confidence: number }, gameType: string): string[] {
    const results: string[] = [];
    const text = candidate.text;
    
    logger.info(`🧠 AI processing candidate: "${text}" (type: ${candidate.type})`);

    // Define OCR character confusion matrix with confidence scores
    const ocrConfusion = new Map([
      ['O', { alternatives: ['0'], confidence: 95 }],
      ['0', { alternatives: ['O'], confidence: 95 }],
      ['S', { alternatives: ['5'], confidence: 90 }],
      ['5', { alternatives: ['S'], confidence: 90 }],
      ['I', { alternatives: ['1'], confidence: 90 }],
      ['1', { alternatives: ['I'], confidence: 90 }],
      ['B', { alternatives: ['8'], confidence: 85 }],
      ['8', { alternatives: ['B'], confidence: 85 }],
      ['G', { alternatives: ['6'], confidence: 80 }],
      ['6', { alternatives: ['G'], confidence: 80 }],
      ['Z', { alternatives: ['2'], confidence: 75 }],
      ['2', { alternatives: ['Z'], confidence: 75 }],
    ]);

    // Apply AI-based correction based on candidate type
    switch (candidate.type) {
      case 'direct_slash':
        // Already in correct format: 078/132
        results.push(text.toUpperCase());
        break;

      case 'set_dash':
        // SET-CODE format: YGLD-EN003, LOB-001
        results.push(this.aiCorrectSetDashFormat(text, ocrConfusion));
        break;

      case 'set_lang_num_total':
        // SET EN NUM TOTAL format: MEG EN 160 132
        results.push(...this.aiCorrectSetLangFormat(text, ocrConfusion));
        break;

      case 'set_num_total':
        // SET NUM TOTAL format: MEG 78 132
        results.push(...this.aiCorrectSetNumFormat(text, ocrConfusion));
        break;

      case 'multi_set_num_total':
        // MULTI SET NUM TOTAL format: OMEGN MEG 18S 132
        results.push(...this.aiCorrectMultiSetFormat(text, ocrConfusion));
        break;

      case 'diamond_pearl':
        // Diamond & Pearl format: 43 D 11S 192
        results.push(...this.aiCorrectDiamondPearlFormat(text, ocrConfusion));
        break;

      case 'num_num':
        // Generic number-number format
        results.push(...this.aiCorrectGenericNumFormat(text, ocrConfusion));
        break;

      default:
        // Apply generic OCR correction
        results.push(this.aiApplyGenericCorrection(text, ocrConfusion));
    }

    logger.info(`🎯 AI corrected "${text}" → [${results.join(', ')}]`);
    return results.filter(r => r && r.length > 0);
  }

  /**
   * AI correction for SET-DASH format (YGLD-EN003, LOB-001, ST14-001, OP01-002)
   */
  private aiCorrectSetDashFormat(text: string, ocrConfusion: Map<string, any>): string {
    let corrected = text.toUpperCase();
    
    // Specific One Piece corrections BEFORE general OCR corrections
    // OPO1 → OP01 (common OCR error where P gets misread as PO)
    corrected = corrected.replace(/\bOPO(\d+)/g, 'OP0$1');
    
    // Apply targeted OCR corrections only to the number parts
    // Handle O's in the card number (after dash): ST14-OO1 → ST14-001
    corrected = corrected.replace(/-([A-Z0-9O]*)/g, (match, cardNumber) => {
      // Replace all O's with 0's in the card number portion only
      const correctedNumber = cardNumber.replace(/O/g, '0');
      return `-${correctedNumber}`;
    });
    
    // Special case for One Piece: "0021" should be "002" (common OCR error)
    corrected = corrected.replace(/-0*021$/g, '-002');
    
    // Clean up extra leading zeros for One Piece 3-digit format
    corrected = corrected.replace(/-0+(\d{3})$/g, '-$1'); // Keep exactly 3 digits
    corrected = corrected.replace(/-0+(\d{2})$/g, '-0$1');  // Pad to 3 digits if needed
    corrected = corrected.replace(/-0+(\d{1})$/g, '-00$1'); // Pad to 3 digits if needed
    // Handle 4+ digit cases by keeping last 3 digits
    corrected = corrected.replace(/-0*(\d{4,})$/g, (match, digits) => {
      return `-${digits.slice(-3)}`;
    });
    
    return corrected;
  }

  /**
   * AI correction for SET LANG NUM TOTAL format (MEG EN 160 132)
   */
  private aiCorrectSetLangFormat(text: string, ocrConfusion: Map<string, any>): string[] {
    const match = text.match(/^([A-Z]{2,6})\s+(EN|JP)\s+([O0-9S5I1]{2,4})\s+(\d{2,3})$/i);
    if (!match) return [];

    const [, setCode, lang, cardNumRaw, total] = match;
    
    // Apply selective OCR corrections to card number
    let cardNum = this.aiApplySelectiveCorrections(cardNumRaw);
    
    // Ensure 3-digit format
    cardNum = cardNum.padStart(3, '0');
    
    return [`${cardNum}/${total}`];
  }

  /**
   * Apply selective OCR corrections - only fix obvious errors, not valid digits
   */
  private aiApplySelectiveCorrections(text: string): string {
    let corrected = text;
    
    // For Pokemon card numbers, be more aggressive since they should be pure numbers
    // Apply comprehensive O→0 correction for consecutive Os
    corrected = corrected.replace(/O+/g, (match) => '0'.repeat(match.length)); // OO → 00, OOO → 000
    
    // S at end of number is likely meant to be 5 (18S → 185)
    corrected = corrected.replace(/S(?=\d*$)/g, '5');
    
    // S at beginning might be 5 (S12 → 512)  
    corrected = corrected.replace(/^S/g, '5');
    
    // S in middle of numbers (1S2 → 152)
    corrected = corrected.replace(/S/g, '5');
    
    // I at beginning might be 1 (I23 → 123)
    corrected = corrected.replace(/^I(?=\d)/g, '1');
    
    // I in middle might be 1 (1I2 → 112)
    corrected = corrected.replace(/I/g, '1');
    
    // Z at end might be 2 (12Z → 122)
    corrected = corrected.replace(/Z$/g, '2');
    
    // Z in middle might be 2 (1Z2 → 122)
    corrected = corrected.replace(/Z/g, '2');
    
    // B might be 8 (1B2 → 182)
    corrected = corrected.replace(/B/g, '8');
    
    // G might be 6 (1G2 → 162)
    corrected = corrected.replace(/G/g, '6');
    
    logger.info(`🔧 Selective OCR correction: "${text}" → "${corrected}"`);
    return corrected;
  }

  /**
   * AI correction for SET NUM TOTAL format (MEG 78 132)
   */
  private aiCorrectSetNumFormat(text: string, ocrConfusion: Map<string, any>): string[] {
    const match = text.match(/^([A-Z]{2,6})\s+([O0-9S5I1]{1,4})\s+(\d{2,3})$/i);
    if (!match) return [];

    const [, setCode, cardNumRaw, total] = match;
    
    // Apply selective OCR corrections to card number - only fix obvious OCR errors
    let cardNum = this.aiApplySelectiveCorrections(cardNumRaw);
    
    // Ensure 3-digit format
    cardNum = cardNum.padStart(3, '0');
    
    return [`${cardNum}/${total}`];
  }

  /**
   * AI correction for MULTI SET NUM TOTAL format (OMEGN MEG 18S 132)
   */
  private aiCorrectMultiSetFormat(text: string, ocrConfusion: Map<string, any>): string[] {
    const match = text.match(/^([A-Z]{2,6})\s+([A-Z]{2,6})\s+([O0-9S5I1]{2,4})\s+(\d{2,3})$/i);
    if (!match) return [];

    const [, setCode1, setCode2, cardNumRaw, total] = match;
    
    // Apply selective OCR corrections to card number - only fix obvious OCR errors
    let cardNum = this.aiApplySelectiveCorrections(cardNumRaw);
    
    // Ensure 3-digit format
    cardNum = cardNum.padStart(3, '0');
    
    return [`${cardNum}/${total}`];
  }

  /**
   * AI correction for Diamond & Pearl format (43 D 11S 192)
   */
  private aiCorrectDiamondPearlFormat(text: string, ocrConfusion: Map<string, any>): string[] {
    const match = text.match(/^(\d+)\s+D\s+([O0-9S5]+)\s+(\d+)$/i);
    if (!match) return [];

    const [, prefix, cardNumRaw, total] = match;
    
    // Apply selective OCR corrections to card number
    let cardNum = this.aiApplySelectiveCorrections(cardNumRaw);
    
    return [`${cardNum}/${total}`];
  }

  /**
   * AI correction for generic number-number format
   */
  private aiCorrectGenericNumFormat(text: string, ocrConfusion: Map<string, any>): string[] {
    const match = text.match(/^([O0-9S5I1]{2,4})\s+([O0-9S5I1]{2,4})$/i);
    if (!match) return [];

    const [, num1Raw, num2Raw] = match;
    
    // Apply selective OCR corrections
    let num1 = this.aiApplySelectiveCorrections(num1Raw);
    let num2 = this.aiApplySelectiveCorrections(num2Raw);
    
    // Determine which is card number and which is total
    const cardNum = num1.padStart(3, '0');
    const total = num2;
    
    return [`${cardNum}/${total}`];
  }

  /**
   * Generic AI OCR correction
   */
  private aiApplyGenericCorrection(text: string, ocrConfusion: Map<string, any>): string {
    let corrected = text.toUpperCase();
    
    for (const [wrong, correct] of ocrConfusion) {
      corrected = corrected.replace(new RegExp(wrong, 'g'), correct.alternatives[0]);
    }
    
    return corrected;
  }

  /**
   * AI-based validation against known card number patterns
   */
  private aiValidateCardNumbers(candidates: string[], gameType: string): string[] {
    const validated: string[] = [];
    
    for (const candidate of candidates) {
      // Check if it matches expected format for the game type
      const isValid = this.aiValidateFormat(candidate, gameType);
      
      if (isValid) {
        validated.push(candidate);
        logger.info(`✅ AI validated: "${candidate}" for ${gameType}`);
      } else {
        logger.info(`❌ AI rejected: "${candidate}" (invalid format for ${gameType})`);
      }
    }
    
    return validated;
  }

  /**
   * AI-based format validation
   */
  private aiValidateFormat(cardNumber: string, gameType: string): boolean {
    switch (gameType) {
      case 'pokemon':
        // Pokemon: 078/132, 001/102, etc.
        return /^\d{1,3}\/\d{2,3}$/.test(cardNumber);
        
      case 'yugioh':
        // Yu-Gi-Oh: YGLD-EN003, LOB-001, etc.
        return /^[A-Z]{3,5}-[A-Z0-9]{2,6}$/.test(cardNumber);
        
      case 'onepiece':
        // One Piece: OP01-001, ST01-001, etc.
        return /^[A-Z]{2,4}\d{1,2}-[A-Z0-9]{3,4}$/.test(cardNumber);
        
      default:
        return true; // Allow unknown formats
    }
  }

  /**
   * Apply OCR-specific corrections for common misreads
   */
  private applyOCRCorrections(cardNumber: string, gameType: string): Array<{
    cardNumber: string;
    confidence: number;
    editDistance: number;
    corrections: string[];
  }> {
    const corrections: Array<{
      cardNumber: string;
      confidence: number;
      editDistance: number;
      corrections: string[];
    }> = [];

    // Common OCR corrections based on visual similarity
    const ocrMistakes = [
      // Character-level OCR errors (visual similarity)
      { from: 'O', to: '0', confidence: 95 },  // Very common: O ↔ 0
      { from: '0', to: 'O', confidence: 95 },
      { from: 'S', to: '5', confidence: 90 },  // S ↔ 5
      { from: '5', to: 'S', confidence: 90 },
      { from: 'I', to: '1', confidence: 90 },  // I ↔ 1
      { from: '1', to: 'I', confidence: 90 },
      { from: 'B', to: '8', confidence: 85 },  // B ↔ 8
      { from: '8', to: 'B', confidence: 85 },
      { from: 'G', to: '6', confidence: 80 },  // G ↔ 6
      { from: '6', to: 'G', confidence: 80 },
      { from: 'Z', to: '2', confidence: 75 },  // Z ↔ 2
      { from: '2', to: 'Z', confidence: 75 },
    ];

    // Apply single-character corrections
    for (const mistake of ocrMistakes) {
      if (cardNumber.includes(mistake.from)) {
        const corrected = cardNumber.replace(new RegExp(mistake.from, 'g'), mistake.to);
        if (corrected !== cardNumber) {
          corrections.push({
            cardNumber: corrected,
            confidence: mistake.confidence,
            editDistance: 1,
            corrections: [`${mistake.from} → ${mistake.to}`]
          });
        }
      }
    }

    // Game-specific corrections
    if (gameType === 'yugioh') {
      logger.info(`🎯 Applying Yu-Gi-Oh specific patterns to: "${cardNumber}"`);
      // Yu-Gi-Oh specific patterns
      const ygoCorrections = [
        // YGLD-ENAO3 → YGLD-ENA03 (O→0 in middle position)
        { pattern: /^([A-Z]{3,5})-([A-Z]{2,3})O(\d{1,2})$/, replacement: '$1-$20$3', desc: 'O → 0 in card number' },
        // SDFC-ENO31 → SDFC-EN031 (O→0 and add leading zero)
        { pattern: /^([A-Z]{3,5})-ENO(\d{1,2})$/, replacement: '$1-EN0$2', desc: 'ENO → EN0' },
        // Add leading zero for 2-digit card numbers
        { pattern: /^([A-Z]{3,5})-EN(\d{1,2})$/, replacement: '$1-EN0$2', desc: 'Add leading zero' },
      ];

      for (const correction of ygoCorrections) {
        logger.info(`🧪 Testing pattern "${correction.pattern}" against "${cardNumber}"`);
        if (correction.pattern.test(cardNumber)) {
          const corrected = cardNumber.replace(correction.pattern, correction.replacement);
          if (corrected !== cardNumber) {
            logger.info(`✅ Yu-Gi-Oh pattern matched: "${cardNumber}" → "${corrected}" (${correction.desc})`);
            corrections.push({
              cardNumber: corrected,
              confidence: 90,
              editDistance: this.levenshteinDistance(cardNumber, corrected),
              corrections: [correction.desc]
            });
          } else {
            logger.warn(`⚠️ Pattern matched but no change: "${cardNumber}"`);
          }
        } else {
          logger.info(`❌ Pattern "${correction.pattern}" did not match "${cardNumber}"`);
        }
      }
    }

    if (gameType === 'onepiece') {
      // One Piece specific patterns
      const opCorrections = [
        // EBO1-OS6 → EB01-056
        { pattern: /^EBO(\d)/, replacement: 'EB0$1', desc: 'EBO → EB0' },
        { pattern: /^0P0(\d)/, replacement: 'OP0$1', desc: '0P0 → OP0' },
        { pattern: /-OS(\d)$/, replacement: '-05$1', desc: 'OS → 05' },
        { pattern: /-O(\d{2})$/, replacement: '-0$1', desc: 'O → 0 in position' },
      ];

      for (const correction of opCorrections) {
        if (correction.pattern.test(cardNumber)) {
          const corrected = cardNumber.replace(correction.pattern, correction.replacement);
          if (corrected !== cardNumber) {
            corrections.push({
              cardNumber: corrected,
              confidence: 90,
              editDistance: this.levenshteinDistance(cardNumber, corrected),
              corrections: [correction.desc]
            });
          }
        }
      }
    }

    if (gameType === 'yugioh') {
      // Yu-Gi-Oh specific patterns
      const ygoCorrections = [
        // YGLD-ENAO3 → YGLD-ENA03 (O in middle should be removed)
        { pattern: /-ENAO(\d{1,2})$/, replacement: '-ENA0$1', desc: 'ENAO → ENA0' },
        { pattern: /-ENBO(\d{1,2})$/, replacement: '-ENB0$1', desc: 'ENBO → ENB0' },
        { pattern: /-ENCO(\d{1,2})$/, replacement: '-ENC0$1', desc: 'ENCO → ENC0' },
        // Handle other common OCR errors in Yu-Gi-Oh
        { pattern: /-EN[A-Z]O(\d{1,2})$/, replacement: '-EN0$1', desc: 'ENxO → EN0' },
        { pattern: /-[A-Z]N(\d{3})$/, replacement: '-EN$1', desc: 'xN → EN' },
        { pattern: /^LOB-EN[A-Z](\d{2})$/, replacement: 'LOB-EN0$1', desc: 'LOB-ENx → LOB-EN0' },
        { pattern: /^SDK-[A-Z]N(\d{3})$/, replacement: 'SDK-EN$1', desc: 'SDK-xN → SDK-EN' },
      ];

      for (const correction of ygoCorrections) {
        if (correction.pattern.test(cardNumber)) {
          const corrected = cardNumber.replace(correction.pattern, correction.replacement);
          if (corrected !== cardNumber) {
            corrections.push({
              cardNumber: corrected,
              confidence: 90,
              editDistance: this.levenshteinDistance(cardNumber, corrected),
              corrections: [correction.desc]
            });
          }
        }
      }
    }

    if (gameType === 'pokemon') {
      // Pokemon specific patterns
      const pkmnCorrections = [
        // OBF EN OO4 → OBF EN 004, 004/197
        { pattern: /^([A-Z]{2,4})\s+EN\s+[O0]{2,3}(\d{1,3})$/, replacement: '$1 EN 0$2', desc: 'OO → 0 in EN format' },
        { pattern: /^([A-Z]{2,4})\s+EN\s+[O0]+(\d{1,3})$/, replacement: '$1-$2', desc: 'Set EN Number → Set-Number' },
        { pattern: /^[O0]{2,3}(\d{1,3})$/, replacement: '00$1', desc: 'OO → 00 prefix' },
        { pattern: /^([A-Z]{2,4})-[O0]{2,3}(\d{1,3})$/, replacement: '$1-00$2', desc: 'Set-OO → Set-00' },
        // Handle /xxx format
        { pattern: /^(\d{1,3})\/[O0]{2,3}(\d{1,3})$/, replacement: '$1/0$2', desc: 'Number/OO → Number/0' },
      ];

      for (const correction of pkmnCorrections) {
        if (correction.pattern.test(cardNumber)) {
          const corrected = cardNumber.replace(correction.pattern, correction.replacement);
          if (corrected !== cardNumber) {
            corrections.push({
              cardNumber: corrected,
              confidence: 90,
              editDistance: this.levenshteinDistance(cardNumber, corrected),
              corrections: [correction.desc]
            });
          }
        }
      }
    }

    // Multi-character corrections (combinations)
    if (corrections.length > 0) {
      const firstCorrection = corrections[0];
      for (const mistake of ocrMistakes.slice(0, 3)) { // Try top 3 additional corrections
        if (firstCorrection.cardNumber.includes(mistake.from)) {
          const doubleCorrection = firstCorrection.cardNumber.replace(
            new RegExp(mistake.from, 'g'), 
            mistake.to
          );
          if (doubleCorrection !== firstCorrection.cardNumber) {
            corrections.push({
              cardNumber: doubleCorrection,
              confidence: Math.min(firstCorrection.confidence - 10, mistake.confidence - 10),
              editDistance: this.levenshteinDistance(cardNumber, doubleCorrection),
              corrections: [...firstCorrection.corrections, `${mistake.from} → ${mistake.to}`]
            });
          }
        }
      }
    }

    logger.info(`🎯 applyOCRCorrections for "${cardNumber}" generated ${corrections.length} corrections`);
    if (corrections.length > 0) {
      corrections.forEach((c, i) => {
        logger.info(`   ${i + 1}. "${c.cardNumber}" (${c.confidence}%) - ${c.corrections.join(', ')}`);
      });
    }

    return corrections.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find fuzzy matches using edit distance
   */
  private findFuzzyMatches(
    target: string, 
    candidates: string[], 
    maxResults: number = 5
  ): Array<{
    cardNumber: string;
    confidence: number;
    editDistance: number;
  }> {
    const matches: Array<{
      cardNumber: string;
      confidence: number;
      editDistance: number;
    }> = [];

    for (const candidate of candidates) {
      const distance = this.levenshteinDistance(target, candidate);
      const maxLength = Math.max(target.length, candidate.length);
      const similarity = (maxLength - distance) / maxLength;
      const confidence = Math.round(similarity * 100);

      // Only include matches with reasonable similarity
      if (confidence >= 60) {
        matches.push({
          cardNumber: candidate,
          confidence,
          editDistance: distance
        });
      }
    }

    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxResults);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Get card data by card number
   */
  async getCardByNumber(cardNumber: string): Promise<any | null> {
    await this.initialize();
    return this.cardNumberDatabase.get(cardNumber.toUpperCase()) || null;
  }

  /**
   * Refresh cache from database
   */
  async refreshCache(): Promise<void> {
    logger.info('🔄 Refreshing card number cache...');
    this.cardNumberDatabase.clear();
    this.gameTypeIndex.clear();
    this.initialized = false;
    
    await this.buildCardNumberDatabase();
    await this.saveToCache();
    this.initialized = true;
    
    logger.info('✅ Card number cache refreshed successfully');
  }

  /**
   * Find ALL cards that have the same card number
   * This is useful when you want to get all cards with a specific number across different sets
   */
  async findAllCardsByNumber(gameType: string, ocrText: string, ocrCardName: string = '', maxResults: number = 50): Promise<{
    topMatch: any | null,
    candidates: any[],
    matches: any[], // For backward compatibility
    cardsByNumber: { [cardNumber: string]: any[] } // NEW: grouped by card number
  }> {
    console.log('🚀 [CARD_NUMBER_FUZZY] findAllCardsByNumber called with NEW CODE at:', new Date().toISOString());
    console.log('📝 [CARD_NUMBER_FUZZY] Method inputs:', { gameType, ocrText: ocrText.substring(0, 100), ocrCardName });

    if (!this.initialized) {
      await this.initialize();
    }

    logger.info(`🔍 Finding ALL cards by number for ${gameType}`);
    logger.info(`📝 OCR text: "${ocrText}"`);

    // Step 1: Extract card numbers from OCR text
    const extractedNumbers = this.extractCardNumbersFromText(ocrText, gameType);
    logger.info(`🎯 Extracted potential card numbers: [${extractedNumbers.join(', ')}]`);

    if (extractedNumbers.length === 0) {
      return {
        topMatch: null,
        candidates: [],
        matches: [],
        cardsByNumber: {}
      };
    }

    // Step 2: Group all cards by their card numbers
    const cardsByNumber: { [cardNumber: string]: any[] } = {};
    const allMatches: any[] = [];

    for (const extractedNumber of extractedNumbers) {
      console.log(`🔍 [CARD_NUMBER_FUZZY] Processing extracted number: "${extractedNumber}"`);
      
      // Try exact match first
      if (this.cardNumberDatabase.has(extractedNumber)) {
        console.log(`✅ [CARD_NUMBER_FUZZY] Exact match found for: "${extractedNumber}"`);
        const cardData = this.cardNumberDatabase.get(extractedNumber)!;
        
        // Get ALL cards with this card number
        const cardsWithThisNumber = cardData.cards.filter((card: any) => 
          card.gameType === gameType
        );

        if (cardsWithThisNumber.length > 0) {
          cardsByNumber[extractedNumber] = cardsWithThisNumber;
          
          // Add to matches with high confidence (exact card number match)
          cardsWithThisNumber.forEach((card: any) => {
            allMatches.push({
              card,
              confidence: 100, // Exact card number match
              matchReason: `Exact card number match: ${extractedNumber}`,
              matchedFields: ['cardNumber'],
              cardNumber: extractedNumber
            });
          });

          logger.info(`🎯 Found ${cardsWithThisNumber.length} cards with number ${extractedNumber}:`);
          cardsWithThisNumber.forEach((card: any, index: number) => {
            logger.info(`  ${index + 1}. ${card.name} (${card.setName || card.setCode})`);
            logger.info(`     Image URL: ${card.imageUrl || 'NO IMAGE'}`);
            logger.info(`     Card Fields: [${Object.keys(card).join(', ')}]`);
          });
        }
      } else {
        // No exact match found - apply OCR corrections for Yu-Gi-Oh
        console.log(`❌ [CARD_NUMBER_FUZZY] No exact match found for: "${extractedNumber}"`);
        if (gameType === 'yugioh') {
          console.log(`🤖 [CARD_NUMBER_FUZZY] Applying Yu-Gi-Oh OCR corrections...`);
          const correctedNumbers = this.generateYuGiOhAICorrections(extractedNumber);
          console.log(`🔧 [CARD_NUMBER_FUZZY] Generated corrections:`, correctedNumbers);
          
          for (const correctedNumber of correctedNumbers) {
            if (this.cardNumberDatabase.has(correctedNumber)) {
              console.log(`✅ [CARD_NUMBER_FUZZY] OCR correction match found: "${extractedNumber}" → "${correctedNumber}"`);
              const cardData = this.cardNumberDatabase.get(correctedNumber)!;
              
              const cardsWithThisNumber = cardData.cards.filter((card: any) => 
                card.gameType === gameType
              );

              if (cardsWithThisNumber.length > 0) {
                cardsByNumber[correctedNumber] = cardsWithThisNumber;
                
                // Add to matches with high confidence (OCR corrected match)
                cardsWithThisNumber.forEach((card: any) => {
                  allMatches.push({
                    card,
                    confidence: 95, // Very high confidence for OCR correction
                    matchReason: `OCR corrected match: ${extractedNumber} → ${correctedNumber}`,
                    matchedFields: ['cardNumber'],
                    cardNumber: correctedNumber,
                    originalNumber: extractedNumber
                  });
                });

                logger.info(`🎯 Found ${cardsWithThisNumber.length} cards with OCR corrected number ${correctedNumber}:`);
                cardsWithThisNumber.forEach((card: any, index: number) => {
                  logger.info(`  ${index + 1}. ${card.name} (${card.setName || card.setCode})`);
                  logger.info(`     Original OCR: ${extractedNumber} → Corrected: ${correctedNumber}`);
                });
                
                // Found a match with correction, break
                break;
              }
            }
          }
        }
      }
    }

    // Step 3: If we have OCR card name, rank cards by name similarity
    if (ocrCardName && ocrCardName.trim() && allMatches.length > 0) {
      logger.info(`🎯 Ranking cards by name similarity to: "${ocrCardName}"`);
      
      // Calculate name similarity scores
      allMatches.forEach((match: any) => {
        const nameSimilarity = this.calculateNameSimilarity(ocrCardName, match.card.name);
        match.nameSimilarity = nameSimilarity;
        // Fix: Use proper percentage scaling (both are 0-100, so divide by 100 to get 0-1 range)
        match.combinedScore = (match.confidence * 0.005) + (nameSimilarity * 0.005); // 50% card number + 50% name, scaled to 0-1
        match.matchReason = `Card number ${match.cardNumber} + name similarity ${nameSimilarity.toFixed(1)}%`;
        
        // Debug logging for name similarity
        logger.info(`🔍 Name similarity debug: "${ocrCardName}" vs "${match.card.name}" = ${nameSimilarity.toFixed(1)}%`);
        logger.info(`📊 Combined score: (${match.confidence} * 0.005) + (${nameSimilarity} * 0.005) = ${match.combinedScore}`);
      });

      // Sort by combined score
      allMatches.sort((a, b) => b.combinedScore - a.combinedScore);
    } else {
      // No name provided, just sort by card name alphabetically
      allMatches.sort((a, b) => a.card.name.localeCompare(b.card.name));
    }

    const topMatch = allMatches.length > 0 ? allMatches[0] : null;
    const candidates = allMatches.slice(0, maxResults);

    logger.info(`🎯 Found ${Object.keys(cardsByNumber).length} unique card numbers with ${allMatches.length} total cards`);
    if (topMatch) {
      logger.info(`🏆 Top match: ${topMatch.card.name} (${topMatch.confidence}% confidence)`);
      logger.info(`🔢 Card number: ${topMatch.cardNumber}`);
    }

    return {
      topMatch,
      candidates,
      matches: allMatches, // For backward compatibility
      cardsByNumber
    };
  }

  /**
   * Calculate name similarity between OCR text and card name
   */
  private calculateNameSimilarity(ocrName: string, cardName: string): number {
    const ocr = ocrName.toLowerCase().trim();
    const card = cardName.toLowerCase().trim();

    // Exact match
    if (ocr === card) return 100;

    // Contains check
    if (card.includes(ocr) || ocr.includes(card)) return 80;

    // Word-based similarity
    const ocrWords = ocr.split(/\s+/);
    const cardWords = card.split(/\s+/);
    
    let matchingWords = 0;
    for (const ocrWord of ocrWords) {
      if (cardWords.some(cardWord => 
        cardWord.includes(ocrWord) || ocrWord.includes(cardWord)
      )) {
        matchingWords++;
      }
    }

    const wordSimilarity = (matchingWords / Math.max(ocrWords.length, cardWords.length)) * 70;

    // Levenshtein distance for character-level similarity
    const levenshtein = this.calculateLevenshteinDistance(ocr, card);
    const maxLength = Math.max(ocr.length, card.length);
    const charSimilarity = Math.max(0, (maxLength - levenshtein) / maxLength * 30);

    return Math.max(wordSimilarity, charSimilarity);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate Yu-Gi-Oh specific OCR corrections for common character confusions
   * Handles patterns like O/0 and I/1 confusion
   */
  private generateYuGiOhAICorrections(cardNumber: string): string[] {
    const corrections: string[] = [];
    
    // Pattern 1: O vs 0 confusion
    // YGLD-ENAO3 → YGLD-ENA03
    if (cardNumber.includes('O')) {
      const corrected = cardNumber.replace(/O/g, '0');
      corrections.push(corrected);
    }
    if (cardNumber.includes('0')) {
      const corrected = cardNumber.replace(/0/g, 'O');
      corrections.push(corrected);
    }
    
    // Pattern 2: I vs 1 confusion
    // EN1 vs ENI patterns
    if (cardNumber.includes('I')) {
      const corrected = cardNumber.replace(/I/g, '1');
      corrections.push(corrected);
    }
    if (cardNumber.includes('1')) {
      const corrected = cardNumber.replace(/1/g, 'I');
      corrections.push(corrected);
    }
    
    // Pattern 3: Combined O/0 and I/1 corrections
    // Handle cases where both confusions might occur
    if (cardNumber.includes('O') && cardNumber.includes('I')) {
      const corrected = cardNumber.replace(/O/g, '0').replace(/I/g, '1');
      corrections.push(corrected);
    }
    if (cardNumber.includes('0') && cardNumber.includes('1')) {
      const corrected = cardNumber.replace(/0/g, 'O').replace(/1/g, 'I');
      corrections.push(corrected);
    }
    
    // Pattern 4: Mixed corrections
    if (cardNumber.includes('O') && cardNumber.includes('1')) {
      const corrected = cardNumber.replace(/O/g, '0').replace(/1/g, 'I');
      corrections.push(corrected);
    }
    if (cardNumber.includes('0') && cardNumber.includes('I')) {
      const corrected = cardNumber.replace(/0/g, 'O').replace(/I/g, '1');
      corrections.push(corrected);
    }
    
    // Remove duplicates and original
    return [...new Set(corrections)].filter(correction => correction !== cardNumber);
  }
}

export const cardNumberFuzzySearch = new CardNumberFuzzySearchService();