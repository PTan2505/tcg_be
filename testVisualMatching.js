#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Test the enhanced scan endpoint with detailed visual matching
async function testVisualMatching() {
  try {
    console.log('🧪 Testing Enhanced Card Scanning with Visual Matching...\n');
    
    // Test one image in detail
    const testCase = { 
      file: 'tests/scan-image/yugioh.jpg', 
      expected: 'Dark Magician', 
      game: 'yugioh' 
    };

    console.log(`🔍 Testing ${testCase.file} (expected: ${testCase.expected})`);
    
    if (!fs.existsSync(testCase.file)) {
      console.log(`  ❌ File ${testCase.file} not found`);
      return;
    }

    const form = new FormData();
    form.append('cardImage', fs.createReadStream(testCase.file));

    const response = await axios.post('http://localhost:3000/test/test-scan', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // Increased timeout for visual processing
    });

    const result = response.data;
    
    console.log('\n📊 DETAILED RESULTS:');
    console.log('='.repeat(50));
    
    console.log(`\n🎮 Game Type: ${result.gameType}`);
    console.log(`🔤 Extracted Name: "${result.extractedText.cardName}"`);
    console.log(`📈 Overall Confidence: ${result.confidence}%`);
    
    console.log('\n📋 Text-Based Search Results:');
    if (result.searchResults && result.searchResults.length > 0) {
      console.log(`   Found ${result.searchResults.length} text matches:`);
      result.searchResults.slice(0, 10).forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.card.name}`);
        console.log(`      Set: ${match.card.setName || 'Unknown'}`);
        console.log(`      Rarity: ${match.card.rarity || 'Unknown'}`);
        console.log(`      Text Confidence: ${(match.confidence * 100).toFixed(1)}%`);
        console.log(`      Image URL: ${match.card.imageUrl ? 'Available' : 'Missing'}`);
        if (match.card.visualMatch) {
          console.log(`      Visual Similarity: ${(match.card.visualMatch.visualSimilarity * 100).toFixed(1)}%`);
          console.log(`      Combined Score: ${(match.card.visualMatch.combinedScore * 100).toFixed(1)}%`);
        }
        console.log('');
      });
    } else {
      console.log('   ❌ No text matches found');
    }

    // Check for visual matching data in pipeline info
    if (result.pipeline && result.pipeline.step4_visual) {
      console.log('\n🖼️  Visual Matching Results:');
      console.log(`   Card Variants Found: ${result.pipeline.step4_visual.variantsFound}`);
      console.log(`   Visual Matches: ${result.pipeline.step4_visual.visualMatches}`);
      
      if (result.pipeline.step4_visual.topVisualMatch) {
        const top = result.pipeline.step4_visual.topVisualMatch;
        console.log(`   Top Visual Match:`);
        console.log(`      Similarity: ${(top.similarity * 100).toFixed(1)}%`);
        console.log(`      Match Type: ${top.matchType}`);
        // Combined score is not available in test route
      }
    }

    // Show timing information
    if (result.pipeline) {
      console.log('\n⏱️  Processing Times:');
      if (result.pipeline.step3_search?.searchTime) {
        console.log(`   Text Search: ${result.pipeline.step3_search.searchTime}ms`);
      }
      console.log(`   Total Pipeline: ~${Date.now() - Date.now()}ms`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Check server and run test
async function main() {
  try {
    const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running\n');
    await testVisualMatching();
  } catch (error) {
    console.log('❌ Server is not running. Please start it with: bun run dev');
    console.log('   Then run this test again.\n');
  }
}

main().catch(console.error);