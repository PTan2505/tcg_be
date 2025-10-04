import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { cacheMiddleware } from '../../shared/middlewares/cache.middleware';
import { rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { CardController } from './card.controller';
import { CardService } from './card.service';

const cardService = new CardService();
const cardController = new CardController(cardService);

export const cardRoutes = new Hono();

// Public routes for testing (no auth required)
cardRoutes.get('/public/stats', cardController.getCardStats);
cardRoutes.get('/public/:type/stats', cardController.getCardStats);
cardRoutes.get('/public/:type', cacheMiddleware(15 * 60 * 1000), cardController.getCardsByGameType);
cardRoutes.get('/public/:type/search', cacheMiddleware(10 * 60 * 1000), cardController.searchCards);
cardRoutes.get('/public/product/:productId', cardController.getCardByProductId);

// All authenticated routes require authentication and rate limiting
cardRoutes.use('/*', authMiddleware);
cardRoutes.use('/*', rateLimitMiddleware(300, 60000)); // 300 requests per minute

// Get all cards with pagination and filtering
cardRoutes.get(
  '/',
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  cardController.getAllCards
);

// Get cards by game type with pagination and filtering
cardRoutes.get(
  '/:type',
  validateParamsMiddleware(['type']),
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  cardController.getCardsByGameType
);

// Search cards by game type (must come before /:type/:cardId)
cardRoutes.get(
  '/:type/search',
  validateParamsMiddleware(['type']),
  cardController.searchCards
);

// Get cards by set (must come before /:cardId)
cardRoutes.get(
  '/sets/:setId',
  validateParamsMiddleware(['setId']),
  cardController.getCardsBySet
);

// Get card statistics
cardRoutes.get(
  '/stats',
  cacheMiddleware(30 * 60 * 1000), // Cache for 30 minutes
  cardController.getCardStats
);

cardRoutes.get(
  '/:type/stats',
  validateParamsMiddleware(['type']),
  cacheMiddleware(30 * 60 * 1000), // Cache for 30 minutes
  cardController.getCardStats
);

// Get specific card by ID
cardRoutes.get(
  '/card/:cardId',
  validateParamsMiddleware(['cardId']),
  cardController.getCardById
);

// Get specific card by TCGPlayer Product ID
cardRoutes.get(
  '/product/:productId',
  validateParamsMiddleware(['productId']),
  cardController.getCardByProductId
);

export default cardRoutes;