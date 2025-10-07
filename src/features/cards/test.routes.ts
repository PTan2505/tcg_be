import { Hono } from 'hono';
import { enhancedOCR } from '../../shared/services/enhancedOCR.service';
import { gameClassifier } from '../../shared/services/gameClassifier.service';
import { smartCardSearch } from '../../shared/services/smartCardSearch.service';

const testRoutes = new Hono();

/**
 * @route POST /test-scan
 * @desc Test the enhanced scanning pipeline without authentication
 * @access Public (for testing only)
 */
testRoutes.post('/test-scan', async (c) => {
  try {
    const body = await c.req.parseBody();
    const image = body.cardImage as File;
    
    if (!image) {
      return c.json({
        success: false,
        error: 'No image provided'
      }, 400);
    }

    // Convert File to Buffer
    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Step 1: Game Classification
    console.log('🎮 Step 1: Classifying game type...');
    const classificationResult = await gameClassifier.classifyGameType(imageBuffer);
    const gameType = classificationResult.gameType;
    console.log(`   Detected: ${gameType}`);

    // Step 2: Enhanced OCR
    console.log('🔤 Step 2: Extracting text...');
    const extractedData = await enhancedOCR.extractCardText(imageBuffer, gameType);
    console.log(`   Card Name: "${extractedData.extractedText.cardName}"`);
    console.log(`   All Text: "${extractedData.extractedText.allText}"`);
    console.log(`   Primary Stats:`, extractedData.extractedText.primaryStats);

    // Step 3: Smart Search
    console.log('🔍 Step 3: Searching for matches...');
    const searchResult = await smartCardSearch.findBestMatches(gameType, extractedData.extractedText, 20);
    console.log(`   Found ${searchResult.matches.length} text matches`);

    // Step 4: Get card variants for visual matching
    console.log('🖼️ Step 4: Getting card variants...');
    const cardVariants = await smartCardSearch.getAllCardVariants(gameType, extractedData.extractedText.cardName, 30);
    console.log(`   Found ${cardVariants.length} card variants`);

    // Step 5: Visual matching (if variants available)
    let visualMatches: any[] = [];
    if (cardVariants.length > 0) {
      console.log('🖼️ Step 5: Performing visual matching...');
      try {
        const { visualMatching } = await import('../../shared/services/visualMatching.service');
        const visualResults = await visualMatching.findVisualMatches(imageBuffer, cardVariants, {
          maxCandidates: 15,
          similarityThreshold: 0.3,
          timeout: 20000
        });
        
        visualMatches = visualResults.map(vm => ({
          cardId: vm.cardId,
          imageUrl: vm.imageUrl,
          similarity: vm.similarity,
          matchType: vm.matchType
        }));
        
        console.log(`   Found ${visualMatches.length} visual matches`);
      } catch (error) {
        console.log(`   Visual matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 6: Return results
    return c.json({
      success: true,
      gameType,
      extractedText: extractedData.extractedText,
      searchResults: searchResult.matches,
      visualMatches,
      cardVariants: cardVariants.length,
      confidence: searchResult.matches.length > 0 ? 85 : 50,
      pipeline: {
        step4_visual: {
          variantsFound: cardVariants.length,
          visualMatches: visualMatches.length,
          topVisualMatch: visualMatches[0] || null
        }
      }
    });

  } catch (error) {
    console.error('Test scan error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default testRoutes;