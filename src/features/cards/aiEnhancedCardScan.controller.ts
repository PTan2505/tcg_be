import { Context } from 'hono';
import { Types } from 'mongoose';
import { ScanHistory } from '../../database/models/scanHistory';
import { cardDataService } from '../../shared/services/cardData.service';
import { enhancedOCR } from '../../shared/services/enhancedOCR.service';
import { CardCandidate, geminiAIService, OCRData } from '../../shared/services/geminiAI.service';
import { setCodeRecognition } from '../../shared/services/setCodeRecognition.service';
import { smartCardSearch } from '../../shared/services/smartCardSearch.service';
import { visualMatching } from '../../shared/services/visualMatching.service';
import { UserCardService } from '../collections/userCard.service';

const logger = {
  error: (...args: any[]) => console.error('[AI_SCAN_CONTROLLER]', ...args),
  info: (...args: any[]) => console.log('[AI_SCAN_CONTROLLER]', ...args),
  warn: (...args: any[]) => console.warn('[AI_SCAN_CONTROLLER]', ...args)
};

interface EnhancedScanResponse {
  success: boolean;
  data: {
    pipeline: any;
    candidates: any[];
    visualMatches: any[];
    topMatch: any;
    scanTime: number;
    method: string;
    gameType: string;
    confidence: string;
    requiresSetSelection: boolean;
    aiEnhanced?: {
      enabled: boolean;
      bestMatch?: any;
      aiConfidence?: number;
      aiReasoning?: string;
      correctedOCR?: {
        cardName?: string;
        setCode?: string;
        cardNumber?: string;
      };
      semanticMatches?: string[];
      error?: string;
      fallbackUsed?: boolean;
    };
  };
  message: string;
}

// Helper functions for compatibility
function getSearchResultMatches(searchResults: any): any[] {
  if (searchResults.matches) {
    return searchResults.matches; // Old interface
  }
  
  // New interface - combine topMatch and candidates
  const allMatches = [];
  if (searchResults.topMatch) {
    allMatches.push(searchResults.topMatch);
  }
  if (searchResults.candidates && Array.isArray(searchResults.candidates)) {
    allMatches.push(...searchResults.candidates);
  }
  return allMatches;
}

function getTopMatch(searchResults: any): any {
  if (searchResults.topMatch) {
    return searchResults.topMatch; // New interface
  }
  const matches = getSearchResultMatches(searchResults);
  if (matches.length > 0) {
    return matches[0]; // Old interface
  }
  return null;
}

/**
 * AI-Enhanced Card Scanning Controller
 * Integrates Gemini AI for improved card identification accuracy
 */
export class AIEnhancedCardScanController {
  private userCardService: UserCardService;

  constructor() {
    this.userCardService = new UserCardService();
  }

  /**
   * Enhanced card scan with AI post-processing
   */
  public enhancedScanWithAI = async (c: Context) => {
    const startTime = Date.now();
    
    try {
      logger.info('🚀 Starting AI-Enhanced Card Scan Pipeline...');
      
      // Get form data
      const body = await c.req.parseBody();
      const gameType = body.gameType as string;
      const imageFile = body.image as File;

      if (!imageFile) {
        return c.json({
          success: false,
          message: 'No image file provided'
        }, 400);
      }

      if (!gameType) {
        return c.json({
          success: false,
          message: 'Game type is required'
        }, 400);
      }

      // Convert File to Buffer
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

      // Step 1: Run the existing 5-step pipeline
      const existingScanResult = await this.runExisting5StepPipeline(imageBuffer, gameType);
      
      if (!existingScanResult.success) {
        return c.json(existingScanResult, 500);
      }

      // Step 2: Apply AI enhancement if we have candidates
      const aiEnhancedResult = await this.applyAIEnhancement(
        existingScanResult,
        gameType
      );

      const totalTime = Date.now() - startTime;
      
      // Step 3: Return combined results
      const response: EnhancedScanResponse = {
        ...aiEnhancedResult,
        data: {
          ...aiEnhancedResult.data,
          scanTime: totalTime,
          method: 'ai_enhanced_5_step_pipeline_with_gemini'
        }
      };

      // Step 4: Save scan history for analytics
      const userId = c.get('userId');
      if (userId && response.data.topMatch) {
        await this.saveScanHistory(userId, response.data.topMatch, {
          gameType,
          processingTime: totalTime,
          ocrConfidence: response.data.pipeline?.step2_ocr?.confidence,
          aiEnhanced: response.data.aiEnhanced?.enabled
        });
      }

      logger.info(`✅ AI-Enhanced scan completed in ${totalTime}ms`);
      return c.json(response);

    } catch (error) {
      logger.error('❌ AI-Enhanced scan error:', error);
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'AI-Enhanced scan failed'
      }, 500);
    }
  };

  /**
   * Run the existing 5-step enhanced scan pipeline
   */
  private async runExisting5StepPipeline(imageBuffer: Buffer, gameType: string): Promise<any> {
    try {
      const pipeline: any = {
        step1_gameType: { detected: gameType, confidence: 100, provided: true },
        step2_ocr: {},
        step2_5_setCode: {},
        step3_search: {},
        step4_visual: {},
        step5_results: {}
      };

      // Step 1: Game Type Detection (already provided)
      logger.info('Step 1: Game type detection - SKIPPED (provided)');

      // Step 2: Enhanced OCR with AI pre-correction
      logger.info('Step 2: Enhanced OCR processing with AI correction...');
      const ocrStartTime = Date.now();
      
      const ocrResult = await enhancedOCR.extractCardText(imageBuffer, gameType as 'pokemon' | 'yugioh' | 'onepiece');
      
      // Apply AI-powered OCR correction using CSV data
      const correctedCardName = await this.correctCardNameWithCSV(
        ocrResult.extractedText.cardName,
        gameType as 'pokemon' | 'yugioh' | 'onepiece'
      );
      
      pipeline.step2_ocr = {
        cardName: correctedCardName,
        originalCardName: ocrResult.extractedText.cardName,
        primaryStats: ocrResult.extractedText.primaryStats,
        confidence: ocrResult.confidence,
        extractedWords: ocrResult.extractedText.allText.split(' ').length || 0,
        aiCorrected: correctedCardName !== ocrResult.extractedText.cardName
      };

      logger.info(`OCR completed in ${Date.now() - ocrStartTime}ms - Original: "${ocrResult.extractedText.cardName}" → Corrected: "${correctedCardName}"`);

      // Step 2.5: Set Code Recognition
      logger.info('Step 2.5: Set code recognition...');
      const setCodeStartTime = Date.now();
      
      const setCodeResult = await setCodeRecognition.extractSetCodes(
        ocrResult.extractedText.allText || ocrResult.extractedText.cardName,
        gameType as 'pokemon' | 'yugioh' | 'onepiece'
      );
      
      pipeline.step2_5_setCode = {
        detectedSetCodes: setCodeResult.extractedCodes,
        setCodeCount: setCodeResult.extractedCodes.length,
        hasSetCodeFiltering: setCodeResult.extractedCodes.length > 0,
        databaseMatches: setCodeResult.confidence
      };

      logger.info(`Set codes: [${setCodeResult.extractedCodes.join(', ')}] in ${Date.now() - setCodeStartTime}ms`);

      // Step 3: Smart Card Search
      logger.info('Step 3: Smart card search...');
      const searchStartTime = Date.now();
      
      const searchResults = await smartCardSearch.findBestMatches(
        gameType as 'pokemon' | 'yugioh' | 'onepiece',
        {
          cardName: correctedCardName, // Use AI-corrected name
          setCode: setCodeResult.extractedCodes[0], // Use first detected set code
          allText: ocrResult.extractedText.allText,
          primaryStats: ocrResult.extractedText.primaryStats,
          confidence: ocrResult.confidence
        },
        20
      );

      const matches = getSearchResultMatches(searchResults);
      
      pipeline.step3_search = {
        strategy: searchResults.searchStrategy || 'enhanced_search',
        candidatesFound: matches.length,
        candidatesAfterSetCodeFiltering: matches.length,
        totalCardsSearched: matches.length,
        searchTime: Date.now() - searchStartTime
      };

      logger.info(`Found ${matches.length} candidates in ${Date.now() - searchStartTime}ms`);

      // Step 4: Visual Matching
      logger.info('Step 4: Visual matching...');
      const visualStartTime = Date.now();
      
      // Convert matches to visual matching format
      const visualCandidates = matches.slice(0, 30).map(match => ({
        cardId: match.cardId || match._id,
        imageUrl: match.imageUrl || match.images?.normal || '',
        name: match.name || 'Unknown'
      })).filter(candidate => candidate.imageUrl); // Only include candidates with valid imageUrl
      
      const visualResults = await visualMatching.findVisualMatches(imageBuffer, visualCandidates);
      
      pipeline.step4_visual = {
        variantsFound: matches.length,
        visualMatches: visualResults.length,
        topVisualMatch: visualResults[0] || null,
        candidatesWithImages: visualCandidates.length
      };

      logger.info(`Visual matching completed in ${Date.now() - visualStartTime}ms`);

      // Step 5: Combine and rank results
      logger.info('Step 5: Combining and ranking results...');
      
      const combinedResults = this.combineSearchAndVisualResults(
        searchResults,
        visualResults,
        pipeline
      );

      pipeline.step5_results = {
        topMatch: combinedResults.topMatch,
        allCandidates: combinedResults.candidates.length,
        withVisualData: visualResults.length
      };

      return {
        success: true,
        data: {
          pipeline,
          candidates: combinedResults.candidates,
          visualMatches: visualResults,
          topMatch: combinedResults.topMatch,
          gameType,
          confidence: combinedResults.topMatch?.confidence || '0%',
          requiresSetSelection: setCodeResult.extractedCodes.length > 1
        }
      };

    } catch (error) {
      logger.error('Error in 5-step pipeline:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Enhanced scan pipeline failed'
      };
    }
  }

  /**
   * Combine search and visual results with enhanced ranking
   */
  private combineSearchAndVisualResults(searchResults: any, visualResults: any[], pipeline: any): any {
    const searchMatches = getSearchResultMatches(searchResults);
    const visualMatches = visualResults || [];

    // Create a map of visual similarities by cardId
    const visualSimilarityMap = new Map();
    visualMatches.forEach((visual: any) => {
      visualSimilarityMap.set(visual.cardId, visual);
    });

    // Enhance search results with visual data
    const enhancedCandidates = searchMatches.map((candidate: any) => {
      const visualMatch = visualSimilarityMap.get(candidate.cardId);
      
      if (visualMatch) {
        // Calculate combined score (60% text confidence + 40% visual similarity)
        const textConfidence = typeof candidate.confidence === 'string' 
          ? parseFloat(candidate.confidence.replace('%', '')) || 0
          : candidate.confidence || 0;
        const visualSimilarity = (visualMatch.visualSimilarity || 0) * 100;
        const combinedScore = (textConfidence * 0.6) + (visualSimilarity * 0.4);
        
        return {
          ...candidate,
          textConfidence,
          visualMatch,
          combinedScore: combinedScore / 100,
          matchReason: visualSimilarity > 75 
            ? `High visual + text match`
            : `Good visual + text match`,
          confidence: `${Math.round(combinedScore)}%`
        };
      } else {
        const confidence = typeof candidate.confidence === 'string' 
          ? parseFloat(candidate.confidence.replace('%', '')) || 0
          : candidate.confidence || 0;
        return {
          ...candidate,
          textConfidence: confidence,
          combinedScore: confidence / 100
        };
      }
    });

    // Sort by combined score
    enhancedCandidates.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));

    return {
      candidates: enhancedCandidates.slice(0, 5), // Top 5 candidates
      topMatch: enhancedCandidates[0] || null
    };
  }

  /**
   * Apply AI enhancement to existing scan results
   */
  private async applyAIEnhancement(
    existingResult: any,
    gameType: string
  ): Promise<EnhancedScanResponse> {
    try {
      // Check if we have the necessary data for AI enhancement
      if (!existingResult.success || !existingResult.data) {
        return {
          ...existingResult,
          data: {
            ...existingResult.data,
            aiEnhanced: {
              enabled: false,
              error: 'No valid scan data for AI enhancement'
            }
          }
        };
      }

      const { pipeline, candidates } = existingResult.data;
      
      // Extract OCR data from pipeline
      const ocrData: OCRData = {
        cardName: pipeline?.step2_ocr?.cardName || '',
        primaryStats: pipeline?.step2_ocr?.primaryStats || {},
        confidence: pipeline?.step2_ocr?.confidence || 0,
        extractedWords: pipeline?.step2_ocr?.extractedWords || 0,
        detectedSetCodes: pipeline?.step2_5_setCode?.detectedSetCodes || []
      };

      // Skip AI if we have very few candidates or very high confidence
      if (!candidates || candidates.length === 0) {
        return {
          ...existingResult,
          data: {
            ...existingResult.data,
            aiEnhanced: {
              enabled: false,
              error: 'No candidates for AI analysis'
            }
          }
        };
      }

      if (candidates.length === 1 && parseFloat(candidates[0].confidence) > 95) {
        return {
          ...existingResult,
          data: {
            ...existingResult.data,
            aiEnhanced: {
              enabled: false,
              error: 'Single high-confidence match found, AI not needed'
            }
          }
        };
      }

      logger.info('🤖 Running Gemini AI analysis...');
      
      // Convert candidates to AI format
      const aiCandidates: CardCandidate[] = candidates.map((candidate: any) => ({
        cardId: candidate.cardId,
        name: candidate.name,
        cardNumber: candidate.cardNumber,
        setCode: candidate.setCode,
        rarity: candidate.rarity,
        gameType: candidate.gameType,
        imageUrl: candidate.imageUrl
      }));

      // Run AI analysis
      const aiResult = await geminiAIService.enhancedCardMatching(
        ocrData,
        aiCandidates.slice(0, 10), // Limit to top 10 candidates for AI analysis
        gameType
      );

      // Merge AI results with existing results
      const enhancedResponse = this.mergeAIResults(
        existingResult,
        aiResult
      );

      logger.info(`🎯 AI found best match: ${aiResult.bestMatch?.name} (${aiResult.confidence}% confidence)`);
      
      return enhancedResponse;

    } catch (error) {
      logger.error('❌ AI enhancement error:', error);
      
      // Return original results with AI error info
      return {
        ...existingResult,
        data: {
          ...existingResult.data,
          aiEnhanced: {
            enabled: true,
            error: error instanceof Error ? error.message : 'AI enhancement failed',
            fallbackUsed: true
          }
        }
      };
    }
  }

  /**
   * Merge AI results with existing scan results
   */
  private mergeAIResults(existingResult: any, aiResult: any): EnhancedScanResponse {
    const originalTopMatch = existingResult.data.topMatch;
    const aiTopMatch = aiResult.bestMatch;
    
    // Determine which match to use as primary
    let finalTopMatch = originalTopMatch;
    let confidence = existingResult.data.confidence;
    
    if (aiResult.confidence > 80 && aiTopMatch) {
      // AI is confident, use AI result
      finalTopMatch = {
        ...aiTopMatch,
        confidence: `${aiResult.confidence}%`,
        matchReason: `AI-Enhanced: ${aiResult.reasoning}`,
        aiEnhanced: true
      };
      confidence = `${aiResult.confidence}%`;
    } else if (aiResult.confidence > 60 && aiTopMatch && aiTopMatch.cardId !== originalTopMatch?.cardId) {
      // AI suggests different card, show as high-priority alternative
      existingResult.data.candidates.unshift({
        ...aiTopMatch,
        confidence: `${aiResult.confidence}%`,
        matchReason: `AI Alternative: ${aiResult.reasoning}`,
        aiEnhanced: true
      });
    }

    return {
      success: true,
      data: {
        ...existingResult.data,
        topMatch: finalTopMatch,
        confidence,
        aiEnhanced: {
          enabled: true,
          bestMatch: aiTopMatch,
          aiConfidence: aiResult.confidence,
          aiReasoning: aiResult.reasoning,
          correctedOCR: {
            cardName: aiResult.aiAnalysis.correctedCardName,
            setCode: aiResult.aiAnalysis.correctedSetCode,
            cardNumber: aiResult.aiAnalysis.correctedCardNumber
          },
          semanticMatches: aiResult.aiAnalysis.semanticMatches
        }
      },
      message: aiResult.confidence > 80 
        ? 'Card identified successfully with AI enhancement'
        : 'Card identified with AI assistance'
    };
  }

  /**
   * Get CSV data loading status
   */
  public getCSVStatus = async (c: Context) => {
    try {
      const stats = await cardDataService.getCardStats();
      
      return c.json({
        success: true,
        data: {
          csvDataLoaded: stats.total > 0,
          cardCounts: stats,
          lastUpdated: new Date().toISOString()
        },
        message: 'CSV data status retrieved successfully'
      });
    } catch (error) {
      logger.error('CSV status error:', error);
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get CSV status'
      }, 500);
    }
  };

  /**
   * Quick OCR correction endpoint using AI
   */
  public correctOCRText = async (c: Context) => {
    try {
      const body = await c.req.json();
      const { ocrText, gameType } = body;

      if (!ocrText || !gameType) {
        return c.json({
          success: false,
          message: 'OCR text and game type are required'
        }, 400);
      }

      const correctedText = await geminiAIService.correctCardName(ocrText, gameType);

      return c.json({
        success: true,
        data: {
          original: ocrText,
          corrected: correctedText,
          changed: ocrText !== correctedText
        },
        message: 'OCR text corrected successfully'
      });

    } catch (error) {
      logger.error('OCR correction error:', error);
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'OCR correction failed'
      }, 500);
    }
  };

  /**
   * Correct card name using CSV data and AI
   */
  private async correctCardNameWithCSV(
    ocrCardName: string,
    gameType: 'pokemon' | 'yugioh' | 'onepiece'
  ): Promise<string> {
    try {
      // Skip correction if OCR text is very short or empty
      if (!ocrCardName || ocrCardName.length < 3) {
        return ocrCardName;
      }

      // Get potential matches from CSV data
      const csvMatches = await cardDataService.findBestCardNameMatches(
        ocrCardName,
        gameType,
        5
      );

      // If we found good matches, use the best one
      if (csvMatches.length > 0) {
        const bestMatch = csvMatches[0];
        logger.info(`🔧 OCR correction: "${ocrCardName}" → "${bestMatch.name}" (confidence: ${Math.round((bestMatch as any).score * 100)}%)`);
        return bestMatch.name;
      }

      // Fallback to AI correction if no CSV matches
      logger.info('🤖 Fallback to AI correction...');
      return await geminiAIService.correctCardName(ocrCardName, gameType);

    } catch (error) {
      logger.warn('Card name correction failed, using original:', error);
      return ocrCardName;
    }
  }

  /**
   * Save scan history for analytics
   */
  private async saveScanHistory(userId: Types.ObjectId, topMatch: any, metadata: any) {
    try {
      // Calculate processing step times (simplified)
      const totalTime = metadata.processingTime || 0;
      const stepTime = Math.floor(totalTime / 4); // Distribute time across steps
      
      await ScanHistory.create({
        userId,
        gameType: metadata.gameType,
        
        // OCR Results
        extractedText: [topMatch.name || 'Unknown'],
        ocrConfidence: (metadata.ocrConfidence || 0) / 100, // Normalize to 0-1
        
        // Recognition Results
        recognizedCardName: topMatch.name,
        recognizedSetCode: topMatch.setName,
        recognizedRarity: topMatch.rarity,
        
        // Matching Results
        potentialMatches: [{
          cardId: topMatch.cardId,
          confidence: (typeof topMatch.confidence === 'string' 
            ? parseFloat(topMatch.confidence.replace('%', '')) 
            : topMatch.confidence) / 100, // Normalize to 0-1
          rank: 1
        }],
        
        // User Selection
        selectedCardId: topMatch.cardId,
        wasAutoSelected: true, // Auto-selected top match
        
        // Performance Metrics
        scanDuration: totalTime,
        processingSteps: {
          imagePreprocessing: stepTime,
          ocrExtraction: stepTime,
          cardMatching: stepTime,
          confidenceRanking: totalTime - (stepTime * 3)
        },
        
        // Image Data
        imageSize: {
          width: 640,
          height: 480,
          fileSize: 0
        },
        
        // AI Enhancement Info
        aiEnhanced: metadata.aiEnhanced || false,
        
        scannedAt: new Date()
      });
      
      logger.info('✅ Scan history saved successfully');
    } catch (error) {
      logger.warn('Failed to save scan history:', error);
    }
  }
}

export const aiEnhancedCardScanController = new AIEnhancedCardScanController();