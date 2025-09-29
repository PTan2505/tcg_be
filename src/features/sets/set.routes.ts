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

// Search sets with advanced filters (must come before /:setId)
setRoutes.get(
  '/search',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  setController.searchSets
);

// Get all sets with optional type filtering and pagination
setRoutes.get(
  '/',
  cacheMiddleware(15 * 60 * 1000), // Cache for 15 minutes
  setController.getAllSets
);

// Get specific set by ID
setRoutes.get(
  '/:setId',
  validateParamsMiddleware(['setId']),
  setController.getSetById
);

export default setRoutes;