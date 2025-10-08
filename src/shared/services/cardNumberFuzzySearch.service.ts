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
        // Pokemon patterns: 1/102, 025/102, MEG EN 160 132, etc.
        // Order matters - most specific patterns first!
        const pkmnPatterns = [
          /\b(\d{1,3})\/(\d{1,3})\b/gi,                    // 004/197, 1/102 (exact format)
          /\b([A-Z]{2,4})\s+EN\s+([1O0\d][O0\d]*[O0\d])\s+(\d{1,3})\b/gi, // MEG EN 16O 132 → 160/132
          /\b([A-Z]{2,5})\s+EN\s+([1O0\d][O0\d]*)\s+(\d{1,3})\b/gi, // GOBF EN 1OO 197 → 100/197
          /\b([A-Z]{2,4})\s+EN\s+[O0]*(\d{1,3})\s+(\d{1,3})\b/gi, // OBF EN OO4 197 → 004/197
          /\b(\d+)\s+D\s+([O0-9S5]+)\s+(\d+)\b/gi,         // 43 D 11S 192 → 115/192 (Diamond & Pearl format)
          /1[S5][O0]\s+1[O0]1[O0][2Z]/gi,                  // 1SO 1O1O2 → 150 10102 → 010/102 (EX/Base Set format)
          /\b([A-Z]{2,4})\s+EN\s+[O0]*(\d{1,3})\b/gi,      // OBF EN 004, SV03 EN 025
          /\b([A-Z]{2,4})-[O0]*(\d{1,3})\b/gi,             // OBF-004, SV03-025
          /\b[1O0][O0]{1,2}(\d{1,3})\s+(\d{1,3})\b/gi,     // 1OO 197 → 100/197, OO4 197 → 004/197
          /\b[O0]{2,3}(\d{1,3})\s+(\d{1,3})\b/gi,          // OO4 197 → 004/197
          /\b[O0]{2,3}(\d{1,3})\b/gi,                      // OO4 → 004, OOO25 → 025
          /\b([A-Z]{2,4})\s*[O0]*(\d{1,3})\b/gi,           // OBF004, SV03025 (fallback - last resort)
        ];

        for (const pattern of pkmnPatterns) {
          const matches = text.match(pattern);
          if (matches && matches.length > 0) {
            logger.info(`🔍 Pattern ${pattern} matched: [${matches.join(', ')}]`);
            // Special handling for patterns with two numbers
            const processedMatches = matches.map(match => {
              // Handle "MEG EN 16O 132" → "160/132"
              if (/^([A-Z]{2,4})\s+EN\s+([1O0\d][O0\d]*[O0\d])\s+(\d{1,3})$/i.test(match)) {
                const parts = match.match(/^([A-Z]{2,4})\s+EN\s+([1O0\d][O0\d]*[O0\d])\s+(\d{1,3})$/i);
                if (parts) {
                  // Convert OCR errors: O→0, handle "16O" → "160" 
                  let cardNum = parts[2].replace(/O/g, '0');
                  // Ensure it's 3 digits
                  cardNum = cardNum.padStart(3, '0');
                  logger.info(`🎯 Converted card number: "${parts[2]}" → "${cardNum}"`);
                  return `${cardNum}/${parts[3]}`;
                }
              }
              // Handle "GOBF EN 1OO 197" → "100/197"
              else if (/^([A-Z]{2,5})\s+EN\s+([1O0\d][O0\d]*)\s+(\d{1,3})$/i.test(match)) {
                const parts = match.match(/^([A-Z]{2,5})\s+EN\s+([1O0\d][O0\d]*)\s+(\d{1,3})$/i);
                if (parts) {
                  // Convert OCR errors: O→0, handle "1OO" → "100"
                  let cardNum = parts[2].replace(/O/g, '0');
                  // Ensure 3-digit format
                  cardNum = cardNum.padStart(3, '0');
                  return `${cardNum}/${parts[3]}`;
                }
              }
              // Handle Diamond & Pearl "43 D 11S 192" → "115/192"
              else if (/^(\d+)\s+D\s+([O0-9S5]+)\s+(\d+)$/i.test(match)) {
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
              // Handle "1OO 197" → "100/197" or "OO4 197" → "004/197"
              else if (/^[1O0][O0]{1,2}(\d{1,3})\s+(\d{1,3})$/i.test(match)) {
                const parts = match.match(/^([1O0])([O0]{1,2})(\d{1,3})\s+(\d{1,3})$/i);
                if (parts) {
                  // Convert OCR errors: O→0, handle "1OO" → "100"
                  let cardNum = parts[1].replace(/O/g, '0') + parts[2].replace(/O/g, '0') + parts[3];
                  // Ensure proper padding (e.g., "100" stays "100", "004" becomes "004")
                  cardNum = cardNum.padStart(3, '0');
                  return `${cardNum}/${parts[4]}`;
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
            logger.info(`✅ Successfully extracted: [${processedMatches.join(', ')}]`);
            // Found matches, don't try other patterns for cleaner results
            break;
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
        match.combinedScore = (match.confidence * 0.5) + (nameSimilarity * 50); // 50% card number + 50% name
        match.matchReason = `Card number ${match.cardNumber} + name similarity ${nameSimilarity.toFixed(1)}%`;
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