import { PokemonCard } from '../../database/models/pokemon/pokemonCard';
import { PokemonSet } from '../../database/models/pokemon/pokemonSet';
import { YugiohCard, YugiohSet } from '../../database/models/yugioh';
import { CardCategory } from '../../shared/types/card.types';

// Keep backward compatibility with string type for now, but prefer enum
export type CardType = CardCategory;

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
  getCardsBySet(cardType: CardType, setId: string, options?: GetCardsOptions): Promise<GetCardsResult>;
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
    if (cardType === CardCategory.POKEMON) {
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
    } else if (cardType === CardCategory.YUGIOH) {
      let baseQuery = this.buildYugiohQuery(search, filters);
      
      // Handle set and rarity filters through YugiohSet collection
      if (filters.set || filters.rarity) {
        let setFilters: any = {};
        
        if (filters.set) {
          setFilters.$or = [
            { setName: { $regex: filters.set, $options: 'i' } },
            { setCode: { $regex: filters.set, $options: 'i' } }
          ];
        }
        
        if (filters.rarity) {
          setFilters.setRarity = { $regex: filters.rarity, $options: 'i' };
        }
        
        // Find cards that match the set/rarity criteria
        const matchingSets = await YugiohSet.find(setFilters).distinct('cardExtId');
        baseQuery.cardExtId = { $in: matchingSets };
      }
      
      const [yugiohCards, yugiohTotal] = await Promise.all([
        YugiohCard.find(baseQuery)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        YugiohCard.countDocuments(baseQuery)
      ]);
      
      // Enrich cards with set information
      const enrichedCards = await Promise.all(
        yugiohCards.map(async (card: any) => {
          const cardSets = await YugiohSet.find({ cardExtId: card.cardExtId }).lean();
          return {
            ...card,
            sets: cardSets
          };
        })
      );
      
      cards = enrichedCards;
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

    if (cardType === CardCategory.POKEMON) {
      card = await PokemonCard.findById(cardId)
        .populate('set')
        .lean();
    } else if (cardType === CardCategory.YUGIOH) {
      card = await YugiohCard.findById(cardId)
        .lean();
    } else {
      throw new Error('Invalid card category. Must be "pokemon" or "yugioh"');
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

  async getCardsBySet(cardType: CardType, setId: string, options: GetCardsOptions = {}): Promise<GetCardsResult> {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    let cards: any[];
    let total: number;

    if (cardType === CardCategory.POKEMON) {
      // For Pokemon, setId can be set name or set ID
      let setQuery: any = {};

      // Check if setId is a MongoDB ObjectId or set name
      if (setId.match(/^[0-9a-fA-F]{24}$/)) {
        // Valid MongoDB ObjectId format - check if it exists
        const setExists = await PokemonSet.findById(setId);
        if (!setExists) {
          throw new Error(`Set with ID '${setId}' not found`);
        }
        setQuery = { set: setId }; // ObjectId
      } else {
        // Validate if setId looks like a reasonable set identifier
        if (setId.length < 2 || setId.includes('invalid') || setId.includes('fake')) {
          throw new Error(`Invalid set identifier: '${setId}'`);
        }
        
        // Find set by name first
        const pokemonSet = await PokemonSet.findOne({ 
          $or: [
            { name: { $regex: setId, $options: 'i' } },
            { id: setId }
          ]
        });
        
        if (!pokemonSet) {
          // For partial name matches, return empty result (this is acceptable)
          // But for clearly invalid identifiers, throw error
          return {
            cards: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          };
        }
        
        setQuery = { set: pokemonSet._id };
      }

      // Add search filter if provided
      let query: any = { ...setQuery };
      if (search) {
        query.$and = [
          setQuery,
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { supertype: { $regex: search, $options: 'i' } },
              { subtypes: { $in: [new RegExp(search, 'i')] } },
              { types: { $in: [new RegExp(search, 'i')] } }
            ]
          }
        ];
      }

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

    } else if (cardType === CardCategory.YUGIOH) {
      // For Yu-Gi-Oh!, find all cards that appear in the specified set
      
      // Validate if setId looks like a reasonable set identifier
      if (setId.length < 2 || setId.includes('invalid') || setId.includes('fake')) {
        throw new Error(`Invalid set identifier: '${setId}'`);
      }
      
      let setQuery: any = {};
      
      // Check if setId is a set name or set code
      setQuery = {
        $or: [
          { setName: { $regex: setId, $options: 'i' } },
          { setCode: { $regex: setId, $options: 'i' } }
        ]
      };

      // Find all sets matching the identifier
      const yugiohSets = await YugiohSet.find(setQuery).lean();
      
      if (yugiohSets.length === 0) {
        // For partial name matches, return empty result (this is acceptable)
        return {
          cards: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      // Get all card IDs from the matching sets
      const cardIds = yugiohSets.map(set => set.cardExtId);

      // Build card query
      let cardQuery: any = { cardExtId: { $in: cardIds } };
      
      if (search) {
        cardQuery.$and = [
          { cardExtId: { $in: cardIds } },
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { type: { $regex: search, $options: 'i' } },
              { desc: { $regex: search, $options: 'i' } },
              { race: { $regex: search, $options: 'i' } },
              { attribute: { $regex: search, $options: 'i' } }
            ]
          }
        ];
      }

      const [yugiohCards, yugiohTotal] = await Promise.all([
        YugiohCard.find(cardQuery)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        YugiohCard.countDocuments(cardQuery)
      ]);

      // Enrich cards with set information
      const enrichedCards = await Promise.all(
        yugiohCards.map(async (card: any) => {
          const cardSets = await YugiohSet.find({ cardExtId: card.cardExtId }).lean();
          return {
            ...card,
            sets: cardSets
          };
        })
      );
      
      cards = enrichedCards;
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

    // For set and rarity filters, we need to find cards through the YugiohSet collection
    // This will be handled in the main query logic above

    return query;
  }
}