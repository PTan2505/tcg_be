import { Deck, DeckFormat, IDeck } from '../../database/models/deck';
import { CardCategory, UserCard } from '../../database/models/userCard';
import { UserCardService } from '../collections/userCard.service';

export interface IDeckService {
  createDeck(userId: string, deckData: CreateDeckData): Promise<IDeck>;
  updateDeck(deckId: string, userId: string, updateData: UpdateDeckData): Promise<IDeck>;
  deleteDeck(deckId: string, userId: string): Promise<void>;
  getUserDecks(userId: string): Promise<IDeck[]>;
  getDeckById(deckId: string, userId?: string): Promise<IDeck>;
  addCardToDeck(deckId: string, userId: string, cardData: AddCardToDeckData): Promise<IDeck>;
  removeCardFromDeck(deckId: string, userId: string, cardId: string): Promise<IDeck>;
  updateCardQuantity(deckId: string, userId: string, cardId: string, quantity: number): Promise<IDeck>;
  validateDeck(deckId: string): Promise<DeckValidationResult>;
  duplicateDeck(deckId: string, userId: string, newName: string): Promise<IDeck>;
}

export interface CreateDeckData {
  name: string;
  description?: string;
  category: CardCategory;
  format: DeckFormat;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateDeckData {
  name?: string;
  description?: string;
  format?: DeckFormat;
  isPublic?: boolean;
  tags?: string[];
}

export interface AddCardToDeckData {
  cardId: string;
  category: CardCategory;
  quantity: number;
}

export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cardCount: {
    total: number;
    unique: number;
    minRequired?: number;
    maxAllowed?: number;
  };
}

export class DeckService implements IDeckService {
  constructor(private userCardService: UserCardService) {}

  async createDeck(userId: string, deckData: CreateDeckData): Promise<IDeck> {
    const deck = new Deck({
      ...deckData,
      userId,
      cards: []
    });

    return await deck.save();
  }

  async updateDeck(deckId: string, userId: string, updateData: UpdateDeckData): Promise<IDeck> {
    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) {
      throw new Error('Deck not found');
    }

    Object.assign(deck, updateData);
    return await deck.save();
  }

  async deleteDeck(deckId: string, userId: string): Promise<void> {
    const result = await Deck.findOneAndDelete({ _id: deckId, userId });
    if (!result) {
      throw new Error('Deck not found');
    }
  }

  async getUserDecks(userId: string): Promise<IDeck[]> {
    return await Deck.find({ userId }).sort({ updatedAt: -1 });
  }

  async getDeckById(deckId: string, userId?: string): Promise<IDeck> {
    const query: any = { _id: deckId };
    
    // If userId is provided, ensure it's either the owner or the deck is public
    if (userId) {
      query.$or = [
        { userId },
        { isPublic: true }
      ];
    } else {
      query.isPublic = true;
    }

    const deck = await Deck.findOne(query).populate('userId', 'firstName lastName');
    if (!deck) {
      throw new Error('Deck not found');
    }

    return deck;
  }

  async addCardToDeck(deckId: string, userId: string, cardData: AddCardToDeckData): Promise<IDeck> {
    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) {
      throw new Error('Deck not found');
    }

    // Verify user owns the card
    const userOwnsCard = await UserCard.findOne({
      userId,
      cardId: cardData.cardId,
      category: cardData.category
    });

    if (!userOwnsCard) {
      throw new Error('You do not own this card');
    }

    // Check if card is already in deck
    const existingCardIndex = deck.cards.findIndex(
      card => card.cardId.toString() === cardData.cardId && card.category === cardData.category
    );

    if (existingCardIndex >= 0) {
      // Update quantity
      deck.cards[existingCardIndex].quantity = Math.min(
        deck.cards[existingCardIndex].quantity + cardData.quantity,
        4 // Maximum cards per deck
      );
    } else {
      // Add new card
      deck.cards.push({
        cardId: cardData.cardId as any,
        category: cardData.category,
        quantity: Math.min(cardData.quantity, 4)
      });
    }

    return await deck.save();
  }

  async removeCardFromDeck(deckId: string, userId: string, cardId: string): Promise<IDeck> {
    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) {
      throw new Error('Deck not found');
    }

    deck.cards = deck.cards.filter(card => card.cardId.toString() !== cardId);
    return await deck.save();
  }

  async updateCardQuantity(deckId: string, userId: string, cardId: string, quantity: number): Promise<IDeck> {
    if (quantity < 1 || quantity > 4) {
      throw new Error('Quantity must be between 1 and 4');
    }

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) {
      throw new Error('Deck not found');
    }

    const cardIndex = deck.cards.findIndex(card => card.cardId.toString() === cardId);
    if (cardIndex === -1) {
      throw new Error('Card not found in deck');
    }

    deck.cards[cardIndex].quantity = quantity;
    return await deck.save();
  }

  async validateDeck(deckId: string): Promise<DeckValidationResult> {
    const deck = await Deck.findById(deckId);
    if (!deck) {
      throw new Error('Deck not found');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = deck.cards.length;

    // Basic validation rules (can be customized per game format)
    const minCards = this.getMinCardsForFormat(deck.format, deck.category);
    const maxCards = this.getMaxCardsForFormat(deck.format, deck.category);

    if (totalCards < minCards) {
      errors.push(`Deck must have at least ${minCards} cards (currently ${totalCards})`);
    }

    if (maxCards && totalCards > maxCards) {
      errors.push(`Deck cannot have more than ${maxCards} cards (currently ${totalCards})`);
    }

    // Check individual card limits
    deck.cards.forEach(card => {
      if (card.quantity > 4) {
        errors.push(`Cannot have more than 4 copies of the same card`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cardCount: {
        total: totalCards,
        unique: uniqueCards,
        minRequired: minCards,
        maxAllowed: maxCards
      }
    };
  }

  async duplicateDeck(deckId: string, userId: string, newName: string): Promise<IDeck> {
    const originalDeck = await this.getDeckById(deckId, userId);
    
    const newDeck = new Deck({
      name: newName,
      description: originalDeck.description,
      userId,
      category: originalDeck.category,
      format: originalDeck.format,
      cards: [...originalDeck.cards],
      isPublic: false,
      tags: [...originalDeck.tags]
    });

    return await newDeck.save();
  }

  private getMinCardsForFormat(format: DeckFormat, category: CardCategory): number {
    // Customize based on game rules
    if (category === CardCategory.YUGIOH) {
      return 40;
    }
    if (category === CardCategory.POKEMON) {
      return 60;
    }
    return 40; // Default
  }

  private getMaxCardsForFormat(format: DeckFormat, category: CardCategory): number | undefined {
    // Customize based on game rules
    if (category === CardCategory.YUGIOH) {
      return 60;
    }
    // Pokemon typically has no max limit for constructed formats
    return undefined;
  }
}