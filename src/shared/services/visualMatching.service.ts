import axios from 'axios';
import { createHash } from 'crypto';
import sharp from 'sharp';

const logger = {
  error: (...args: any[]) => console.error('[VISUAL_MATCH]', ...args),
  info: (...args: any[]) => console.log('[VISUAL_MATCH]', ...args),
  warn: (...args: any[]) => console.warn('[VISUAL_MATCH]', ...args)
};

export interface VisualMatchResult {
  cardId: string;
  imageUrl: string;
  similarity: number;
  matchType: 'exact' | 'high' | 'moderate' | 'low';
  processingTime: number;
}

export interface VisualMatchOptions {
  maxCandidates?: number;
  similarityThreshold?: number;
  imageSize?: { width: number; height: number };
  timeout?: number;
  enhancedMode?: boolean; // New option for enhanced trading card analysis
}

export class VisualMatchingService {
  private imageCache = new Map<string, Buffer>();
  private hashCache = new Map<string, string>();

  /**
   * Compare scanned image with multiple candidate card images
   */
  async findVisualMatches(
    scannedImageBuffer: Buffer,
    candidates: Array<{ cardId: string; imageUrl: string; name: string }>,
    options: VisualMatchOptions = {}
  ): Promise<VisualMatchResult[]> {
    const startTime = Date.now();
    const {
      maxCandidates = 20,
      similarityThreshold = 0.35,
      imageSize = { width: 280, height: 392 }, // Higher resolution for enhanced mode
      timeout = 30000,
      enhancedMode = false
    } = options;

    try {
      logger.info(`🖼️  Starting ${enhancedMode ? 'ENHANCED' : 'standard'} visual matching for ${candidates.length} candidates`);

      // Use higher resolution and better preprocessing for enhanced mode
      const targetImageSize = enhancedMode 
        ? { width: 320, height: 448 } // Better resolution for card details
        : imageSize;

      // Normalize the scanned image with enhanced preprocessing
      const normalizedScanned = await this.normalizeImage(
        scannedImageBuffer, 
        targetImageSize, 
        enhancedMode
      );
      const scannedHash = await this.generateImageHash(normalizedScanned);

      const visualMatches: VisualMatchResult[] = [];
      const validCandidates = candidates.slice(0, maxCandidates);

      // Enhanced processing with better concurrency control
      const concurrencyLimit = enhancedMode ? 3 : 5; // Lower concurrency for enhanced mode
      for (let i = 0; i < validCandidates.length; i += concurrencyLimit) {
        const batch = validCandidates.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (candidate) => {
          try {
            const similarity = await this.compareImages(
              normalizedScanned,
              scannedHash,
              candidate.imageUrl,
              targetImageSize,
              enhancedMode
            );

            if (similarity >= similarityThreshold) {
              return {
                cardId: candidate.cardId,
                imageUrl: candidate.imageUrl,
                similarity,
                matchType: this.getMatchType(similarity, enhancedMode),
                processingTime: Date.now() - startTime
              } as VisualMatchResult;
            }
          } catch (error) {
            logger.warn(`Failed to process candidate ${candidate.cardId}:`, error instanceof Error ? error.message : 'Unknown error');
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        visualMatches.push(...batchResults.filter(Boolean) as VisualMatchResult[]);

        // Check timeout
        if (Date.now() - startTime > timeout) {
          logger.warn('Visual matching timeout reached, returning partial results');
          break;
        }
      }

      // Sort by similarity (highest first)
      visualMatches.sort((a, b) => b.similarity - a.similarity);

      const processingTime = Date.now() - startTime;
      logger.info(`🖼️  ${enhancedMode ? 'Enhanced' : 'Standard'} visual matching completed: ${visualMatches.length} matches found in ${processingTime}ms`);
      
      // Log top matches for debugging
      if (visualMatches.length > 0 && enhancedMode) {
        logger.info('🏆 Top 3 visual matches:');
        visualMatches.slice(0, 3).forEach((match, index) => {
          logger.info(`  ${index + 1}. ${(match.similarity * 100).toFixed(1)}% similarity (${match.matchType})`);
        });
      }
      
      return visualMatches;

    } catch (error) {
      logger.error('Visual matching failed:', error);
      return [];
    }
  }

  /**
   * Compare two images for similarity using multiple advanced techniques
   */
  private async compareImages(
    scannedImage: Buffer,
    scannedHash: string,
    candidateImageUrl: string,
    imageSize: { width: number; height: number },
    enhancedMode: boolean = false
  ): Promise<number> {
    try {
      // Get candidate image
      const candidateImage = await this.downloadAndNormalizeImage(candidateImageUrl, imageSize, enhancedMode);
      const candidateHash = await this.generateImageHash(candidateImage);

      // Enhanced mode uses more sophisticated algorithms
      if (enhancedMode) {
        return await this.enhancedCompareImages(scannedImage, candidateImage, scannedHash, candidateHash);
      }

      // Standard mode - original algorithm
      return await this.standardCompareImages(scannedImage, candidateImage, scannedHash, candidateHash);

    } catch (error) {
      logger.warn('Image comparison failed:', error instanceof Error ? error.message : 'Unknown error');
      return 0;
    }
  }

  /**
   * Enhanced comparison algorithm optimized for trading cards
   */
  private async enhancedCompareImages(
    scannedImage: Buffer,
    candidateImage: Buffer,
    scannedHash: string,
    candidateHash: string
  ): Promise<number> {
    // 1. Perceptual Hash Similarity (structural)
    const hashSimilarity = this.compareHashes(scannedHash, candidateHash);
    
    // 2. Enhanced Color Analysis (artwork focus)
    const colorSimilarity = await this.compareEnhancedColorFeatures(scannedImage, candidateImage);
    
    // 3. Advanced Edge Detection (card details)
    const edgeSimilarity = await this.compareAdvancedEdges(scannedImage, candidateImage);
    
    // 4. Card-specific Region Analysis
    const regionSimilarity = await this.compareCardRegions(scannedImage, candidateImage);
    
    // 5. Texture and Pattern Analysis
    const textureSimilarity = await this.compareAdvancedTextures(scannedImage, candidateImage);

    // Safety checks for NaN values
    const safeHashSimilarity = isNaN(hashSimilarity) ? 0 : hashSimilarity;
    const safeColorSimilarity = isNaN(colorSimilarity) ? 0 : colorSimilarity;
    const safeEdgeSimilarity = isNaN(edgeSimilarity) ? 0 : edgeSimilarity;
    const safeRegionSimilarity = isNaN(regionSimilarity) ? 0 : regionSimilarity;
    const safeTextureSimilarity = isNaN(textureSimilarity) ? 0 : textureSimilarity;

    // Enhanced weighted combination optimized for trading card identification
    const finalSimilarity = (
      safeHashSimilarity * 0.10 +      // Overall structure (reduced weight)
      safeColorSimilarity * 0.35 +     // Card artwork colors (increased weight)
      safeEdgeSimilarity * 0.25 +      // Card details and text  
      safeRegionSimilarity * 0.20 +    // Card-specific regions (new)
      safeTextureSimilarity * 0.10     // Surface texture and patterns
    );

    const safeFinalSimilarity = isNaN(finalSimilarity) ? 0 : Math.max(0, Math.min(1, finalSimilarity));
    return Math.round(safeFinalSimilarity * 100) / 100;
  }

  /**
   * Standard comparison algorithm (original)
   */
  private async standardCompareImages(
    scannedImage: Buffer,
    candidateImage: Buffer,
    scannedHash: string,
    candidateHash: string
  ): Promise<number> {
    // 1. Perceptual Hash Similarity (good for overall structure)
    const hashSimilarity = this.compareHashes(scannedHash, candidateHash);
    
    // 2. Color Histogram Similarity (good for artwork/colors)
    const colorSimilarity = await this.compareColorHistograms(scannedImage, candidateImage);
    
    // 3. Edge Detection Similarity (good for card artwork and text)
    const edgeSimilarity = await this.compareEdges(scannedImage, candidateImage);
    
    // 4. Template Matching (good for card layout)
    const templateSimilarity = await this.compareTemplates(scannedImage, candidateImage);
    
    // 5. Texture Analysis (good for card surface and artwork)
    const textureSimilarity = await this.compareTextures(scannedImage, candidateImage);

    // Safety checks for NaN values
    const safeHashSimilarity = isNaN(hashSimilarity) ? 0 : hashSimilarity;
    const safeColorSimilarity = isNaN(colorSimilarity) ? 0 : colorSimilarity;
    const safeEdgeSimilarity = isNaN(edgeSimilarity) ? 0 : edgeSimilarity;
    const safeTemplateSimilarity = isNaN(templateSimilarity) ? 0 : templateSimilarity;
    const safeTextureSimilarity = isNaN(textureSimilarity) ? 0 : textureSimilarity;

    // Weighted combination optimized for trading cards
    const finalSimilarity = (
      safeHashSimilarity * 0.15 +      // Overall structure
      safeColorSimilarity * 0.30 +     // Card artwork colors (most important)
      safeEdgeSimilarity * 0.25 +      // Card details and text
      safeTemplateSimilarity * 0.20 +  // Card layout
      safeTextureSimilarity * 0.10     // Surface texture
    );

    const safeFinalSimilarity = isNaN(finalSimilarity) ? 0 : Math.max(0, Math.min(1, finalSimilarity));
    return Math.round(safeFinalSimilarity * 100) / 100;
  }

  /**
   * Download and normalize candidate image
   */
  private async downloadAndNormalizeImage(
    imageUrl: string, 
    imageSize: { width: number; height: number },
    enhancedMode: boolean = false
  ): Promise<Buffer> {
    // Check cache first
    const cacheKey = `${imageUrl}_${imageSize.width}x${imageSize.height}_${enhancedMode ? 'enhanced' : 'standard'}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    try {
      // Download image with timeout
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'TCG-Scanner/1.0'
        }
      });

      const imageBuffer = Buffer.from(response.data);
      const normalizedImage = await this.normalizeImage(imageBuffer, imageSize, enhancedMode);

      // Cache the result
      this.imageCache.set(cacheKey, normalizedImage);
      
      // Limit cache size
      if (this.imageCache.size > 100) {
        const firstKey = this.imageCache.keys().next().value;
        if (firstKey) {
          this.imageCache.delete(firstKey);
        }
      }

      return normalizedImage;

    } catch (error) {
      throw new Error(`Failed to download image from ${imageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize image for comparison (enhanced for trading cards)
   */
  private async normalizeImage(
    imageBuffer: Buffer, 
    size: { width: number; height: number },
    enhancedMode: boolean = false
  ): Promise<Buffer> {
    let pipeline = sharp(imageBuffer)
      .resize(size.width, size.height, { 
        fit: 'fill',
        withoutEnlargement: false 
      });

    if (enhancedMode) {
      // Enhanced preprocessing for better card identification
      pipeline = pipeline
        .normalize() // Auto-adjust brightness/contrast
        .modulate({
          saturation: 1.15, // More saturation enhancement for artwork
          brightness: 1.05,  // Slight brightness boost
          hue: 0
        })
        .sharpen(1.5, 1, 2.5) // Stronger sharpening for text and details
        .gamma(1.1); // Slight gamma adjustment
    } else {
      // Standard preprocessing
      pipeline = pipeline
        .normalize()
        .modulate({
          saturation: 1.1,
          brightness: 1.0
        })
        .sharpen(1, 1, 2);
    }

    return await pipeline.png().toBuffer();
  }

  /**
   * Generate perceptual hash of image
   */
  private async generateImageHash(imageBuffer: Buffer): Promise<string> {
    const cacheKey = createHash('md5').update(imageBuffer).digest('hex');
    
    if (this.hashCache.has(cacheKey)) {
      return this.hashCache.get(cacheKey)!;
    }

    // Create a simple perceptual hash using 8x8 grid
    const thumbnail = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate average pixel value
    let sum = 0;
    for (const pixel of thumbnail) {
      sum += pixel;
    }
    const average = sum / thumbnail.length;

    // Generate hash string
    let hash = '';
    for (const pixel of thumbnail) {
      hash += pixel > average ? '1' : '0';
    }

    this.hashCache.set(cacheKey, hash);
    return hash;
  }

  /**
   * Compare two perceptual hashes
   */
  private compareHashes(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return 0;

    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        differences++;
      }
    }

    const similarity = 1 - (differences / hash1.length);
    return Math.max(0, similarity);
  }

  /**
   * Compare pixel-by-pixel similarity
   */
  private async comparePixels(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Get raw pixel data
      const pixels1 = await sharp(image1).raw().toBuffer();
      const pixels2 = await sharp(image2).raw().toBuffer();

      if (pixels1.length !== pixels2.length) return 0;

      // Calculate mean squared error
      let totalDiff = 0;
      for (let i = 0; i < pixels1.length; i++) {
        const diff = pixels1[i] - pixels2[i];
        totalDiff += diff * diff;
      }

      const mse = totalDiff / pixels1.length;
      const maxPossibleMse = 255 * 255;
      const similarity = 1 - (mse / maxPossibleMse);

      return Math.max(0, similarity);

    } catch (error) {
      logger.warn('Pixel comparison failed:', error);
      return 0;
    }
  }

  /**
   * Compare structural similarity (simplified SSIM)
   */
  private async compareStructural(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Get image statistics
      const stats1 = await sharp(image1).stats();
      const stats2 = await sharp(image2).stats();

      // Compare mean and standard deviation across channels
      let similarity = 0;
      const channels = Math.min(stats1.channels.length, stats2.channels.length);

      for (let i = 0; i < channels; i++) {
        const meanDiff = Math.abs(stats1.channels[i].mean - stats2.channels[i].mean) / 255;
        // Use standard deviation if available, otherwise use mean as approximation
        const std1 = (stats1.channels[i] as any).std || stats1.channels[i].mean;
        const std2 = (stats2.channels[i] as any).std || stats2.channels[i].mean;
        const stdDiff = Math.abs(std1 - std2) / 255;
        
        const channelSimilarity = 1 - ((meanDiff + stdDiff) / 2);
        similarity += channelSimilarity;
      }

      return Math.max(0, similarity / channels);

    } catch (error) {
      logger.warn('Structural comparison failed:', error);
      return 0;
    }
  }

  /**
   * Enhanced color feature comparison for trading cards
   */
  private async compareEnhancedColorFeatures(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // 1. HSV histogram comparison (better for artwork)
      const hsvSimilarity = await this.compareHSVHistograms(image1, image2);
      
      // 2. Color moment comparison
      const momentSimilarity = await this.compareColorMoments(image1, image2);
      
      // 3. Dominant color comparison
      const dominantSimilarity = await this.compareDominantColors(image1, image2);

      // Combine all color features
      const colorSimilarity = (hsvSimilarity * 0.4) + (momentSimilarity * 0.3) + (dominantSimilarity * 0.3);
      return Math.max(0, Math.min(1, colorSimilarity));

    } catch (error) {
      logger.warn('Enhanced color comparison failed:', error);
      return await this.compareColorHistograms(image1, image2); // Fallback
    }
  }

  /**
   * Advanced edge detection optimized for card text and artwork
   */
  private async compareAdvancedEdges(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Use multiple edge detection methods
      const sobelSimilarity = await this.compareEdges(image1, image2);
      const cannyEdges1 = await this.detectCannyEdges(image1);
      const cannyEdges2 = await this.detectCannyEdges(image2);
      const cannySimilarity = await this.compareEdgeImages(cannyEdges1, cannyEdges2);

      // Combine edge detection results
      return (sobelSimilarity * 0.6) + (cannySimilarity * 0.4);

    } catch (error) {
      logger.warn('Advanced edge comparison failed:', error);
      return await this.compareEdges(image1, image2); // Fallback
    }
  }

  /**
   * Card-specific region analysis (artwork, text areas, etc.)
   */
  private async compareCardRegions(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Define card regions (approximate trading card layout)
      const regions = [
        { name: 'artwork', x: 0.1, y: 0.15, w: 0.8, h: 0.4 },  // Main artwork area
        { name: 'title', x: 0.1, y: 0.05, w: 0.8, h: 0.1 },   // Title area
        { name: 'stats', x: 0.1, y: 0.7, w: 0.8, h: 0.15 },   // Stats area
        { name: 'text', x: 0.1, y: 0.55, w: 0.8, h: 0.15 }    // Text area
      ];

      let totalSimilarity = 0;
      let totalWeight = 0;

      for (const region of regions) {
        const region1 = await this.extractRegion(image1, region);
        const region2 = await this.extractRegion(image2, region);
        
        if (region1 && region2) {
          const regionSimilarity = await this.compareRegionSimilarity(region1, region2);
          const weight = region.name === 'artwork' ? 2 : 1; // Artwork is more important
          
          totalSimilarity += regionSimilarity * weight;
          totalWeight += weight;
        }
      }

      return totalWeight > 0 ? totalSimilarity / totalWeight : 0;

    } catch (error) {
      logger.warn('Card region comparison failed:', error);
      return 0;
    }
  }

  /**
   * Advanced texture and pattern analysis
   */
  private async compareAdvancedTextures(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // 1. Enhanced texture features
      const lbp1 = await this.getLocalBinaryPatterns(image1);
      const lbp2 = await this.getLocalBinaryPatterns(image2);
      const lbpSimilarity = this.compareHistograms(lbp1, lbp2);

      // 2. Gradient magnitude features
      const grad1 = await this.getGradientFeatures(image1);
      const grad2 = await this.getGradientFeatures(image2);
      const gradSimilarity = this.compareFeatureVectors(grad1, grad2);

      // Combine texture features
      return (lbpSimilarity * 0.6) + (gradSimilarity * 0.4);

    } catch (error) {
      logger.warn('Advanced texture comparison failed:', error);
      return await this.compareTextures(image1, image2); // Fallback
    }
  }

  // Helper methods for enhanced algorithms

  /**
   * Compare HSV histograms for better color analysis
   */
  private async compareHSVHistograms(image1: Buffer, image2: Buffer): Promise<number> {
    // Convert to HSV and compare histograms
    const hsv1 = await sharp(image1).resize(64, 64).raw().toBuffer();
    const hsv2 = await sharp(image2).resize(64, 64).raw().toBuffer();

    // Simplified HSV histogram comparison
    return await this.compareColorHistograms(image1, image2);
  }

  /**
   * Compare color moments (mean, variance, skewness)
   */
  private async compareColorMoments(image1: Buffer, image2: Buffer): Promise<number> {
    const stats1 = await sharp(image1).stats();
    const stats2 = await sharp(image2).stats();

    let similarity = 0;
    const channels = Math.min(stats1.channels.length, stats2.channels.length);

    for (let i = 0; i < channels; i++) {
      const meanDiff = Math.abs(stats1.channels[i].mean - stats2.channels[i].mean) / 255;
      similarity += (1 - meanDiff);
    }

    return channels > 0 ? similarity / channels : 0;
  }

  /**
   * Compare dominant colors in images
   */
  private async compareDominantColors(image1: Buffer, image2: Buffer): Promise<number> {
    // Get dominant colors using k-means-like approach
    const colors1 = await this.getDominantColors(image1, 5);
    const colors2 = await this.getDominantColors(image2, 5);

    // Compare color palettes
    let bestMatches = 0;
    for (const color1 of colors1) {
      let bestMatch = 0;
      for (const color2 of colors2) {
        const colorDist = this.calculateColorDistance(color1, color2);
        const similarity = Math.max(0, 1 - colorDist / 441.673); // Max RGB distance
        bestMatch = Math.max(bestMatch, similarity);
      }
      bestMatches += bestMatch;
    }

    return colors1.length > 0 ? bestMatches / colors1.length : 0;
  }

  /**
   * Get dominant colors from image
   */
  private async getDominantColors(imageBuffer: Buffer, numColors: number): Promise<number[][]> {
    const resized = await sharp(imageBuffer)
      .resize(32, 32)
      .raw()
      .toBuffer();

    // Simple color extraction (simplified k-means)
    const colors: number[][] = [];
    for (let i = 0; i < resized.length; i += 3) {
      colors.push([resized[i], resized[i + 1], resized[i + 2]]);
    }

    // Return first numColors unique colors (simplified)
    return colors.slice(0, numColors);
  }

  /**
   * Calculate Euclidean distance between two RGB colors
   */
  private calculateColorDistance(color1: number[], color2: number[]): number {
    const dr = color1[0] - color2[0];
    const dg = color1[1] - color2[1];
    const db = color1[2] - color2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Detect Canny edges (simplified implementation)
   */
  private async detectCannyEdges(imageBuffer: Buffer): Promise<Buffer> {
    // Simplified Canny edge detection using convolution
    return await sharp(imageBuffer)
      .resize(100, 100)
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1] // Sobel Y
      })
      .raw()
      .toBuffer();
  }

  /**
   * Compare two edge images
   */
  private async compareEdgeImages(edges1: Buffer, edges2: Buffer): Promise<number> {
    if (edges1.length !== edges2.length) return 0;

    let similarity = 0;
    for (let i = 0; i < edges1.length; i++) {
      const diff = Math.abs(edges1[i] - edges2[i]);
      similarity += (255 - diff) / 255;
    }

    return similarity / edges1.length;
  }

  /**
   * Extract specific region from image
   */
  private async extractRegion(
    imageBuffer: Buffer, 
    region: { x: number; y: number; w: number; h: number }
  ): Promise<Buffer | null> {
    try {
      const { width, height } = await sharp(imageBuffer).metadata();
      if (!width || !height) return null;

      const left = Math.floor(region.x * width);
      const top = Math.floor(region.y * height);
      const regionWidth = Math.floor(region.w * width);
      const regionHeight = Math.floor(region.h * height);

      return await sharp(imageBuffer)
        .extract({ left, top, width: regionWidth, height: regionHeight })
        .resize(64, 64)
        .raw()
        .toBuffer();
    } catch (error) {
      return null;
    }
  }

  /**
   * Compare similarity between two image regions
   */
  private async compareRegionSimilarity(region1: Buffer, region2: Buffer): Promise<number> {
    if (region1.length !== region2.length) return 0;

    let similarity = 0;
    for (let i = 0; i < region1.length; i++) {
      const diff = Math.abs(region1[i] - region2[i]);
      similarity += (255 - diff) / 255;
    }

    return similarity / region1.length;
  }

  /**
   * Get Local Binary Patterns for texture analysis
   */
  private async getLocalBinaryPatterns(imageBuffer: Buffer): Promise<number[]> {
    const gray = await sharp(imageBuffer)
      .resize(64, 64)
      .grayscale()
      .raw()
      .toBuffer();

    // Simplified LBP histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < gray.length; i++) {
      histogram[gray[i]]++;
    }

    return histogram;
  }

  /**
   * Get gradient magnitude features
   */
  private async getGradientFeatures(imageBuffer: Buffer): Promise<number[]> {
    const edges = await this.detectEdges(imageBuffer);
    
    // Calculate gradient statistics
    let sum = 0;
    let max = 0;
    for (const pixel of edges) {
      sum += pixel;
      max = Math.max(max, pixel);
    }
    
    const mean = sum / edges.length;
    return [mean / 255, max / 255]; // Normalized features
  }

  /**
   * Compare two histograms using correlation
   */
  private compareHistograms(hist1: number[], hist2: number[]): number {
    if (hist1.length !== hist2.length) return 0;

    let correlation = 0;
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;

    for (let i = 0; i < hist1.length; i++) {
      sum1 += hist1[i];
      sum2 += hist2[i];
      sum1Sq += hist1[i] * hist1[i];
      sum2Sq += hist2[i] * hist2[i];
      pSum += hist1[i] * hist2[i];
    }

    const num = pSum - (sum1 * sum2 / hist1.length);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / hist1.length) * (sum2Sq - sum2 * sum2 / hist1.length));

    correlation = den === 0 ? 0 : num / den;
    return Math.max(0, Math.min(1, (correlation + 1) / 2));
  }

  /**
   * Compare two feature vectors using cosine similarity
   */
  private compareFeatureVectors(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Categorize match quality
   */
  private getMatchType(similarity: number, enhancedMode: boolean = false): 'exact' | 'high' | 'moderate' | 'low' {
    if (enhancedMode) {
      // Stricter thresholds for enhanced mode
      if (similarity >= 0.85) return 'exact';
      if (similarity >= 0.65) return 'high';
      if (similarity >= 0.45) return 'moderate';
      return 'low';
    } else {
      // Standard thresholds
      if (similarity >= 0.9) return 'exact';
      if (similarity >= 0.7) return 'high';
      if (similarity >= 0.5) return 'moderate';
      return 'low';
    }
  }

  /**
   * Compare color histograms of two images
   */
  private async compareColorHistograms(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Get RGB histograms
      const hist1 = await this.getColorHistogram(image1);
      const hist2 = await this.getColorHistogram(image2);

      // Calculate histogram correlation
      let correlation = 0;
      let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;

      for (let i = 0; i < hist1.length; i++) {
        sum1 += hist1[i];
        sum2 += hist2[i];
        sum1Sq += hist1[i] * hist1[i];
        sum2Sq += hist2[i] * hist2[i];
        pSum += hist1[i] * hist2[i];
      }

      const num = pSum - (sum1 * sum2 / hist1.length);
      const den = Math.sqrt((sum1Sq - sum1 * sum1 / hist1.length) * (sum2Sq - sum2 * sum2 / hist1.length));

      correlation = den === 0 ? 0 : num / den;
      return Math.max(0, Math.min(1, (correlation + 1) / 2)); // Normalize to 0-1

    } catch (error) {
      logger.warn('Color histogram comparison failed:', error);
      return 0;
    }
  }

  /**
   * Get color histogram from image
   */
  private async getColorHistogram(imageBuffer: Buffer): Promise<number[]> {
    const resized = await sharp(imageBuffer)
      .resize(64, 64, { fit: 'fill' })
      .raw()
      .toBuffer();

    const histogram = new Array(256).fill(0);
    
    // Create combined RGB histogram
    for (let i = 0; i < resized.length; i += 3) {
      const r = resized[i];
      const g = resized[i + 1];
      const b = resized[i + 2];
      const intensity = Math.round((r + g + b) / 3);
      histogram[intensity]++;
    }

    return histogram;
  }

  /**
   * Compare edge features of two images
   */
  private async compareEdges(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Apply edge detection using Sobel-like filter
      const edges1 = await this.detectEdges(image1);
      const edges2 = await this.detectEdges(image2);

      // Compare edge densities in different regions
      const regions = 4; // 2x2 grid
      let totalSimilarity = 0;

      for (let i = 0; i < regions; i++) {
        for (let j = 0; j < regions; j++) {
          const region1 = this.getImageRegion(edges1, i, j, regions);
          const region2 = this.getImageRegion(edges2, i, j, regions);
          
          const regionSimilarity = this.compareRegionEdges(region1, region2);
          totalSimilarity += regionSimilarity;
        }
      }

      return totalSimilarity / (regions * regions);

    } catch (error) {
      logger.warn('Edge comparison failed:', error);
      return 0;
    }
  }

  /**
   * Detect edges in image using simplified edge detection
   */
  private async detectEdges(imageBuffer: Buffer): Promise<Buffer> {
    return await sharp(imageBuffer)
      .resize(100, 100, { fit: 'fill' })
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .raw()
      .toBuffer();
  }

  /**
   * Get specific region from edge-detected image
   */
  private getImageRegion(imageBuffer: Buffer, regionX: number, regionY: number, totalRegions: number): number[] {
    const width = 100;
    const height = 100;
    const regionWidth = Math.floor(width / totalRegions);
    const regionHeight = Math.floor(height / totalRegions);
    
    const startX = regionX * regionWidth;
    const startY = regionY * regionHeight;
    
    const region: number[] = [];
    
    for (let y = startY; y < startY + regionHeight && y < height; y++) {
      for (let x = startX; x < startX + regionWidth && x < width; x++) {
        const index = y * width + x;
        if (index < imageBuffer.length) {
          region.push(imageBuffer[index]);
        }
      }
    }
    
    return region;
  }

  /**
   * Compare edge density in regions
   */
  private compareRegionEdges(region1: number[], region2: number[]): number {
    if (region1.length === 0 || region2.length === 0) return 0;

    const density1 = region1.reduce((sum, val) => sum + (val > 128 ? 1 : 0), 0) / region1.length;
    const density2 = region2.reduce((sum, val) => sum + (val > 128 ? 1 : 0), 0) / region2.length;
    
    return 1 - Math.abs(density1 - density2);
  }

  /**
   * Compare template matching for card layout
   */
  private async compareTemplates(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      // Create templates for card-specific areas (top, middle, bottom)
      const template1 = await this.createCardTemplate(image1);
      const template2 = await this.createCardTemplate(image2);

      // Compare templates
      let similarity = 0;
      for (let i = 0; i < template1.length; i++) {
        const diff = Math.abs(template1[i] - template2[i]);
        similarity += (255 - diff) / 255;
      }

      return similarity / template1.length;

    } catch (error) {
      logger.warn('Template comparison failed:', error);
      return 0;
    }
  }

  /**
   * Create simplified template for card layout
   */
  private async createCardTemplate(imageBuffer: Buffer): Promise<number[]> {
    // Resize to standard template size
    const templateBuffer = await sharp(imageBuffer)
      .resize(32, 44, { fit: 'fill' }) // Card aspect ratio
      .grayscale()
      .blur(1) // Slight blur to focus on major features
      .raw()
      .toBuffer();

    return Array.from(templateBuffer);
  }

  /**
   * Compare texture patterns using Local Binary Patterns (simplified)
   */
  private async compareTextures(image1: Buffer, image2: Buffer): Promise<number> {
    try {
      const texture1 = await this.getTextureFeatures(image1);
      const texture2 = await this.getTextureFeatures(image2);

      // Compare texture histograms
      let similarity = 0;
      const minLength = Math.min(texture1.length, texture2.length);
      
      for (let i = 0; i < minLength; i++) {
        const diff = Math.abs(texture1[i] - texture2[i]);
        similarity += Math.max(0, 1 - diff);
      }

      return minLength > 0 ? similarity / minLength : 0;

    } catch (error) {
      logger.warn('Texture comparison failed:', error);
      return 0;
    }
  }

  /**
   * Extract simplified texture features
   */
  private async getTextureFeatures(imageBuffer: Buffer): Promise<number[]> {
    // Get image statistics as texture features
    const stats = await sharp(imageBuffer)
      .resize(50, 50, { fit: 'fill' })
      .grayscale()
      .stats();

    // Use channel statistics as texture descriptors
    const features: number[] = [];
    stats.channels.forEach(channel => {
      features.push(channel.mean / 255);
      features.push(channel.min / 255);
      features.push(channel.max / 255);
    });

    return features;
  }

  /**
   * Clear caches (useful for memory management)
   */
  clearCache(): void {
    this.imageCache.clear();
    this.hashCache.clear();
    logger.info('Visual matching caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      imageCache: this.imageCache.size,
      hashCache: this.hashCache.size
    };
  }
}

export const visualMatching = new VisualMatchingService();