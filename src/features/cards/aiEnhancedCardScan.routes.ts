import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { rateLimitMiddleware } from '../../shared/middlewares/security.middleware';
import { aiEnhancedCardScanController } from './aiEnhancedCardScan.controller';

const aiEnhancedScanRoutes = new Hono();

// Apply middleware - skip auth for status endpoints
aiEnhancedScanRoutes.use('/csv-status', async (c, next) => await next()); // Skip auth for CSV status
aiEnhancedScanRoutes.use('*', authMiddleware);
aiEnhancedScanRoutes.use('*', rateLimitMiddleware(20, 60000)); // 20 scans per minute

/**
 * @route POST /ai-enhanced
 * @desc AI-Enhanced card scanning with Gemini AI post-processing
 * @access Private
 * @body image (file), gameType (required)
 */
aiEnhancedScanRoutes.post(
  '/ai-enhanced',
  rateLimitMiddleware(10, 60000), // More restrictive for AI scanning
  aiEnhancedCardScanController.enhancedScanWithAI
);

/**
 * @route GET /csv-status
 * @desc Check CSV card data loading status
 * @access Public
 */
aiEnhancedScanRoutes.get('/csv-status', aiEnhancedCardScanController.getCSVStatus);

/**
 * @route POST /correct-ocr
 * @desc Correct OCR text using AI
 * @access Private
 * @body ocrText (required), gameType (required)
 */
aiEnhancedScanRoutes.post(
  '/correct-ocr',
  rateLimitMiddleware(30, 60000), // Allow more OCR corrections
  aiEnhancedCardScanController.correctOCRText
);

/**
 * @route GET /status
 * @desc Check AI service status
 * @access Private
 */
aiEnhancedScanRoutes.get('/status', async (c) => {
  try {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    return c.json({
      success: true,
      data: {
        aiServiceAvailable: hasApiKey,
        geminiConfigured: hasApiKey,
        features: {
          enhancedScanning: hasApiKey,
          ocrCorrection: hasApiKey,
          semanticMatching: hasApiKey
        },
        endpoints: [
          'POST /ai-enhanced - AI-enhanced card scanning',
          'POST /correct-ocr - OCR text correction',
          'GET /status - Service status'
        ]
      },
      message: hasApiKey 
        ? 'AI services are ready' 
        : 'AI services unavailable - GEMINI_API_KEY not configured'
    });
  } catch (error) {
    return c.json({
      success: false,
      message: 'Error checking AI service status'
    }, 500);
  }
});

export default aiEnhancedScanRoutes;