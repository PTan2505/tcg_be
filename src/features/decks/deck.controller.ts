import { Context } from 'hono';
import { createErrorResponse, createSuccessResponse, MESSAGES } from '../../shared/constants/messages';
import AppError from '../../shared/errors/AppError';
import { AddCardToDeckOptions, CreateDeckOptions, deckService, GetDecksOptions, UpdateDeckOptions } from './deck.service';

export class DeckController {
  // Get user's decks
  getUserDecks = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(createErrorResponse(MESSAGES.AUTH.AUTHENTICATION_REQUIRED), 401);
      }

      const userId = user._id.toString();
      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        gameType: c.req.query('gameType') as any,
        search: c.req.query('search') as string,
        sortBy: c.req.query('sortBy') as any || 'updatedAt',
        sortOrder: c.req.query('sortOrder') as any || 'desc'
      };

      const result = await deckService.getUserDecks(userId, options);
      return c.json(createSuccessResponse(result.decks, MESSAGES.DECKS.GET_SUCCESS, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore
      }));
    } catch (error) {
      console.error('Error getting user decks:', error);
      return c.json(createErrorResponse(MESSAGES.DECKS.GET_FAILED), 500);
    }
  };

  // Get public decks
  getPublicDecks = async (c: Context) => {
    try {
      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        gameType: c.req.query('gameType') as any,
        search: c.req.query('search') as string,
        sortBy: c.req.query('sortBy') as any || 'updatedAt',
        sortOrder: c.req.query('sortOrder') as any || 'desc'
      };

      const result = await deckService.getPublicDecks(options);
      return c.json(result);
    } catch (error) {
      console.error('Error getting public decks:', error);
      return c.json(createErrorResponse(MESSAGES.DECKS.GET_FAILED), 500);
    }
  };

  // Create a new deck
  createDeck = async (c: Context) => {
    try {
      console.log('DEBUG: Entering DeckController.createDeck');
      const user = c.get('user');
      if (!user) {
        return c.json(createErrorResponse(MESSAGES.AUTH.AUTHENTICATION_REQUIRED), 401);
      }

      const userId = user._id.toString();
      const options: CreateDeckOptions = await c.req.json();
      const deck = await deckService.createDeck(userId, options);
      return c.json(createSuccessResponse(deck, MESSAGES.DECKS.CREATE_SUCCESS), 201);
    } catch (error: any) {
      console.error('Error creating deck:', error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || MESSAGES.DECKS.CREATE_FAILED);
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  // Update a deck
  updateDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(createErrorResponse(MESSAGES.AUTH.AUTHENTICATION_REQUIRED), 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');
      const options: UpdateDeckOptions = await c.req.json();

      // Validation of provided cards (gameType, existence) is handled in the service

      const deck = await deckService.updateDeck(deckId, userId, options);
      return c.json(createSuccessResponse(deck, MESSAGES.DECKS.UPDATE_SUCCESS));
    } catch (error) {
      console.error('Error updating deck:', error);
      if (error instanceof Error) {
        // Map known service errors to proper HTTP responses and localized messages
        if (error.message === 'Deck not found or access denied') {
          return c.json(createErrorResponse(MESSAGES.DECKS.DECK_NOT_FOUND_OR_ACCESS_DENIED), 404);
        }

        if (error.message === MESSAGES.VALIDATION.CARD_ID_REQUIRED) {
          return c.json(createErrorResponse(MESSAGES.VALIDATION.CARD_ID_REQUIRED), 400);
        }

        if (error.message === MESSAGES.CARDS.CARD_NOT_FOUND) {
          return c.json(createErrorResponse(MESSAGES.CARDS.CARD_NOT_FOUND), 404);
        }

        if (error.message === MESSAGES.VALIDATION.GAME_TYPE_INVALID) {
          return c.json(createErrorResponse(MESSAGES.VALIDATION.GAME_TYPE_INVALID), 400);
        }

        // For other known string errors thrown by service, return 400
        return c.json(createErrorResponse(error.message), 400);
      } else {
        return c.json(createErrorResponse(MESSAGES.DECKS.UPDATE_FAILED), 500);
      }
    }
  };

  // Delete a deck
  deleteDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(createErrorResponse(MESSAGES.AUTH.AUTHENTICATION_REQUIRED), 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');

      await deckService.deleteDeck(deckId, userId);
      return c.body(null, 204);
    } catch (error) {
      console.error('Error deleting deck:', error);
      if (error instanceof Error && error.message === 'Deck not found or access denied') {
        return c.json(createErrorResponse(MESSAGES.DECKS.DECK_NOT_FOUND_OR_ACCESS_DENIED), 404);
      } else {
        return c.json(createErrorResponse(MESSAGES.DECKS.DELETE_FAILED), 500);
      }
    }
  };

  // Get deck by ID
  getDeckById = async (c: Context) => {
    try {
      const deckId = c.req.param('id');
      const user = c.get('user');
      const userId = user?._id?.toString(); // Optional authentication

      const deck = await deckService.getDeckById(deckId, userId);
      
      if (!deck) {
        return c.json(createErrorResponse(MESSAGES.DECKS.DECK_NOT_FOUND), 404);
      }

      return c.json(deck);
    } catch (error) {
      console.error('Error getting deck:', error);
      return c.json(createErrorResponse(MESSAGES.DECKS.GET_FAILED), 500);
    }
  };

  // Get deck statistics
  getDeckStats = async (c: Context) => {
    try {
      const deckId = c.req.param('id');
      const user = c.get('user');
      const userId = user?._id?.toString(); // Optional authentication

      const stats = await deckService.getDeckStats(deckId, userId);
      return c.json(stats);
    } catch (error) {
      console.error('Error getting deck stats:', error);
      if (error instanceof Error && error.message === 'Deck not found or access denied') {
        return c.json(createErrorResponse(MESSAGES.DECKS.DECK_NOT_FOUND_OR_ACCESS_DENIED), 404);
      } else {
        return c.json(createErrorResponse(MESSAGES.DECKS.GET_FAILED), 500);
      }
    }
  };

  // Add card to deck
  addCardToDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(createErrorResponse(MESSAGES.AUTH.AUTHENTICATION_REQUIRED), 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');
      const options: AddCardToDeckOptions = await c.req.json();

      const deck = await deckService.addCardToDeck(deckId, userId, options);
      return c.json(deck);
    } catch (error: any) {
      console.error('Error adding card to deck:', error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      // Map some known service string errors to reasonable statuses
      if (error instanceof Error && (error.message === 'Deck not found or access denied' || error.message === 'Card not found')) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      if (error instanceof Error) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(MESSAGES.DECKS.UPDATE_FAILED);
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  // Remove card from deck
  removeCardFromDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(createErrorResponse(MESSAGES.AUTH.AUTHENTICATION_REQUIRED), 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');
      const cardId = c.req.param('cardId');
      const body = await c.req.json();
      const quantity = parseInt(body.quantity) || 1;

      const deck = await deckService.removeCardFromDeck(deckId, userId, cardId, quantity);
      return c.json(deck);
    } catch (error) {
      console.error('Error removing card from deck:', error);
      if (error instanceof Error) {
        if (error.message === 'Deck not found or access denied' || error.message === 'Card not found in deck') {
          return c.json(createErrorResponse(error.message), 404);
        } else {
          return c.json(createErrorResponse(error.message), 400);
        }
      } else {
        return c.json(createErrorResponse(MESSAGES.DECKS.UPDATE_FAILED), 500);
      }
    }
  };

  // Duplicate a deck
  duplicateDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json(createErrorResponse(MESSAGES.AUTH.AUTHENTICATION_REQUIRED), 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');
      const body = await c.req.json();
      const newName = body.name;

      const deck = await deckService.duplicateDeck(deckId, userId, newName);
      return c.json(deck, 201);
    } catch (error) {
      console.error('Error duplicating deck:', error);
      if (error instanceof Error && error.message === 'Deck not found or access denied') {
        return c.json(createErrorResponse(MESSAGES.DECKS.DECK_NOT_FOUND_OR_ACCESS_DENIED), 404);
      } else {
        return c.json(createErrorResponse(MESSAGES.DECKS.CREATE_FAILED), 500);
      }
    }
  };

  // Search decks
  searchDecks = async (c: Context) => {
    try {
      const query = c.req.query('q');
      
      if (!query) {
        return c.json(createErrorResponse(MESSAGES.VALIDATION.SEARCH_QUERY_REQUIRED), 400);
      }

      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        gameType: c.req.query('gameType') as any,
        sortBy: c.req.query('sortBy') as any || 'updatedAt',
        sortOrder: c.req.query('sortOrder') as any || 'desc'
      };

      const result = await deckService.searchDecks(query, options);
      return c.json(result);
    } catch (error) {
      console.error('Error searching decks:', error);
      return c.json(createErrorResponse(MESSAGES.DECKS.GET_FAILED), 500);
    }
  };

  // Get popular decks
  getPopularDecks = async (c: Context) => {
    try {
      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        gameType: c.req.query('gameType') as any,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      };

      const result = await deckService.getPopularDecks(options);
      return c.json(result);
    } catch (error) {
      console.error('Error getting popular decks:', error);
      return c.json(createErrorResponse(MESSAGES.DECKS.GET_FAILED), 500);
    }
  };
}

export const deckController = new DeckController();