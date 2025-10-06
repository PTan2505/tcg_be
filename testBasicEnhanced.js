#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Test with just text matching first
async function testBasicEnhanced() {
  try {
    console.log('🧪 Testing Basic Enhanced Scanning (Text Only)...\n');
    
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
      timeout: 30000
    });

    const result = response.data;
    
    console.log('\n📊 RESULTS:');
    console.log(`🎮 Game Type: ${result.gameType}`);
    console.log(`🔤 Extracted Name: "${result.extractedText.cardName}"`);
    console.log(`📋 Text Matches: ${result.searchResults.length}`);
    console.log(`🖼️ Card Variants Found: ${result.cardVariants}`);
    console.log(`🖼️ Visual Matches: ${result.visualMatches.length}`);
    
    if (result.visualMatches.length > 0) {
      console.log('\n🔍 First few visual matches:');
      result.visualMatches.slice(0, 3).forEach((match, index) => {
        console.log(`   ${index + 1}. Similarity: ${match.similarity} (${match.matchType})`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response && error.response.status < 500) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Check server and run test
async function main() {
  try {
    await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running\n');
    await testBasicEnhanced();
  } catch (error) {
    console.log('❌ Server is not running. Please start it first.\n');
  }
}

main().catch(console.error);