import { readFile } from 'fs/promises';
import { join } from 'path';

const logger = {
  error: (...args: any[]) => console.error('[SET_CODE]', ...args),
  info: (...args: any[]) => console.log('[SET_CODE]', ...args),
  warn: (...args: any[]) => console.warn('[SET_CODE]', ...args)
};

export interface SetCodeMatch {
  setCode: string;
  setName: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  groupId: string;
  gameType: 'pokemon' | 'yugioh' | 'onepiece';
}

export interface SetCodeExtraction {
  extractedCodes: string[];
  confidence: number;
  position: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'unknown';
}

export class SetCodeRecognitionService {
  private setCodeDatabase: Map<string, any> = new Map();
  private setCodeAliases: Map<string, string> = new Map();
  private initialized = false;

  /**
   * Initialize set code database from CSV files
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('🔧 Initializing Set Code Recognition Service...');

      // Load Pokemon sets
      const pokemonSets = await this.loadSetCodesFromCSV('pokemon', 'data/sets/PokemonGroups.csv');
      logger.info(`📦 Loaded ${pokemonSets.length} Pokemon sets`);

      // Load Yu-Gi-Oh sets
      const yugiohSets = await this.loadSetCodesFromCSV('yugioh', 'data/sets/YuGiOhGroups.csv');
      logger.info(`📦 Loaded ${yugiohSets.length} Yu-Gi-Oh sets`);

      // Load One Piece sets
      const onepieceSets = await this.loadSetCodesFromCSV('onepiece', 'data/sets/OnePieceCardGameGroups.csv');
      logger.info(`📦 Loaded ${onepieceSets.length} One Piece sets`);

      // Create aliases for flexible matching
      this.createSetCodeAliases();

      this.initialized = true;
      logger.info('✅ Set Code Recognition Service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Set Code Recognition Service:', error);
    }
  }

  /**
   * Load set codes from CSV file
   */
  private async loadSetCodesFromCSV(gameType: string, filePath: string): Promise<any[]> {
    try {
      const fullPath = join(process.cwd(), filePath);
      const csvContent = await readFile(fullPath, 'utf-8');
      const lines = csvContent.split('\n').slice(1); // Skip header

      const sets: any[] = [];

      for (const line of lines) {
        if (line.trim()) {
          const [groupId, name, abbreviation, isSupplemental, publishedOn, modifiedOn, categoryId] = line.split(',');
          
          if (abbreviation && abbreviation !== 'undefined') {
            const setData = {
              groupId: groupId?.trim(),
              name: name?.trim(),
              abbreviation: abbreviation?.trim(),
              gameType,
              isSupplemental: isSupplemental === 'True',
              publishedOn: publishedOn?.trim(),
              categoryId: categoryId?.trim()
            };

            sets.push(setData);
            
            // Store in database with multiple key formats
            const cleanAbbr = abbreviation.trim().replace(/"/g, '');
            this.setCodeDatabase.set(`${gameType}:${cleanAbbr.toLowerCase()}`, setData);
            this.setCodeDatabase.set(`${gameType}:${cleanAbbr.toUpperCase()}`, setData);
            
            // Store original case
            this.setCodeDatabase.set(`${gameType}:${cleanAbbr}`, setData);
          }
        }
      }

      return sets;

    } catch (error) {
      logger.error(`Failed to load ${gameType} sets from ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Create aliases for flexible set code matching
   */
  private createSetCodeAliases(): void {
    logger.info('🔗 Creating set code aliases...');

    // One Piece aliases - handle OP01 vs OP-01 variations
    for (const [key, setData] of this.setCodeDatabase) {
      if (setData.gameType === 'onepiece') {
        const abbr = setData.abbreviation;
        
        // Create variations: OP01 <-> OP-01, ST-01 <-> ST01, etc.
        if (abbr.includes('-')) {
          const withoutDash = abbr.replace('-', '');
          this.setCodeAliases.set(`onepiece:${withoutDash.toLowerCase()}`, key);
          this.setCodeAliases.set(`onepiece:${withoutDash.toUpperCase()}`, key);
        } else {
          // Add dash variations for codes that might have dashes
          if (/^[A-Z]{2,3}\d+/.test(abbr)) {
            const match = abbr.match(/^([A-Z]{2,3})(\d+.*)$/);
            if (match) {
              const withDash = `${match[1]}-${match[2]}`;
              this.setCodeAliases.set(`onepiece:${withDash.toLowerCase()}`, key);
              this.setCodeAliases.set(`onepiece:${withDash.toUpperCase()}`, key);
            }
          }
        }
      }
    }

    // Yu-Gi-Oh aliases - handle various formats
    for (const [key, setData] of this.setCodeDatabase) {
      if (setData.gameType === 'yugioh') {
        const abbr = setData.abbreviation;
        
        // Create variations for common patterns
        // LOB vs LOB-EN vs LOB-005, etc.
        this.setCodeAliases.set(`yugioh:${abbr.toLowerCase()}`, key);
        this.setCodeAliases.set(`yugioh:${abbr.toUpperCase()}`, key);
        
        // Handle hyphenated versions
        if (!abbr.includes('-')) {
          this.setCodeAliases.set(`yugioh:${abbr.toLowerCase()}-`, key);
          this.setCodeAliases.set(`yugioh:${abbr.toUpperCase()}-`, key);
        }
      }
    }

    // Pokemon aliases - handle SV10 variations
    for (const [key, setData] of this.setCodeDatabase) {
      if (setData.gameType === 'pokemon') {
        const abbr = setData.abbreviation;
        
        // Handle different formats like SV10, SV-10, etc.
        this.setCodeAliases.set(`pokemon:${abbr.toLowerCase()}`, key);
        this.setCodeAliases.set(`pokemon:${abbr.toUpperCase()}`, key);
        
        // Special handling for SV series
        if (abbr.startsWith('SV') && /\d/.test(abbr)) {
          const withDash = abbr.replace(/^(SV)(\d)/, '$1-$2');
          this.setCodeAliases.set(`pokemon:${withDash.toLowerCase()}`, key);
          this.setCodeAliases.set(`pokemon:${withDash.toUpperCase()}`, key);
        }
      }
    }

    logger.info(`🔗 Created ${this.setCodeAliases.size} set code aliases`);
  }

  /**
   * Extract set codes from OCR text
   */
  async extractSetCodes(
    ocrText: string,
    gameType: 'pokemon' | 'yugioh' | 'onepiece',
    fullOcrData?: any
  ): Promise<SetCodeExtraction> {
    await this.initialize();

    try {
      logger.info(`🔍 Extracting set codes for ${gameType} from: "${ocrText}"`);

      const extractedCodes: string[] = [];
      let confidence = 0;
      let position: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'unknown' = 'unknown';

      // Game-specific extraction patterns
      switch (gameType) {
        case 'onepiece':
          const opCodes = this.extractOnePieceSetCodes(ocrText);
          extractedCodes.push(...opCodes);
          confidence = opCodes.length > 0 ? 0.9 : 0;
          position = 'bottom-right';
          break;

        case 'yugioh':
          const ygoCodes = this.extractYugiohSetCodes(ocrText);
          extractedCodes.push(...ygoCodes);
          confidence = ygoCodes.length > 0 ? 0.85 : 0;
          position = 'bottom-right';
          break;

        case 'pokemon':
          const pkmnCodes = this.extractPokemonSetCodes(ocrText);
          extractedCodes.push(...pkmnCodes);
          confidence = pkmnCodes.length > 0 ? 0.8 : 0;
          position = 'bottom-center';
          break;
      }

      logger.info(`🎯 Extracted ${extractedCodes.length} set codes: ${extractedCodes.join(', ')}`);

      return {
        extractedCodes: [...new Set(extractedCodes)], // Remove duplicates
        confidence,
        position
      };

    } catch (error) {
      logger.error('Set code extraction failed:', error);
      return {
        extractedCodes: [],
        confidence: 0,
        position: 'unknown'
      };
    }
  }

  /**
   * Extract One Piece set codes (OP01-002, ST-01, etc.)
   */
  /**
   * Fix common OCR misreads for card scanning
   */
  private correctOCRErrors(text: string): string {
    // Common OCR character substitutions
    const corrections = {
      // I/1/l confusion
      'BIT': 'BPT',      // BIT-007 → BPT-007  
      'BlT': 'BPT',      // lowercase l
      'B1T': 'BPT',      // number 1
      'BLT': 'BPT',      // L instead of P
      
      // Common Yu-Gi-Oh set code OCR mistakes
      'LOB': 'LOB',  // Legend of Blue Eyes
      'L0B': 'LOB',
      'LO8': 'LOB',
      'MRD': 'MRD',  // Metal Raiders
      'MR0': 'MRD',
      'SDK': 'SDK',  // Starter Deck: Kaiba
      'SOK': 'SDK',
      'S0K': 'SDK'
    };

    let correctedText = text.toUpperCase();
    
    // Apply corrections
    for (const [wrong, correct] of Object.entries(corrections)) {
      const regex = new RegExp(wrong, 'gi');
      correctedText = correctedText.replace(regex, correct);
    }
    
    // Additional pattern-based corrections
    correctedText = correctedText
      // Fix O/0 in card numbers: -OO7 → -007, -O07 → -007  
      .replace(/-OO(\d)/g, '-00$1')  // -OO7 → -007
      .replace(/-O(\d{2})/g, '-0$1')  // -O07 → -007
      .replace(/-(\d)O(\d)/g, '-$10$2')  // -1O1 → -101
      // Fix I/1 in set codes
      .replace(/\b([A-Z]{2})I(\w*)/g, '$1P$2');  // Generic 3rd letter I → P pattern
    
    return correctedText;
  }

  /**
   * Generate targeted OCR character variations for set code patterns
   */
  private generateOCRVariations(text: string): string[] {
    // Focus on most common OCR confusions for card set codes
    const corrections = [
      // Primary O/0 confusion (most common)
      { from: 'O', to: '0' },
      { from: '0', to: 'O' },
      
      // I/P confusion (critical for BIT→BPT)
      { from: 'I', to: 'P' },
      { from: 'P', to: 'I' },
      
      // I/1 confusion (common in set codes)
      { from: 'I', to: '1' },
      { from: '1', to: 'I' },
      
      // B/P confusion (less common but possible)
      { from: 'B', to: 'P' },
      { from: 'P', to: 'B' },
      
      // S/5 confusion
      { from: 'S', to: '5' },
      { from: '5', to: 'S' }
    ];

    const variations = new Set([text.toUpperCase()]);
    
    // Apply targeted corrections sequentially for better coverage
    for (const { from, to } of corrections) {
      const current = Array.from(variations);
      for (const variant of current) {
        // Only apply if character exists in text
        if (variant.includes(from)) {
          // Replace all occurrences
          const allReplace = variant.replace(new RegExp(from, 'g'), to);
          variations.add(allReplace);
        }
      }
    }

    return Array.from(variations).slice(0, 30); // Allow more variations for better coverage
  }

  /**
   * Extract One Piece set codes with comprehensive OCR error handling
   */
  private extractOnePieceSetCodes(text: string): string[] {
    const codes: string[] = [];
    
    // Generate all possible OCR variations of the input text
    const textVariations = this.generateOCRVariations(text);
    
    // Patterns for One Piece cards - enhanced to handle more variations
    const opPatterns = [
      // Full card codes: OP01-002, 0P01-002, OPO1-OO2 (handle O/0 variations)
      /\b([O0]P[O0]\d{1})-[O0]\d{2,3}\b/gi,
      /\b([O0]P\d{2})-[O0]\d{2,3}\b/gi,
      /\b(ST\d{2})-[O0]\d{2,3}\b/gi,
      /\b(ST-\d{2})-[O0]\d{2,3}\b/gi,
      /\b(PRB\d{2})-[O0]\d{2,3}\b/gi,
      /\b(EB[O0]?\d{1,2})-[O0][A-Z]\d{1,2}\b/gi, // EBO1-OS6, EB01-OS6
      /\b(EBO\d{1})-[O0][A-Z]\d{1,2}\b/gi, // Specific for EBO1-OS6 pattern
      
      // Set codes only: OP01, 0P01, OPO1 (handle O/0 at start and middle)
      /\b([O0]P[O0]?\d{1,2})(?=\s|$|-)/gi,
      /\b(ST-?\d{2})(?=\s|$|-)/gi,
      /\b(PRB\d{2})(?=\s|$|-)/gi,
      /\b(EB[O0]?\d{1,2})(?=\s|$|-)/gi,
      /\b(EBO\d{1})(?=\s|$|-)/gi, // EBO1 pattern
      
      // Handle underscore variants: OP01_002, EBO1_OS6
      /\b([O0]P\d{2})_[O0]\d{2,3}\b/gi,
      /\b(ST\d{2})_[O0]\d{2,3}\b/gi,
      /\b(EBO\d{1})_[O0][A-Z]\d{1,2}\b/gi
    ];

    // Try each variation of the text
    for (const variation of textVariations) {
      for (const pattern of opPatterns) {
        const matches = variation.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Extract just the set part (before card number or separator)
            let setCode = match.replace(/[-_]\d{3,4}$/, '').trim().toUpperCase();
            
            // Normalize O/0 confusion: 0P01 → OP01
            setCode = setCode.replace(/^0P/, 'OP');
            
            if (setCode.length >= 3 && setCode.length <= 5) {
              codes.push(setCode);
            }
          }
        }
      }
    }

    return [...new Set(codes)]; // Remove duplicates
  }

  /**
   * Extract Yu-Gi-Oh set codes with comprehensive OCR error handling
   */
  private extractYugiohSetCodes(text: string): string[] {
    const codes: string[] = [];

    // Generate all possible OCR variations of the input text
    const textVariations = this.generateOCRVariations(text);

    // Enhanced patterns for Yu-Gi-Oh codes
    const ygoPatterns = [
      // Collector's Tins: CT03-EN001, CTO3-ENOO1 (handle O/0 confusion more aggressively)
      /\b(CT[O0]?\d{1,2})-[A-Z]*[O0]*\d+\b/gi,
      
      // More flexible patterns for CT series
      /\b(CT[O0]?\d{1,2})-[ENG]*[O0N]*\d+\b/gi,
      
      // Standard 3-letter codes: LOB-005, MRD-143
      /\b([A-Z]{3})-[O0]*\d{3}\b/gi,
      
      // 4-letter codes: BEWD-EN001 style, RATE-SE001
      /\b([A-Z]{4})-[A-Z]{2}[O0]*\d{3}\b/gi,
      
      // Known classic sets with numbers: CT03, CT04, CT05, MP17, MP18, etc.
      /\b(LOB|MRD|SDK|PSV|MRL|SRL|PGD|IOC|AST|SOD|RDS|FET|TLM|CRV|EEN|SOI|EOJ|POTD|CDIP|STON|FLOD|GFTP|DUDE|MP\d{2}|MAGO|KICO|BPT|DBT|CT[O0]?\d{1,2}|TP\d|HL\d|CP\d|WC\d|SD\d|DP\d|EP\d|OP\d{2}|RA[O0]\d|TN\d{2})-?[A-Z]*[O0]*\d{1,3}\b/gi,
      
      // Anniversary sets: 20TH-JPC55, 25YC-xxx
      /\b(\d{2}TH-[A-Z]{3}\d{2,3})\b/gi,
      /\b(\d{2}YC-[A-Z]*\d{3})\b/gi,
      
      // Set codes without card numbers (include Collector's Tins)
      /\b(LOB|MRD|SDK|PSV|MRL|SRL|PGD|IOC|AST|SOD|RDS|FET|TLM|CRV|EEN|SOI|EOJ|POTD|CDIP|STON|FLOD|GFTP|DUDE|MAGO|KICO|BPT|CT[O0]?\d{1,2})(?=\s|$|-)/gi
    ];

    // Try each variation of the text
    for (const variation of textVariations) {
      for (const pattern of ygoPatterns) {
        const matches = variation.match(pattern);
        if (matches) {
          for (const match of matches) {
            let setCode = match.split('-')[0].trim().toUpperCase();
            
            // Fix common OCR errors in Yu-Gi-Oh set codes (enhanced)
            setCode = setCode
              .replace(/CTO(\d)/g, 'CT0$1')  // CTO3 → CT03
              .replace(/CT([O0])(\d)/g, 'CT0$2')  // CTO3 → CT03, CT03 → CT03  
              .replace(/([A-Z]{2})[O0](\d)/g, '$10$2')  // Generic XO1 → X01
              .replace(/^[O0]([A-Z])/g, '0$1');  // Leading O → 0
            
            // For anniversary codes, keep the full format
            if (match.includes('TH-') || match.includes('YC-')) {
              setCode = match.toUpperCase();
            }
            
            if (setCode.length >= 3 && setCode.length <= 10) {
              codes.push(setCode);
            }
          }
        }
      }
    }

    return [...new Set(codes)]; // Remove duplicates
  }

  /**
   * Extract Pokemon set codes (SV10, PAR, etc.)
   */
  /**
   * Extract Pokemon set codes with comprehensive OCR error handling
   */
  private extractPokemonSetCodes(text: string): string[] {
    const codes: string[] = [];

    // Generate all possible OCR variations of the input text
    const textVariations = this.generateOCRVariations(text);

    // More precise patterns for Pokemon codes
    const pkmnPatterns = [
      // Scarlet/Violet series: SV1, SV10, SV12
      /\bSV(\d{1,2})\b/gi,
      
      // Sword/Shield series: SWSH1, SWSH12
      /\bSWSH(\d{1,3})\b/gi,
      
      // Known set abbreviations (must be exact matches)
      /\b(PAL|PAR|MEW|OBF|TEF|TWM|SFA|EVO|CRZ|LOR|ASR|BRS|SP|PGO|VIV|CPA|RCL|SSH|DAA|WCS|UNM|LOT|DRM|BCR)(?=\s|$|\d)/gi,
      
      // PROMO cards
      /\bPROMO\b/gi
    ];

    // Try each variation of the text
    for (const variation of textVariations) {
      for (const pattern of pkmnPatterns) {
        const matches = variation.match(pattern);
        if (matches) {
          for (const match of matches) {
            let setCode = match.trim().toUpperCase();
            
            // Handle SV series - keep SV + number format
            if (setCode.match(/^SV\d+$/)) {
              codes.push(setCode);
            }
            // Handle SWSH series
            else if (setCode.match(/^SWSH\d+$/)) {
              codes.push(setCode);
            }
            // Handle other known abbreviations
            else if (setCode.length >= 2 && setCode.length <= 5) {
              codes.push(setCode);
            }
          }
        }
      }
    }

    return [...new Set(codes)]; // Remove duplicates
  }

  /**
   * Match extracted set codes with database
   */
  async matchSetCodes(
    extractedCodes: string[],
    gameType: 'pokemon' | 'yugioh' | 'onepiece'
  ): Promise<SetCodeMatch[]> {
    await this.initialize();

    const matches: SetCodeMatch[] = [];

    for (const code of extractedCodes) {
      // Try exact match first
      const exactKey = `${gameType}:${code}`;
      if (this.setCodeDatabase.has(exactKey)) {
        const setData = this.setCodeDatabase.get(exactKey);
        matches.push({
          setCode: setData.abbreviation,
          setName: setData.name,
          confidence: 0.95,
          matchType: 'exact',
          groupId: setData.groupId,
          gameType: setData.gameType
        });
        continue;
      }

      // Try case-insensitive match
      const lowerKey = `${gameType}:${code.toLowerCase()}`;
      const upperKey = `${gameType}:${code.toUpperCase()}`;
      
      if (this.setCodeDatabase.has(lowerKey)) {
        const setData = this.setCodeDatabase.get(lowerKey);
        matches.push({
          setCode: setData.abbreviation,
          setName: setData.name,
          confidence: 0.9,
          matchType: 'exact',
          groupId: setData.groupId,
          gameType: setData.gameType
        });
        continue;
      }

      if (this.setCodeDatabase.has(upperKey)) {
        const setData = this.setCodeDatabase.get(upperKey);
        matches.push({
          setCode: setData.abbreviation,
          setName: setData.name,
          confidence: 0.9,
          matchType: 'exact',
          groupId: setData.groupId,
          gameType: setData.gameType
        });
        continue;
      }

      // Try alias match
      if (this.setCodeAliases.has(lowerKey)) {
        const aliasKey = this.setCodeAliases.get(lowerKey);
        const setData = this.setCodeDatabase.get(aliasKey!);
        matches.push({
          setCode: setData.abbreviation,
          setName: setData.name,
          confidence: 0.85,
          matchType: 'partial',
          groupId: setData.groupId,
          gameType: setData.gameType
        });
        continue;
      }

      // Try fuzzy match for partial codes
      const fuzzyMatch = this.findFuzzySetMatch(code, gameType);
      if (fuzzyMatch) {
        matches.push({
          setCode: fuzzyMatch.abbreviation,
          setName: fuzzyMatch.name,
          confidence: 0.7,
          matchType: 'fuzzy',
          groupId: fuzzyMatch.groupId,
          gameType: fuzzyMatch.gameType
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    logger.info(`🎯 Found ${matches.length} set code matches`);
    if (matches.length > 0) {
      const topMatch = matches[0];
      logger.info(`   Top match: ${topMatch.setCode} - ${topMatch.setName} (${(topMatch.confidence * 100).toFixed(1)}%)`);
    }

    return matches;
  }

  /**
   * Find fuzzy match for set codes
   */
  private findFuzzySetMatch(code: string, gameType: string): any | null {
    let bestMatch: any = null;
    let bestScore = 0;

    for (const [key, setData] of this.setCodeDatabase) {
      if (setData.gameType === gameType) {
        const similarity = this.calculateStringSimilarity(code.toLowerCase(), setData.abbreviation.toLowerCase());
        
        if (similarity > 0.6 && similarity > bestScore) {
          bestScore = similarity;
          bestMatch = setData;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
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

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Get all available set codes for a game type
   */
  async getAvailableSetCodes(gameType: 'pokemon' | 'yugioh' | 'onepiece'): Promise<string[]> {
    await this.initialize();

    const setCodes: string[] = [];
    for (const [key, setData] of this.setCodeDatabase) {
      if (setData.gameType === gameType) {
        setCodes.push(setData.abbreviation);
      }
    }

    return [...new Set(setCodes)].sort();
  }

  /**
   * Extract set codes from card name/set name (used for filtering candidates)
   */
  extractSetCodeFromCardName(setName: string): string[] {
    if (!setName) return [];
    
    // Try to extract codes from set name using all game patterns
    const onePieceCodes = this.extractOnePieceSetCodes(setName);
    const yugiohCodes = this.extractYugiohSetCodes(setName);
    const pokemonCodes = this.extractPokemonSetCodes(setName);
    
    return [...new Set([...onePieceCodes, ...yugiohCodes, ...pokemonCodes])];
  }

  /**
   * Compare two set codes for similarity
   */
  compareSetCodes(code1: string, code2: string): boolean {
    if (!code1 || !code2) return false;
    
    // Normalize codes by removing hyphens, underscores, and spaces
    const normalize = (code: string) => code.replace(/[-_\s]/g, '').toUpperCase();
    
    const norm1 = normalize(code1);
    const norm2 = normalize(code2);
    
    // Exact match
    if (norm1 === norm2) return true;
    
    // For Pokemon SV series: SV1 should match SV1 but not SV10
    if (norm1.startsWith('SV') && norm2.startsWith('SV')) {
      return norm1 === norm2;
    }
    
    // For One Piece: OP01 should match OP01-002
    if ((norm1.startsWith('OP') || norm1.startsWith('ST')) && 
        (norm2.startsWith('OP') || norm2.startsWith('ST'))) {
      // Extract set prefix (OP01, ST01, etc.)
      const getSetPrefix = (code: string) => {
        const match = code.match(/^(OP|ST|PRB|EB)\d{2}/);
        return match ? match[0] : code;
      };
      return getSetPrefix(norm1) === getSetPrefix(norm2);
    }
    
    // For Yu-Gi-Oh: LOB should match LOB-005
    if (norm1.length >= 3 && norm2.length >= 3) {
      const prefix1 = norm1.substring(0, 3);
      const prefix2 = norm2.substring(0, 3);
      if (prefix1 === prefix2) return true;
    }
    
    // Partial match for longer codes (minimum 4 characters)
    if (norm1.length >= 4 && norm2.length >= 4) {
      return norm1.includes(norm2) || norm2.includes(norm1);
    }
    
    return false;
  }

  /**
   * Test set code recognition with sample data
   */
  async testSetCodeRecognition(): Promise<void> {
    await this.initialize();

    const testCases = [
      { text: 'OP01-002', gameType: 'onepiece' as const, expected: 'OP01' },
      { text: 'LOB-005', gameType: 'yugioh' as const, expected: 'LOB' },
      { text: 'SV10', gameType: 'pokemon' as const, expected: 'SV10' },
      { text: 'Mewtwo OP-01-025', gameType: 'onepiece' as const, expected: 'OP-01' },
      { text: 'Dark Magician SDY-006', gameType: 'yugioh' as const, expected: 'SDY' },
    ];

    logger.info('🧪 Testing Set Code Recognition...');

    for (const testCase of testCases) {
      const extraction = await this.extractSetCodes(testCase.text, testCase.gameType);
      const matches = await this.matchSetCodes(extraction.extractedCodes, testCase.gameType);
      
      logger.info(`\n📝 Test: "${testCase.text}" (${testCase.gameType})`);
      logger.info(`   Extracted: ${extraction.extractedCodes.join(', ')}`);
      logger.info(`   Expected: ${testCase.expected}`);
      
      if (matches.length > 0) {
        logger.info(`   ✅ Found: ${matches[0].setCode} - ${matches[0].setName} (${(matches[0].confidence * 100).toFixed(1)}%)`);
      } else {
        logger.info(`   ❌ No matches found`);
      }
    }
  }
}

export const setCodeRecognition = new SetCodeRecognitionService();