import { Types } from 'mongoose';
import { PokemonDeck } from '../../database/models/pokemon/pokemonDeck';

export interface IPokemonDeck {
  _id: Types.ObjectId;
  deckExtId: string;
  name: string;
  types: string[];
  cards: Array<{
    card: Types.ObjectId;
    count: number;
  }>;
}

export interface IPokemonDeckPopulated {
  _id: Types.ObjectId;
  deckExtId: string;
  name: string;
  types: string[];
  cards: Array<{
    card: any; // Populated PokemonCard
    count: number;
  }>;
}

export interface IPokemonDeckService {
  getAllDecks(page?: number, limit?: number, types?: string[]): Promise<{
    decks: IPokemonDeck[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getDeckById(deckId: string): Promise<IPokemonDeckPopulated>;
  getDeckByExtId(deckExtId: string): Promise<IPokemonDeckPopulated>;
  searchDecks(query: string, types?: string[]): Promise<IPokemonDeck[]>;
  getDecksByTypes(types: string[]): Promise<IPokemonDeck[]>;
  getDeckStats(deckId: string): Promise<{
    totalCards: number;
    uniqueCards: number;
    typeBreakdown: Record<string, number>;
    rarityBreakdown: Record<string, number>;
  }>;
}

export class PokemonDeckService implements IPokemonDeckService {
  async getAllDecks(page: number = 1, limit: number = 20, types?: string[]) {
    const skip = (page - 1) * limit;
    const query: any = {};
    
    if (types && types.length > 0) {
      query.types = { $in: types };
    }

    const [decks, total] = await Promise.all([
      PokemonDeck.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PokemonDeck.countDocuments(query)
    ]);

    return {
      decks: decks as unknown as IPokemonDeck[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getDeckById(deckId: string): Promise<IPokemonDeckPopulated> {
    const deck = await PokemonDeck.findById(deckId)
      .populate('cards.card')
      .lean();

    if (!deck) {
      throw new Error('Pokemon deck not found');
    }

    return deck as unknown as IPokemonDeckPopulated;
  }

  async getDeckByExtId(deckExtId: string): Promise<IPokemonDeckPopulated> {
    const deck = await PokemonDeck.findOne({ deckExtId })
      .populate('cards.card')
      .lean();

    if (!deck) {
      throw new Error('Pokemon deck not found');
    }

    return deck as unknown as IPokemonDeckPopulated;
  }

  async searchDecks(query: string, types?: string[]): Promise<IPokemonDeck[]> {
    const searchQuery: any = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { deckExtId: { $regex: query, $options: 'i' } }
      ]
    };

    if (types && types.length > 0) {
      searchQuery.types = { $in: types };
    }

    const decks = await PokemonDeck.find(searchQuery)
      .sort({ name: 1 })
      .limit(50)
      .lean();

    return decks as unknown as IPokemonDeck[];
  }

  async getDecksByTypes(types: string[]): Promise<IPokemonDeck[]> {
    const decks = await PokemonDeck.find({
      types: { $in: types }
    })
    .sort({ name: 1 })
    .lean();

    return decks as unknown as IPokemonDeck[];
  }

  async getDeckStats(deckId: string) {
    const deck = await PokemonDeck.findById(deckId)
      .populate('cards.card')
      .lean();

    if (!deck) {
      throw new Error('Pokemon deck not found');
    }

    const totalCards = deck.cards.reduce((sum, cardEntry) => sum + cardEntry.count, 0);
    const uniqueCards = deck.cards.length;

    // Calculate type breakdown
    const typeBreakdown: Record<string, number> = {};
    deck.types.forEach(type => {
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    // Calculate rarity breakdown (requires populated cards)
    const rarityBreakdown: Record<string, number> = {};
    deck.cards.forEach((cardEntry: any) => {
      if (cardEntry.card && cardEntry.card.rarity) {
        const rarity = cardEntry.card.rarity;
        rarityBreakdown[rarity] = (rarityBreakdown[rarity] || 0) + cardEntry.count;
      }
    });

    return {
      totalCards,
      uniqueCards,
      typeBreakdown,
      rarityBreakdown
    };
  }
}