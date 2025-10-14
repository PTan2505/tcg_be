import 'dotenv/config';

export const PREMIUM_CONFIG = {
  DECK_LIMIT_FREEMIUM: Number(process.env.DECK_LIMIT_FREEMIUM || 3),
  SCAN_LIMIT_FREEMIUM: Number(process.env.SCAN_LIMIT_FREEMIUM || 10),
  COLLECTION_LIMIT_PER_GAME_FREEMIUM: Number(process.env.COLLECTION_LIMIT_PER_GAME_FREEMIUM || 30),
};

export default PREMIUM_CONFIG;
