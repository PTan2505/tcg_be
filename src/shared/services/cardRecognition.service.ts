import { getOCRService } from '../../shared/services/ocr.service';

interface CardRecognitionResult {
  cardName: string;
  setCode?: string;
  rarity?: string;
  confidence: number;
  extractedText: string[];
  gameSpecificData?: {
    [key: string]: any;
  };
}

interface GamePatterns {
  namePatterns: RegExp[];
  setCodePatterns: RegExp[];
  rarityPatterns: RegExp[];
  numberPatterns: RegExp[];
  specialPatterns?: RegExp[];
}

export class CardRecognitionService {
  private gamePatterns: { [gameType: string]: GamePatterns } = {
    onepiece: {
      namePatterns: [
        // Specific pattern for Monkey.D.Luffy style names
        /([A-Z][a-z]+\.[A-Z]\.[A-Z][a-z]+)/g,
        // Character names with dots and multiple parts
        /([A-Z][a-z]+(?:\.[A-Z]\.?[A-Z]?[a-z]*)*(?:\s+[A-Z][a-z]*)*)/g,
        // More flexible character names
        /([A-Z][a-z]+(?:\.[A-Z])?[a-z]*(?:\s+[A-Z][a-z]*)*)/g,
        // Names in parentheses format
        /([A-Z][a-z]+(?:\.[A-Z][a-z]*)*(?:\s+[A-Z][a-z]*)*)\s*\(/g,
        // Character names with numbers
        /([A-Z][a-z]+(?:\.[A-Z][a-z]*)*(?:\s+[A-Z][a-z]*)*)\s+\(\d+\)/g,
        // Simple word extraction (last resort)
        /\b([A-Z][a-z]{3,})\b/g
      ],
      setCodePatterns: [
        /OP\d{2}-\d{3}/gi, // OP01-001 format (case insensitive)
        /ST\d{2}-\d{3}/gi, // ST01-001 format (starter decks)
        /P-\d{3}/gi,       // P-001 format (promos)
        /EB-\d{2}-\d{3}/gi, // EB-01-001 format (extra boosters)
        /OP\s*\d{2}\s*-\s*\d{3}/gi, // OP 01 - 001 (with spaces)
        /\d{3}/g           // Just numbers like 003
      ],
      rarityPatterns: [
        /\b(C|UC|R|SR|L|SEC|P|COMMON|UNCOMMON|RARE|SUPER|LEADER|SECRET|PROMO)\b/gi
      ],
      numberPatterns: [
        /\(\d{3}\)/g,     // (001) format
        /-\d{3}/g,        // -001 format
        /\b\d{3}\b/g      // standalone 003
      ]
    },
    pokemon: {
      namePatterns: [
        // More flexible Pokemon names
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/g,
        // Names with ex, GX, V, VMAX suffixes
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)\s+(?:ex|EX|GX|V|VMAX|VSTAR)/g,
        // Basic Pokemon names
        /\b([A-Z][a-z]{3,})\b/g,
        // Pokemon with numbers
        /([A-Z][a-z]+)\s*\d*/g
      ],
      setCodePatterns: [
        /[A-Z]{2,4}\s*\d{1,3}/gi, // BS 001, SV 123 format
        /\d{1,3}\/\d{1,3}/g,      // 001/198 format
        /[A-Z]{3,}\s*\d+/gi       // More flexible set codes
      ],
      rarityPatterns: [
        /\b(C|U|R|RR|RRR|SR|HR|UR|PR|COMMON|UNCOMMON|RARE)\b/gi
      ],
      numberPatterns: [
        /\d{1,3}\/\d{1,3}/g,     // 001/198 format
        /\#\d{1,3}/g,            // #001 format
        /\b\d{1,3}\b/g           // standalone numbers
      ]
    },
    yugioh: {
      namePatterns: [
        // More flexible Yu-Gi-Oh names
        /([A-Z][A-Za-z\s\-'.,]+)/g,
        // Names with numbers or special characters
        /([A-Z][A-Za-z\s\-'.,0-9]+?)(?:\s+\[|\s+\(|$)/g,
        // Single words that could be card names
        /\b([A-Z][a-z]{4,})\b/g
      ],
      setCodePatterns: [
        /[A-Z]{3,5}-[A-Z]{2}\d{3}/gi, // DUDE-EN001 format
        /[A-Z]{4}\d{5}/gi,            // PHHY12345 format
        /[A-Z]{3,}\s*\d+/gi           // More flexible
      ],
      rarityPatterns: [
        /\b(C|R|SR|UR|ScR|CR|GR|PR|COMMON|RARE|SUPER|ULTRA|SECRET)\b/gi
      ],
      numberPatterns: [
        /[A-Z]{3,5}-[A-Z]{2}\d{3}/gi,
        /\b\d{3,}\b/g
      ]
    }
  };

  async recognizeCard(
    imageBuffer: Buffer,
    gameType: string
  ): Promise<CardRecognitionResult> {
    const startTime = Date.now();
    
    try {
      // Extract text using OCR (now async)
      const ocrService = await getOCRService();
      const ocrResult = await ocrService.extractText(imageBuffer, {
        enhanceContrast: true,
        resizeWidth: 800
      });

      if (ocrResult.text.length === 0) {
        return {
          cardName: '',
          confidence: 0,
          extractedText: [],
        };
      }

      // Process extracted text for the specific game
      const recognitionResult = this.processExtractedText(
        ocrResult.text,
        gameType,
        ocrResult.confidence
      );

      console.log(`Card recognition completed in ${Date.now() - startTime}ms`);
      return recognitionResult;

    } catch (error: any) {
      console.error('Card recognition failed:', error);
      throw new Error(`Failed to recognize card: ${error?.message || 'Unknown error'}`);
    }
  }

  private processExtractedText(
    extractedText: string[],
    gameType: string,
    ocrConfidence: number
  ): CardRecognitionResult {
    const patterns = this.gamePatterns[gameType];
    if (!patterns) {
      throw new Error(`Unsupported game type: ${gameType}`);
    }

    const allText = extractedText.join(' ');
    let allCandidateNames: string[] = [];
    let bestSetCode: string | undefined;
    let bestRarity: string | undefined;
    let confidence = Math.max(0.3, ocrConfidence); // Minimum base confidence

    // Extract all possible card names from all patterns
    for (const pattern of patterns.namePatterns) {
      for (const line of extractedText) {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].trim().length >= 3) {
            allCandidateNames.push(match[1].trim());
          }
        }
      }
      
      // Also try on combined text
      const allMatches = allText.matchAll(pattern);
      for (const match of allMatches) {
        if (match[1] && match[1].trim().length >= 3) {
          allCandidateNames.push(match[1].trim());
        }
      }
    }

    // Pick the best candidate name (longest, most likely to be complete)
    let bestCardName = '';
    if (allCandidateNames.length > 0) {
      // Remove duplicates and sort by length
      const uniqueNames = [...new Set(allCandidateNames)];
      bestCardName = uniqueNames
        .filter(name => name.length >= 3)
        .sort((a, b) => b.length - a.length)[0] || '';
    }

    // Extract set code with more flexible matching
    for (const pattern of patterns.setCodePatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        bestSetCode = matches[0].replace(/\s+/g, ''); // Remove spaces
        confidence += 0.15; // Boost confidence if set code found
        break;
      }
    }

    // Extract rarity with more flexible matching
    for (const pattern of patterns.rarityPatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        bestRarity = matches[0].toUpperCase();
        confidence += 0.1; // Boost for rarity
        break;
      }
    }

    // Clean up card name
    bestCardName = this.cleanCardName(bestCardName, gameType);

    // More lenient confidence adjustment
    confidence = this.adjustConfidence(
      bestCardName,
      bestSetCode,
      bestRarity,
      extractedText,
      confidence
    );

    return {
      cardName: bestCardName,
      setCode: bestSetCode,
      rarity: bestRarity,
      confidence: Math.min(confidence, 1.0),
      extractedText,
      gameSpecificData: this.extractGameSpecificData(allText, gameType)
    };
  }

  private adjustConfidenceImproved(
    cardName: string,
    setCode: string | undefined,
    rarity: string | undefined,
    extractedText: string[],
    candidatesFound: number,
    baseConfidence: number
  ): number {
    let adjustedConfidence = baseConfidence;

    // Less harsh penalties for short names
    if (!cardName || cardName.length < 3) {
      adjustedConfidence *= 0.5; // Less harsh than before
    } else if (cardName.length < 6) {
      adjustedConfidence *= 0.8; // Less harsh than before
    }

    // Boost confidence for set code detection
    if (setCode) {
      adjustedConfidence += 0.2; // Increased bonus
    }

    // Boost confidence for rarity detection
    if (rarity) {
      adjustedConfidence += 0.15; // Increased bonus
    }

    // Less harsh penalty for few text lines
    if (extractedText.length < 2) {
      adjustedConfidence *= 0.9; // Less harsh
    }

    // Boost confidence for more candidates found
    if (candidatesFound > 2) {
      adjustedConfidence += 0.1;
    }

    // Boost confidence for longer extracted text
    if (extractedText.length > 5) {
      adjustedConfidence += 0.1; // Increased bonus
    }

    // Less harsh penalty for OCR errors
    const hasLikelyErrors = extractedText.some(line => 
      line.includes('|||') || 
      line.includes('...') || 
      /\d{10,}/.test(line)
    );

    if (hasLikelyErrors) {
      adjustedConfidence *= 0.95; // Less harsh
    }

    return Math.max(0.2, Math.min(1, adjustedConfidence)); // Minimum 0.2 confidence
  }

  private cleanCardName(name: string, gameType: string): string {
    if (!name) return '';

    // Remove common OCR artifacts
    let cleaned = name
      .replace(/[|]/g, 'I') // Replace pipe with I
      .replace(/[0O]/g, 'O') // Normalize O and 0
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Game-specific cleaning
    switch (gameType) {
      case 'onepiece':
        // Fix common One Piece name patterns first
        cleaned = cleaned.replace(/Monkey\.?D\.?\s*/gi, 'Monkey.D.');
        
        // If we only have "Monkey.D" try to complete it
        if (cleaned === 'Monkey.D' || cleaned === 'Monkey.D.') {
          // This is likely Monkey.D.Luffy, but we'll keep it as is for now
          // The database search should find it
        }
        
        // Remove card numbers and parentheses
        cleaned = cleaned.replace(/\s*\(\d+\).*$/, '');
        
        // Fix other common patterns
        cleaned = cleaned.replace(/Trafalgar\.?\s*Law/gi, 'Trafalgar Law');
        cleaned = cleaned.replace(/Roronoa\.?\s*Zoro/gi, 'Roronoa Zoro');
        cleaned = cleaned.replace(/Portgas\.?D\.?\s*Ace/gi, 'Portgas.D.Ace');
        break;
      
      case 'pokemon':
        // Remove Pokemon suffixes like ex, GX, etc.
        cleaned = cleaned.replace(/\s+(ex|EX|GX|V|VMAX|VSTAR).*$/, '');
        break;
      
      case 'yugioh':
        // Yu-Gi-Oh names are usually left as-is
        break;
    }

    return cleaned;
  }

  private adjustConfidence(
    cardName: string,
    setCode: string | undefined,
    rarity: string | undefined,
    extractedText: string[],
    baseConfidence: number
  ): number {
    let adjustedConfidence = baseConfidence;

    // Penalize short or empty names
    if (!cardName || cardName.length < 3) {
      adjustedConfidence *= 0.3;
    } else if (cardName.length < 6) {
      adjustedConfidence *= 0.7;
    }

    // Boost confidence for set code detection
    if (setCode) {
      adjustedConfidence += 0.15;
    }

    // Boost confidence for rarity detection
    if (rarity) {
      adjustedConfidence += 0.1;
    }

    // Penalize if very few text lines extracted
    if (extractedText.length < 2) {
      adjustedConfidence *= 0.8;
    }

    // Boost confidence for longer extracted text (more data)
    if (extractedText.length > 5) {
      adjustedConfidence += 0.05;
    }

    // Check for common OCR errors
    const hasLikelyErrors = extractedText.some(line => 
      line.includes('|||') || // Multiple pipes
      line.includes('...') || // Dots
      /\d{10,}/.test(line)    // Very long numbers
    );

    if (hasLikelyErrors) {
      adjustedConfidence *= 0.9;
    }

    return Math.max(0, Math.min(1, adjustedConfidence));
  }

  private extractGameSpecificData(text: string, gameType: string): any {
    const data: any = {};

    switch (gameType) {
      case 'onepiece':
        // Extract power, cost, life, etc.
        const powerMatch = text.match(/(\d{4,5})\s*(?:power|Power)/i);
        if (powerMatch) data.power = parseInt(powerMatch[1]);

        const costMatch = text.match(/cost\s*(\d+)/i);
        if (costMatch) data.cost = parseInt(costMatch[1]);

        const lifeMatch = text.match(/life\s*(\d+)/i);
        if (lifeMatch) data.life = parseInt(lifeMatch[1]);

        // Extract attributes
        const attributes = text.match(/\b(Strike|Slash|Ranged|Special)\b/g);
        if (attributes) data.attributes = attributes;

        break;

      case 'pokemon':
        // Extract HP, types, etc.
        const hpMatch = text.match(/HP\s*(\d+)/i);
        if (hpMatch) data.hp = parseInt(hpMatch[1]);

        const typeMatch = text.match(/\b(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Fairy|Dragon|Colorless)\b/g);
        if (typeMatch) data.types = typeMatch;

        break;

      case 'yugioh':
        // Extract ATK, DEF, level, etc.
        const atkMatch = text.match(/ATK[\/\s]*(\d+)/i);
        if (atkMatch) data.attack = parseInt(atkMatch[1]);

        const defMatch = text.match(/DEF[\/\s]*(\d+)/i);
        if (defMatch) data.defense = parseInt(defMatch[1]);

        const levelMatch = text.match(/Level\s*(\d+)/i);
        if (levelMatch) data.level = parseInt(levelMatch[1]);

        break;
    }

    return data;
  }

  /**
   * Get similarity score between recognized text and card name
   */
  calculateNameSimilarity(recognizedName: string, cardName: string): number {
    if (!recognizedName || !cardName) return 0;

    const recognized = recognizedName.toLowerCase().trim();
    const card = cardName.toLowerCase().trim();

    // Exact match
    if (recognized === card) return 1.0;

    // Contains match
    if (card.includes(recognized) || recognized.includes(card)) {
      return 0.8;
    }

    // Levenshtein distance
    const distance = this.levenshteinDistance(recognized, card);
    const maxLength = Math.max(recognized.length, card.length);
    
    if (maxLength === 0) return 0;

    return Math.max(0, 1 - (distance / maxLength));
  }

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
}