/**
 * Game Type Classifier Service
 * Identifies card game type from image using visual characteristics
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';

// Simple logger
const logger = {
  error: (...args: any[]) => console.error('[CLASSIFIER]', ...args),
  info: (...args: any[]) => console.log('[CLASSIFIER]', ...args),
  warn: (...args: any[]) => console.warn('[CLASSIFIER]', ...args)
};

export interface GameClassificationResult {
  gameType: 'pokemon' | 'yugioh' | 'onepiece';
  confidence: number;
  reasoning: string;
  visualFeatures: {
    dominantColors: Array<{ color: string; percentage: number }>;
    textPatterns: string[];
    layoutFeatures: string[];
  };
}

export class GameClassifierService {
  private visionClient: ImageAnnotatorClient;

  constructor() {
    // Prefer explicit credentials object when GOOGLE_APPLICATION_CREDENTIALS points to a file
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    let clientOptions: any = {};
    if (credPath) {
      try {
        const raw = fs.readFileSync(credPath, 'utf8');
        const parsed = JSON.parse(raw);
        // Construct a GoogleAuth instance with the parsed credentials so
        // google-gax receives an auth object that implements required helpers
        clientOptions.auth = new GoogleAuth({ credentials: parsed });
      } catch (err) {
        logger.warn('Failed to load GOOGLE_APPLICATION_CREDENTIALS, falling back to default application credentials', err);
      }
    }

    this.visionClient = new ImageAnnotatorClient(clientOptions);
  }

  /**
   * Classify card game type from image
   */
  async classifyGameType(imageBuffer: Buffer): Promise<GameClassificationResult> {
    try {
      logger.info('🎯 Starting game type classification...');

      // Analyze image with Google Cloud Vision
      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer }
      });

      const detections = result.textAnnotations || [];
      const fullText = detections.length > 0 ? detections[0].description || '' : '';

      // Extract visual features
      const visualFeatures = await this.extractVisualFeatures(imageBuffer, fullText);

      // Classify based on multiple criteria
      const classification = this.performClassification(fullText, visualFeatures);

      logger.info(`🎯 Classification result: ${classification.gameType} (${classification.confidence}%)`);
      return classification;

    } catch (error) {
      logger.error('Error in game classification:', error);
      throw error;
    }
  }

  /**
   * Extract visual features from image
   */
  private async extractVisualFeatures(imageBuffer: Buffer, text: string) {
    // Get dominant colors
    const dominantColors = await this.extractDominantColors(imageBuffer);

    // Extract text patterns
    const textPatterns = this.extractTextPatterns(text);

    // Detect layout features
    const layoutFeatures = this.detectLayoutFeatures(text);

    return {
      dominantColors,
      textPatterns,
      layoutFeatures
    };
  }

  /**
   * Perform game type classification using multiple criteria
   */
  private performClassification(text: string, visualFeatures: any): GameClassificationResult {
    const lowerText = text.toLowerCase();
    
    // Scoring system for each game type
    const scores = {
      pokemon: 0,
      yugioh: 0,
      onepiece: 0
    };

    // Pokemon indicators
    if (this.containsPattern(lowerText, ['hp', 'pokémon', 'pokemon', 'energy', 'weakness', 'resistance'])) {
      scores.pokemon += 30;
    }
    if (this.containsPattern(lowerText, ['evolves from', 'basic', 'stage 1', 'stage 2'])) {
      scores.pokemon += 20;
    }
    if (this.containsHP(lowerText)) {
      scores.pokemon += 25;
    }

    // Yu-Gi-Oh indicators
    if (this.containsPattern(lowerText, ['atk', 'def', 'attack', 'defense', 'level', 'attribute'])) {
      scores.yugioh += 30;
    }
    if (this.containsPattern(lowerText, ['spell', 'trap', 'monster', 'effect', 'fusion', 'synchro', 'xyz'])) {
      scores.yugioh += 25;
    }
    if (this.containsATKDEF(lowerText)) {
      scores.yugioh += 20;
    }

    // One Piece indicators
    if (this.containsPattern(lowerText, ['power', 'cost', 'life', 'counter', 'don!', 'leader'])) {
      scores.onepiece += 30;
    }
    if (this.containsPattern(lowerText, ['crew', 'character', 'event', 'stage'])) {
      scores.onepiece += 20;
    }

    // Color-based classification
    const colorBonus = this.getColorBasedScore(visualFeatures.dominantColors);
    scores.pokemon += colorBonus.pokemon;
    scores.yugioh += colorBonus.yugioh;
    scores.onepiece += colorBonus.onepiece;

    // Determine winner
    const maxScore = Math.max(scores.pokemon, scores.yugioh, scores.onepiece);
    let gameType: 'pokemon' | 'yugioh' | 'onepiece';
    
    if (scores.pokemon === maxScore) gameType = 'pokemon';
    else if (scores.yugioh === maxScore) gameType = 'yugioh';
    else gameType = 'onepiece';

    const confidence = Math.min(95, Math.max(60, maxScore * 1.2)); // Scale to 60-95%

    return {
      gameType,
      confidence: Math.round(confidence),
      reasoning: this.generateReasoning(gameType, scores, lowerText),
      visualFeatures
    };
  }

  /**
   * Helper methods for pattern detection
   */
  private containsPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private containsHP(text: string): boolean {
    return /hp\s*\d+/i.test(text) || /\d+\s*hp/i.test(text);
  }

  private containsATKDEF(text: string): boolean {
    return /atk\/\s*\d+/i.test(text) || /def\/\s*\d+/i.test(text) || /\d+\/\d+/i.test(text);
  }

  private extractTextPatterns(text: string): string[] {
    const patterns = [];
    
    if (/hp\s*\d+/i.test(text)) patterns.push('HP_PATTERN');
    if (/atk\/def/i.test(text)) patterns.push('ATK_DEF_PATTERN');
    if (/power\s*\d+/i.test(text)) patterns.push('POWER_PATTERN');
    if (/\d+\/\d+/i.test(text)) patterns.push('FRACTION_PATTERN');
    
    return patterns;
  }

  private detectLayoutFeatures(text: string): string[] {
    const features = [];
    
    if (text.length > 200) features.push('COMPLEX_TEXT');
    if (/\n.*\n.*\n/i.test(text)) features.push('MULTI_LINE');
    if (/[A-Z]{2,}/i.test(text)) features.push('UPPERCASE_WORDS');
    
    return features;
  }

  private getColorBasedScore(colors: Array<{ color: string; percentage: number }>) {
    const scores = { pokemon: 0, yugioh: 0, onepiece: 0 };
    
    colors.forEach(({ color, percentage }) => {
      const colorLower = color.toLowerCase();
      
      // Pokemon often has bright, vibrant colors
      if (colorLower.includes('yellow') || colorLower.includes('blue') || colorLower.includes('red')) {
        scores.pokemon += percentage * 0.1;
      }
      
      // Yu-Gi-Oh often has dark/golden themes
      if (colorLower.includes('gold') || colorLower.includes('brown') || colorLower.includes('black')) {
        scores.yugioh += percentage * 0.1;
      }
      
      // One Piece often has bright, anime-style colors
      if (colorLower.includes('orange') || colorLower.includes('purple') || colorLower.includes('green')) {
        scores.onepiece += percentage * 0.1;
      }
    });
    
    return scores;
  }

  private generateReasoning(gameType: string, scores: any, text: string): string {
    const reasons = [];
    
    if (gameType === 'pokemon') {
      if (text.includes('hp')) reasons.push('HP values detected');
      if (text.includes('pokemon') || text.includes('pokémon')) reasons.push('Pokemon branding found');
      if (text.includes('energy')) reasons.push('Energy system indicators');
    } else if (gameType === 'yugioh') {
      if (text.includes('atk') || text.includes('def')) reasons.push('ATK/DEF stats found');
      if (text.includes('level')) reasons.push('Level system detected');
      if (text.includes('effect')) reasons.push('Effect text patterns');
    } else if (gameType === 'onepiece') {
      if (text.includes('power')) reasons.push('Power values detected');
      if (text.includes('cost')) reasons.push('Cost system found');
      if (text.includes('don!')) reasons.push('One Piece DON! system');
    }
    
    return reasons.join(', ') || 'Visual pattern analysis';
  }

  private async extractDominantColors(imageBuffer: Buffer): Promise<Array<{ color: string; percentage: number }>> {
    try {
      const { data, info } = await sharp(imageBuffer)
        .resize(100, 100)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

      // Simple color analysis - get most common colors
      const colorCounts: { [key: string]: number } = {};
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Group similar colors
        const colorKey = `${Math.floor(r / 32) * 32},${Math.floor(g / 32) * 32},${Math.floor(b / 32) * 32}`;
        colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
      }

      // Get top 5 colors
      const totalPixels = data.length / 4;
      const sortedColors = Object.entries(colorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([color, count]) => ({
          color: `rgb(${color})`,
          percentage: Math.round((count / totalPixels) * 100)
        }));

      return sortedColors;
    } catch (error) {
      logger.warn('Color extraction failed, using defaults:', error);
      return [{ color: 'rgb(128,128,128)', percentage: 100 }];
    }
  }
}

export const gameClassifier = new GameClassifierService();