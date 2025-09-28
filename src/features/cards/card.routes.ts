import { Hono } from 'hono';
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
  cardController.getCardsByType
);

// Search cards by type (must come before /:type/:cardId)
cardRoutes.get(
  '/:type/search',
  validateParamsMiddleware(['type']),
  cardController.searchCards
);

// Get specific card by ID and type
cardRoutes.get(
  '/:type/:cardId',
  validateParamsMiddleware(['type', 'cardId']),
  cardController.getCardById
);

export default cardRoutes;