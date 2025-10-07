import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { rateLimitMiddleware } from '../../shared/middlewares/security.middleware';
import { enhancedCardScanController } from './enhancedCardScan.controller';

const enhancedScanRoutes = new Hono();

// Apply middleware
enhancedScanRoutes.use('*', authMiddleware);
enhancedScanRoutes.use('*', rateLimitMiddleware(25, 60000)); // 25 scans per minute

/**
 * @route POST /enhanced
 * @desc Enhanced 5-step card scanning pipeline with Set Code Recognition
 * @access Private
 * @body image (file), gameType (optional), location (optional), userPreferences (optional)
 */
enhancedScanRoutes.post(
  '/enhanced',
  rateLimitMiddleware(15, 60000), // More restrictive for enhanced scanning
  enhancedCardScanController.scanCardEnhanced
);

export default enhancedScanRoutes;