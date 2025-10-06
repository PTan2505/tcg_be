import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { cacheMiddleware } from '../../shared/middlewares/cache.middleware';
import { rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { SetController } from './set.controller';
import { SetService } from './set.service';

const setService = new SetService();
const setController = new SetController(setService);

export const setRoutes = new Hono();

// Public routes for testing (no auth required)
setRoutes.get('/public/stats', setController.getSetStats);
setRoutes.get('/public/:type/stats', setController.getSetStats);
setRoutes.get('/public/:type', cacheMiddleware(15 * 60 * 1000), setController.getSetsByType);
setRoutes.get('/public/:type/search', cacheMiddleware(10 * 60 * 1000), setController.searchSets);

// All authenticated routes require authentication and rate limiting
setRoutes.use('/*', authMiddleware);
setRoutes.use('/*', rateLimitMiddleware(300, 60000)); // 300 requests per minute

// Get all sets with pagination and filtering
setRoutes.get(
  '/',
  cacheMiddleware(15 * 60 * 1000), // Cache for 15 minutes
  setController.getAllSets
);

// Get set statistics
setRoutes.get(
  '/stats',
  cacheMiddleware(30 * 60 * 1000), // Cache for 30 minutes
  setController.getSetStats
);

// Get set statistics by type
setRoutes.get(
  '/:type/stats',
  validateParamsMiddleware(['type']),
  cacheMiddleware(30 * 60 * 1000), // Cache for 30 minutes
  setController.getSetStats
);

// Search sets with advanced filters by type (must come before /:type/:setId)
setRoutes.get(
  '/:type/search',
  validateParamsMiddleware(['type']),
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  setController.searchSets
);

// Get specific set by ID within a type (must come before /:type)
setRoutes.get(
  '/:type/:setId',
  validateParamsMiddleware(['type', 'setId']),
  setController.getSetById
);

// Get specific set by group ID
setRoutes.get(
  '/group/:groupId',
  validateParamsMiddleware(['groupId']),
  setController.getSetByGroupId
);

// Get all sets by type with pagination and filtering (must come last)
setRoutes.get(
  '/:type',
  validateParamsMiddleware(['type']),
  cacheMiddleware(15 * 60 * 1000), // Cache for 15 minutes
  setController.getSetsByType
);

export default setRoutes;