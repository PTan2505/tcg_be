import { Hono } from 'hono';
import { cacheMiddleware } from '../../shared/middlewares/cache.middleware';
import { rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { CardController } from './card.controller';
import { CardService } from './card.service';

const cardService = new CardService();
const cardController = new CardController(cardService);

export const cardRoutes = new Hono();

// Apply rate limiting to prevent abuse
cardRoutes.use('/*', rateLimitMiddleware(300, 60000)); // 300 requests per minute

// Get cards by type with pagination and filtering
cardRoutes.get(
  '/:type',
  validateParamsMiddleware(['type']),
  cacheMiddleware(10 * 60 * 1000), // Cache for 10 minutes
  cardController.getCardsByType
);

// Search cards by type (must come before /:type/:cardId)
cardRoutes.get(
  '/:type/search',
  validateParamsMiddleware(['type']),
  cardController.searchCards
);

// Get cards by set (must come before /:type/:cardId)
cardRoutes.get(
  '/:type/sets/:setId',
  validateParamsMiddleware(['type', 'setId']),
  cardController.getCardsBySet
);

// Get specific card by ID and type
cardRoutes.get(
  '/:type/:cardId',
  validateParamsMiddleware(['type', 'cardId']),
  cardController.getCardById
);

export default cardRoutes;