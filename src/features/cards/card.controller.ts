import { Context } from 'hono';
import { CardType, GetCardsOptions, ICardService } from './card.service';

export class CardController {
  constructor(private cardService: ICardService) {}

  getCardsByType = async (c: Context) => {
    try {
      const { type } = c.req.param();
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        rarity,
        cardType,
        set,
        attribute,
        race
      } = c.req.query();

      // Validate card type
      if (!['pokemon', 'yugioh'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Card type must be either "pokemon" or "yugioh"'
          }
        }, 400);
      }

      const options: GetCardsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
        filters: {
          rarity,
          type: cardType,
          set,
          attribute,
          race
        }
      };

      // Validate pagination parameters
      if (options.page && options.page < 1) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'page',
            message: 'Page must be greater than 0'
          }
        }, 400);
      }

      if (options.limit && (options.limit < 1 || options.limit > 100)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'limit',
            message: 'Limit must be between 1 and 100'
          }
        }, 400);
      }

      const result = await this.cardService.getCardsByType(type as CardType, options);

      return c.json({
        success: true,
        data: result.cards,
        pagination: result.pagination
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch cards'
        }
      }, 500);
    }
  };

  getCardById = async (c: Context) => {
    try {
      const { type, cardId } = c.req.param();

      // Validate card type
      if (!['pokemon', 'yugioh'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Card type must be either "pokemon" or "yugioh"'
          }
        }, 400);
      }

      const card = await this.cardService.getCardById(cardId, type as CardType);

      return c.json({
        success: true,
        data: card
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'cardId',
            message: error.message
          }
        }, 404);
      }

      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch card'
        }
      }, 500);
    }
  };

  searchCards = async (c: Context) => {
    try {
      const { type } = c.req.param();
      const { q: query, page, limit, sortBy, sortOrder } = c.req.query();

      // Validate card type
      if (!['pokemon', 'yugioh'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Card type must be either "pokemon" or "yugioh"'
          }
        }, 400);
      }

      // Validate search query
      if (!query || query.trim().length === 0) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'q',
            message: 'Search query is required'
          }
        }, 400);
      }

      const options: GetCardsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.cardService.searchCards(type as CardType, query, options);

      return c.json({
        success: true,
        data: result.cards,
        pagination: result.pagination
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to search cards'
        }
      }, 500);
    }
  };

  getCardsBySet = async (c: Context) => {
    try {
      const { type, setId } = c.req.param();
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder
      } = c.req.query();

      // Validate card type
      if (!['pokemon', 'yugioh'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Card type must be either "pokemon" or "yugioh"'
          }
        }, 400);
      }

      // Validate set identifier
      if (!setId || setId.trim().length === 0) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'setId',
            message: 'Set ID is required'
          }
        }, 400);
      }

      const options: GetCardsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      // Validate pagination parameters
      if (options.page && options.page < 1) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'page',
            message: 'Page must be greater than 0'
          }
        }, 400);
      }

      if (options.limit && (options.limit < 1 || options.limit > 100)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'limit',
            message: 'Limit must be between 1 and 100'
          }
        }, 400);
      }

      const result = await this.cardService.getCardsBySet(type as CardType, setId, options);

      return c.json({
        success: true,
        data: result.cards,
        pagination: result.pagination,
        metadata: {
          setId,
          cardType: type
        }
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch cards by set'
        }
      }, 500);
    }
  };
}