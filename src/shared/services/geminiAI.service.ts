import { GoogleGenerativeAI } from '@google/generative-ai';
import { cardDataService } from './cardData.service';

export interface OCRData {
  cardName: string;
  primaryStats: Record<string, any>;
  confidence: number;
  extractedWords: number;
  detectedSetCodes?: string[];
}

export interface CardCandidate {
  cardId: string;
  name: string;
  cardNumber?: string;
  setCode?: string;
  rarity?: string;
  gameType: string;
  imageUrl?: string;
  // Additional fields from CSV data
  [key: string]: any;
}

export interface AIMatchResult {
  bestMatch: CardCandidate | null;
  confidence: number;
  reasoning: string;
  alternativeMatches: CardCandidate[];
  aiAnalysis: {
    correctedCardName?: string;
    correctedSetCode?: string;
    correctedCardNumber?: string;
    semanticMatches: string[];
  };
}

class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Enhanced AI card matching using Gemini with CSV data integration
   * Analyzes OCR data against card database to find best matches
   */
  async enhancedCardMatching(
    ocrData: OCRData,
    candidates: CardCandidate[],
    gameType: string
  ): Promise<AIMatchResult> {
    try {
      // Step 1: Get potential card name corrections from CSV data
      const csvMatches = await cardDataService.findBestCardNameMatches(
        ocrData.cardName,
        gameType as 'onepiece' | 'pokemon' | 'yugioh',
        20
      );

      // Step 2: Create comprehensive prompt for Gemini with CSV context
      const prompt = this.createEnhancedMatchingPrompt(ocrData, candidates, gameType, csvMatches);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse AI response
      return this.parseAIResponse(text, candidates);
      
    } catch (error) {
      console.error('Gemini AI matching error:', error);
      
      // Fallback to first candidate if AI fails
      return {
        bestMatch: candidates[0] || null,
        confidence: 50,
        reasoning: 'AI service unavailable, using fallback matching',
        alternativeMatches: candidates.slice(1, 3),
        aiAnalysis: {
          semanticMatches: []
        }
      };
    }
  }

  /**
   * Create enhanced prompt with CSV data context
   */
  private createEnhancedMatchingPrompt(
    ocrData: OCRData,
    candidates: CardCandidate[],
    gameType: string,
    csvMatches: any[]
  ): string {
    const candidatesText = candidates.map((card, index) => 
      `${index + 1}. ID: ${card.cardId}
   Name: ${card.name}
   Card Number: ${card.cardNumber || 'N/A'}
   Set Code: ${card.setCode || 'N/A'}
   Rarity: ${card.rarity || 'N/A'}
   Game Type: ${card.gameType}`
    ).join('\n\n');

    const csvMatchesText = csvMatches.slice(0, 10).map((card, index) => 
      `${index + 1}. ${card.name} (${card.setCode || 'Unknown Set'}) [${card.cardNumber || 'No Number'}]`
    ).join('\n');

    return `You are an expert Trading Card Game (TCG) card identification AI with access to comprehensive card databases. Your task is to correct OCR errors and find the best matching card.

**OCR EXTRACTED DATA:**
- Card Name: "${ocrData.cardName}"
- Detected Set Codes: ${ocrData.detectedSetCodes?.join(', ') || 'None'}
- Primary Stats: ${JSON.stringify(ocrData.primaryStats)}
- OCR Confidence: ${ocrData.confidence}%
- Game Type: ${gameType}
- Extracted Words: ${ocrData.extractedWords}

**POTENTIAL CARD NAME CORRECTIONS FROM DATABASE:**
Based on fuzzy matching against the complete ${gameType.toUpperCase()} card database, here are the most likely card names:
${csvMatchesText}

**SEARCH RESULT CANDIDATES:**
${candidatesText}

**ENHANCED ANALYSIS INSTRUCTIONS:**
1. **OCR Error Detection**: The OCR detected "${ocrData.cardName}" - check if this is a partial/corrupted version of any card in the database
2. **Name Correction Priority**: Use the CSV database matches above to identify the most likely intended card name
3. **Example Corrections**:
   - "Mega" could be "Meganium", "Mega Lucario", "Mega Charizard"
   - "Traf" could be "Trafalgar Law"
   - "Monke" could be "Monkey.D.Luffy"
4. **Set Code Matching**: Cross-reference detected set codes with candidate set codes
5. **Statistical Validation**: Consider card popularity and likelihood in the context

**IMPORTANT MATCHING RULES:**
- For Pokemon: Look for HP, weakness, resistance, retreat cost, evolution stage
- For One Piece: Look for power, cost, counter, type (Leader/Character/Event/Stage)
- For Yu-Gi-Oh: Look for ATK/DEF, Level/Rank, monster type, spell/trap

**RESPONSE FORMAT (JSON ONLY):**
{
  "bestMatchIndex": <1-based index of best match from candidates, or 0 if no good match>,
  "confidence": <0-100 confidence score>,
  "reasoning": "<detailed explanation including OCR correction logic>",
  "alternativeMatches": [<array of 1-based indices for 2nd and 3rd best matches>],
  "aiAnalysis": {
    "correctedCardName": "<most likely intended card name from database>",
    "correctedSetCode": "<corrected set code if needed>",
    "correctedCardNumber": "<corrected card number if needed>",
    "semanticMatches": ["<list of semantic clues and corrections applied>"],
    "ocrErrors": ["<list of detected OCR errors and corrections>"]
  }
}

**OCR CORRECTION EXAMPLES:**
- Input: "Mega" → Likely: "Meganium" (common Pokemon card)
- Input: "Traf" → Likely: "Trafalgar Law" (popular One Piece character)
- Input: "Dark Mag" → Likely: "Dark Magician" (iconic Yu-Gi-Oh card)

Focus on finding the CORRECT card name from the database first, then match it to the best candidate. Provide detailed reasoning about OCR corrections.`;
  }

  /**
   * Create comprehensive prompt for Gemini AI analysis (legacy method)
   */
  private createMatchingPrompt(
    ocrData: OCRData,
    candidates: CardCandidate[],
    gameType: string
  ): string {
    const candidatesText = candidates.map((card, index) => 
      `${index + 1}. ID: ${card.cardId}
   Name: ${card.name}
   Card Number: ${card.cardNumber || 'N/A'}
   Set Code: ${card.setCode || 'N/A'}
   Rarity: ${card.rarity || 'N/A'}
   Game Type: ${card.gameType}`
    ).join('\n\n');

    return `You are an expert Trading Card Game (TCG) card identification AI. Analyze the OCR data and find the best matching card from the candidates.

**OCR EXTRACTED DATA:**
- Card Name: "${ocrData.cardName}"
- Detected Set Codes: ${ocrData.detectedSetCodes?.join(', ') || 'None'}
- Primary Stats: ${JSON.stringify(ocrData.primaryStats)}
- OCR Confidence: ${ocrData.confidence}%
- Game Type: ${gameType}
- Extracted Words: ${ocrData.extractedWords}

**CARD CANDIDATES TO MATCH:**
${candidatesText}

**ANALYSIS INSTRUCTIONS:**
1. **Name Matching**: Consider OCR errors like O/0, I/1, similar looking characters
2. **Set Code Matching**: Match detected set codes with candidate set codes
3. **Card Number Matching**: Look for partial matches, OCR corrections needed
4. **Semantic Understanding**: Use context clues from stats and game type
5. **Rarity Consistency**: Consider if detected stats match expected rarity

**IMPORTANT MATCHING RULES:**
- For Pokemon: Look for HP, weakness, resistance, retreat cost
- For One Piece: Look for power, cost, counter, type (Leader/Character/Event/Stage)
- For Yu-Gi-Oh: Look for ATK/DEF, Level/Rank, monster type, spell/trap

**RESPONSE FORMAT (JSON ONLY):**
{
  "bestMatchIndex": <1-based index of best match, or 0 if no good match>,
  "confidence": <0-100 confidence score>,
  "reasoning": "<detailed explanation of why this match was chosen>",
  "alternativeMatches": [<array of 1-based indices for 2nd and 3rd best matches>],
  "aiAnalysis": {
    "correctedCardName": "<OCR name with corrections applied>",
    "correctedSetCode": "<corrected set code if needed>",
    "correctedCardNumber": "<corrected card number if needed>",
    "semanticMatches": ["<list of semantic clues that helped matching>"]
  }
}

**EXAMPLES OF OCR CORRECTIONS:**
- "Dark Magician" with OCR "Dark Magieian" → correctedCardName: "Dark Magician"
- Set code "OP09" detected as "OP0G" → correctedSetCode: "OP09"
- Card number "001" detected as "OO1" → correctedCardNumber: "001"

Analyze carefully and provide the JSON response:`;
  }

  /**
   * Parse Gemini AI response and convert to structured result
   */
  private parseAIResponse(aiResponse: string, candidates: CardCandidate[]): AIMatchResult {
    try {
      // Extract JSON from AI response (remove any markdown or extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Convert AI response to our format
      const bestMatchIndex = parsed.bestMatchIndex - 1; // Convert to 0-based
      const bestMatch = bestMatchIndex >= 0 && bestMatchIndex < candidates.length 
        ? candidates[bestMatchIndex] 
        : null;
      
      const alternativeMatches = (parsed.alternativeMatches || [])
        .map((index: number) => candidates[index - 1]) // Convert to 0-based
        .filter(Boolean) // Remove undefined entries
        .slice(0, 2); // Limit to 2 alternatives
      
      return {
        bestMatch,
        confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
        reasoning: parsed.reasoning || 'AI analysis completed',
        alternativeMatches,
        aiAnalysis: {
          correctedCardName: parsed.aiAnalysis?.correctedCardName,
          correctedSetCode: parsed.aiAnalysis?.correctedSetCode,
          correctedCardNumber: parsed.aiAnalysis?.correctedCardNumber,
          semanticMatches: parsed.aiAnalysis?.semanticMatches || []
        }
      };
      
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response:', aiResponse);
      
      // Fallback parsing
      return {
        bestMatch: candidates[0] || null,
        confidence: 70,
        reasoning: 'AI response parsing failed, using first candidate',
        alternativeMatches: candidates.slice(1, 3),
        aiAnalysis: {
          semanticMatches: []
        }
      };
    }
  }

  /**
   * Quick card name correction using AI
   * For single field corrections without full matching
   */
  async correctCardName(ocrName: string, gameType: string): Promise<string> {
    try {
      const prompt = `You are a TCG card name correction AI. Fix OCR errors in this card name.

Game Type: ${gameType}
OCR Card Name: "${ocrName}"

Common OCR errors to fix:
- O ↔ 0 (letter O vs number 0)
- I ↔ 1 (letter I vs number 1)  
- rn ↔ m (letters rn vs letter m)
- vv ↔ w (letters vv vs letter w)
- Missing or extra spaces
- Capitalization errors

Return ONLY the corrected card name, no explanation:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const correctedName = response.text().trim();
      
      return correctedName || ocrName;
      
    } catch (error) {
      console.error('Card name correction error:', error);
      return ocrName; // Return original if correction fails
    }
  }
}

export const geminiAIService = new GeminiAIService();