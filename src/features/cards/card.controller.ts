import { Context } from 'hono';
import { getCardCategory, getValidCardCategories } from '../../shared/types/card.types';
import { GetCardsOptions, ICardService } from './card.service';

export class CardController {
  constructor(private cardService: ICardService) {}

  getCardsByType = async (c: Context) => {
    try {
      const { category } = c.req.param();
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

      // Validate card category
      try {
        getCardCategory(category); // This will throw if invalid
      } catch (error) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'category',
            message: `Card category must be one of: ${getValidCardCategories().join(', ')}`
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

      const cardCategory = getCardCategory(category);
      const result = await this.cardService.getCardsByType(cardCategory, options);

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
      const { category, cardId } = c.req.param();

      // Validate card category
      if (!['pokemon', 'yugioh'].includes(category)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'category',
            message: 'Card category must be either "pokemon" or "yugioh"'
          }
        }, 400);
      }

      const cardCategory = getCardCategory(category);
      const card = await this.cardService.getCardById(cardId, cardCategory);

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
      const { category } = c.req.param();
      const { q: query, page, limit, sortBy, sortOrder } = c.req.query();

      // Validate card category
      if (!['pokemon', 'yugioh'].includes(category)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'category',
            message: 'Card category must be either "pokemon" or "yugioh"'
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

      const cardCategory = getCardCategory(category);
      const result = await this.cardService.searchCards(cardCategory, query, options);

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
      const { category, setId } = c.req.param();
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder
      } = c.req.query();

      // Validate card category
      if (!['pokemon', 'yugioh'].includes(category)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'category',
            message: 'Card category must be either "pokemon" or "yugioh"'
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

      const cardCategory = getCardCategory(category);
      const result = await this.cardService.getCardsBySet(cardCategory, setId, options);

      return c.json({
        success: true,
        data: result.cards,
        pagination: result.pagination,
        metadata: {
          setId,
          cardCategory: category
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