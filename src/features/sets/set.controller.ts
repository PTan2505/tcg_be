import { Context } from 'hono';
import { GetSetsOptions, ISetService, SetType } from './set.service';

export class SetController {
  constructor(private setService: ISetService) {}

  getAllSets = async (c: Context) => {
    try {
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        isSupplemental,
        categoryId
      } = c.req.query();

      const options: GetSetsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
        isSupplemental: isSupplemental ? isSupplemental === 'true' : undefined,
        categoryId: categoryId ? parseInt(categoryId) : undefined
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

      const result = await this.setService.getAllSets(options);

      return c.json({
        success: true,
        data: result.sets,
        pagination: result.pagination
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch sets'
        }
      }, 500);
    }
  };

  getSetsByType = async (c: Context) => {
    try {
      const { type } = c.req.param();
      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        isSupplemental,
        categoryId
      } = c.req.query();

      // Validate set type
      if (!['pokemon', 'yugioh', 'onepiece'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Set type must be "pokemon", "yugioh", or "onepiece"'
          }
        }, 400);
      }

      const options: GetSetsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
        isSupplemental: isSupplemental ? isSupplemental === 'true' : undefined,
        categoryId: categoryId ? parseInt(categoryId) : undefined
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

      const result = await this.setService.getSetsByType(type as SetType, options);

      return c.json({
        success: true,
        data: result.sets,
        pagination: result.pagination
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch sets'
        }
      }, 500);
    }
  };

  getSetById = async (c: Context) => {
    try {
      const { setId } = c.req.param();

      const set = await this.setService.getSetById(setId);

      return c.json({
        success: true,
        data: set
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'setId',
            message: error.message
          }
        }, 404);
      }

      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch set'
        }
      }, 500);
    }
  };

  getSetByGroupId = async (c: Context) => {
    try {
      const { groupId } = c.req.param();

      if (!groupId || isNaN(parseInt(groupId))) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'groupId',
            message: 'Valid group ID is required'
          }
        }, 400);
      }

      const set = await this.setService.getSetByGroupId(parseInt(groupId));

      return c.json({
        success: true,
        data: set
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return c.json({
          success: false,
          error: {
            name: 'NotFoundError',
            field: 'groupId',
            message: error.message
          }
        }, 404);
      }

      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to fetch set'
        }
      }, 500);
    }
  };

  searchSets = async (c: Context) => {
    try {
      const { type } = c.req.param();
      const { q: query, page, limit, sortBy, sortOrder } = c.req.query();

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

      // Validate set type
      if (!['pokemon', 'yugioh', 'onepiece'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Set type must be "pokemon", "yugioh", or "onepiece"'
          }
        }, 400);
      }

      const options: GetSetsOptions = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await this.setService.searchSets(type as SetType, query, options);

      return c.json({
        success: true,
        data: result.sets,
        pagination: result.pagination,
        query
      });
    } catch (error: any) {
      return c.json({
        success: false,
        error: {
          name: 'Error',
          field: 'general',
          message: error.message || 'Failed to search sets'
        }
      }, 500);
    }
  };

  getSetStats = async (c: Context) => {
    try {
      const { type } = c.req.param();

      // Validate set type if provided
      if (type && !['pokemon', 'yugioh', 'onepiece'].includes(type)) {
        return c.json({
          success: false,
          error: {
            name: 'ValidationError',
            field: 'type',
            message: 'Set type must be "pokemon", "yugioh", or "onepiece"'
          }
        }, 400);
      }

      const stats = await this.setService.getSetStats(type as SetType);

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
          message: error.message || 'Failed to fetch set statistics'
        }
      }, 500);
    }
  };
}