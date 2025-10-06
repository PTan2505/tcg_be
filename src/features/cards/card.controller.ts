import { Context } from 'hono';
import { MESSAGES, createSuccessResponse } from '../../shared/constants/messages';
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
            message: MESSAGES.VALIDATION.PAGE_GREATER_THAN_ZERO
          }
        }, 400);
      }

      if (options.limit && (options.limit < 1 || options.limit > 100)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'limit',
            message: MESSAGES.VALIDATION.LIMIT_BETWEEN_1_100
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
          message: error.message || MESSAGES.CARDS.FETCH_FAILED
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
            message: MESSAGES.VALIDATION.GAME_TYPE_INVALID
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
            message: MESSAGES.VALIDATION.LIMIT_BETWEEN_1_100
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
          message: error.message || MESSAGES.CARDS.FETCH_FAILED
        }
      }, 500);
    }
  };

  getCardById = async (c: Context) => {
    try {
      const { cardId } = c.req.param();

      const card = await this.cardService.getCardById(cardId);

      return c.json(createSuccessResponse(card));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'cardId',
            message: MESSAGES.CARDS.CARD_NOT_FOUND
          }
        }, 404);
      }

      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.CARDS.FETCH_FAILED
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
            message: MESSAGES.VALIDATION.PRODUCT_ID_REQUIRED
          }
        }, 400);
      }

      const card = await this.cardService.getCardByProductId(parseInt(productId));

      return c.json(createSuccessResponse(card));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'productId',
            message: MESSAGES.CARDS.CARD_NOT_FOUND
          }
        }, 404);
      }

      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.CARDS.FETCH_FAILED
        }
      }, 500);
    }
  };

  searchCards = async (c: Context) => {
    try {
      const { type } = c.req.param();
      const { q: query, page, limit, sortBy, sortOrder } = c.req.query();

      // Validate game type
      if (!['pokemon', 'yugioh', 'onepiece'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: MESSAGES.VALIDATION.GAME_TYPE_INVALID
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
            message: MESSAGES.VALIDATION.SEARCH_QUERY_REQUIRED
          }
        }, 400);
      }

      const options: GetCardsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.cardService.searchCards(type as GameType, query, options);

      return c.json(createSuccessResponse(result.cards, MESSAGES.CARDS.SEARCH_SUCCESS, result.pagination));
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.CARDS.SEARCH_FAILED
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
            message: MESSAGES.VALIDATION.SET_ID_REQUIRED
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
            message: MESSAGES.VALIDATION.PAGE_GREATER_THAN_ZERO
          }
        }, 400);
      }

      if (options.limit && (options.limit < 1 || options.limit > 100)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'limit',
            message: MESSAGES.VALIDATION.LIMIT_BETWEEN_1_100
          }
        }, 400);
      }

      const result = await this.cardService.getCardsBySet(setId, options);

      return c.json(createSuccessResponse(result.cards, MESSAGES.CARDS.CARDS_BY_SET_SUCCESS, result.pagination));
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.CARDS.CARDS_BY_SET_FAILED
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
            message: MESSAGES.VALIDATION.GAME_TYPE_INVALID
          }
        }, 400);
      }

      const stats = await this.cardService.getCardStats(type as GameType);

      return c.json(createSuccessResponse(stats, MESSAGES.CARDS.STATS_SUCCESS));
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.CARDS.STATS_FAILED
        }
      }, 500);
    }
  };
}