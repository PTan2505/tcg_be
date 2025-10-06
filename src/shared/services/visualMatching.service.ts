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
      similarityThreshold = 0.35, // Slightly higher threshold for better matches
      imageSize = { width: 240, height: 336 }, // Better resolution for card details
      timeout = 30000
    } = options;

    try {
      logger.info(`🖼️  Starting visual matching for ${candidates.length} candidates`);

      // Normalize the scanned image
      const normalizedScanned = await this.normalizeImage(scannedImageBuffer, imageSize);
      const scannedHash = await this.generateImageHash(normalizedScanned);

      const visualMatches: VisualMatchResult[] = [];
      const validCandidates = candidates.slice(0, maxCandidates);

      // Process candidates in parallel (but with concurrency limit)
      const concurrencyLimit = 5;
      for (let i = 0; i < validCandidates.length; i += concurrencyLimit) {
        const batch = validCandidates.slice(i, i + concurrencyLimit);
        
        const batchPromises = batch.map(async (candidate) => {
          try {
            const similarity = await this.compareImages(
              normalizedScanned,
              scannedHash,
              candidate.imageUrl,
              imageSize
            );

            if (similarity >= similarityThreshold) {
              return {
                cardId: candidate.cardId,
                imageUrl: candidate.imageUrl,
                similarity,
                matchType: this.getMatchType(similarity),
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

      logger.info(`🖼️  Visual matching completed: ${visualMatches.length} matches found in ${Date.now() - startTime}ms`);
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
    imageSize: { width: number; height: number }
  ): Promise<number> {
    try {
      // Get candidate image
      const candidateImage = await this.downloadAndNormalizeImage(candidateImageUrl, imageSize);
      const candidateHash = await this.generateImageHash(candidateImage);

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

      // Additional safety check
      const safeFinalSimilarity = isNaN(finalSimilarity) ? 0 : Math.max(0, Math.min(1, finalSimilarity));
      
      return Math.round(safeFinalSimilarity * 100) / 100; // Round to 2 decimal places

    } catch (error) {
      logger.warn('Image comparison failed:', error instanceof Error ? error.message : 'Unknown error');
      return 0;
    }
  }

  /**
   * Download and normalize candidate image
   */
  private async downloadAndNormalizeImage(imageUrl: string, imageSize: { width: number; height: number }): Promise<Buffer> {
    // Check cache first
    const cacheKey = `${imageUrl}_${imageSize.width}x${imageSize.height}`;
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
      const normalizedImage = await this.normalizeImage(imageBuffer, imageSize);

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
  private async normalizeImage(imageBuffer: Buffer, size: { width: number; height: number }): Promise<Buffer> {
    return await sharp(imageBuffer)
      .resize(size.width, size.height, { 
        fit: 'fill',
        withoutEnlargement: false 
      })
      .normalize() // Auto-adjust brightness/contrast
      .modulate({
        saturation: 1.1, // Slightly enhance saturation for better color matching
        brightness: 1.0
      })
      .sharpen(1, 1, 2) // Enhance details
      .png()
      .toBuffer();
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
   * Categorize match quality
   */
  private getMatchType(similarity: number): 'exact' | 'high' | 'moderate' | 'low' {
    if (similarity >= 0.9) return 'exact';
    if (similarity >= 0.7) return 'high';
    if (similarity >= 0.5) return 'moderate';
    return 'low';
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