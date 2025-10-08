import mongoose, { Schema } from 'mongoose';
import { Card } from '../../database/models/card';
import { Deck, DeckFormat, GameType, IDeck } from '../../database/models/deck';

export interface CreateDeckOptions {
  name: string;
  description?: string;
  gameType: GameType;
  format: DeckFormat;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateDeckOptions {
  name?: string;
  description?: string;
  gameType?: GameType;
  format?: DeckFormat;
  isPublic?: boolean;
  tags?: string[];
}

export interface GetDecksOptions {
  page?: number;
  limit?: number;
  gameType?: GameType;
  format?: DeckFormat;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'cardCount';
  sortOrder?: 'asc' | 'desc';
}

export interface DecksResult {
  decks: IDeck[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AddCardToDeckOptions {
  cardId: string;
  quantity: number;
}

export class DeckService {
  async getUserDecks(userId: string, options: GetDecksOptions = {}): Promise<DecksResult> {
    const {
      page = 1,
      limit = 20,
      gameType,
      format,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (gameType) {
      filter.gameType = gameType;
    }

    if (format) {
      filter.format = format;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [decks, total] = await Promise.all([
      Deck.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('cards.cardId', 'name imageUrl gameType'),
      Deck.countDocuments(filter)
    ]);

    return {
      decks,
      total,
      page,
      limit,
      hasMore: total > page * limit
    };
  }

  async getPublicDecks(options: GetDecksOptions = {}): Promise<DecksResult> {
    const {
      page = 1,
      limit = 20,
      gameType,
      format,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    const filter: any = { isPublic: true };

    if (gameType) {
      filter.gameType = gameType;
    }

    if (format) {
      filter.format = format;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [decks, total] = await Promise.all([
      Deck.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('cards.cardId', 'name imageUrl gameType')
        .populate('userId', 'username'),
      Deck.countDocuments(filter)
    ]);

    return {
      decks,
      total,
      page,
      limit,
      hasMore: total > page * limit
    };
  }

  async createDeck(userId: string, options: CreateDeckOptions): Promise<IDeck> {
    const deck = new Deck({
      ...options,
      userId: new Schema.Types.ObjectId(userId),
      cards: []
    });

    return await deck.save();
  }

  async updateDeck(deckId: string, userId: string, options: UpdateDeckOptions): Promise<IDeck> {
    const deck = await Deck.findOne({
      _id: deckId,
      userId: new Schema.Types.ObjectId(userId)
    });

    if (!deck) {
      throw new Error('Deck not found or access denied');
    }

    Object.assign(deck, options);
    return await deck.save();
  }

  async deleteDeck(deckId: string, userId: string): Promise<void> {
    const result = await Deck.deleteOne({
      _id: deckId,
      userId: new Schema.Types.ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      throw new Error('Deck not found or access denied');
    }
  }

  async getDeckById(deckId: string, userId?: string): Promise<IDeck | null> {
    const filter: any = { _id: deckId };

    // If userId is provided, check ownership or public status
    if (userId) {
      filter.$or = [
        { userId: new Schema.Types.ObjectId(userId) },
        { isPublic: true }
      ];
    } else {
      // If no userId provided, only return public decks
      filter.isPublic = true;
    }

    return await Deck.findOne(filter)
      .populate('cards.cardId', 'name imageUrl gameType pricing')
      .populate('userId', 'username');
  }

  async getDeckStats(deckId: string, userId?: string): Promise<any> {
    const deck = await this.getDeckById(deckId, userId);

    if (!deck) {
      throw new Error('Deck not found or access denied');
    }

    const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = deck.cards.length;

    // Calculate deck value if cards have pricing
    let totalValue = 0;
    deck.cards.forEach(deckCard => {
      if (deckCard.cardId && typeof deckCard.cardId === 'object' && 'pricing' in deckCard.cardId) {
        const card = deckCard.cardId as any;
        if (card.pricing?.market) {
          totalValue += card.pricing.market * deckCard.quantity;
        }
      }
    });

    // Get card type distribution
    const cardTypeDistribution: { [key: string]: number } = {};
    deck.cards.forEach(deckCard => {
      if (deckCard.cardId && typeof deckCard.cardId === 'object' && 'cardType' in deckCard.cardId) {
        const card = deckCard.cardId as any;
        const type = card.cardType || 'Unknown';
        cardTypeDistribution[type] = (cardTypeDistribution[type] || 0) + deckCard.quantity;
      }
    });

    return {
      totalCards,
      uniqueCards,
      totalValue: totalValue > 0 ? totalValue : null,
      cardTypeDistribution,
      format: deck.format,
      gameType: deck.gameType,
      isLegal: this.validateDeckFormat(deck)
    };
  }

  async addCardToDeck(deckId: string, userId: string, options: AddCardToDeckOptions): Promise<IDeck> {
    const { cardId, quantity } = options;

    const deck = await Deck.findOne({
      _id: deckId,
      userId: new Schema.Types.ObjectId(userId)
    });

    if (!deck) {
      throw new Error('Deck not found or access denied');
    }

    // Check if card exists
    const card = await Card.findById(cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // Check if card is already in deck
    const existingCardIndex = deck.cards.findIndex(
      deckCard => deckCard.cardId.toString() === cardId
    );

    if (existingCardIndex >= 0) {
      // Update quantity
      deck.cards[existingCardIndex].quantity += quantity;
    } else {
      // Add new card
      deck.cards.push({
        cardId: new Schema.Types.ObjectId(cardId),
        quantity
      });
    }

    return await deck.save();
  }

  async removeCardFromDeck(deckId: string, userId: string, cardId: string, quantity: number = 1): Promise<IDeck> {
    const deck = await Deck.findOne({
      _id: deckId,
      userId: new Schema.Types.ObjectId(userId)
    });

    if (!deck) {
      throw new Error('Deck not found or access denied');
    }

    const cardIndex = deck.cards.findIndex(
      deckCard => deckCard.cardId.toString() === cardId
    );

    if (cardIndex === -1) {
      throw new Error('Card not found in deck');
    }

    const currentQuantity = deck.cards[cardIndex].quantity;

    if (quantity >= currentQuantity) {
      // Remove card completely
      deck.cards.splice(cardIndex, 1);
    } else {
      // Reduce quantity
      deck.cards[cardIndex].quantity -= quantity;
    }

    return await deck.save();
  }

  async duplicateDeck(deckId: string, userId: string, newName?: string): Promise<IDeck> {
    const originalDeck = await Deck.findOne({
      $or: [
        { _id: deckId, userId: new Schema.Types.ObjectId(userId) },
        { _id: deckId, isPublic: true }
      ]
    });

    if (!originalDeck) {
      throw new Error('Deck not found or access denied');
    }

    const duplicatedDeck = new Deck({
      name: newName || `${originalDeck.name} (Copy)`,
      description: originalDeck.description,
      gameType: originalDeck.gameType,
      format: originalDeck.format,
      userId: new Schema.Types.ObjectId(userId),
      cards: [...originalDeck.cards],
      tags: [...(originalDeck.tags || [])],
      isPublic: false // Duplicated decks are private by default
    });

    return await duplicatedDeck.save();
  }

  private validateDeckFormat(deck: IDeck): boolean {
    const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);

    switch (deck.format) {
      case DeckFormat.STANDARD:
        return totalCards >= 40 && totalCards <= 60;
      case DeckFormat.EXPANDED:
        return totalCards >= 40;
      case DeckFormat.UNLIMITED:
        return totalCards >= 1;
      case DeckFormat.CUSTOM:
        return totalCards >= 1;
      default:
        return true;
    }
  }

  async searchDecks(query: string, options: GetDecksOptions = {}): Promise<DecksResult> {
    return await this.getPublicDecks({
      ...options,
      search: query
    });
  }

  async getDecksByUser(userId: string, options: GetDecksOptions = {}): Promise<DecksResult> {
    return await this.getUserDecks(userId, options);
  }

  async getPopularDecks(options: GetDecksOptions = {}): Promise<DecksResult> {
    return await this.getPublicDecks({
      ...options,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  }
}

export const deckService = new DeckService();