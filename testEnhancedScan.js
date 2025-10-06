#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Test the enhanced scan endpoint
async function testEnhancedScan() {
  try {
    console.log('🧪 Testing Enhanced Card Scanning...\n');
    
    // Test images (in tests/scan-image directory)
    const testImages = [
      { file: 'tests/scan-image/yugioh.jpg', expected: 'Dark Magician', game: 'yugioh' },
      { file: 'tests/scan-image/pokemon.jpg', expected: 'Alakazam', game: 'pokemon' },
      { file: 'tests/scan-image/onepiece.jpg', expected: 'Trafalgar Law', game: 'onepiece' }
    ];

    for (const testCase of testImages) {
      console.log(`🔍 Testing ${testCase.file} (expected: ${testCase.expected})`);
      
      try {
        // Check if file exists
        if (!fs.existsSync(testCase.file)) {
          console.log(`  ❌ File ${testCase.file} not found, skipping\n`);
          continue;
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
        
        console.log(`  ✅ Game Type: ${result.gameType}`);
        console.log(`  ✅ Extracted Name: "${result.extractedText.cardName}"`);
        console.log(`  ✅ Confidence: ${result.confidence}%`);
        
        if (result.searchResults && result.searchResults.length > 0) {
          console.log(`  ✅ Found ${result.searchResults.length} matches:`);
          result.searchResults.slice(0, 3).forEach((match, index) => {
            console.log(`    ${index + 1}. ${match.card.name} (confidence: ${(match.confidence * 100).toFixed(1)}%)`);
          });
        } else {
          console.log(`  ❌ No matches found`);
        }
        
        // Check if we got the expected result
        const foundExpected = result.searchResults?.some(match => 
          match.card.name.toLowerCase().includes(testCase.expected.toLowerCase())
        );
        
        if (foundExpected) {
          console.log(`  🎉 SUCCESS: Found expected card "${testCase.expected}"`);
        } else {
          console.log(`  ⚠️  WARNING: Expected "${testCase.expected}" not found in results`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error testing ${testCase.file}:`, error.message);
      }
      
      console.log(''); // Empty line between tests
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Start server check
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start it with: bun run dev');
    console.log('   Then run this test again.\n');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testEnhancedScan();
  }
}

main().catch(console.error);