import fs from 'fs';
import path from 'path';
// @ts-ignore
import csv from 'csv-parser';

export interface CardDataEntry {
  name: string;
  cleanName: string;
  cardNumber?: string;
  setCode?: string;
  rarity?: string;
  gameType: string;
  // Additional fields from CSV
  [key: string]: any;
}

export interface CardDataCache {
  onepiece: CardDataEntry[];
  pokemon: CardDataEntry[];
  yugioh: CardDataEntry[];
}

class CardDataService {
  private cardCache: CardDataCache = {
    onepiece: [],
    pokemon: [],
    yugioh: []
  };
  
  private cacheLoaded = false;
  private readonly dataPath = path.join(process.cwd(), 'data', 'cards');

  /**
   * Load all card data from CSV files into memory cache
   */
  async loadCardData(): Promise<void> {
    if (this.cacheLoaded) {
      return;
    }

    console.log('🔄 Loading card data from CSV files...');
    const startTime = Date.now();

    try {
      // Load data for each game type
      await Promise.all([
        this.loadGameTypeData('onepiece'),
        this.loadGameTypeData('pokemon'),
        this.loadGameTypeData('yugioh')
      ]);

      const loadTime = Date.now() - startTime;
      const totalCards = this.cardCache.onepiece.length + 
                        this.cardCache.pokemon.length + 
                        this.cardCache.yugioh.length;

      console.log(`✅ Card data loaded: ${totalCards} cards in ${loadTime}ms`);
      console.log(`   - One Piece: ${this.cardCache.onepiece.length} cards`);
      console.log(`   - Pokemon: ${this.cardCache.pokemon.length} cards`);
      console.log(`   - Yu-Gi-Oh: ${this.cardCache.yugioh.length} cards`);
      
      this.cacheLoaded = true;
    } catch (error) {
      console.error('❌ Failed to load card data:', error);
      throw error;
    }
  }

  /**
   * Load card data for a specific game type
   */
  private async loadGameTypeData(gameType: 'onepiece' | 'pokemon' | 'yugioh'): Promise<void> {
    const gameTypePath = path.join(this.dataPath, gameType);
    
    if (!fs.existsSync(gameTypePath)) {
      console.warn(`⚠️  Directory not found: ${gameTypePath}`);
      return;
    }

    const csvFiles = fs.readdirSync(gameTypePath)
      .filter(file => file.endsWith('.csv'));

    for (const csvFile of csvFiles) {
      const filePath = path.join(gameTypePath, csvFile);
      await this.loadCSVFile(filePath, gameType);
    }
  }

  /**
   * Load and parse a single CSV file
   */
  private async loadCSVFile(filePath: string, gameType: 'onepiece' | 'pokemon' | 'yugioh'): Promise<void> {
    return new Promise((resolve, reject) => {
      const cards: CardDataEntry[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: any) => {
          // Parse CSV row based on common field patterns
          const card = this.parseCSVRow(row, gameType);
          if (card && card.name) {
            cards.push(card);
          }
        })
        .on('end', () => {
          this.cardCache[gameType].push(...cards);
          console.log(`   📄 Loaded ${cards.length} cards from ${path.basename(filePath)}`);
          resolve();
        })
        .on('error', (error: any) => {
          console.error(`❌ Error reading ${filePath}:`, error);
          reject(error);
        });
    });
  }

  /**
   * Parse CSV row into standardized card format
   */
  private parseCSVRow(row: any, gameType: string): CardDataEntry | null {
    try {
      // Common field mappings based on actual CSV structure
      const name = row.name || row.Name || row.CardName || row.card_name || '';
      const cardNumber = row.extNumber || row.Number || row.number || row.CardNumber || row.card_number || '';
      const setCode = row.extSetCode || row.SetCode || row.set_code || row.Set || row.set || '';
      const rarity = row.extRarity || row.Rarity || row.rarity || '';

      if (!name || name.includes('Booster') || name.includes('Box') || name.includes('Pack')) {
        return null; // Skip booster products
      }

      // Clean up card name (remove parenthetical numbering like "(002)")
      const cleanedName = name.replace(/\s*\(\d+\)\s*$/, '').trim();

      return {
        name: cleanedName,
        cleanName: this.cleanCardName(cleanedName),
        cardNumber: cardNumber?.toString().trim() || undefined,
        setCode: setCode?.toString().trim() || undefined,
        rarity: rarity?.toString().trim() || undefined,
        gameType,
        productId: row.productId,
        originalName: name, // Keep original for debugging
        ...row // Include all original fields
      };
    } catch (error) {
      console.warn('Failed to parse CSV row:', error);
      return null;
    }
  }

  /**
   * Clean card name for better matching
   */
  private cleanCardName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();
  }

  /**
   * Find best card name matches using fuzzy search
   */
  async findBestCardNameMatches(
    ocrText: string, 
    gameType: 'onepiece' | 'pokemon' | 'yugioh',
    limit: number = 10
  ): Promise<CardDataEntry[]> {
    await this.loadCardData();

    const cards = this.cardCache[gameType];
    const cleanOCR = this.cleanCardName(ocrText);
    
    // Score each card based on name similarity
    const scoredCards = cards.map(card => ({
      card,
      score: this.calculateNameSimilarity(cleanOCR, card.cleanName)
    }));

    // Sort by score and return top matches
    return scoredCards
      .filter(item => item.score > 0.3) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.card);
  }

  /**
   * Calculate similarity between two card names
   */
  private calculateNameSimilarity(ocr: string, cardName: string): number {
    // Exact match
    if (ocr === cardName) return 1.0;
    
    // Check if OCR is contained in card name
    if (cardName.includes(ocr)) {
      return 0.8 + (ocr.length / cardName.length) * 0.2;
    }
    
    // Check if card name starts with OCR
    if (cardName.startsWith(ocr)) {
      return 0.7 + (ocr.length / cardName.length) * 0.3;
    }
    
    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(ocr, cardName);
    const maxLength = Math.max(ocr.length, cardName.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity > 0.3 ? similarity : 0;
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
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Search for cards by set code
   */
  async findCardsBySetCode(
    setCode: string,
    gameType: 'onepiece' | 'pokemon' | 'yugioh'
  ): Promise<CardDataEntry[]> {
    await this.loadCardData();
    
    const cards = this.cardCache[gameType];
    return cards.filter(card => 
      card.setCode && card.setCode.toLowerCase().includes(setCode.toLowerCase())
    );
  }

  /**
   * Get all card names for a game type (for AI context)
   */
  async getAllCardNames(gameType: 'onepiece' | 'pokemon' | 'yugioh'): Promise<string[]> {
    await this.loadCardData();
    
    return [...new Set(this.cardCache[gameType].map(card => card.name))];
  }

  /**
   * Get card statistics
   */
  async getCardStats(): Promise<{
    onepiece: number;
    pokemon: number;
    yugioh: number;
    total: number;
  }> {
    await this.loadCardData();
    
    const stats = {
      onepiece: this.cardCache.onepiece.length,
      pokemon: this.cardCache.pokemon.length,
      yugioh: this.cardCache.yugioh.length,
      total: 0
    };
    
    stats.total = stats.onepiece + stats.pokemon + stats.yugioh;
    return stats;
  }
}

export const cardDataService = new CardDataService();