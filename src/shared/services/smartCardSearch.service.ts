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
        () => this.fuzzyNameMatchWithCache(allCards, extractedText.cardName, gameType),
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
   * Find best matches within a specific set
   * Used when set detection has high confidence
   */
  async findBestMatchesInSet(
    gameType: 'pokemon' | 'yugioh' | 'onepiece',
    extractedText: any,
    setCode: string,
    limit: number = 15
  ): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🎯 Searching for ${gameType} card: "${extractedText.cardName}" in set: ${setCode}`);

      // First, find the CardSet by abbreviation and gameType
      const { CardSet } = await import('../../database/models/cardSet');
      const cardSet = await CardSet.findOne({ 
        abbreviation: setCode,
        gameType: gameType
      }).lean();
      
      if (!cardSet) {
        logger.info(`🎯 CardSet not found for abbreviation: ${setCode} and gameType: ${gameType}`);
        return {
          matches: [],
          searchStrategy: 'set_not_found',
          totalCandidates: 0,
          processingTime: Date.now() - startTime
        };
      }
      
      logger.info(`🎯 Found CardSet: ${cardSet.name} (ID: ${cardSet._id})`);

      // Then find cards in that set
      const setCards = await Card.find({ 
        cardSet: cardSet._id,
        gameType: gameType
      }).lean();
      
      logger.info(`🎯 Found ${setCards.length} cards in set ${setCode} (${cardSet.name})`);
      
      if (setCards.length === 0) {
        return {
          matches: [],
          searchStrategy: 'set_specific_no_cards',
          totalCandidates: 0,
          processingTime: Date.now() - startTime
        };
      }

      // Use same strategies but only on set-specific cards
      logger.info(`🎯 Running search strategies on ${setCards.length} cards from set ${setCode}`);
      const strategies = [
        () => this.exactNameMatch(setCards, extractedText.cardName),
        () => this.fuzzyNameMatch(setCards, extractedText.cardName, gameType),
        () => this.statBasedMatch(setCards, extractedText.primaryStats, gameType),
        () => this.combinedTextMatch(setCards, extractedText.allText, gameType),
        () => this.partialNameMatch(setCards, extractedText.cardName)
      ];

      let bestMatches: CardMatch[] = [];
      let usedStrategy = '';

      // Try each strategy
      for (const [index, strategy] of strategies.entries()) {
        const matches = strategy();
        
        if (matches.length > 0 && matches[0].confidence > 60) { // Lower threshold for set-specific
          bestMatches = matches.slice(0, limit);
          usedStrategy = `set_specific_${this.getStrategyName(index)}`;
          logger.info(`🎯 Strategy ${index + 1} (${this.getStrategyName(index)}) found ${matches.length} matches`);
          if (matches.length > 0) {
            logger.info(`   Top result: ${matches[0].card.name} [ID: ${matches[0].card._id}] (${matches[0].confidence}%)`);
          }
          break;
        }
        
        if (matches.length > 0 && bestMatches.length === 0) {
          bestMatches = matches.slice(0, limit);
          usedStrategy = `set_specific_${this.getStrategyName(index)}`;
        }
      }

      // If still no matches, try broader search within the set
      if (bestMatches.length === 0) {
        bestMatches = this.broadTextSearch(setCards, extractedText.allText).slice(0, limit);
        usedStrategy = 'set_specific_broad_search';
        logger.info(`🎯 Broad search in set found ${bestMatches.length} matches`);
      }

      const processingTime = Date.now() - startTime;
      logger.info(`🎯 Set-specific search complete: ${bestMatches.length} matches found in ${processingTime}ms`);

      // Log top matches for debugging
      if (bestMatches.length > 0) {
        logger.info(`🎯 Top matches in ${setCode}:`);
        bestMatches.slice(0, 3).forEach((match, index) => {
          logger.info(`   ${index + 1}. ${match.card.name} [ID: ${match.card._id}] (${match.confidence}% - ${match.matchReason})`);
        });
      }

      return {
        matches: bestMatches,
        searchStrategy: usedStrategy,
        totalCandidates: setCards.length,
        processingTime
      };

    } catch (error) {
      logger.error('Error in set-specific card search:', error);
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
   * Strategy 2: Fuzzy name matching using Fuse.js (for set-specific search)
   */
  private fuzzyNameMatch(cards: any[], cardName: string, gameType: string): CardMatch[] {
    if (!cardName || cardName === 'Unknown Card') return [];

    logger.info(`🔍 Fuzzy search for "${cardName}" in ${cards.length} set-specific cards`);
    
    // For set-specific search, create new Fuse instance with only set cards
    const fuse = this.createFuseInstance(cards);
    const results = fuse.search(cardName, { limit: 10 });

    const matches = results.map((result: any) => ({
      card: result.item,
      confidence: Math.round((1 - result.score!) * 100),
      matchReason: `Fuzzy name match (${Math.round((1 - result.score!) * 100)}% similarity)`,
      score: Math.round((1 - result.score!) * 100),
      matchedFields: ['name']
    })).filter((match: any) => match.confidence > 60);

    logger.info(`🔍 Set-specific fuzzy search found ${matches.length} matches`);
    return matches;
  }

  /**
   * Strategy 2: Fuzzy name matching using cached Fuse.js (for full database search)
   */
  private fuzzyNameMatchWithCache(cards: any[], cardName: string, gameType: string): CardMatch[] {
    if (!cardName || cardName === 'Unknown Card') return [];

    // For full database search, use cached Fuse instance
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
   * Get or create Fuse.js instance for game type (for full database search)
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
   * Create new Fuse.js instance for specific card set (for set-specific search)
   */
  private createFuseInstance(cards: any[]): Fuse<any> {
    return new Fuse(cards, {
      keys: [
        { name: 'name', weight: 0.8 },
        { name: 'setName', weight: 0.2 }
      ],
      threshold: 0.4,
      includeScore: true
    });
  }

  /**
   * Get all card variants with the same name for visual matching (Enhanced)
   */
  async getAllCardVariants(
    gameType: 'pokemon' | 'yugioh' | 'onepiece',
    cardName: string,
    maxVariants: number = 50
  ): Promise<Array<{ cardId: string; imageUrl: string; name: string; setCode?: string; rarity?: string }>> {
    try {
      logger.info(`🔍 Getting enhanced variants of "${cardName}" for ${gameType}`);

      // Enhanced search strategy with multiple approaches
      const searchStrategies = [
        // 1. Exact name match (highest priority)
        () => Card.find({
          gameType,
          name: { $regex: new RegExp(`^${cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }),
        
        // 2. Name contains all major words
        () => {
          const majorWords = cardName.split(/\s+/).filter(word => word.length > 2);
          if (majorWords.length > 0) {
            const wordRegexes = majorWords.map(word => 
              new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            );
            return Card.find({
              gameType,
              name: { $all: wordRegexes }
            });
          }
          return Card.find({ _id: { $exists: false } }); // Empty result
        },

        // 3. Fuzzy matching with different name variations
        () => {
          const variations = this.generateNameVariations(cardName);
          const orConditions = variations.map(variation => ({
            name: { $regex: new RegExp(variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
          }));
          
          return Card.find({
            gameType,
            $or: orConditions
          });
        },

        // 4. Partial name matching (broader search)
        () => Card.find({
          gameType,
          name: { $regex: new RegExp(cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        })
      ];

      let allVariants: any[] = [];
      const seenCardIds = new Set<string>();

      // Execute search strategies in order of priority
      for (const [index, strategy] of searchStrategies.entries()) {
        try {
          const strategyResults = await strategy()
            .select('_id name imageUrl setCode rarity gameType setName')
            .lean()
            .limit(maxVariants);

          logger.info(`Strategy ${index + 1}: Found ${strategyResults.length} potential variants`);

          // Add unique variants
          for (const card of strategyResults) {
            if (!seenCardIds.has(card._id.toString()) && card.imageUrl && card.imageUrl.trim() !== '') {
              seenCardIds.add(card._id.toString());
              allVariants.push(card);
            }
          }

          // Stop if we have enough variants from high-priority strategies
          if (allVariants.length >= maxVariants * 0.7 && index < 2) {
            logger.info(`Got sufficient variants (${allVariants.length}) from high-priority strategy ${index + 1}`);
            break;
          }
        } catch (error) {
          logger.warn(`Search strategy ${index + 1} failed:`, error);
        }
      }

      // Sort variants by relevance (exact matches first, then by set name, etc.)
      allVariants.sort((a, b) => {
        // Exact name matches first
        const aExact = a.name.toLowerCase() === cardName.toLowerCase() ? 1 : 0;
        const bExact = b.name.toLowerCase() === cardName.toLowerCase() ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        // Then by name length (shorter names are often base cards)
        const lengthDiff = a.name.length - b.name.length;
        if (Math.abs(lengthDiff) > 0) return lengthDiff;

        // Finally alphabetically by set name
        return (a.setName || '').localeCompare(b.setName || '');
      });

      const finalVariants = allVariants
        .slice(0, maxVariants)
        .map(card => ({
          cardId: card._id.toString(),
          imageUrl: card.imageUrl!,
          name: card.name,
          setCode: card.setCode,
          rarity: card.rarity
        }));

      logger.info(`🔍 Enhanced search found ${finalVariants.length} unique variants with images`);
      
      // Log some examples for debugging
      if (finalVariants.length > 0) {
        logger.info('Sample variants:');
        finalVariants.slice(0, 3).forEach((variant, index) => {
          logger.info(`  ${index + 1}. ${variant.name} (${variant.setCode || 'Unknown set'})`);
        });
      }

      return finalVariants;

    } catch (error) {
      logger.error('Error getting enhanced card variants:', error);
      return [];
    }
  }

  /**
   * Generate name variations for better matching
   */
  private generateNameVariations(cardName: string): string[] {
    const variations = [cardName];
    
    // Remove common suffixes/prefixes
    const commonSuffixes = ['EX', 'GX', 'V', 'VMAX', 'ex', 'gx', 'v', 'vmax'];
    const commonPrefixes = ['Team', 'Dark', 'Light', 'Shining'];
    
    let baseName = cardName;
    
    // Try removing suffixes
    for (const suffix of commonSuffixes) {
      const pattern = new RegExp(`\\s+${suffix}\\s*$`, 'i');
      if (pattern.test(baseName)) {
        const withoutSuffix = baseName.replace(pattern, '').trim();
        if (withoutSuffix.length > 0) {
          variations.push(withoutSuffix);
          baseName = withoutSuffix; // Use this for further processing
        }
      }
    }
    
    // Try removing prefixes
    for (const prefix of commonPrefixes) {
      const pattern = new RegExp(`^${prefix}\\s+`, 'i');
      if (pattern.test(baseName)) {
        const withoutPrefix = baseName.replace(pattern, '').trim();
        if (withoutPrefix.length > 0) {
          variations.push(withoutPrefix);
        }
      }
    }

    // Add variations with common card type words
    const cardTypes = ['Pokémon', 'Pokemon', 'Card'];
    for (const type of cardTypes) {
      variations.push(`${baseName} ${type}`);
    }

    // Remove duplicates and return
    return [...new Set(variations)].filter(v => v.length > 0);
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