import mongoose, { Schema } from 'mongoose';
import { Card } from '../../database/models/card';
import { Deck, IDeck } from '../../database/models/deck';
import UserModel from '../../database/models/user';
import PREMIUM_CONFIG from '../../shared/config/premium.config';
import { getMessage } from '../../shared/constants/messages';
import AppError from '../../shared/errors/AppError';
import { GameType } from '../cards/card.service';

export interface CreateDeckOptions {
  name: string;
  description?: string;
  gameType: GameType;
  isPublic?: boolean;
}

export interface UpdateDeckOptions {
  name?: string;
  description?: string;
  gameType?: GameType;
  isPublic?: boolean;
  cards?: AddCardToDeckOptions[];
}

export interface GetDecksOptions {
  page?: number;
  limit?: number;
  gameType?: GameType;
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
  async getUserDecks(
    userId: string,
    options: GetDecksOptions = {}
  ): Promise<DecksResult> {
    const {
      page = 1,
      limit = 20,
      gameType,
      search,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = options;

    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (gameType) {
      filter.gameType = gameType;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const [decks, total] = await Promise.all([
      Deck.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("cards.cardId", "name imageUrl gameType"),
      Deck.countDocuments(filter),
    ]);

    return {
      decks,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  async getPublicDecks(options: GetDecksOptions = {}): Promise<DecksResult> {
    const {
      page = 1,
      limit = 20,
      gameType,
      search,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = options;

    const filter: any = { isPublic: true };

    if (gameType) {
      filter.gameType = gameType;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const [decks, total] = await Promise.all([
      Deck.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("cards.cardId", "name imageUrl gameType")
        .populate("userId", "username"),
      Deck.countDocuments(filter),
    ]);

    return {
      decks,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };
  }

  async createDeck(userId: string, options: CreateDeckOptions): Promise<IDeck> {
    // Enforce freemium deck limit (3 decks)
    const user = await UserModel.findById(userId);
    if (user && !user.isPremium) {
      const existing = await Deck.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });
      if (existing >= PREMIUM_CONFIG.DECK_LIMIT_FREEMIUM) {
        throw new AppError(getMessage('PREMIUM.DECK_LIMIT_REACHED'), 403);
      }
    }

    const deck = new Deck({
      ...options,
      userId: new mongoose.Types.ObjectId(userId),
      cards: [],
    });

    return await deck.save();
  }

  async updateDeck(
    deckId: string,
    userId: string,
    options: UpdateDeckOptions
  ): Promise<IDeck> {
    const deck = await Deck.findOne({
      _id: deckId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!deck) {
      throw new Error("Deck not found or access denied");
    }

    Object.assign(deck, options);
    return await deck.save();
  }

  async deleteDeck(deckId: string, userId: string): Promise<void> {
    const result = await Deck.deleteOne({
      _id: deckId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new Error("Deck not found or access denied");
    }
  }

  async getDeckById(deckId: string, userId?: string): Promise<IDeck | null> {
    const filter: any = { _id: deckId };

    // If userId is provided, check ownership or public status
    if (userId) {
      filter.$or = [
        { userId: new mongoose.Types.ObjectId(userId) },
        { isPublic: true },
      ];
    } else {
      // If no userId provided, only return public decks
      filter.isPublic = true;
    }

    return await Deck.findOne(filter)
      .populate("cards.cardId", "name imageUrl gameType pricing")
      .populate("userId", "username");
  }

  async getDeckStats(deckId: string, userId?: string): Promise<any> {
    const deck = await this.getDeckById(deckId, userId);

    if (!deck) {
      throw new Error("Deck not found or access denied");
    }

    const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = deck.cards.length;

    // Calculate deck value if cards have pricing
    let totalValue = 0;
    deck.cards.forEach((deckCard) => {
      if (
        deckCard.cardId &&
        typeof deckCard.cardId === "object" &&
        "pricing" in deckCard.cardId
      ) {
        const card = deckCard.cardId as any;
        if (card.pricing?.market) {
          totalValue += card.pricing.market * deckCard.quantity;
        }
      }
    });

    // Get card type distribution
    const cardTypeDistribution: { [key: string]: number } = {};
    deck.cards.forEach((deckCard) => {
      if (
        deckCard.cardId &&
        typeof deckCard.cardId === "object" &&
        "cardType" in deckCard.cardId
      ) {
        const card = deckCard.cardId as any;
        const type = card.cardType || "Unknown";
        cardTypeDistribution[type] =
          (cardTypeDistribution[type] || 0) + deckCard.quantity;
      }
    });

    return {
      totalCards,
      uniqueCards,
      totalValue: totalValue > 0 ? totalValue : null,
      cardTypeDistribution,
      gameType: deck.gameType,
    };
  }

  async addCardToDeck(
    deckId: string,
    userId: string,
    options: AddCardToDeckOptions
  ): Promise<IDeck> {
    const { cardId, quantity } = options;

    const deck = await Deck.findOne({
      _id: deckId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!deck) {
      throw new Error("Deck not found or access denied");
    }

    // Check if card exists
    const card = await Card.findById(cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    // Check if card is already in deck
    const existingCardIndex = deck.cards.findIndex(
      (deckCard) => deckCard.cardId.toString() === cardId
    );

    if (existingCardIndex >= 0) {
      // Update quantity
      deck.cards[existingCardIndex].quantity += quantity;
    } else {
      // Add new card
      deck.cards.push({
        cardId: new mongoose.Types.ObjectId(cardId),
        quantity,
      });
    }

    return await deck.save();
  }

  async removeCardFromDeck(
    deckId: string,
    userId: string,
    cardId: string,
    quantity: number = 1
  ): Promise<IDeck> {
    const deck = await Deck.findOne({
      _id: deckId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!deck) {
      throw new Error("Deck not found or access denied");
    }

    const cardIndex = deck.cards.findIndex(
      (deckCard) => deckCard.cardId.toString() === cardId
    );

    if (cardIndex === -1) {
      throw new Error("Card not found in deck");
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

  async duplicateDeck(
    deckId: string,
    userId: string,
    newName?: string
  ): Promise<IDeck> {
    const originalDeck = await Deck.findOne({
      $or: [
        { _id: deckId, userId: new Schema.Types.ObjectId(userId) },
        { _id: deckId, isPublic: true },
      ],
    });

    if (!originalDeck) {
      throw new Error("Deck not found or access denied");
    }

    // Enforce freemium deck limit (3 decks) for duplication
    const user = await UserModel.findById(userId);
    if (user && !user.isPremium) {
      const existing = await Deck.countDocuments({ userId: new Schema.Types.ObjectId(userId) });
      if (existing >= PREMIUM_CONFIG.DECK_LIMIT_FREEMIUM) {
        throw new AppError(getMessage('PREMIUM.DECK_LIMIT_REACHED'), 403);
      }
    }

    const duplicatedDeck = new Deck({
      name: newName || `${originalDeck.name} (Copy)`,
      description: originalDeck.description,
      gameType: originalDeck.gameType,
      userId: new mongoose.Types.ObjectId(userId),
      cards: [...originalDeck.cards],
      isPublic: false, // Duplicated decks are private by default
    });

    return await duplicatedDeck.save();
  }

  async searchDecks(
    query: string,
    options: GetDecksOptions = {}
  ): Promise<DecksResult> {
    return await this.getPublicDecks({
      ...options,
      search: query,
    });
  }

  async getDecksByUser(
    userId: string,
    options: GetDecksOptions = {}
  ): Promise<DecksResult> {
    return await this.getUserDecks(userId, options);
  }

  async getPopularDecks(options: GetDecksOptions = {}): Promise<DecksResult> {
    return await this.getPublicDecks({
      ...options,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  }
}

export const deckService = new DeckService();