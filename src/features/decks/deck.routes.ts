import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { deckController } from './deck.controller';

const deck = new Hono();

// User deck management routes (protected)
deck.get('/user', authMiddleware, deckController.getUserDecks);
deck.post('/user', authMiddleware, deckController.createDeck);
deck.get('/user/:id', authMiddleware, deckController.getDeckById);
deck.put('/user/:id', authMiddleware, deckController.updateDeck);
deck.delete('/user/:id', authMiddleware, deckController.deleteDeck);

// User deck card management
deck.post('/user/:id/cards', authMiddleware, deckController.addCardToDeck);
deck.put('/user/:id/cards/:cardId', authMiddleware, (c) => c.json({ 
  success: false, 
  error: 'Update deck card not implemented yet' 
}, 404));
deck.delete('/user/:id/cards/:cardId', authMiddleware, deckController.removeCardFromDeck);

// User deck operations
deck.post('/user/:id/validate', authMiddleware, (c) => c.json({ 
  success: true, 
  message: 'Deck validation placeholder - always valid' 
}));
deck.post('/user/:id/duplicate', authMiddleware, deckController.duplicateDeck);

// Public routes
deck.get('/public', deckController.getPublicDecks);
deck.get('/search', deckController.searchDecks);
deck.get('/popular', deckController.getPopularDecks);
deck.get('/:id', deckController.getDeckById);
deck.get('/:id/stats', deckController.getDeckStats);

export default deck;