import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { UserCardService } from '../collections/userCard.service';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import {
  addCardToDeckSchema,
  createDeckSchema,
  duplicateDeckSchema,
  updateCardQuantitySchema,
  updateDeckSchema
} from './deck.validator';

const userCardService = new UserCardService();
const deckService = new DeckService(userCardService);
const deckController = new DeckController(deckService);

export const deckRoutes = new Hono();

// All routes require authentication and rate limiting
deckRoutes.use('/*', authMiddleware);
deckRoutes.use('/*', rateLimitMiddleware(100, 60000)); // 100 requests per minute for deck operations

// Create new deck
deckRoutes.post(
  '/',
  validateRequest(createDeckSchema),
  deckController.createDeck
);

// Get user's decks
deckRoutes.get(
  '/',
  deckController.getUserDecks
);

// Get specific deck (can view public decks or owned decks)
deckRoutes.get(
  '/:deckId',
  validateParamsMiddleware(['deckId']),
  deckController.getDeckById
);

// Update deck (only owner)
deckRoutes.patch(
  '/:deckId',
  validateParamsMiddleware(['deckId']),
  validateRequest(updateDeckSchema),
  deckController.updateDeck
);

// Delete deck (only owner)
deckRoutes.delete(
  '/:deckId',
  validateParamsMiddleware(['deckId']),
  deckController.deleteDeck
);

// Add card to deck (only owner, must own the card)
deckRoutes.post(
  '/:deckId/cards',
  validateParamsMiddleware(['deckId']),
  validateRequest(addCardToDeckSchema),
  deckController.addCardToDeck
);

// Remove card from deck (only owner)
deckRoutes.delete(
  '/:deckId/cards/:cardId',
  validateParamsMiddleware(['deckId', 'cardId']),
  deckController.removeCardFromDeck
);

// Update card quantity in deck (only owner)
deckRoutes.patch(
  '/:deckId/cards/:cardId',
  validateParamsMiddleware(['deckId', 'cardId']),
  validateRequest(updateCardQuantitySchema),
  deckController.updateCardQuantity
);

// Validate deck format compliance (only owner or public deck)
deckRoutes.get(
  '/:deckId/validate',
  validateParamsMiddleware(['deckId']),
  deckController.validateDeck
);

// Duplicate deck (can duplicate public decks or owned decks)
deckRoutes.post(
  '/:deckId/duplicate',
  validateParamsMiddleware(['deckId']),
  validateRequest(duplicateDeckSchema),
  deckController.duplicateDeck
);

export default deckRoutes;