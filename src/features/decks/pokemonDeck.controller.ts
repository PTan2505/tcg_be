import { Context } from 'hono';
import { IPokemonDeckService } from './pokemonDeck.service';

export class PokemonDeckController {
  constructor(private pokemonDeckService: IPokemonDeckService) {}

  getAllDecks = async (c: Context) => {
    try {
      const page = parseInt(c.req.query('page') || '1', 10);
      const limit = parseInt(c.req.query('limit') || '20', 10);
      const types = c.req.query('types')?.split(',').filter(Boolean);

      if (page < 1 || limit < 1 || limit > 100) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'pagination',
            message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1-100'
          }
        }, 400);
      }

      const result = await this.pokemonDeckService.getAllDecks(page, limit, types);

      return c.json({
        success: true,
        message: 'Pokemon decks retrieved successfully',
        data: {
          decks: result.decks,
          pagination: {
            page: result.page,
            limit: limit,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: result.page < result.totalPages,
            hasPrev: result.page > 1
          }
        }
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch Pokemon decks'
        }
      }, 500);
    }
  };

  getDeckById = async (c: Context) => {
    try {
      const { deckId } = c.req.param();

      const deck = await this.pokemonDeckService.getDeckById(deckId);

      return c.json({
        success: true,
        message: 'Pokemon deck retrieved successfully',
        data: deck
      });
    } catch (error: any) {
      if (error.message === 'Pokemon deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Pokemon deck not found'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch Pokemon deck'
        }
      }, 500);
    }
  };

  getDeckByExtId = async (c: Context) => {
    try {
      const { deckExtId } = c.req.param();

      const deck = await this.pokemonDeckService.getDeckByExtId(deckExtId);

      return c.json({
        success: true,
        message: 'Pokemon deck retrieved successfully',
        data: deck
      });
    } catch (error: any) {
      if (error.message === 'Pokemon deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckExtId',
            message: 'Pokemon deck not found'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch Pokemon deck'
        }
      }, 500);
    }
  };

  searchDecks = async (c: Context) => {
    try {
      const query = c.req.query('q') || '';
      const types = c.req.query('types')?.split(',').filter(Boolean);

      if (!query.trim()) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'query',
            message: 'Search query is required'
          }
        }, 400);
      }

      const decks = await this.pokemonDeckService.searchDecks(query, types);

      return c.json({
        success: true,
        message: 'Pokemon decks search completed',
        data: {
          decks,
          total: decks.length
        }
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to search Pokemon decks'
        }
      }, 500);
    }
  };

  getDecksByTypes = async (c: Context) => {
    try {
      const typesParam = c.req.query('types');
      
      if (!typesParam) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'types',
            message: 'Types parameter is required'
          }
        }, 400);
      }

      const types = typesParam.split(',').filter(Boolean);
      
      if (types.length === 0) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'types',
            message: 'At least one type must be specified'
          }
        }, 400);
      }

      const decks = await this.pokemonDeckService.getDecksByTypes(types);

      return c.json({
        success: true,
        message: 'Pokemon decks retrieved by types',
        data: {
          decks,
          total: decks.length,
          types
        }
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch Pokemon decks by types'
        }
      }, 500);
    }
  };

  getDeckStats = async (c: Context) => {
    try {
      const { deckId } = c.req.param();

      const stats = await this.pokemonDeckService.getDeckStats(deckId);

      return c.json({
        success: true,
        message: 'Pokemon deck stats retrieved successfully',
        data: stats
      });
    } catch (error: any) {
      if (error.message === 'Pokemon deck not found') {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'deckId',
            message: 'Pokemon deck not found'
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch Pokemon deck stats'
        }
      }, 500);
    }
  };
}