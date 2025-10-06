#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Test specifically for Pokemon2.jpg to see if Mewtwo ranks higher
async function testPokemonMatching() {
  try {
    console.log('🧪 Testing Improved Visual Matching for Pokemon2.jpg...\n');
    
    const testFile = 'tests/scan-image/pokemon2.jpg';
    
    if (!fs.existsSync(testFile)) {
      console.log('❌ Pokemon2.jpg not found. Please ensure the file exists.');
      return;
    }

    console.log(`🔍 Testing ${testFile} (looking for Mewtwo as top match)`);

    const form = new FormData();
    form.append('cardImage', fs.createReadStream(testFile));

    const response = await axios.post('http://localhost:3000/test/test-scan', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // Longer timeout for improved processing
    });

    const result = response.data;
    
    console.log('\n📊 IMPROVED VISUAL MATCHING RESULTS:');
    console.log('='.repeat(60));
    
    console.log(`\n🎮 Game Type: ${result.gameType}`);
    console.log(`🔤 Extracted Name: "${result.extractedText.cardName}"`);
    console.log(`📈 Overall Confidence: ${result.confidence}%`);
    
    console.log('\n📋 Top 10 Text-Based Search Results:');
    if (result.searchResults && result.searchResults.length > 0) {
      result.searchResults.slice(0, 10).forEach((match, index) => {
        const isMewtwo = match.card.name.toLowerCase().includes('mewtwo');
        const marker = isMewtwo ? '🎯' : '  ';
        console.log(`${marker} ${index + 1}. ${match.card.name}`);
        console.log(`      Text Confidence: ${(match.confidence * 100).toFixed(1)}%`);
        console.log(`      Set: ${match.card.setName || 'Unknown'}`);
        if (isMewtwo) {
          console.log(`      ⭐ THIS IS THE EXPECTED CARD!`);
        }
        console.log('');
      });
    }

    console.log('\n🖼️ Visual Matching Results:');
    console.log(`   Card Variants Found: ${result.cardVariants}`);
    console.log(`   Visual Matches: ${result.visualMatches.length}`);
    
    if (result.visualMatches && result.visualMatches.length > 0) {
      console.log('\n🔍 Top 10 Visual Matches:');
      result.visualMatches.slice(0, 10).forEach((match, index) => {
        // Try to find the card name from search results
        const cardData = result.searchResults.find(sr => sr.card._id === match.cardId);
        const cardName = cardData ? cardData.card.name : 'Unknown';
        const isMewtwo = cardName.toLowerCase().includes('mewtwo');
        const marker = isMewtwo ? '🎯' : '  ';
        
        console.log(`${marker} ${index + 1}. ${cardName}`);
        console.log(`      Visual Similarity: ${(match.similarity * 100).toFixed(1)}%`);
        console.log(`      Match Type: ${match.matchType}`);
        if (isMewtwo) {
          console.log(`      ⭐ VISUAL MATCH FOR EXPECTED CARD!`);
        }
        console.log('');
      });
    }

    // Look for Mewtwo specifically
    console.log('\n🎯 MEWTWO ANALYSIS:');
    const mewtwos = result.searchResults.filter(match => 
      match.card.name.toLowerCase().includes('mewtwo')
    );
    
    if (mewtwos.length > 0) {
      console.log(`   Found ${mewtwos.length} Mewtwo variants in text results`);
      mewtwos.forEach((mewtwo, index) => {
        console.log(`   ${index + 1}. ${mewtwo.card.name} (Text: ${(mewtwo.confidence * 100).toFixed(1)}%)`);
        
        // Check if this Mewtwo has visual matching data
        const visualMatch = result.visualMatches.find(vm => vm.cardId === mewtwo.card._id);
        if (visualMatch) {
          console.log(`      Visual Similarity: ${(visualMatch.similarity * 100).toFixed(1)}%`);
          console.log(`      Match Type: ${visualMatch.matchType}`);
        } else {
          console.log(`      No visual match data available`);
        }
      });
    } else {
      console.log('   ❌ No Mewtwo found in results!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      if (error.response.data) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

// Check server and run test
async function main() {
  try {
    await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running\n');
    await testPokemonMatching();
  } catch (error) {
    console.log('❌ Server is not running. Please start it first.\n');
  }
}

main().catch(console.error);