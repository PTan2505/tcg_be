import vision from '@google-cloud/vision';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

interface OCRResult {
  text: string[];
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    box: { x: number; y: number; width: number; height: number };
  }>;
}

interface ImagePreprocessingOptions {
  enhanceContrast?: boolean;
  denoiseImage?: boolean;
  cropToCard?: boolean;
  resizeWidth?: number;
}

export class OCRService {
  private tesseractWorker: any = null;
  private googleVisionClient: any = null;
  private initializationPromise: Promise<void>;
  private isInitialized: boolean = false;

  constructor() {
    this.initializationPromise = this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    try {
      console.log('Starting OCR services initialization...');
      
      // Initialize Google Vision if credentials are available
      if (process.env.GOOGLE_CLOUD_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('🔑 Google Vision credentials found:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
        
        this.googleVisionClient = new vision.ImageAnnotatorClient();
        
        // Test the service account connection
        try {
          console.log('🧪 Testing Google Vision API connection...');
          
          // Get project info to verify connection
          const projectId = await this.googleVisionClient.getProjectId();
          console.log('📍 Connected to Google Cloud Project:', projectId);
          
          // Check service account details
          const auth = this.googleVisionClient.auth;
          console.log('🔐 Service Account Info:', {
            type: auth.constructor.name,
            projectId: projectId
          });
          
        } catch (testError: any) {
          console.error('❌ Google Vision API connection test failed:', testError.message);
          console.error('🔍 Full error:', testError);
        }
        
        console.log('✅ Google Vision API initialized (primary OCR)');
      } else {
        console.log('⚠️ Google Vision API credentials not found');
      }

      // Initialize Tesseract worker as fallback
      try {
        console.log('Initializing Tesseract worker (fallback OCR)...');
        this.tesseractWorker = await createWorker('eng');
        
        await this.tesseractWorker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-() ',
          tessedit_pageseg_mode: '6', // Uniform block of text
        });
        
        console.log('✅ Tesseract OCR initialized (fallback ready)');
      } catch (tesseractError) {
        console.warn('⚠️ Tesseract initialization failed, Google Vision only mode:', tesseractError);
        // Continue without Tesseract if Google Vision is available
        if (!this.googleVisionClient) {
          throw new Error('Both Google Vision and Tesseract failed to initialize');
        }
      }
      
      this.isInitialized = true;
      
      if (this.googleVisionClient && this.tesseractWorker) {
        console.log('🎯 OCR Ready: Google Vision + Tesseract fallback');
      } else if (this.googleVisionClient) {
        console.log('🎯 OCR Ready: Google Vision only (no fallback)');
      } else if (this.tesseractWorker) {
        console.log('🎯 OCR Ready: Tesseract only (offline mode)');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize OCR services:', error);
      throw error;
    }
  }

  /**
   * Ensure OCR services are initialized before use
   */
  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      console.log('Waiting for OCR services to initialize...');
      await this.initializationPromise;
    }
  }

  /**
   * Main OCR method that tries multiple approaches
   */
  async extractText(imageBuffer: Buffer, options: ImagePreprocessingOptions = {}): Promise<OCRResult> {
    try {
      // Ensure OCR services are initialized
      await this.ensureInitialized();
      
      // Preprocess the image
      const processedBuffer = await this.preprocessImage(imageBuffer, options);

      // Priority: Google Vision (high accuracy) → Tesseract (fallback)
      let result: OCRResult;

      if (this.googleVisionClient) {
        try {
          console.log('🎯 Using Google Vision API (high accuracy mode)');
          result = await this.extractTextWithGoogleVision(processedBuffer);
          console.log(`✅ Google Vision completed with ${result.text.length} text lines`);
        } catch (googleError) {
          console.warn('⚠️ Google Vision failed, falling back to Tesseract:', googleError);
          
          if (this.tesseractWorker) {
            result = await this.extractTextWithTesseract(processedBuffer);
          } else {
            throw new Error('Google Vision failed and no Tesseract fallback available');
          }
        }
      } else if (this.tesseractWorker) {
        console.log('🔄 Using Tesseract OCR (offline mode)');
        result = await this.extractTextWithTesseract(processedBuffer);
      } else {
        throw new Error('No OCR service available');
      }

      return result;
    } catch (error: any) {
      console.error('❌ OCR extraction failed:', error);
      throw new Error(`Failed to extract text from image: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(
    imageBuffer: Buffer, 
    options: ImagePreprocessingOptions
  ): Promise<Buffer> {
    try {
      let image = sharp(imageBuffer);

      // Resize if specified
      if (options.resizeWidth) {
        image = image.resize(options.resizeWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Enhance contrast and brightness for better OCR
      if (options.enhanceContrast !== false) {
        image = image.normalize().sharpen();
      }

      // Convert to grayscale for better text recognition
      image = image.greyscale();

      // Apply threshold to get black text on white background
      image = image.threshold(128);

      return await image.png().toBuffer();
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      return imageBuffer; // Return original if preprocessing fails
    }
  }

  /**
   * Extract text using Google Vision API
   */
  private async extractTextWithGoogleVision(imageBuffer: Buffer): Promise<OCRResult> {
    console.log('🔍 Starting Google Vision API request...');
    console.log(`📊 Image size: ${imageBuffer.length} bytes`);
    
    try {
      const [result] = await this.googleVisionClient.textDetection({
        image: { content: imageBuffer }
      });

      console.log('✅ Google Vision API response received');
      console.log(`📝 Raw API response:`, JSON.stringify(result, null, 2));

      const textAnnotations = result.textAnnotations || [];
      console.log(`📄 Text annotations found: ${textAnnotations.length}`);
      
      if (textAnnotations.length === 0) {
        console.log('⚠️ No text annotations found in image');
        return { text: [], confidence: 0 };
      }

      // First annotation contains the full text
      const fullText = textAnnotations[0]?.description || '';
      const textLines = fullText.split('\n').filter((line: string) => line.trim().length > 0);
      
      console.log(`📋 Extracted text lines:`, textLines);

      // Extract individual text blocks with bounding boxes
      const boundingBoxes = textAnnotations.slice(1).map((annotation: any) => ({
        text: annotation.description || '',
        box: {
          x: annotation.boundingPoly?.vertices?.[0]?.x || 0,
          y: annotation.boundingPoly?.vertices?.[0]?.y || 0,
          width: (annotation.boundingPoly?.vertices?.[2]?.x || 0) - (annotation.boundingPoly?.vertices?.[0]?.x || 0),
          height: (annotation.boundingPoly?.vertices?.[2]?.y || 0) - (annotation.boundingPoly?.vertices?.[0]?.y || 0)
        }
      }));

      console.log(`🎯 Google Vision OCR completed successfully with ${textLines.length} lines`);
      
      return {
        text: textLines,
        confidence: 0.9, // Google Vision typically has high confidence
        boundingBoxes
      };
    } catch (error: any) {
      console.error('❌ Google Vision API Error Details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        stack: error?.stack
      });
      throw error;
    }
  }

  /**
   * Extract text using Tesseract.js
   */
  private async extractTextWithTesseract(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.tesseractWorker) {
      throw new Error('Tesseract worker not initialized. Please wait for initialization to complete.');
    }

    try {
      console.log('Starting Tesseract OCR recognition...');
      const result = await this.tesseractWorker.recognize(imageBuffer);
      console.log(`Tesseract OCR completed with confidence: ${result.data.confidence}%`);
      
      const textLines = result.data.text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      return {
        text: textLines,
        confidence: result.data.confidence / 100, // Convert to 0-1 scale
        boundingBoxes: result.data.words?.map((word: any) => ({
          text: word.text,
          box: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0
          }
        }))
      };
    } catch (error: any) {
      console.error('Tesseract recognition failed:', error);
      throw new Error(`Tesseract OCR failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      if (this.tesseractWorker) {
        console.log('Cleaning up Tesseract worker...');
        await this.tesseractWorker.terminate();
        this.tesseractWorker = null;
        this.isInitialized = false;
        console.log('✅ Tesseract worker terminated');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Check if OCR services are ready
   */
  isReady(): boolean {
    return this.isInitialized && (this.tesseractWorker !== null || this.googleVisionClient !== null);
  }

  /**
   * Get OCR service status
   */
  getStatus(): { googleVision: boolean; tesseract: boolean; mode: string } {
    const googleVision = !!this.googleVisionClient;
    const tesseract = !!this.tesseractWorker;
    
    let mode = 'none';
    if (googleVision && tesseract) mode = 'hybrid';
    else if (googleVision) mode = 'google-only';
    else if (tesseract) mode = 'tesseract-only';
    
    return { googleVision, tesseract, mode };
  }
}

// Singleton instance
let ocrServiceInstance: OCRService | null = null;
let initializationPromise: Promise<OCRService> | null = null;

export const getOCRService = async (): Promise<OCRService> => {
  if (ocrServiceInstance) {
    // Ensure it's ready before returning
    if (!ocrServiceInstance.isReady()) {
      await ocrServiceInstance.ensureInitialized();
    }
    return ocrServiceInstance;
  }

  // If we're already initializing, return the same promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    console.log('Creating new OCR service instance...');
    ocrServiceInstance = new OCRService();
    await ocrServiceInstance.ensureInitialized();
    console.log('✅ OCR service instance ready');
    return ocrServiceInstance;
  })();

  return initializationPromise;
};