/**
 * Smart Card Search Service
 * Finds best matching cards using multiple search strategies
 */

import Fuse from 'fuse.js';
import { Card } from '../../database/models/card';

const logger = {
  error: (...args: any[]) => console.error('[SEARCH]', ...args),
  info: (...args: any[]) => console.log('[SEARCH]', ...args),
  warn: (...args: any[]) => console.warn('[SEARCH]', ...args)
};

export interface CardMatch {
  card: any;
  confidence: number;
  matchReason: string;
  score: number;
  matchedFields: string[];
}

export interface SearchResult {
  matches: CardMatch[];
  searchStrategy: string;
  totalCandidates: number;
  processingTime: number;
}

export class SmartCardSearchService {
  private fuseInstances: Map<string, Fuse<any>> = new Map();

  constructor() {
    // Initialize Fuse.js instances for each game type
    this.initializeFuseInstances();
  }

  /**
   * Find best matching cards using extracted text data
   */
  async findBestMatches(
    gameType: 'pokemon' | 'yugioh' | 'onepiece',
    extractedText: any,
    limit: number = 20  // Increased default limit for more candidates
  ): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 Searching for ${gameType} card: "${extractedText.cardName}"`);

      // Get all cards for the game type
      const allCards = await Card.find({ gameType }).lean();
      
      if (allCards.length === 0) {
        return {
          matches: [],
          searchStrategy: 'no_cards_found',
          totalCandidates: 0,
          processingTime: Date.now() - startTime
        };
      }

      // Try multiple search strategies
      const strategies = [
        () => this.exactNameMatch(allCards, extractedText.cardName),
        () => this.fuzzyNameMatch(allCards, extractedText.cardName, gameType),
        () => this.statBasedMatch(allCards, extractedText.primaryStats, gameType),
        () => this.combinedTextMatch(allCards, extractedText.allText, gameType),
        () => this.partialNameMatch(allCards, extractedText.cardName)
      ];

      let bestMatches: CardMatch[] = [];
      let usedStrategy = '';

      // Try each strategy until we get good results
      for (const [index, strategy] of strategies.entries()) {
        const matches = strategy();
        
        if (matches.length > 0 && matches[0].confidence > 70) {
          bestMatches = matches.slice(0, limit);
          usedStrategy = this.getStrategyName(index);
          break;
        }
        
        // Keep the best results so far
        if (matches.length > 0 && bestMatches.length === 0) {
          bestMatches = matches.slice(0, limit);
          usedStrategy = this.getStrategyName(index);
        }
      }

      // If still no good matches, try broader search
      if (bestMatches.length === 0 || bestMatches[0].confidence < 50) {
        bestMatches = this.broadTextSearch(allCards, extractedText.allText).slice(0, limit);
        usedStrategy = 'broad_text_search';
      }

      const processingTime = Date.now() - startTime;
      logger.info(`🔍 Search complete: ${bestMatches.length} matches found in ${processingTime}ms`);

      return {
        matches: bestMatches,
        searchStrategy: usedStrategy,
        totalCandidates: allCards.length,
        processingTime
      };

    } catch (error) {
      logger.error('Error in card search:', error);
      throw error;
    }
  }

  /**
   * Strategy 1: Exact name matching
   */
  private exactNameMatch(cards: any[], cardName: string): CardMatch[] {
    if (!cardName || cardName === 'Unknown Card') return [];

    const matches = cards.filter(card => 
      card.name.toLowerCase() === cardName.toLowerCase()
    );

    return matches.map(card => ({
      card,
      confidence: 95,
      matchReason: 'Exact name match',
      score: 95,
      matchedFields: ['name']
    }));
  }

  /**
   * Strategy 2: Fuzzy name matching using Fuse.js
   */
  private fuzzyNameMatch(cards: any[], cardName: string, gameType: string): CardMatch[] {
    if (!cardName || cardName === 'Unknown Card') return [];

    const fuse = this.getFuseInstance(gameType, cards);
    const results = fuse.search(cardName, { limit: 10 });

    return results.map((result: any) => ({
      card: result.item,
      confidence: Math.round((1 - result.score!) * 100),
      matchReason: `Fuzzy name match (${Math.round((1 - result.score!) * 100)}% similarity)`,
      score: Math.round((1 - result.score!) * 100),
      matchedFields: ['name']
    })).filter((match: any) => match.confidence > 60);
  }

  /**
   * Strategy 3: Statistics-based matching
   */
  private statBasedMatch(cards: any[], primaryStats: any, gameType: string): CardMatch[] {
    if (!primaryStats || Object.keys(primaryStats).length === 0) return [];

    const matches: CardMatch[] = [];

    for (const card of cards) {
      let score = 0;
      const matchedFields: string[] = [];

      // Game-specific stat matching
      if (gameType === 'pokemon') {
        if (primaryStats.HP && card.hp && card.hp.toString() === primaryStats.HP) {
          score += 40;
          matchedFields.push('HP');
        }
      } else if (gameType === 'yugioh') {
        if (primaryStats.ATK && card.attack && card.attack.toString() === primaryStats.ATK) {
          score += 30;
          matchedFields.push('ATK');
        }
        if (primaryStats.DEF && card.defense && card.defense.toString() === primaryStats.DEF) {
          score += 30;
          matchedFields.push('DEF');
        }
        if (primaryStats.Level && card.level && card.level.toString() === primaryStats.Level) {
          score += 20;
          matchedFields.push('Level');
        }
      } else if (gameType === 'onepiece') {
        if (primaryStats.Power && card.power && card.power.toString() === primaryStats.Power) {
          score += 40;
          matchedFields.push('Power');
        }
        if (primaryStats.Cost && card.cost && card.cost.toString() === primaryStats.Cost) {
          score += 20;
          matchedFields.push('Cost');
        }
      }

      if (score > 20) {
        matches.push({
          card,
          confidence: Math.min(85, score),
          matchReason: `Statistics match: ${matchedFields.join(', ')}`,
          score,
          matchedFields
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Strategy 4: Combined text analysis
   */
  private combinedTextMatch(cards: any[], allText: string, gameType: string): CardMatch[] {
    if (!allText || allText.length < 10) return [];

    const textWords = allText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const matches: CardMatch[] = [];

    for (const card of cards) {
      let score = 0;
      const matchedFields: string[] = [];

      // Check name words
      const nameWords = card.name.toLowerCase().split(/\s+/);
      const nameMatches = nameWords.filter((word: string) => textWords.includes(word));
      if (nameMatches.length > 0) {
        score += nameMatches.length * 15;
        matchedFields.push('name_words');
      }

      // Check description/effect text if available
      if (card.text || card.effect || card.description) {
        const cardText = (card.text || card.effect || card.description).toLowerCase();
        const commonWords = textWords.filter(word => cardText.includes(word));
        if (commonWords.length > 2) {
          score += Math.min(20, commonWords.length * 3);
          matchedFields.push('description');
        }
      }

      // Check set name
      if (card.setName) {
        const setWords = card.setName.toLowerCase().split(/\s+/);
        const setMatches = setWords.filter((word: string) => textWords.includes(word));
        if (setMatches.length > 0) {
          score += setMatches.length * 5;
          matchedFields.push('set_name');
        }
      }

      if (score > 15) {
        matches.push({
          card,
          confidence: Math.min(80, score),
          matchReason: `Text analysis: ${matchedFields.join(', ')}`,
          score,
          matchedFields
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Strategy 5: Partial name matching
   */
  private partialNameMatch(cards: any[], cardName: string): CardMatch[] {
    if (!cardName || cardName === 'Unknown Card') return [];

    const searchTerms = cardName.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const matches: CardMatch[] = [];

    for (const card of cards) {
      const cardNameLower = card.name.toLowerCase();
      let matchedTerms = 0;

      for (const term of searchTerms) {
        if (cardNameLower.includes(term)) {
          matchedTerms++;
        }
      }

      if (matchedTerms > 0) {
        const confidence = Math.round((matchedTerms / searchTerms.length) * 70);
        matches.push({
          card,
          confidence,
          matchReason: `Partial name match (${matchedTerms}/${searchTerms.length} terms)`,
          score: confidence,
          matchedFields: ['partial_name']
        });
      }
    }

    return matches
      .filter(match => match.confidence > 30)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Broad text search (fallback)
   */
  private broadTextSearch(cards: any[], allText: string): CardMatch[] {
    if (!allText) return [];

    const words = allText.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const matches: CardMatch[] = [];

    for (const card of cards) {
      let score = 0;
      const cardText = `${card.name} ${card.setName || ''} ${card.text || ''}`.toLowerCase();

      for (const word of words) {
        if (cardText.includes(word)) {
          score += 1;
        }
      }

      if (score > 0) {
        const confidence = Math.min(60, score * 5);
        matches.push({
          card,
          confidence,
          matchReason: `Broad text search (${score} matching words)`,
          score: confidence,
          matchedFields: ['broad_text']
        });
      }
    }

    return matches
      .filter(match => match.confidence > 20)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Initialize Fuse.js instances for fuzzy searching
   */
  private async initializeFuseInstances() {
    const gameTypes = ['pokemon', 'yugioh', 'onepiece'];
    
    for (const gameType of gameTypes) {
      try {
        const cards = await Card.find({ gameType }).lean();
        const fuse = new Fuse(cards, {
          keys: [
            { name: 'name', weight: 0.8 },
            { name: 'setName', weight: 0.2 }
          ],
          threshold: 0.4,
          includeScore: true
        });
        
        this.fuseInstances.set(gameType, fuse);
        logger.info(`📚 Initialized Fuse.js for ${gameType}: ${cards.length} cards`);
      } catch (error) {
        logger.error(`Failed to initialize Fuse.js for ${gameType}:`, error);
      }
    }
  }

  /**
   * Get or create Fuse.js instance for game type
   */
  private getFuseInstance(gameType: string, cards: any[]): Fuse<any> {
    let fuse = this.fuseInstances.get(gameType);
    
    if (!fuse) {
      fuse = new Fuse(cards, {
        keys: [
          { name: 'name', weight: 0.8 },
          { name: 'setName', weight: 0.2 }
        ],
        threshold: 0.4,
        includeScore: true
      });
      
      this.fuseInstances.set(gameType, fuse);
    }
    
    return fuse;
  }

  /**
   * Get all card variants with the same name for visual matching
   */
  async getAllCardVariants(
    gameType: 'pokemon' | 'yugioh' | 'onepiece',
    cardName: string,
    maxVariants: number = 50
  ): Promise<Array<{ cardId: string; imageUrl: string; name: string; setCode?: string; rarity?: string }>> {
    try {
      logger.info(`🔍 Getting all variants of "${cardName}" for ${gameType}`);

      // Get all cards with exact or similar names
      const cards = await Card.find({
        gameType,
        $or: [
          { name: { $regex: new RegExp(`^${cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { name: { $regex: new RegExp(cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }
        ]
      })
      .select('_id name imageUrl setCode rarity gameType')
      .lean()
      .limit(maxVariants);

      const variants = cards
        .filter(card => card.imageUrl && card.imageUrl.trim() !== '')
        .map(card => ({
          cardId: card._id.toString(),
          imageUrl: card.imageUrl!, // We filtered for non-empty imageUrls above
          name: card.name,
          setCode: card.setCode,
          rarity: card.rarity
        }));

      logger.info(`🔍 Found ${variants.length} variants with images`);
      return variants;

    } catch (error) {
      logger.error('Error getting card variants:', error);
      return [];
    }
  }

  private getStrategyName(index: number): string {
    const names = [
      'exact_name_match',
      'fuzzy_name_match', 
      'stats_based_match',
      'combined_text_match',
      'partial_name_match'
    ];
    return names[index] || 'unknown_strategy';
  }
}

export const smartCardSearch = new SmartCardSearchService();