import { Context } from 'hono';
import { MESSAGES, createSuccessResponse } from '../../shared/constants/messages';
import { GameType } from '../cards/card.service';
import { GetUserCardsOptions, IUserCardService } from './userCard.service';

export class UserCardController {
  constructor(private userCardService: IUserCardService) {
  }

  addCard = async (c: Context) => {
    try {
      const user = c.get('user');
      const { cardId } = c.get('validatedData');

      const userCard = await this.userCardService.addCardToCollection(
        user.id,
        cardId
      );

      return c.json(createSuccessResponse(userCard, MESSAGES.COLLECTIONS.ADD_CARD_SUCCESS), 201);
    } catch (error: any) {
      if (error.message === 'Card is already in your collection') {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'cardId',
            message: MESSAGES.COLLECTIONS.CARD_ALREADY_EXISTS
          }
        }, 400);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.COLLECTIONS.ADD_CARD_FAILED
        }
      }, 400);
    }
  };

  removeCard = async (c: Context) => {
    try {
      const user = c.get('user');
      const { cardId } = c.req.param();

      await this.userCardService.removeCardFromCollection(
        user.id,
        cardId,
      );

      return c.json({
        success: true,
        message: MESSAGES.COLLECTIONS.REMOVE_CARD_SUCCESS
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.COLLECTIONS.REMOVE_CARD_FAILED
        }
      }, 400);
    }
  };

  getUserCollection = async (c: Context) => {
    try {
      const user = c.get('user');
      const {
        sortBy,
        sortOrder,
        limit,
        page,
        search,
        gameType,
        rarity,
        setId,
        minPrice,
        maxPrice
      } = c.req.query();

      const options: GetUserCardsOptions = {
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        limit: limit ? parseInt(limit) : undefined,
        page: page ? parseInt(page) : undefined,
        search,
        gameType: gameType as GameType,
        filters: {
          rarity,
          setId,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
        }
      };

      const userCards = await this.userCardService.getUserCards(user.id, options);

      return c.json(createSuccessResponse(userCards, MESSAGES.COLLECTIONS.GET_SUCCESS));
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.COLLECTIONS.GET_FAILED
        }
      }, 500);
    }
  };

  getUserCardsByGameType = async (c: Context) => {
    try {
      const user = c.get('user');
      const { gameType } = c.req.param();
         const {
           sortBy,
           sortOrder,
           limit,
           page,
           search,
           rarity,
           setId,
           minPrice,
           maxPrice,
         } = c.req.query();

         const options: GetUserCardsOptions = {
           sortBy: sortBy as any,
           sortOrder: sortOrder as any,
           limit: limit ? parseInt(limit) : undefined,
           page: page ? parseInt(page) : undefined,
           search,
           gameType: gameType as GameType,
           filters: {
             rarity,
             setId,
             minPrice: minPrice ? parseFloat(minPrice) : undefined,
             maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
           },
         };


      if (!["pokemon", "yugioh", "onepiece"].includes(gameType)) {
        return c.json(
          {
            success: false,
            error: {
              name: "ValidationError",
              field: "gameType",
              message: MESSAGES.VALIDATION.GAME_TYPE_INVALID,
            },
          },
          400
        );
      }

      const userCards = await this.userCardService.getUserCardsByGameType(
        user.id,
        gameType as GameType,
        options,
      );

      return c.json(createSuccessResponse(userCards, MESSAGES.COLLECTIONS.GET_SUCCESS));
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.COLLECTIONS.GET_FAILED
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
            message: MESSAGES.VALIDATION.SEARCH_QUERY_REQUIRED
          }
        }, 400);
      }

      const userCards = await this.userCardService.searchUserCards(user.id, query);

      return c.json(createSuccessResponse(userCards, MESSAGES.COLLECTIONS.GET_SUCCESS));
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.COLLECTIONS.GET_FAILED
        }
      }, 500);
    }
  };

  getCardDetails = async (c: Context) => {
    try {
      const { cardId } = c.req.param();

      const cardDetails = await this.userCardService.getCardDetails(cardId);

      return c.json(createSuccessResponse(cardDetails));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'cardId',
            message: MESSAGES.COLLECTIONS.CARD_NOT_FOUND_IN_COLLECTION
          }
        }, 404);
      }
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.COLLECTIONS.GET_FAILED
        }
      }, 500);
    }
  };

  getSetsByGameType = async (c: Context) => {
    try {
      const user = c.get('user');
      const { gameType } = c.req.param();

      if (!["pokemon", "yugioh", "onepiece"].includes(gameType)) {
        return c.json(
          {
            success: false,
            error: {
              name: "ValidationError",
              field: "gameType",
              message: MESSAGES.VALIDATION.GAME_TYPE_INVALID,
            },
          },
          400
        );
      }

      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder
      } = c.req.query();

      const options = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        sortBy: sortBy as 'name' | 'publishedOn' | 'cardCount',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.userCardService.getUserCollectionSets(
        user.id, 
        gameType as GameType, 
        options
      );

      return c.json(createSuccessResponse(result.sets, MESSAGES.COLLECTIONS.GET_SUCCESS, {
        pagination: result.pagination
      }));
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || MESSAGES.COLLECTIONS.GET_FAILED
        }
      }, 500);
    }
  };
}