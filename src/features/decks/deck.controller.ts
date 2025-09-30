import { Context } from 'hono';
import { AddCardToDeckData, CreateDeckData, IDeckService, UpdateDeckData } from './deck.service';

export class DeckController {
  constructor(private deckService: IDeckService) {}

  createDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      const deckData = c.get('validatedData') as CreateDeckData;

      const deck = await this.deckService.createDeck(user.id, deckData);

      return c.json({
        success: true,
        message: 'Deck created successfully',
        data: deck
      }, 201);
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to create deck'
        }
      }, 400);
    }
  };

  updateDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId } = c.req.param();
      const updateData = c.get('validatedData') as UpdateDeckData;

      const deck = await this.deckService.updateDeck(deckId, user.id, updateData);

      return c.json({
        success: true,
        message: 'Deck updated successfully',
        data: deck
      });
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or you do not have permission to access it'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to update deck'
        }
      }, 400);
    }
  };

  deleteDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId } = c.req.param();

      await this.deckService.deleteDeck(deckId, user.id);

      return c.json({
        success: true,
        message: 'Deck deleted successfully'
      });
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or you do not have permission to delete it'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to delete deck'
        }
      }, 400);
    }
  };

  getUserDecks = async (c: Context) => {
    try {
      const user = c.get('user');
      const decks = await this.deckService.getUserDecks(user.id);

      return c.json({
        success: true,
        data: decks,
        total: decks.length
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch user decks'
        }
      }, 500);
    }
  };

  getDeckById = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId } = c.req.param();

      // Pass user ID to check ownership or public status
      const deck = await this.deckService.getDeckById(deckId, user?.id);

      return c.json({
        success: true,
        data: deck
      });
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or is private'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch deck'
        }
      }, 500);
    }
  };

  addCardToDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId } = c.req.param();
      const cardData = c.get('validatedData') as AddCardToDeckData;

      const deck = await this.deckService.addCardToDeck(deckId, user.id, cardData);

      return c.json({
        success: true,
        message: 'Card added to deck successfully',
        data: deck
      });
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or you do not have permission to modify it'
          }
        }, 404);
      }
      if (error.message === 'You do not own this card') {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'cardId',
            message: 'You do not own this card'
          }
        }, 403);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to add card to deck'
        }
      }, 400);
    }
  };

  removeCardFromDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId, cardId } = c.req.param();

      const deck = await this.deckService.removeCardFromDeck(deckId, user.id, cardId);

      return c.json({
        success: true,
        message: 'Card removed from deck successfully',
        data: deck
      });
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or you do not have permission to modify it'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to remove card from deck'
        }
      }, 400);
    }
  };

  updateCardQuantity = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId, cardId } = c.req.param();
      const { quantity } = c.get('validatedData');

      const deck = await this.deckService.updateCardQuantity(deckId, user.id, cardId, quantity);

      return c.json({
        success: true,
        message: 'Card quantity updated successfully',
        data: deck
      });
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or you do not have permission to modify it'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to update card quantity'
        }
      }, 400);
    }
  };

  validateDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId } = c.req.param();

      // First check if user owns the deck
      await this.deckService.getDeckById(deckId, user.id);
      
      const validation = await this.deckService.validateDeck(deckId);

      return c.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or you do not have permission to access it'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to validate deck'
        }
      }, 500);
    }
  };

  duplicateDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      const { deckId } = c.req.param();
      const { name } = c.get('validatedData');

      const newDeck = await this.deckService.duplicateDeck(deckId, user.id, name);

      return c.json({
        success: true,
        message: 'Deck duplicated successfully',
        data: newDeck
      }, 201);
    } catch (error: any) {
      if (error.message === 'Deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Deck not found or is private'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to duplicate deck'
        }
      }, 400);
    }
  };
}