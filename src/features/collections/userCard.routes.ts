import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { ownershipMiddleware, rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { UserCardController } from './userCard.controller';
import { UserCardService } from './userCard.service';
import { addCardSchema } from './userCard.validator';

const userCardService = new UserCardService();
const userCardController = new UserCardController(userCardService);

export const userCardRoutes = new Hono();

// All routes require authentication and rate limiting
userCardRoutes.use('/*', authMiddleware);
userCardRoutes.use('/*', rateLimitMiddleware(200, 60000)); // 200 requests per minute
userCardRoutes.use('/*', ownershipMiddleware('userCard'));

// Add card to collection
userCardRoutes.post(
  '/',
  validateRequest(addCardSchema),
  userCardController.addCard
);

// Remove card from collection
userCardRoutes.delete(
  '/:cardId',
  validateParamsMiddleware(['cardId']),
  userCardController.removeCard
);

// Get user's complete collection with filtering/searching
userCardRoutes.get(
  '/',
  userCardController.getUserCollection
);

// Get user's cards by game type
userCardRoutes.get(
  '/cards/:gameType',
  validateParamsMiddleware(['gameType']),
  userCardController.getUserCardsByGameType
);

// Get sets by game type
userCardRoutes.get(
  '/sets/:gameType',
  validateParamsMiddleware(['gameType']),
  userCardController.getSetsByGameType
);

// Search user's cards
userCardRoutes.get(
  '/search',
  userCardController.searchUserCards
);

// Get detailed information about a specific card
userCardRoutes.get(
  '/details/:cardId',
  validateParamsMiddleware(['cardId']),
  userCardController.getCardDetails
);

export default userCardRoutes;