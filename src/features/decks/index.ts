import { Hono } from 'hono';
import deckRoutes from './deck.routes';
import pokemonDeckRoutes from './pokemonDeck.routes';

const allDeckRoutes = new Hono();

// User-created decks (requires authentication)
allDeckRoutes.route('/user', deckRoutes);

// Pokemon recommended decks (public, read-only)
allDeckRoutes.route('/pokemon', pokemonDeckRoutes);

export default allDeckRoutes;