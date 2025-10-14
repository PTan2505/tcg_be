import { createHash } from 'crypto';
import sharp from 'sharp';

export interface VisualSimilarityResult {
  cardId: string;
  productId: number;
  similarity: number;
  imageUrl: string;
  name: string;
  gameType: string;
}

export interface ImageFeatures {
  histogram: number[];
  aspectRatio: number;
  averageColor: { r: number; g: number; b: number };
  edgeScore: number;
  brightnessScore: number;
  hash: string;
}

export class VisualSimilarityService {
  
  /**
   * Extract visual features from an image buffer
   */
  async extractImageFeatures(imageBuffer: Buffer): Promise<ImageFeatures> {
    try {
      // Resize to standard size for consistent comparison
      const processedImage = await sharp(imageBuffer)
        .resize(200, 280, { fit: 'fill' }) // Standard card aspect ratio
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = processedImage;
      const { width, height, channels } = info;

      // Calculate histogram (simplified RGB distribution)
      const histogram = new Array(768).fill(0); // 256 values each for R, G, B
      let totalR = 0, totalG = 0, totalB = 0;
      let edgePixels = 0;
      let totalBrightness = 0;

      for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Build histogram
        histogram[r]++;
        histogram[256 + g]++;
        histogram[512 + b]++;

        // Calculate averages
        totalR += r;
        totalG += g;
        totalB += b;

        // Simple edge detection (looking for high contrast)
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;

        if (i > 0) {
          const prevBrightness = (data[i - channels] + data[i - channels + 1] + data[i - channels + 2]) / 3;
          if (Math.abs(brightness - prevBrightness) > 50) {
            edgePixels++;
          }
        }
      }

      const pixelCount = data.length / channels;

      // Normalize histogram
      const normalizedHistogram = histogram.map(val => val / pixelCount);

      // Calculate features
      const aspectRatio = width / height;
      const averageColor = {
        r: Math.round(totalR / pixelCount),
        g: Math.round(totalG / pixelCount),
        b: Math.round(totalB / pixelCount)
      };
      const edgeScore = edgePixels / pixelCount;
      const brightnessScore = totalBrightness / pixelCount;

      // Create a simple hash for quick duplicate detection
      const hash = createHash('md5').update(data.slice(0, 1000)).digest('hex').substring(0, 16);

      return {
        histogram: normalizedHistogram,
        aspectRatio,
        averageColor,
        edgeScore,
        brightnessScore,
        hash
      };

    } catch (error) {
      console.error('❌ Error extracting image features:', error);
      const { getMessage } = require('../constants/messages');
      const AppError = require('../errors/AppError').default;
      throw new AppError(getMessage('VISUAL.FAILED_EXTRACT_FEATURES'), 500);
    }
  }

  /**
   * Download and extract features from a card image URL
   */
  async extractImageFeaturesFromUrl(imageUrl: string): Promise<ImageFeatures | null> {
    try {
      console.log(`📥 Downloading image: ${imageUrl}`);
      
      // Add headers to bypass CDN restrictions
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Cache-Control': 'max-age=0'
      };

      const response = await fetch(imageUrl, { 
        headers,
        method: 'GET'
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Failed to download image: ${response.status} ${response.statusText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      if (imageBuffer.length === 0) {
        console.warn(`⚠️ Empty image downloaded from ${imageUrl}`);
        return null;
      }

      return await this.extractImageFeatures(imageBuffer);

    } catch (error) {
      console.warn(`⚠️ Error downloading image from ${imageUrl}:`, error);
      return null;
    }
  }

  /**
   * Calculate similarity between two sets of image features
   */
  calculateSimilarity(features1: ImageFeatures, features2: ImageFeatures): number {
    let similarity = 0;
    let totalWeight = 0;

    // Histogram similarity (40% weight)
    const histogramWeight = 0.4;
    const histogramSimilarity = this.compareHistograms(features1.histogram, features2.histogram);
    similarity += histogramSimilarity * histogramWeight;
    totalWeight += histogramWeight;

    // Aspect ratio similarity (15% weight)
    const aspectWeight = 0.15;
    const aspectSimilarity = 1 - Math.min(Math.abs(features1.aspectRatio - features2.aspectRatio) / 2, 1);
    similarity += aspectSimilarity * aspectWeight;
    totalWeight += aspectWeight;

    // Color similarity (25% weight)
    const colorWeight = 0.25;
    const colorSimilarity = this.compareColors(features1.averageColor, features2.averageColor);
    similarity += colorSimilarity * colorWeight;
    totalWeight += colorWeight;

    // Edge similarity (10% weight)
    const edgeWeight = 0.1;
    const edgeSimilarity = 1 - Math.min(Math.abs(features1.edgeScore - features2.edgeScore), 1);
    similarity += edgeSimilarity * edgeWeight;
    totalWeight += edgeWeight;

    // Brightness similarity (10% weight)
    const brightnessWeight = 0.1;
    const brightnessSimilarity = 1 - Math.min(Math.abs(features1.brightnessScore - features2.brightnessScore) / 255, 1);
    similarity += brightnessSimilarity * brightnessWeight;
    totalWeight += brightnessWeight;

    // Hash exact match bonus
    if (features1.hash === features2.hash) {
      similarity += 0.2; // 20% bonus for exact hash match
    }

    return Math.min(similarity / totalWeight, 1.0);
  }

  /**
   * Compare histograms using correlation coefficient
   */
  private compareHistograms(hist1: number[], hist2: number[]): number {
    const n = Math.min(hist1.length, hist2.length);
    
    // Calculate means
    const mean1 = hist1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = hist2.slice(0, n).reduce((a, b) => a + b, 0) / n;

    // Calculate correlation coefficient
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = hist1[i] - mean1;
      const diff2 = hist2[i] - mean2;
      
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    if (denominator === 0) return 0;

    const correlation = numerator / denominator;
    return Math.max(0, correlation); // Convert to 0-1 range
  }

  /**
   * Compare average colors
   */
  private compareColors(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
    const rDiff = Math.abs(color1.r - color2.r);
    const gDiff = Math.abs(color1.g - color2.g);
    const bDiff = Math.abs(color1.b - color2.b);
    
    const totalDiff = rDiff + gDiff + bDiff;
    const maxPossibleDiff = 255 * 3;
    
    return 1 - (totalDiff / maxPossibleDiff);
  }

  /**
   * Find visually similar cards from a subset of candidate cards
   */
  async findSimilarCards(
    userImageFeatures: ImageFeatures,
    candidateCards: Array<{ _id: string; productId: number; name: string; imageUrl: string; gameType: string }>,
    minSimilarity: number = 0.3,
    maxResults: number = 10
  ): Promise<VisualSimilarityResult[]> {
    console.log(`🎨 Comparing visual similarity with ${candidateCards.length} candidate cards...`);
    
    const results: VisualSimilarityResult[] = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Add delay between requests to avoid rate limiting
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (const card of candidateCards) {
      try {
        if (!card.imageUrl) {
          continue;
        }

        // Add delay between requests (100ms to be respectful to CDN)
        if (processedCount > 0) {
          await delay(100);
        }

        const cardFeatures = await this.extractImageFeaturesFromUrl(card.imageUrl);
        if (!cardFeatures) {
          errorCount++;
          continue;
        }

        const similarity = this.calculateSimilarity(userImageFeatures, cardFeatures);
        
        if (similarity >= minSimilarity) {
          results.push({
            cardId: card._id.toString(),
            productId: card.productId,
            similarity,
            imageUrl: card.imageUrl,
            name: card.name,
            gameType: card.gameType
          });
          successCount++;
        }

        processedCount++;
        
        // Log progress every 10 cards
        if (processedCount % 10 === 0) {
          console.log(`📊 Processed ${processedCount}/${candidateCards.length} cards, found ${results.length} matches (${successCount} success, ${errorCount} errors)`);
        }

        // Stop early if we have enough good matches
        if (results.length >= maxResults * 2 && results.some(r => r.similarity > 0.8)) {
          console.log(`🎯 Found enough high-quality matches, stopping early at ${processedCount} cards`);
          break;
        }

      } catch (error) {
        console.warn(`⚠️ Error processing card ${card.name}:`, error);
        errorCount++;
      }
    }

    // Sort by similarity (highest first) and limit results
    const sortedResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    console.log(`✅ Visual similarity search complete: ${sortedResults.length} matches found from ${processedCount} processed cards`);
    console.log(`📈 Success rate: ${successCount}/${processedCount} (${((successCount/processedCount)*100).toFixed(1)}%)`);
    
    return sortedResults;
  }
}

// Export singleton instance
export const visualSimilarityService = new VisualSimilarityService();