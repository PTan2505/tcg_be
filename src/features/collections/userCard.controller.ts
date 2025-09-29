import { Context } from 'hono';
import { CardCategory } from '../../database/models/userCard';
import { GetUserCardsOptions, IUserCardService } from './userCard.service';

export class UserCardController {
  constructor(private userCardService: IUserCardService) {}

  addCard = async (c: Context) => {
    try {
      const user = c.get('user');
      const { cardId, category } = c.get('validatedData');

      const userCard = await this.userCardService.addCardToCollection(
        user.id,
        cardId,
        category
      );

      return c.json({
        success: true,
        message: 'Card added to collection successfully',
        data: userCard
      }, 201);
    } catch (error: any) {
      if (error.message === 'Card is already in your collection') {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'cardId',
            message: error.message
          }
        }, 400);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to add card to collection'
        }
      }, 400);
    }
  };

  removeCard = async (c: Context) => {
    try {
      const user = c.get('user');
      const { cardId } = c.req.param();
      const { category } = c.req.query();

      if (!category || !Object.values(CardCategory).includes(category as CardCategory)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'category',
            message: 'Valid category is required'
          }
        }, 400);
      }

      await this.userCardService.removeCardFromCollection(
        user.id,
        cardId,
        category as CardCategory
      );

      return c.json({
        success: true,
        message: 'Card removed from collection successfully'
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to remove card from collection'
        }
      }, 400);
    }
  };

  getUserCollection = async (c: Context) => {
    try {
      const user = c.get('user');
      const {
        category,
        sortBy,
        sortOrder,
        limit,
        offset,
        search,
        type,
        set,
        rarity
      } = c.req.query();

      const options: GetUserCardsOptions = {
        category: category as CardCategory,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        search,
        filters: {
          type,
          set,
          rarity
        }
      };

      const userCards = await this.userCardService.getUserCards(user.id, options);

      return c.json({
        success: true,
        data: userCards,
        total: userCards.length
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch user collection'
        }
      }, 500);
    }
  };

  getUserCardsByCategory = async (c: Context) => {
    try {
      const user = c.get('user');
      const { category } = c.req.param();

      if (!Object.values(CardCategory).includes(category as CardCategory)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'category',
            message: 'Invalid category'
          }
        }, 400);
      }

      const userCards = await this.userCardService.getUserCardsByCategory(
        user.id,
        category as CardCategory
      );

      return c.json({
        success: true,
        data: userCards,
        total: userCards.length
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch user cards by category'
        }
      }, 500);
    }
  };

  searchUserCards = async (c: Context) => {
    try {
      const user = c.get('user');
      const { q: query } = c.req.query();

      if (!query) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'q',
            message: 'Search query is required'
          }
        }, 400);
      }

      const userCards = await this.userCardService.searchUserCards(user.id, query);

      return c.json({
        success: true,
        data: userCards,
        total: userCards.length
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to search user cards'
        }
      }, 500);
    }
  };

  getCardDetails = async (c: Context) => {
    try {
      const { cardId } = c.req.param();
      const { category } = c.req.query();

      if (!category || !Object.values(CardCategory).includes(category as CardCategory)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'category',
            message: 'Valid category is required'
          }
        }, 400);
      }

      const cardDetails = await this.userCardService.getCardDetails(
        cardId,
        category as CardCategory
      );

      return c.json({
        success: true,
        data: cardDetails
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
          message: error.message || 'Failed to get card details'
        }
      }, 500);
    }
  };
}