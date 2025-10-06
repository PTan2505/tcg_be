#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Test the MAIN enhanced scan endpoint (with authentication bypass for testing)
async function testMainEnhancedScan() {
  try {
    console.log('🧪 Testing MAIN Enhanced Scan API...\n');
    
    const testFile = 'tests/scan-image/pokemon2.jpg';
    
    if (!fs.existsSync(testFile)) {
      console.log('❌ Pokemon2.jpg not found');
      return;
    }

    console.log(`🔍 Testing ${testFile} with MAIN API endpoint`);

    const form = new FormData();
    form.append('image', fs.createReadStream(testFile)); // Note: 'image' not 'cardImage'

    // Try the main API endpoint (this might require auth)
    try {
      const response = await axios.post('http://localhost:3000/api/cards/scan/enhanced', form, {
        headers: {
          ...form.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });

      const result = response.data;
      
      console.log('\n📊 MAIN API RESULTS:');
      console.log('='.repeat(50));
      
      if (result.success && result.data) {
        console.log(`🎮 Game Type: ${result.data.pipeline.step1_gameType.detected}`);
        console.log(`🔤 Extracted Name: "${result.data.pipeline.step2_ocr.cardName}"`);
        
        console.log('\n📋 Top 5 Final Results (with combined scoring):');
        if (result.data.candidates && result.data.candidates.length > 0) {
          result.data.candidates.slice(0, 5).forEach((candidate, index) => {
            const isMewtwo = candidate.name.toLowerCase().includes('mewtwo');
            const marker = isMewtwo ? '🎯' : '  ';
            console.log(`${marker} ${index + 1}. ${candidate.name}`);
            console.log(`      Final Confidence: ${candidate.confidence}`);
            console.log(`      Match Reason: ${candidate.matchReason}`);
            console.log(`      Set: ${candidate.setName || 'Unknown'}`);
            if (candidate.visualMatch) {
              console.log(`      Visual Similarity: ${(candidate.visualMatch.visualSimilarity * 100).toFixed(1)}%`);
            }
            if (isMewtwo) {
              console.log(`      ⭐ THIS IS THE EXPECTED CARD!`);
            }
            console.log('');
          });
        }

        // Check if Mewtwo is now the top result
        const topResult = result.data.candidates[0];
        if (topResult && topResult.name.toLowerCase().includes('mewtwo')) {
          console.log('🎉 SUCCESS: Mewtwo is now the TOP result!');
        } else {
          console.log('⚠️  Mewtwo is not the top result yet. Need further optimization.');
        }

      } else {
        console.log('❌ Unexpected response format:', result);
      }

    } catch (authError) {
      if (authError.response && authError.response.status === 401) {
        console.log('⚠️  Main API requires authentication. Using test endpoint instead...');
        
        // Fallback to test endpoint
        const form2 = new FormData();
        form2.append('cardImage', fs.createReadStream(testFile));
        
        const testResponse = await axios.post('http://localhost:3000/test/test-scan', form2, {
          headers: {
            ...form2.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000
        });

        const testResult = testResponse.data;
        console.log('\n📊 TEST ENDPOINT RESULTS (Reference):');
        console.log(`🎮 Game Type: ${testResult.gameType}`);
        console.log(`🔤 Extracted Name: "${testResult.extractedText.cardName}"`);
        console.log(`📈 Visual Matches: ${testResult.visualMatches.length}`);
        
        if (testResult.visualMatches.length > 0) {
          const topVisual = testResult.visualMatches[0];
          console.log(`🖼️ Top Visual Match: ${(topVisual.similarity * 100).toFixed(1)}% similarity`);
        }
        
      } else {
        throw authError;
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check server and run test
async function main() {
  try {
    await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running\n');
    await testMainEnhancedScan();
  } catch (error) {
    console.log('❌ Server is not running. Please start it first.\n');
  }
}

main().catch(console.error);