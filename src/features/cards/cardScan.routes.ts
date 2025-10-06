import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { rateLimitMiddleware } from '../../shared/middlewares/security.middleware';
import { validateRequest } from '../../shared/middlewares/validation.middleware';
import { CardScanController } from './cardScan.controller';
import {
    batchScanSchema,
    cardSelectionSchema
} from './cardScan.validator';

const cardScanController = new CardScanController();

export const cardScanRoutes = new Hono();

// All routes require authentication
cardScanRoutes.use('*', authMiddleware);

// Apply rate limiting - scanning is more intensive than regular API calls
cardScanRoutes.use('*', rateLimitMiddleware(60, 60000)); // 60 requests per minute

/**
 * @route POST /scan
 * @desc Scan trading card using OCR and pattern matching
 * @access Private
 * @body multipart/form-data with image file and scan options
 */
cardScanRoutes.post(
  '/scan',
  // Higher rate limit for actual scanning (most resource intensive)
  rateLimitMiddleware(20, 60000), // 20 scans per minute
  cardScanController.scanCard
);

/**
 * @route POST /visual-scan
 * @desc Scan trading card using visual similarity matching
 * @access Private
 * @body multipart/form-data with image file and scan options
 */
cardScanRoutes.post(
  '/visual-scan',
  // Higher rate limit for actual scanning (most resource intensive)
  rateLimitMiddleware(15, 60000), // 15 visual scans per minute (more intensive)
  cardScanController.visualScanCard
);

/**
 * @route POST /confirm
 * @desc Confirm card selection and add to user's collection
 * @access Private
 * @body JSON with selectedCardId and card details
 */
cardScanRoutes.post(
  '/confirm',
  validateRequest(cardSelectionSchema),
  cardScanController.confirmCardSelection
);

/**
 * @route GET /search
 * @desc Fuzzy search for cards (manual lookup when scan fails)
 * @access Private
 * @query q, gameType, setCode, maxResults, includeVariants
 */
cardScanRoutes.get(
  '/search',
  cardScanController.fuzzySearchCards
);

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

/**
 * @route POST /batch
 * @desc Batch scan multiple cards at once
 * @access Private
 * @body JSON with array of card images
 */
cardScanRoutes.post(
  '/batch',
  // Even more restrictive rate limit for batch operations
  rateLimitMiddleware(5, 60000), // 5 batch scans per minute
  validateRequest(batchScanSchema),
  cardScanController.batchScanCards
);

/**
 * @route GET /stats
 * @desc Get user's scanning statistics
 * @access Private
 */
cardScanRoutes.get(
  '/stats',
  cardScanController.getScanStats
);

export default cardScanRoutes;