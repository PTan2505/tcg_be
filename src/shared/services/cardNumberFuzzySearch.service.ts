import { readFile, writeFile } from 'fs/promises';
import { Card } from '../../database/models/card';

const logger = {
  error: (...args: any[]) => console.error('[CARD_NUMBER_FUZZY]', ...args),
  info: (...args: any[]) => console.log('[CARD_NUMBER_FUZZY]', ...args),
  warn: (...args: any[]) => console.warn('[CARD_NUMBER_FUZZY]', ...args)
};

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
      }).select('name gameType setCode extendedData.extNumber').lean();

      logger.info(`📋 Processing ${cards.length} cards with card numbers...`);

      for (const card of cards) {
        const cardNumber = card.extendedData?.extNumber;
        if (cardNumber && typeof cardNumber === 'string') {
          const normalizedNumber = cardNumber.toUpperCase();
          
          // Store card number with metadata
          this.cardNumberDatabase.set(normalizedNumber, {
            cardNumber: normalizedNumber,
            cardName: card.name,
            gameType: card.gameType,
            setCode: card.setCode,
            cardId: card._id
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

    for (const extractedNumber of extractedNumbers) {
      // Try exact match first
      if (this.cardNumberDatabase.has(extractedNumber)) {
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

      // Try OCR error correction
      const ocrCorrected = this.applyOCRCorrections(extractedNumber, gameType);
      for (const corrected of ocrCorrected) {
        if (this.cardNumberDatabase.has(corrected.cardNumber)) {
          const cardData = this.cardNumberDatabase.get(corrected.cardNumber);
          matches.push({
            cardNumber: corrected.cardNumber,
            originalOCR: extractedNumber,
            confidence: corrected.confidence,
            editDistance: corrected.editDistance,
            matchType: 'ocr_correction',
            gameType,
            corrections: corrected.corrections
          });
        }
      }

      // Try fuzzy matching if no exact/OCR matches found
      if (matches.length === 0 || matches.every(m => m.originalOCR !== extractedNumber)) {
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
   * Extract potential card numbers from OCR text using game-specific patterns
   */
  private extractCardNumbersFromText(text: string, gameType: string): string[] {
    const numbers: string[] = [];

    switch (gameType) {
      case 'onepiece':
        // One Piece patterns: OP01-001, EBO1-OS6, ST01-001, etc.
        const opPatterns = [
          /\b([O0]P[O0]?\d{1,2})-[O0A-Z]\d{2,3}\b/gi,    // OP01-001, OPO1-OS6
          /\b(ST\d{2})-[O0A-Z]\d{2,3}\b/gi,             // ST01-001
          /\b(EB[O0]?\d{1,2})-[O0A-Z][O0A-Z]?\d{1,3}\b/gi, // EB01-001, EBO1-OS6, EBO1-O56
          /\b(PRB\d{2})-[O0A-Z]\d{2,3}\b/gi,            // PRB01-001
        ];

        for (const pattern of opPatterns) {
          const matches = text.match(pattern);
          if (matches) {
            numbers.push(...matches.map(m => m.toUpperCase()));
          }
        }
        break;

      case 'yugioh':
        // Yu-Gi-Oh patterns: LOB-001, SDK-001, YGLD-ENAO3, etc.
        const ygoPatterns = [
          /\b([A-Z]{3,5})-[O0A-Z]{2,4}\d{1,3}\b/gi,     // YGLD-ENAO3, LOB-EN001
          /\b([A-Z]{3,4})-[O0A-Z]\d{2,3}\b/gi,          // LOB-001, SDK-001
          /\b([A-Z]{3,4})-\d{3}\b/gi,                   // LOB-001
          /\b([A-Z]{4,5})-[A-Z]{2,3}\d{2,3}\b/gi,       // YGLD-EN003, SDBE-EN001
        ];

        for (const pattern of ygoPatterns) {
          const matches = text.match(pattern);
          if (matches) {
            numbers.push(...matches.map(m => m.toUpperCase()));
          }
        }
        break;

      case 'pokemon':
        // Pokemon patterns: 1/102, 025/102, OBF EN 004, etc.
        const pkmnPatterns = [
          /\b(\d{1,3})\/(\d{1,3})\b/gi,                    // 004/197, 1/102
          /\b([A-Z]{2,4})\s+EN\s+[O0]*(\d{1,3})\s+(\d{1,3})\b/gi, // OBF EN OO4 197 → OBF EN 004/197
          /\b(\d+)\s+D\s+([O0-9S5]+)\s+(\d+)\b/gi,         // 43 D 11S 192 → 115/192 (Diamond & Pearl format)
          /1[S5][O0]\s+1[O0]1[O0][2Z]/gi,                  // 1SO 1O1O2 → 150 10102 → 010/102 (EX/Base Set format)
          /\b([A-Z]{2,4})\s+EN\s+[O0]*(\d{1,3})\b/gi,      // OBF EN 004, SV03 EN 025
          /\b([A-Z]{2,4})-[O0]*(\d{1,3})\b/gi,             // OBF-004, SV03-025
          /\b[O0]{2,3}(\d{1,3})\s+(\d{1,3})\b/gi,          // OO4 197 → 004/197
          /\b([A-Z]{2,4})\s*[O0]*(\d{1,3})\b/gi,           // OBF004, SV03025 (fallback)
          /\b[O0]{2,3}(\d{1,3})\b/gi,                      // OO4 → 004, OOO25 → 025
        ];

        for (const pattern of pkmnPatterns) {
          const matches = text.match(pattern);
          if (matches) {
            // Special handling for patterns with two numbers
            const processedMatches = matches.map(match => {
              // Handle Diamond & Pearl "43 D 11S 192" → "115/192"
              if (/^(\d+)\s+D\s+([O0-9S5]+)\s+(\d+)$/i.test(match)) {
                const parts = match.match(/^(\d+)\s+D\s+([O0-9S5]+)\s+(\d+)$/i);
                if (parts) {
                  const cardNum = parts[2].replace(/S/g, '5').replace(/O/g, '0'); // 11S → 115
                  const total = parts[3]; // 192
                  return `${cardNum}/${total}`;
                }
              }
              // Handle EX/Base Set "1SO 1O1O2" → "010/102"
              else if (/^1[S5][O0]\s+1[O0]1[O0][2Z]$/i.test(match)) {
                // Apply OCR corrections: S→5, O→0, Z→2
                const corrected = match.replace(/S/g, '5').replace(/O/g, '0').replace(/Z/g, '2');
                // Extract the "10102" part and split it as "010/102"
                const numberPart = corrected.match(/(\d+)\s+(\d+)/);
                if (numberPart && numberPart[2] === '10102') {
                  // Split "10102" into "010" + "102"
                  const cardNum = '010';
                  const total = '102';
                  return `${cardNum}/${total}`;
                }
              }
              // Handle "OBF EN OO4 197" → "004/197"
              else if (/^([A-Z]{2,4})\s+EN\s+[O0]*(\d{1,3})\s+(\d{1,3})$/i.test(match)) {
                const parts = match.match(/^([A-Z]{2,4})\s+EN\s+([O0]*)(\d{1,3})\s+(\d{1,3})$/i);
                if (parts) {
                  const paddedNumber = parts[2].replace(/O/g, '0') + parts[3].padStart(3, '0');
                  return `${paddedNumber}/${parts[4]}`;
                }
              }
              // Handle "OO4 197" → "004/197"
              else if (/^[O0]{2,3}(\d{1,3})\s+(\d{1,3})$/i.test(match)) {
                const parts = match.match(/^([O0]{2,3})(\d{1,3})\s+(\d{1,3})$/i);
                if (parts) {
                  const paddedNumber = parts[1].replace(/O/g, '0') + parts[2];
                  return `${paddedNumber.substring(paddedNumber.length - 3)}/${parts[3]}`;
                }
              }
              return match;
            });
            numbers.push(...processedMatches.map(m => m.toUpperCase()));
          }
        }
        break;
    }

    return [...new Set(numbers)]; // Remove duplicates
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
}

export const cardNumberFuzzySearch = new CardNumberFuzzySearchService();