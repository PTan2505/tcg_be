import { Context } from 'hono';
import { GameType, GetCardsOptions, ICardService } from './card.service';

export class CardController {
  constructor(private cardService: ICardService) {}

  getAllCards = async (c: Context) => {
    try {
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        rarity,
        setId,
        minPrice,
        maxPrice
      } = c.req.query();

      const options: GetCardsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
        rarity,
        setId,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
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

      const result = await this.cardService.getAllCards(options);

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

  getCardsByGameType = async (c: Context) => {
    try {
      const { type } = c.req.param();
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        rarity,
        setId,
        minPrice,
        maxPrice
      } = c.req.query();

      // Validate game type
      if (!['pokemon', 'yugioh', 'onepiece'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Game type must be "pokemon", "yugioh", or "onepiece"'
          }
        }, 400);
      }

      const options: GetCardsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
        rarity,
        setId,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
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

      const result = await this.cardService.getCardsByGameType(type as GameType, options);

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
      const { cardId } = c.req.param();

      const card = await this.cardService.getCardById(cardId);

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

  getCardByProductId = async (c: Context) => {
    try {
      const { productId } = c.req.param();

      if (!productId || isNaN(parseInt(productId))) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'productId',
            message: 'Valid product ID is required'
          }
        }, 400);
      }

      const card = await this.cardService.getCardByProductId(parseInt(productId));

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
            field: 'productId',
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
      const {
        q: query,
        page,
        limit,
        sortBy,
        sortOrder,
        rarity,
        minPrice,
        maxPrice,
      } = c.req.query();

      // Validate game type
      if (!['pokemon', 'yugioh', 'onepiece'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Game type must be "pokemon", "yugioh", or "onepiece"'
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
        sortOrder: sortOrder as "asc" | "desc",
        rarity,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      };

      const result = await this.cardService.searchCards(type as GameType, query, options);

      return c.json({
        success: true,
        data: result.cards,
        pagination: result.pagination,
        query
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
      const { setId } = c.req.param();
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder
      } = c.req.query();

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

      const result = await this.cardService.getCardsBySet(setId, options);

      return c.json({
        success: true,
        data: result.cards,
        pagination: result.pagination,
        metadata: {
          setId
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

  getCardStats = async (c: Context) => {
    try {
      const { type } = c.req.param();

      // Validate game type if provided
      if (type && !['pokemon', 'yugioh', 'onepiece'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Game type must be "pokemon", "yugioh", or "onepiece"'
          }
        }, 400);
      }

      const stats = await this.cardService.getCardStats(type as GameType);

      return c.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch card statistics'
        }
      }, 500);
    }
  };
}