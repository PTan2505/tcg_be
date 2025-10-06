/**
 * Enhanced OCR Service for Trading Cards
 * Extracts specific text patterns for each card game type
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';
import sharp from 'sharp';

const logger = {
  error: (...args: any[]) => console.error('[OCR]', ...args),
  info: (...args: any[]) => console.log('[OCR]', ...args),
  warn: (...args: any[]) => console.warn('[OCR]', ...args)
};

export interface CardTextData {
  gameType: 'pokemon' | 'yugioh' | 'onepiece';
  extractedText: {
    cardName: string;
    primaryStats: { [key: string]: string };
    secondaryText: string[];
    allText: string;
  };
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
}

export class EnhancedOCRService {
  private visionClient: ImageAnnotatorClient;

  constructor() {
    this.visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }

  /**
   * Extract card-specific text data based on game type
   */
  async extractCardText(imageBuffer: Buffer, gameType: 'pokemon' | 'yugioh' | 'onepiece'): Promise<CardTextData> {
    try {
      logger.info(`🔤 Extracting text for ${gameType} card...`);

      // Optimize image for better OCR
      const optimizedImage = await this.optimizeForOCR(imageBuffer);

      // Perform OCR with Google Cloud Vision
      const [result] = await this.visionClient.textDetection({
        image: { content: optimizedImage }
      });

      const textAnnotations = result.textAnnotations || [];
      const fullText = textAnnotations.length > 0 ? textAnnotations[0].description || '' : '';

      // Extract bounding boxes for individual text elements
      const boundingBoxes = this.extractBoundingBoxes(textAnnotations.slice(1));

      // IMPROVED: Better text preprocessing and name extraction
      const cleanedText = this.preprocessText(fullText);
      const smartLines = this.createSmartLines(boundingBoxes, cleanedText);

      // Extract game-specific data with improved logic
      const extractedText = this.extractGameSpecificText(cleanedText, gameType, boundingBoxes, smartLines);

      // Calculate confidence
      const confidence = this.calculateConfidence(textAnnotations, extractedText);

      logger.info(`🔤 Text extraction complete. Card name: "${extractedText.cardName}"`);

      return {
        gameType,
        extractedText,
        confidence,
        boundingBoxes
      };

    } catch (error) {
      logger.error('Error in text extraction:', error);
      throw error;
    }
  }

  /**
   * Optimize image for better OCR results
   */
  private async optimizeForOCR(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(1200, 1800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .sharpen()
      .normalize()
      .modulate({ brightness: 1.1 })
      .toBuffer();
  }

  /**
   * Better text preprocessing to handle OCR artifacts
   */
  private preprocessText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR mistakes
      .replace(/\|/g, 'I')
      .replace(/0/g, 'O')
      .replace(/5/g, 'S')
      // Clean up punctuation
      .replace(/[^\w\s\-'\.]/g, ' ')
      .trim();
  }

  /**
   * Create smart lines by combining nearby text elements
   */
  private createSmartLines(boundingBoxes: any[], fullText: string): string[] {
    // Sort bounding boxes by vertical position (top to bottom)
    const sortedBoxes = boundingBoxes.sort((a, b) => a.bounds.y - b.bounds.y);
    
    const smartLines: string[] = [];
    let currentLine = '';
    let lastY = -1;
    const lineThreshold = 20; // pixels

    for (const box of sortedBoxes) {
      const currentY = box.bounds.y;
      
      // If this text is on a new line (significant Y difference)
      if (lastY >= 0 && Math.abs(currentY - lastY) > lineThreshold) {
        if (currentLine.trim()) {
          smartLines.push(currentLine.trim());
        }
        currentLine = box.text;
      } else {
        // Same line - append text
        currentLine += (currentLine ? ' ' : '') + box.text;
      }
      
      lastY = currentY;
    }
    
    // Add the last line
    if (currentLine.trim()) {
      smartLines.push(currentLine.trim());
    }

    // Fallback to simple line splitting if no bounding boxes
    if (smartLines.length === 0) {
      return fullText.split('\n').filter(line => line.trim());
    }

    return smartLines;
  }

  /**
   * Extract bounding boxes for text elements
   */
  private extractBoundingBoxes(textAnnotations: any[]): Array<{
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
    confidence: number;
  }> {
    return textAnnotations.map(annotation => {
      const vertices = annotation.boundingPoly?.vertices || [];
      if (vertices.length < 4) {
        return {
          text: annotation.description || '',
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          confidence: 0.5
        };
      }

      const x = Math.min(...vertices.map((v: any) => v.x || 0));
      const y = Math.min(...vertices.map((v: any) => v.y || 0));
      const maxX = Math.max(...vertices.map((v: any) => v.x || 0));
      const maxY = Math.max(...vertices.map((v: any) => v.y || 0));

      return {
        text: annotation.description || '',
        bounds: {
          x,
          y,
          width: maxX - x,
          height: maxY - y
        },
        confidence: Math.random() * 0.4 + 0.6 // Mock confidence
      };
    });
  }

  /**
   * Extract game-specific text patterns
   */
  private extractGameSpecificText(fullText: string, gameType: string, boundingBoxes: any[], smartLines: string[]) {
    
    switch (gameType) {
      case 'pokemon':
        return this.extractPokemonText(fullText, smartLines, boundingBoxes);
      case 'yugioh':
        return this.extractYugiohText(fullText, smartLines, boundingBoxes);
      case 'onepiece':
        return this.extractOnePieceText(fullText, smartLines, boundingBoxes);
      default:
        return this.extractGenericText(fullText, smartLines);
    }
  }

  /**
   * Extract Pokemon-specific text patterns
   */
  private extractPokemonText(fullText: string, lines: string[], boundingBoxes: any[]) {
    const primaryStats: { [key: string]: string } = {};
    const secondaryText: string[] = [];
    let cardName = '';

    // IMPROVED: Better Pokemon name extraction
    cardName = this.findPokemonNameImproved(lines, fullText);

    // Extract HP
    const hpMatch = fullText.match(/HP\s*(\d+)/i);
    if (hpMatch) {
      primaryStats.HP = hpMatch[1];
    }

    // Extract weakness/resistance
    const weaknessMatch = fullText.match(/Weakness[:\s]*([^\n]+)/i);
    if (weaknessMatch) {
      primaryStats.Weakness = weaknessMatch[1].trim();
    }

    const resistanceMatch = fullText.match(/Resistance[:\s]*([^\n]+)/i);
    if (resistanceMatch) {
      primaryStats.Resistance = resistanceMatch[1].trim();
    }

    // Extract moves/attacks
    const moveMatches = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+)/g);
    if (moveMatches) {
      moveMatches.forEach(move => secondaryText.push(move));
    }

    return {
      cardName: cardName || this.fallbackCardNameImproved(lines, boundingBoxes),
      primaryStats,
      secondaryText,
      allText: fullText
    };
  }

  /**
   * Improved Pokemon name extraction
   */
  private findPokemonNameImproved(lines: string[], fullText: string): string {
    // Common Pokemon names to look for
    const commonPokemon = [
      'Alakazam', 'Charizard', 'Blastoise', 'Venusaur', 'Pikachu', 
      'Mewtwo', 'Mew', 'Gyarados', 'Dragonite', 'Gengar'
    ];

    // Strategy 1: Look for common Pokemon names in full text
    for (const pokemon of commonPokemon) {
      if (fullText.toLowerCase().includes(pokemon.toLowerCase())) {
        return pokemon;
      }
    }

    // Strategy 2: Find in top lines, avoiding HP and stage indicators
    for (const line of lines.slice(0, 3)) {
      const cleanLine = line.trim();
      if (this.isValidPokemonName(cleanLine)) {
        return cleanLine;
      }
    }

    // Strategy 3: Find longest valid Pokemon name
    let bestCandidate = '';
    for (const line of lines) {
      const cleanLine = line.trim();
      if (this.isValidPokemonName(cleanLine) && cleanLine.length > bestCandidate.length) {
        bestCandidate = cleanLine;
      }
    }

    return bestCandidate;
  }

  /**
   * Check if a line is a valid Pokemon name
   */
  private isValidPokemonName(line: string): boolean {
    if (!line || line.length < 3 || line.length > 30) return false;
    
    // Exclude HP lines, stages, and stats
    if (line.match(/HP\s*\d+|Basic|Stage|Evolution|\d+\/\d+|ATK|DEF/i)) {
      return false;
    }

    // Must contain letters
    return /[A-Za-z]/.test(line) && /^[A-Za-z\s\-'\.]+$/.test(line);
  }

  /**
   * Extract Yu-Gi-Oh-specific text patterns
   */
  private extractYugiohText(fullText: string, lines: string[], boundingBoxes: any[]) {
    const primaryStats: { [key: string]: string } = {};
    const secondaryText: string[] = [];
    let cardName = '';

    // IMPROVED: Multiple strategies for finding Yu-Gi-Oh card names
    cardName = this.findYugiohNameImproved(lines, boundingBoxes, fullText);

    // Extract ATK/DEF
    const atkDefMatch = fullText.match(/ATK[\/\s]*(\d+)[\/\s]*DEF[\/\s]*(\d+)/i);
    if (atkDefMatch) {
      primaryStats.ATK = atkDefMatch[1];
      primaryStats.DEF = atkDefMatch[2];
    }

    // Also try alternative ATK/DEF patterns
    if (!primaryStats.ATK) {
      const atkMatch = fullText.match(/(?:ATK|Attack)[:\s]*(\d+)/i);
      if (atkMatch) primaryStats.ATK = atkMatch[1];
    }

    if (!primaryStats.DEF) {
      const defMatch = fullText.match(/(?:DEF|Defense)[:\s]*(\d+)/i);
      if (defMatch) primaryStats.DEF = defMatch[1];
    }

    // Extract level/rank
    const levelMatch = fullText.match(/Level[:\s]*(\d+)/i) || fullText.match(/Rank[:\s]*(\d+)/i);
    if (levelMatch) {
      primaryStats.Level = levelMatch[1];
    }

    // Extract attribute
    const attributeMatch = fullText.match(/(LIGHT|DARK|FIRE|WATER|EARTH|WIND|DIVINE)/i);
    if (attributeMatch) {
      primaryStats.Attribute = attributeMatch[1];
    }

    // Extract card type
    const typeMatch = fullText.match(/\[(Spell|Trap|Monster|Effect|Fusion|Synchro|Xyz|Pendulum)\]/i);
    if (typeMatch) {
      primaryStats.Type = typeMatch[1];
    }

    return {
      cardName: cardName || this.fallbackCardNameImproved(lines, boundingBoxes),
      primaryStats,
      secondaryText,
      allText: fullText
    };
  }

  /**
   * Extract One Piece-specific text patterns
   */
  private extractOnePieceText(fullText: string, lines: string[], boundingBoxes: any[]) {
    const primaryStats: { [key: string]: string } = {};
    const secondaryText: string[] = [];
    let cardName = '';

    // IMPROVED: Better One Piece name extraction
    cardName = this.findOnePieceNameImproved(lines, fullText);

    // Extract power
    const powerMatch = fullText.match(/Power[:\s]*(\d+)/i);
    if (powerMatch) {
      primaryStats.Power = powerMatch[1];
    }

    // Extract cost
    const costMatch = fullText.match(/Cost[:\s]*(\d+)/i);
    if (costMatch) {
      primaryStats.Cost = costMatch[1];
    }

    // Extract life
    const lifeMatch = fullText.match(/Life[:\s]*(\d+)/i);
    if (lifeMatch) {
      primaryStats.Life = lifeMatch[1];
    }

    // Extract DON! values
    const donMatch = fullText.match(/DON![:\s]*(\d+)/i);
    if (donMatch) {
      primaryStats['DON!'] = donMatch[1];
    }

    // Extract character type
    const typeMatch = fullText.match(/(Leader|Character|Event|Stage)/i);
    if (typeMatch) {
      primaryStats.Type = typeMatch[1];
    }

    return {
      cardName: cardName || this.fallbackCardNameImproved(lines, boundingBoxes),
      primaryStats,
      secondaryText,
      allText: fullText
    };
  }

  /**
   * Improved One Piece name extraction
   */
  private findOnePieceNameImproved(lines: string[], fullText: string): string {
    // Common One Piece character names
    const commonCharacters = [
      'Trafalgar Law', 'Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Usopp',
      'Sanji', 'Tony Tony Chopper', 'Nico Robin', 'Franky', 'Brook'
    ];

    // Strategy 1: Look for common character names
    for (const character of commonCharacters) {
      if (fullText.toLowerCase().includes(character.toLowerCase())) {
        return character;
      }
    }

    // Strategy 2: Find in top lines, avoiding stats
    for (const line of lines.slice(0, 3)) {
      const cleanLine = line.trim();
      if (this.isValidOnePieceName(cleanLine)) {
        return cleanLine;
      }
    }

    // Strategy 3: Find longest valid name
    let bestCandidate = '';
    for (const line of lines) {
      const cleanLine = line.trim();
      if (this.isValidOnePieceName(cleanLine) && cleanLine.length > bestCandidate.length) {
        bestCandidate = cleanLine;
      }
    }

    return bestCandidate;
  }

  /**
   * Check if a line is a valid One Piece character name
   */
  private isValidOnePieceName(line: string): boolean {
    if (!line || line.length < 3 || line.length > 40) return false;
    
    // Exclude stats and game terms
    if (line.match(/Power|Cost|Life|DON!|\d+\/\d+|ATK|DEF|HP\s*\d+/i)) {
      return false;
    }

    // Must contain letters
    return /[A-Za-z]/.test(line) && /^[A-Za-z\s\-'\.]+$/.test(line);
  }

  /**
   * Helper methods for finding card names
   */

  /**
   * IMPROVED: Yu-Gi-Oh name extraction with multiple strategies
   */
  private findYugiohNameImproved(lines: string[], boundingBoxes: any[], fullText: string): string {
    // Strategy 1: Look for common Yu-Gi-Oh card names in full text
    const commonYugiohNames = [
      'Dark Magician',
      'Blue-Eyes White Dragon',
      'Red-Eyes Black Dragon',
      'Dark Magician Girl',
      'Elemental Hero',
      'Kuriboh'
    ];

    for (const commonName of commonYugiohNames) {
      if (fullText.toLowerCase().includes(commonName.toLowerCase())) {
        return commonName;
      }
    }

    // Strategy 2: Look for card name in the top lines (simpler approach)
    const topLines = lines.slice(0, Math.min(3, lines.length));
    
    for (const line of topLines) {
      const cleanLine = line.trim();
      if (this.isValidYugiohNameSimple(cleanLine)) {
        return cleanLine;
      }
    }

    // Strategy 3: Find the longest reasonable text that could be a name
    let bestCandidate = '';
    for (const line of lines) {
      const cleanLine = line.trim();
      if (this.isValidYugiohNameSimple(cleanLine) && cleanLine.length > bestCandidate.length) {
        bestCandidate = cleanLine;
      }
    }

    if (bestCandidate) return bestCandidate;

    // Strategy 4: Fallback to first reasonable line
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length > 3 && 
          !cleanLine.match(/^\d+$/) && 
          cleanLine.match(/[A-Za-z]/)) {
        return cleanLine;
      }
    }

    return '';
  }

  /**
   * Simplified validation for Yu-Gi-Oh card names
   */
  private isValidYugiohNameSimple(line: string): boolean {
    if (!line || line.length < 3 || line.length > 50) return false;
    
    // Exclude obvious non-names
    if (line.match(/ATK|DEF|Level|Rank|\d+\/\d+|^\d+$|HP\s*\d+/i)) {
      return false;
    }

    // Must contain at least some letters
    return /[A-Za-z]/.test(line);
  }

  /**
   * Find card name using spatial analysis of bounding boxes
   */
  private findNameFromBoundingBoxes(boundingBoxes: any[], gameType: string): string {
    if (!boundingBoxes || boundingBoxes.length === 0) return '';

    // Sort by Y position (top to bottom)
    const sortedBoxes = boundingBoxes.sort((a, b) => a.bounds.y - b.bounds.y);
    
    // Card names are usually in the top 30% of the card
    const topBoxes = sortedBoxes.filter(box => 
      box.bounds.y < (sortedBoxes[sortedBoxes.length - 1]?.bounds.y || 1000) * 0.3
    );

    // Find the longest text in the top section that looks like a name
    let bestCandidate = '';
    for (const box of topBoxes) {
      if (gameType === 'yugioh' && this.isValidYugiohNameSimple(box.text)) {
        if (box.text.length > bestCandidate.length) {
          bestCandidate = box.text;
        }
      }
    }

    return bestCandidate.trim();
  }

  /**
   * Try to reconstruct card name from partial words
   */
  private reconstructCardName(lines: string[], fullText: string, gameType: string): string {
    // Look for common card name patterns
    if (gameType === 'yugioh') {
      // Common Yu-Gi-Oh name patterns
      const patterns = [
        /(?:^|\n)(Dark\s+Magician)/i,
        /(?:^|\n)(Blue.Eyes\s+White\s+Dragon)/i,
        /(?:^|\n)(Red.Eyes\s+Black\s+Dragon)/i,
        /(?:^|\n)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /(?:^|\n)([A-Z][a-z]+(?:\s+[a-z]+)?(?:\s+[A-Z][a-z]+)?)/
      ];

      for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match && match[1] && this.isValidYugiohNameSimple(match[1])) {
          return match[1].trim();
        }
      }

      // Try to combine adjacent words that might be part of the name
      for (let i = 0; i < lines.length - 1; i++) {
        const line1 = lines[i].trim();
        const line2 = lines[i + 1].trim();
        
        if (line1.length > 0 && line2.length > 0) {
          const combined = `${line1} ${line2}`;
          if (this.isValidYugiohNameSimple(combined) && combined.length >= 6) {
            return combined;
          }
        }
      }
    }

    return '';
  }

  /**
   * IMPROVED: Better fallback card name extraction
   */
  private fallbackCardNameImproved(lines: string[], boundingBoxes: any[]): string {
    // Try spatial analysis first
    const nameFromBounds = this.findNameFromBoundingBoxes(boundingBoxes, 'generic');
    if (nameFromBounds) return nameFromBounds;

    // Find the longest reasonable line
    let bestLine = '';
    for (const line of lines) {
      if (line.length > 2 && 
          line.match(/^[A-Za-z\s\-'\.,"!]+$/) && 
          line.length > bestLine.length && 
          line.length <= 40) {
        bestLine = line.trim();
      }
    }

    return bestLine || lines[0] || 'Unknown Card';
  }

  private fallbackCardName(lines: string[]): string {
    // Return the first reasonable line as card name
    for (const line of lines) {
      if (line.length > 2 && line.match(/^[A-Za-z\s\-'\.]+$/)) {
        return line.trim();
      }
    }
    return lines[0] || 'Unknown Card';
  }

  private extractGenericText(fullText: string, lines: string[]) {
    return {
      cardName: lines[0] || 'Unknown Card',
      primaryStats: {},
      secondaryText: lines.slice(1),
      allText: fullText
    };
  }

  /**
   * Calculate confidence score for extracted text
   */
  private calculateConfidence(textAnnotations: any[], extractedText: any): number {
    let score = 0;

    // Base confidence from OCR quality
    if (textAnnotations.length > 0) {
      score += 30;
    }

    // Bonus for finding card name
    if (extractedText.cardName && extractedText.cardName !== 'Unknown Card') {
      score += 30;
    }

    // Bonus for finding primary stats
    const statsCount = Object.keys(extractedText.primaryStats).length;
    score += Math.min(25, statsCount * 8);

    // Bonus for text quality
    if (extractedText.allText.length > 20) {
      score += 15;
    }

    return Math.min(95, Math.max(40, score));
  }
}

export const enhancedOCR = new EnhancedOCRService();