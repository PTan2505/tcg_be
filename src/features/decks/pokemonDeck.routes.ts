import { Hono } from 'hono';
import { rateLimitMiddleware, validateParamsMiddleware } from '../../shared/middlewares/security.middleware';
import { PokemonDeckController } from './pokemonDeck.controller';
import { PokemonDeckService } from './pokemonDeck.service';

const pokemonDeckService = new PokemonDeckService();
const pokemonDeckController = new PokemonDeckController(pokemonDeckService);

export const pokemonDeckRoutes = new Hono();

// Rate limiting for Pokemon deck routes (more relaxed since these are read-only and public)
pokemonDeckRoutes.use('/*', rateLimitMiddleware(200, 60000)); // 200 requests per minute for viewing

// Get all Pokemon decks with pagination and optional type filtering
pokemonDeckRoutes.get(
  '/',
  pokemonDeckController.getAllDecks
);

// Search Pokemon decks by name or deckExtId
pokemonDeckRoutes.get(
  '/search',
  pokemonDeckController.searchDecks
);

// Get Pokemon decks by types
pokemonDeckRoutes.get(
  '/types',
  pokemonDeckController.getDecksByTypes
);

// Get specific Pokemon deck by database ID
pokemonDeckRoutes.get(
  '/id/:deckId',
  validateParamsMiddleware(['deckId']),
  pokemonDeckController.getDeckById
);

// Get specific Pokemon deck by external ID (from the original data)
pokemonDeckRoutes.get(
  '/ext/:deckExtId',
  validateParamsMiddleware(['deckExtId']),
  pokemonDeckController.getDeckByExtId
);

// Get Pokemon deck statistics
pokemonDeckRoutes.get(
  '/id/:deckId/stats',
  validateParamsMiddleware(['deckId']),
  pokemonDeckController.getDeckStats
);

export default pokemonDeckRoutes;