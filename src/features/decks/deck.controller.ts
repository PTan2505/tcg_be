import { Context } from 'hono';
import { AddCardToDeckOptions, CreateDeckOptions, deckService, GetDecksOptions, UpdateDeckOptions } from './deck.service';

export class DeckController {
  // Get user's decks
  getUserDecks = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const userId = user._id.toString();
      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        category: c.req.query('category') as any,
        format: c.req.query('format') as any,
        search: c.req.query('search') as string,
        sortBy: c.req.query('sortBy') as any || 'updatedAt',
        sortOrder: c.req.query('sortOrder') as any || 'desc'
      };

      const result = await deckService.getUserDecks(userId, options);
      return c.json({
        success: true,
        data: result.decks,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      console.error('Error getting user decks:', error);
      return c.json({ error: 'Failed to get decks' }, 500);
    }
  };

  // Get public decks
  getPublicDecks = async (c: Context) => {
    try {
      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        category: c.req.query('category') as any,
        format: c.req.query('format') as any,
        search: c.req.query('search') as string,
        sortBy: c.req.query('sortBy') as any || 'updatedAt',
        sortOrder: c.req.query('sortOrder') as any || 'desc'
      };

      const result = await deckService.getPublicDecks(options);
      return c.json(result);
    } catch (error) {
      console.error('Error getting public decks:', error);
      return c.json({ error: 'Failed to get public decks' }, 500);
    }
  };

  // Create a new deck
  createDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const userId = user._id.toString();
      const options: CreateDeckOptions = await c.req.json();

      const deck = await deckService.createDeck(userId, options);
      return c.json({
        success: true,
        data: deck
      }, 201);
    } catch (error) {
      console.error('Error creating deck:', error);
      return c.json({ error: 'Failed to create deck' }, 500);
    }
  };

  // Update a deck
  updateDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');
      const options: UpdateDeckOptions = await c.req.json();

      const deck = await deckService.updateDeck(deckId, userId, options);
      return c.json(deck);
    } catch (error) {
      console.error('Error updating deck:', error);
      if (error instanceof Error && error.message === 'Deck not found or access denied') {
        return c.json({ error: error.message }, 404);
      } else {
        return c.json({ error: 'Failed to update deck' }, 500);
      }
    }
  };

  // Delete a deck
  deleteDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');

      await deckService.deleteDeck(deckId, userId);
      return c.body(null, 204);
    } catch (error) {
      console.error('Error deleting deck:', error);
      if (error instanceof Error && error.message === 'Deck not found or access denied') {
        return c.json({ error: error.message }, 404);
      } else {
        return c.json({ error: 'Failed to delete deck' }, 500);
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
        return c.json({ error: 'Deck not found' }, 404);
      }

      return c.json(deck);
    } catch (error) {
      console.error('Error getting deck:', error);
      return c.json({ error: 'Failed to get deck' }, 500);
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
        return c.json({ error: error.message }, 404);
      } else {
        return c.json({ error: 'Failed to get deck stats' }, 500);
      }
    }
  };

  // Add card to deck
  addCardToDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
      }

      const userId = user._id.toString();
      const deckId = c.req.param('id');
      const options: AddCardToDeckOptions = await c.req.json();

      const deck = await deckService.addCardToDeck(deckId, userId, options);
      return c.json(deck);
    } catch (error) {
      console.error('Error adding card to deck:', error);
      if (error instanceof Error) {
        if (error.message === 'Deck not found or access denied' || error.message === 'Card not found') {
          return c.json({ error: error.message }, 404);
        } else {
          return c.json({ error: error.message }, 400);
        }
      } else {
        return c.json({ error: 'Failed to add card to deck' }, 500);
      }
    }
  };

  // Remove card from deck
  removeCardFromDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
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
          return c.json({ error: error.message }, 404);
        } else {
          return c.json({ error: error.message }, 400);
        }
      } else {
        return c.json({ error: 'Failed to remove card from deck' }, 500);
      }
    }
  };

  // Duplicate a deck
  duplicateDeck = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ error: 'User not authenticated' }, 401);
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
        return c.json({ error: error.message }, 404);
      } else {
        return c.json({ error: 'Failed to duplicate deck' }, 500);
      }
    }
  };

  // Search decks
  searchDecks = async (c: Context) => {
    try {
      const query = c.req.query('q');
      
      if (!query) {
        return c.json({ error: 'Search query is required' }, 400);
      }

      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        category: c.req.query('category') as any,
        format: c.req.query('format') as any,
        sortBy: c.req.query('sortBy') as any || 'updatedAt',
        sortOrder: c.req.query('sortOrder') as any || 'desc'
      };

      const result = await deckService.searchDecks(query, options);
      return c.json(result);
    } catch (error) {
      console.error('Error searching decks:', error);
      return c.json({ error: 'Failed to search decks' }, 500);
    }
  };

  // Get popular decks
  getPopularDecks = async (c: Context) => {
    try {
      const options: GetDecksOptions = {
        page: parseInt(c.req.query('page') || '1'),
        limit: parseInt(c.req.query('limit') || '20'),
        category: c.req.query('category') as any,
        format: c.req.query('format') as any,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      };

      const result = await deckService.getPopularDecks(options);
      return c.json(result);
    } catch (error) {
      console.error('Error getting popular decks:', error);
      return c.json({ error: 'Failed to get popular decks' }, 500);
    }
  };
}

export const deckController = new DeckController();