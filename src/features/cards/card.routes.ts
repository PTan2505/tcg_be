import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { cacheMiddleware } from '../../shared/middlewares/cache.middleware';
import { rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { CardController } from './card.controller';
import { CardService } from './card.service';

const cardService = new CardService();
const cardController = new CardController(cardService);

export const cardRoutes = new Hono();

// All routes require authentication and rate limiting
cardRoutes.use('/*', authMiddleware);
cardRoutes.use('/*', rateLimitMiddleware(300, 60000)); // 300 requests per minute

// Get cards by category with pagination and filtering
cardRoutes.get(
  '/:category',
  validateParamsMiddleware(['category']),
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  cardController.getCardsByType
);

// Search cards by category (must come before /:category/:cardId)
cardRoutes.get(
  '/:category/search',
  validateParamsMiddleware(['category']),
  cardController.searchCards
);

// Get cards by set (must come before /:category/:cardId)
cardRoutes.get(
  '/:category/sets/:setId',
  validateParamsMiddleware(['category', 'setId']),
  cardController.getCardsBySet
);

// Get specific card by ID and category
cardRoutes.get(
  '/:category/:cardId',
  validateParamsMiddleware(['category', 'cardId']),
  cardController.getCardById
);

export default cardRoutes;