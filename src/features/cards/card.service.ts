import { PokemonCard } from '../../database/models/pokemon/pokemonCard';
import { YugiohCard } from '../../database/models/yugioh/yugiohModel';

export type CardType = 'pokemon' | 'yugioh';

export interface GetCardsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: {
    rarity?: string;
    type?: string;
    set?: string;
    attribute?: string;
    race?: string;
  };
}

export interface GetCardsResult {
  cards: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ICardService {
  getCardsByType(cardType: CardType, options?: GetCardsOptions): Promise<GetCardsResult>;
  getCardById(cardId: string, cardType: CardType): Promise<any>;
  searchCards(cardType: CardType, query: string, options?: GetCardsOptions): Promise<GetCardsResult>;
}

export class CardService implements ICardService {
  async getCardsByType(cardType: CardType, options: GetCardsOptions = {}): Promise<GetCardsResult> {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc',
      filters = {}
    } = options;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    let query: any = {};
    let cards: any[];
    let total: number;

    // Select appropriate model and build query based on card type
    if (cardType === 'pokemon') {
      query = this.buildPokemonQuery(search, filters);
      
      const [pokemonCards, pokemonTotal] = await Promise.all([
        PokemonCard.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('set')
          .lean(),
        PokemonCard.countDocuments(query)
      ]);
      
      cards = pokemonCards;
      total = pokemonTotal;
    } else if (cardType === 'yugioh') {
      query = this.buildYugiohQuery(search, filters);
      
      const [yugiohCards, yugiohTotal] = await Promise.all([
        YugiohCard.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        YugiohCard.countDocuments(query)
      ]);
      
      cards = yugiohCards;
      total = yugiohTotal;
    } else {
      throw new Error('Invalid card type. Must be "pokemon" or "yugioh"');
    }

    const totalPages = Math.ceil(total / limit);

    return {
      cards,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getCardById(cardId: string, cardType: CardType): Promise<any> {
    let card: any;

    if (cardType === 'pokemon') {
      card = await PokemonCard.findById(cardId)
        .populate('set')
        .lean();
    } else if (cardType === 'yugioh') {
      card = await YugiohCard.findById(cardId)
        .lean();
    } else {
      throw new Error('Invalid card type. Must be "pokemon" or "yugioh"');
    }

    if (!card) {
      throw new Error(`${cardType} card not found`);
    }

    return card;
  }

  async searchCards(cardType: CardType, query: string, options: GetCardsOptions = {}): Promise<GetCardsResult> {
    const searchOptions = {
      ...options,
      search: query
    };

    return this.getCardsByType(cardType, searchOptions);
  }

  private buildPokemonQuery(search: string, filters: any): any {
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { supertype: { $regex: search, $options: 'i' } },
        { subtypes: { $in: [new RegExp(search, 'i')] } },
        { types: { $in: [new RegExp(search, 'i')] } },
        { artist: { $regex: search, $options: 'i' } },
        { rarity: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply filters
    if (filters.rarity) {
      query.rarity = { $regex: filters.rarity, $options: 'i' };
    }

    if (filters.type) {
      query.types = { $in: [filters.type] };
    }

    if (filters.set) {
      query.set = filters.set;
    }

    return query;
  }

  private buildYugiohQuery(search: string, filters: any): any {
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } },
        { race: { $regex: search, $options: 'i' } },
        { attribute: { $regex: search, $options: 'i' } },
        { archetype: { $regex: search, $options: 'i' } }
      ];
    }

    // Apply filters
    if (filters.type) {
      query.type = { $regex: filters.type, $options: 'i' };
    }

    if (filters.attribute) {
      query.attribute = { $regex: filters.attribute, $options: 'i' };
    }

    if (filters.race) {
      query.race = { $regex: filters.race, $options: 'i' };
    }

    if (filters.rarity) {
      query['card_sets.set_rarity'] = { $regex: filters.rarity, $options: 'i' };
    }

    if (filters.set) {
      query['card_sets.set_name'] = { $regex: filters.set, $options: 'i' };
    }

    return query;
  }
}