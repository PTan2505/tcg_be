import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { rateLimitMiddleware } from '../../shared/middlewares/security.middleware';
import { CardScanController } from './cardScan.controller';

const cardScanController = new CardScanController();

export const cardScanRoutes = new Hono();

// All routes require authentication
cardScanRoutes.use('*', authMiddleware);

// Apply rate limiting
cardScanRoutes.use('*', rateLimitMiddleware(60, 60000)); // 60 requests per minute

/**
 * @route GET /history
 * @desc Get user's scan history with pagination and filters
 * @access Private
 * @query page, limit, gameType, startDate, endDate
 */
cardScanRoutes.get(
  '/history',
  cardScanController.getScanHistory
);

export default cardScanRoutes;