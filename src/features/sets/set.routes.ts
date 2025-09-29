import { Hono } from 'hono';
import { cacheMiddleware } from '../../shared/middlewares/cache.middleware';
import { rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { SetController } from './set.controller';
import { SetService } from './set.service';

const setService = new SetService();
const setController = new SetController(setService);

export const setRoutes = new Hono();

// Apply rate limiting to prevent abuse
setRoutes.use('/*', rateLimitMiddleware(300, 60000)); // 300 requests per minute

// Search sets with advanced filters by category (must come before /:category/:setId)
setRoutes.get(
  '/:category/search',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  setController.searchSets
);

// Get specific set by ID within a category (must come before /:category)
setRoutes.get(
  '/:category/:setId',
  validateParamsMiddleware(['setId']),
  setController.getSetById
);

// Get all sets by category with pagination and filtering (must come last)
setRoutes.get(
  '/:category',
  cacheMiddleware(15 * 60 * 1000), // Cache for 15 minutes
  setController.getAllSets
);

export default setRoutes;