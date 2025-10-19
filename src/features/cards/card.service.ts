import mongoose from 'mongoose';
import { Card, ICard } from '../../database/models/card';

export type GameType = 'pokemon' | 'yugioh' | 'onepiece';

export interface GetCardsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  rarity?: string;
  setId?: string;
  minPrice?: number;
  maxPrice?: number;
  // New fields for enhanced filtering
  cardType?: string;        // extCardType: Character, Leader, Event, etc.
  color?: string;          // extColor: Red, Green, Blue, etc.
  attribute?: string;      // extAttribute: Strike, Slash, etc.
  subtype?: string;        // extSubtypes: Straw Hat Crew, etc.
  cost?: number;           // extCost: Energy/mana cost
  power?: number;          // extPower: Attack power
  life?: number;           // extLife: Life points for leaders
  hp?: number;             // extHP: Health points for Pokemon
  stage?: string;          // extStage: Basic, Stage 1, Stage 2 for Pokemon
  monsterType?: string;    // extMonsterType: for Yu-Gi-Oh
  defense?: number;        // extDefense: for Yu-Gi-Oh
  level?: number;          // extLevel: for Yu-Gi-Oh
  description?: string;    // extDescription: Card text search
}

export interface CardsResult {
  cards: ICard[];
  pagination: {
    totalPages: number;
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface CardStats {
  totalCards: number;
  totalSets: number;
  avgPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  topRarities: Array<{
    rarity: string;
    count: number;
  }>;
  gameType?: GameType;
}

export interface ICardService {
  getAllCards(options?: GetCardsOptions): Promise<CardsResult>;
  getCardsByGameType(gameType: GameType, options?: GetCardsOptions): Promise<CardsResult>;
  getCardsBySet(setId: string, options?: GetCardsOptions): Promise<CardsResult>;
  getCardById(cardId: string): Promise<ICard>;
  getCardByProductId(productId: number): Promise<ICard>;
  searchCards(gameType: GameType, query: string, options?: GetCardsOptions): Promise<CardsResult>;
  getCardStats(gameType?: GameType): Promise<CardStats | CardStats[]>;
  updateCardPrices(productIds: number[]): Promise<{ updated: number; errors: number }>;
}

export class CardService implements ICardService {
  async getAllCards(options: GetCardsOptions = {}): Promise<CardsResult> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      rarity,
      setId,
      minPrice,
      maxPrice,
      cardType,
      color,
      attribute,
      subtype,
      cost,
      power,
      life,
      hp,
      stage,
      monsterType,
      defense,
      level,
      description
    } = options;

    // Build filter
    const filter: any = { isActive: true };

    // Enhanced fuzzy search for name
    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      const searchConditions = [];
      
      // Create fuzzy search patterns for each term
      for (const term of searchTerms) {
        const fuzzyPattern = term.split('').join('.*');
        searchConditions.push(
          { name: { $regex: fuzzyPattern, $options: 'i' } },
          { cleanName: { $regex: fuzzyPattern, $options: 'i' } },
          { name: { $regex: term, $options: 'i' } },
          { cleanName: { $regex: term, $options: 'i' } }
        );
      }
      
      // Also include exact phrase search
      searchConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { cleanName: { $regex: search, $options: 'i' } }
      );

      filter.$or = searchConditions;
    }

    // Enhanced filtering options
    if (rarity) {
      filter['extendedData.extRarity'] = { $regex: rarity, $options: 'i' };
    }

    if (setId) {
      filter.cardSet = new mongoose.Types.ObjectId(setId);
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter['tcgPlayerPrice.marketPrice'] = {};
      if (minPrice !== undefined) {
        filter['tcgPlayerPrice.marketPrice'].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        filter['tcgPlayerPrice.marketPrice'].$lte = maxPrice;
      }
    }

    // Game-specific filtering
    if (cardType) {
      filter['extendedData.extCardType'] = { $regex: cardType, $options: 'i' };
    }

    if (color) {
      filter['extendedData.extColor'] = { $regex: color, $options: 'i' };
    }

    if (attribute) {
      filter['extendedData.extAttribute'] = { $regex: attribute, $options: 'i' };
    }

    if (subtype) {
      filter['extendedData.extSubtypes'] = { $regex: subtype, $options: 'i' };
    }

    if (cost !== undefined) {
      filter['extendedData.extCost'] = cost;
    }

    if (power !== undefined) {
      filter['extendedData.extPower'] = power;
    }

    if (life !== undefined) {
      filter['extendedData.extLife'] = life;
    }

    if (hp !== undefined) {
      filter['extendedData.extHP'] = hp;
    }

    if (stage) {
      filter['extendedData.extStage'] = { $regex: stage, $options: 'i' };
    }

    if (monsterType) {
      filter['extendedData.extMonsterType'] = { $regex: monsterType, $options: 'i' };
    }

    if (defense !== undefined) {
      filter['extendedData.extDefense'] = defense;
    }

    if (level !== undefined) {
      filter['extendedData.extLevel'] = level;
    }

    if (description) {
      filter['extendedData.extDescription'] = { $regex: description, $options: 'i' };
    }

    // Build sort with enhanced options
    const sort: any = {};
    if (sortBy === 'price') {
      sort['tcgPlayerPrice.marketPrice'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'name') {
      sort.name = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'number') {
      sort.number = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'cost') {
      sort['extendedData.extCost'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'power') {
      sort['extendedData.extPower'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'hp') {
      sort['extendedData.extHP'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'defense') {
      sort['extendedData.extDefense'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [cards, totalItems] = await Promise.all([
      Card.find(filter)
        .populate('cardSet', 'name abbreviation gameType')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Card.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      cards: cards as ICard[],
      pagination: {
        totalPages,
        currentPage: page,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  async getCardsByGameType(gameType: GameType, options: GetCardsOptions = {}): Promise<CardsResult> {
    const filter: any = { gameType, isActive: true };
    
    // Merge the gameType filter with the base options
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      rarity,
      setId,
      minPrice,
      maxPrice,
      cardType,
      color,
      attribute,
      subtype,
      cost,
      power,
      life,
      hp,
      stage,
      monsterType,
      defense,
      level,
      description
    } = options;

    // Enhanced fuzzy search for name
    if (search) {
      const searchTerms = search.trim().split(/\s+/);
      const searchConditions = [];
      
      // Create fuzzy search patterns for each term
      for (const term of searchTerms) {
        const fuzzyPattern = term.split('').join('.*');
        searchConditions.push(
          { name: { $regex: fuzzyPattern, $options: 'i' } },
          { cleanName: { $regex: fuzzyPattern, $options: 'i' } },
          { name: { $regex: term, $options: 'i' } },
          { cleanName: { $regex: term, $options: 'i' } }
        );
      }
      
      // Also include exact phrase search
      searchConditions.push(
        { name: { $regex: search, $options: 'i' } },
        { cleanName: { $regex: search, $options: 'i' } }
      );

      filter.$or = searchConditions;
    }

    // Enhanced filtering options
    if (rarity) {
      filter['extendedData.extRarity'] = { $regex: rarity, $options: 'i' };
    }

    if (setId) {
      filter.cardSet = new mongoose.Types.ObjectId(setId);
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter['tcgPlayerPrice.marketPrice'] = {};
      if (minPrice !== undefined) {
        filter['tcgPlayerPrice.marketPrice'].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        filter['tcgPlayerPrice.marketPrice'].$lte = maxPrice;
      }
    }

    // New filtering options based on game-specific fields
    if (cardType) {
      filter['extendedData.extCardType'] = { $regex: cardType, $options: 'i' };
    }

    if (color) {
      filter['extendedData.extColor'] = { $regex: color, $options: 'i' };
    }

    if (attribute) {
      filter['extendedData.extAttribute'] = { $regex: attribute, $options: 'i' };
    }

    if (subtype) {
      filter['extendedData.extSubtypes'] = { $regex: subtype, $options: 'i' };
    }

    if (cost !== undefined) {
      filter['extendedData.extCost'] = cost;
    }

    if (power !== undefined) {
      filter['extendedData.extPower'] = power;
    }

    if (life !== undefined) {
      filter['extendedData.extLife'] = life;
    }

    if (hp !== undefined) {
      filter['extendedData.extHP'] = hp;
    }

    if (stage) {
      filter['extendedData.extStage'] = { $regex: stage, $options: 'i' };
    }

    if (monsterType) {
      filter['extendedData.extMonsterType'] = { $regex: monsterType, $options: 'i' };
    }

    if (defense !== undefined) {
      filter['extendedData.extDefense'] = defense;
    }

    if (level !== undefined) {
      filter['extendedData.extLevel'] = level;
    }

    if (description) {
      filter['extendedData.extDescription'] = { $regex: description, $options: 'i' };
    }

    // Build sort with enhanced options
    const sort: any = {};
    if (sortBy === 'price') {
      sort['tcgPlayerPrice.marketPrice'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'name') {
      sort.name = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'number') {
      sort.number = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'cost') {
      sort['extendedData.extCost'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'power') {
      sort['extendedData.extPower'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'hp') {
      sort['extendedData.extHP'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'defense') {
      sort['extendedData.extDefense'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [cards, totalItems] = await Promise.all([
      Card.find(filter)
        .populate('cardSet', 'name abbreviation gameType')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Card.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      cards: cards as ICard[],
      pagination: {
        totalPages,
        currentPage: page,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  async getCardsBySet(setId: string, options: GetCardsOptions = {}): Promise<CardsResult> {
    return this.getAllCards({ ...options, setId });
  }

  async getCardById(cardId: string): Promise<ICard> {
    const card = await Card.findById(cardId)
      .populate('cardSet', 'name abbreviation gameType categoryId groupId')
      .lean();

    if (!card) {
      const { getMessage } = require('../../shared/constants/messages');
      const AppError = require('../../shared/errors/AppError').default;
      throw new AppError(getMessage('CARDS.CARD_NOT_FOUND') + `: ${cardId}`, 404);
    }

    return card as ICard;
  }

  async getCardByProductId(productId: number): Promise<ICard> {
    const card = await Card.findOne({ productId, isActive: true })
      .populate('cardSet', 'name abbreviation gameType categoryId groupId')
      .lean();

    if (!card) {
      const { getMessage } = require('../../shared/constants/messages');
      const AppError = require('../../shared/errors/AppError').default;
      throw new AppError(getMessage('CARDS.CARD_NOT_FOUND') + `: productId ${productId}`, 404);
    }

    return card as ICard;
  }

  async searchCards(gameType: GameType, query: string, options: GetCardsOptions = {}): Promise<CardsResult> {
    const searchOptions = {
      ...options,
      search: query
    };

    return this.getCardsByGameType(gameType, searchOptions);
  }

  async getCardStats(gameType?: GameType): Promise<CardStats | CardStats[]> {
    if (gameType) {
      return this.getStatsForGameType(gameType);
    }

    // Get stats for all game types
    const gameTypes: GameType[] = ['pokemon', 'yugioh', 'onepiece'];
    const allStats = await Promise.all(
      gameTypes.map(type => this.getStatsForGameType(type))
    );

    return allStats;
  }

  private async getStatsForGameType(gameType: GameType): Promise<CardStats> {
    const [
      totalCards,
      priceStats,
      rarityStats,
      setCount
    ] = await Promise.all([
      Card.countDocuments({ gameType, isActive: true }),
      Card.aggregate([
        { $match: { gameType, isActive: true, 'tcgPlayerPrice.marketPrice': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$tcgPlayerPrice.marketPrice' },
            minPrice: { $min: '$tcgPlayerPrice.marketPrice' },
            maxPrice: { $max: '$tcgPlayerPrice.marketPrice' }
          }
        }
      ]),
      Card.aggregate([
        { $match: { gameType, isActive: true } },
        { $group: { _id: '$rarity', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Card.distinct('cardSet', { gameType, isActive: true }).then(sets => sets.length)
    ]);

    const priceData = priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 };

    return {
      totalCards,
      totalSets: setCount,
      avgPrice: priceData.avgPrice || 0,
      priceRange: {
        min: priceData.minPrice || 0,
        max: priceData.maxPrice || 0
      },
      topRarities: rarityStats.map(r => ({
        rarity: r._id || 'Unknown',
        count: r.count
      })),
      gameType
    };
  }

  async updateCardPrices(productIds: number[]): Promise<{ updated: number; errors: number }> {
    // This would implement price update logic by fetching fresh data from TCGPlayer
    // For now, it's a placeholder
    let updated = 0;
    let errors = 0;

    for (const productId of productIds) {
      try {
        // Here you would fetch updated price data and update the card
        await Card.updateOne(
          { productId },
          { $set: { lastPriceUpdate: new Date() } }
        );
        updated++;
      } catch (error) {
        errors++;
      }
    }

    return { updated, errors };
  }
}