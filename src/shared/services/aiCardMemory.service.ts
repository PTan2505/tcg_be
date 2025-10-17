import { cardDataService } from './cardData.service';

export interface CardMemoryCache {
  onepiece: {
    names: string[];
    cards: Map<string, any[]>; // name -> cards
    setCards: Map<string, any[]>; // setCode -> cards
  };
  pokemon: {
    names: string[];
    cards: Map<string, any[]>;
    setCards: Map<string, any[]>;
  };
  yugioh: {
    names: string[];
    cards: Map<string, any[]>;
    setCards: Map<string, any[]>;
  };
}

class AICardMemoryService {
  private memoryCache: CardMemoryCache | null = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Initialize AI memory with card data - call at app startup
   */
  async initializeAIMemory(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadCardDataIntoMemory();
    return this.loadPromise;
  }

  /**
   * Load all card data into optimized memory structure
   */
  private async _loadCardDataIntoMemory(): Promise<void> {
    console.log('🧠 Initializing AI Card Memory Cache...');
    const startTime = Date.now();

    try {
      // Load raw card data from CSV
      await cardDataService.loadCardData();
      
      // Create optimized memory structure
      this.memoryCache = {
        onepiece: this._buildGameMemoryCache('onepiece'),
        pokemon: this._buildGameMemoryCache('pokemon'),
        yugioh: this._buildGameMemoryCache('yugioh')
      };

      const loadTime = Date.now() - startTime;
      const totalNames = this.memoryCache.onepiece.names.length + 
                        this.memoryCache.pokemon.names.length + 
                        this.memoryCache.yugioh.names.length;

      console.log(`✅ AI Memory Cache loaded: ${totalNames} card names in ${loadTime}ms`);
      console.log(`   - One Piece: ${this.memoryCache.onepiece.names.length} names`);
      console.log(`   - Pokemon: ${this.memoryCache.pokemon.names.length} names`);
      console.log(`   - Yu-Gi-Oh: ${this.memoryCache.yugioh.names.length} names`);
      
      this.isLoaded = true;
    } catch (error) {
      console.error('❌ Failed to initialize AI memory:', error);
      throw error;
    }
  }

  /**
   * Build optimized memory cache for a game type
   */
  private _buildGameMemoryCache(gameType: 'onepiece' | 'pokemon' | 'yugioh'): any {
    const cards = cardDataService['cardCache'][gameType];
    const names: string[] = [];
    const cardMap = new Map<string, any[]>();
    const setCardMap = new Map<string, any[]>();

    cards.forEach(card => {
      // Collect unique names
      if (!names.includes(card.name)) {
        names.push(card.name);
      }

      // Map name -> cards
      if (!cardMap.has(card.name)) {
        cardMap.set(card.name, []);
      }
      cardMap.get(card.name)!.push(card);

      // Map setCode -> cards
      if (card.setCode) {
        if (!setCardMap.has(card.setCode)) {
          setCardMap.set(card.setCode, []);
        }
        setCardMap.get(card.setCode)!.push(card);
      }
    });

    return {
      names: names.sort(),
      cards: cardMap,
      setCards: setCardMap
    };
  }

  /**
   * Smart OCR correction using pre-loaded memory
   */
  async correctOCRWithMemory(
    ocrText: string,
    gameType: 'onepiece' | 'pokemon' | 'yugioh',
    detectedSetCodes?: string[]
  ): Promise<{
    correctedName: string;
    confidence: number;
    matches: any[];
    reasoning: string;
  }> {
    await this.ensureLoaded();

    if (!this.memoryCache) {
      const { getMessage } = require('../constants/messages');
      const AppError = require('../errors/AppError').default;
      throw new AppError(getMessage('AI.MEMORY_NOT_INITIALIZED'), 500);
    }

    const gameMemory = this.memoryCache[gameType];
    
    // Step 1: Fast fuzzy matching against names in memory
    const nameMatches = this._findFuzzyMatches(ocrText, gameMemory.names);
    
    // Step 2: If we have set codes, prioritize cards from those sets
    let setFilteredMatches: any[] = [];
    if (detectedSetCodes && detectedSetCodes.length > 0) {
      detectedSetCodes.forEach(setCode => {
        const setCards = gameMemory.setCards.get(setCode);
        if (setCards) {
          setFilteredMatches.push(...setCards);
        }
      });
    }

    // Step 3: Combine and score results
    const bestMatch = this._scoreCombinedMatches(
      ocrText,
      nameMatches,
      setFilteredMatches,
      detectedSetCodes
    );

    return bestMatch;
  }

  /**
   * Fast fuzzy matching against names in memory
   */
  private _findFuzzyMatches(ocrText: string, names: string[]): Array<{name: string, score: number}> {
    const cleanOCR = ocrText.toLowerCase().trim();
    const matches: Array<{name: string, score: number}> = [];

    names.forEach(name => {
      const cleanName = name.toLowerCase();
      let score = 0;

      // Exact match
      if (cleanOCR === cleanName) {
        score = 1.0;
      }
      // Partial name detection - if OCR is start of a longer name
      else if (cleanOCR.length >= 3 && cleanName.startsWith(cleanOCR)) {
        // "Mega" matches "Mega Lucario ex", "Mega Charizard", etc.
        score = 0.85 + (cleanOCR.length / cleanName.length * 0.15); // 85-100% confidence
      }
      // Reverse partial - if longer name starts with OCR
      else if (cleanName.length >= 3 && cleanOCR.startsWith(cleanName)) {
        score = 0.8;
      }
      // Contains match
      else if (cleanName.includes(cleanOCR) || cleanOCR.includes(cleanName)) {
        score = 0.75;
      }
      // Levenshtein distance for similar names
      else {
        const distance = this._levenshteinDistance(cleanOCR, cleanName);
        const maxLen = Math.max(cleanOCR.length, cleanName.length);
        score = 1 - (distance / maxLen);
        
        // Only include if score is reasonable
        if (score < 0.6) return;
      }

      if (score > 0) {
        matches.push({ name, score });
      }
    });

    // Sort by score descending and return top matches
    return matches.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  /**
   * Score and combine name matches with set-filtered matches
   */
  private _scoreCombinedMatches(
    ocrText: string,
    nameMatches: Array<{name: string, score: number}>,
    setFilteredMatches: any[],
    detectedSetCodes?: string[]
  ): any {
    if (nameMatches.length === 0) {
      return {
        correctedName: ocrText,
        confidence: 0,
        matches: [],
        reasoning: 'No matches found in memory cache'
      };
    }

    let bestNameMatch = nameMatches[0];
    let confidence = bestNameMatch.score * 100;
    let reasoning = `Best fuzzy match: "${bestNameMatch.name}" (${Math.round(confidence)}%)`;

    // Special handling for set code context
    if (setFilteredMatches.length > 0 && detectedSetCodes) {
      // Look for matches that exist in both name matches and set matches
      const contextMatch = nameMatches.find(nameMatch =>
        setFilteredMatches.some(setCard =>
          setCard.name.toLowerCase() === nameMatch.name.toLowerCase()
        )
      );

      if (contextMatch) {
        bestNameMatch = contextMatch;
        confidence = Math.min(95, contextMatch.score * 100 + 15); // Boost confidence for set context
        reasoning = `Set-context match: "${contextMatch.name}" in set(s) [${detectedSetCodes.join(', ')}] (${Math.round(confidence)}%)`;
        
        // Special boost for MEG set with Mega Pokemon
        if (detectedSetCodes.some(code => code.toUpperCase().includes('MEG')) && 
            contextMatch.name.toLowerCase().startsWith('mega')) {
          confidence = Math.min(98, confidence + 15); // Extra boost for Mega Evolution context
          reasoning += ` + Mega Evolution set bonus`;
        }
        
        // Boost for Pokemon with 'ex' suffix when in appropriate sets
        if (detectedSetCodes.some(code => ['MEG', 'EX'].includes(code.toUpperCase())) && 
            contextMatch.name.toLowerCase().includes(' ex')) {
          confidence = Math.min(97, confidence + 8);
          reasoning += ` + EX card bonus`;
        }
      } else {
        // No direct match but boost confidence for having set context
        confidence = Math.min(90, confidence + 5);
        reasoning += ` + Set context available`;
      }
    }

    return {
      correctedName: bestNameMatch.name,
      confidence: Math.round(confidence),
      matches: nameMatches.slice(0, 5),
      reasoning
    };
  }

  /**
   * Get card suggestions for AI context (limited to reduce tokens)
   */
  async getCardContextForAI(
    gameType: 'onepiece' | 'pokemon' | 'yugioh',
    limit: number = 50
  ): Promise<string[]> {
    await this.ensureLoaded();
    
    if (!this.memoryCache) {
      return [];
    }

    // Return popular/common card names (first N names alphabetically)
    return this.memoryCache[gameType].names.slice(0, limit);
  }

  /**
   * Simple Levenshtein distance calculation
   */
  private _levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Ensure memory is loaded
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.initializeAIMemory();
    }
  }

  /**
   * Get memory cache statistics
   */
  getMemoryStats(): any {
    if (!this.memoryCache) {
      return { loaded: false };
    }

    return {
      loaded: true,
      onepiece: {
        names: this.memoryCache.onepiece.names.length,
        cards: this.memoryCache.onepiece.cards.size,
        sets: this.memoryCache.onepiece.setCards.size
      },
      pokemon: {
        names: this.memoryCache.pokemon.names.length,
        cards: this.memoryCache.pokemon.cards.size,
        sets: this.memoryCache.pokemon.setCards.size
      },
      yugioh: {
        names: this.memoryCache.yugioh.names.length,
        cards: this.memoryCache.yugioh.cards.size,
        sets: this.memoryCache.yugioh.setCards.size
      }
    };
  }
}

export const aiCardMemoryService = new AICardMemoryService();