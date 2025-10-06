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
 * @desc Enhanced 4-step card scanning pipeline
 * @access Private
 * @body image (file), gameType (optional), location (optional), userPreferences (optional)
 */
enhancedScanRoutes.post(
  '/enhanced',
  rateLimitMiddleware(15, 60000), // More restrictive for enhanced scanning
  enhancedCardScanController.scanCardEnhanced
);

/**
 * @route GET /pipeline-demo
 * @desc Get information about the 4-step pipeline
 * @access Private
 */
enhancedScanRoutes.get(
  '/pipeline-demo',
  enhancedCardScanController.testPipeline
);

export default enhancedScanRoutes;