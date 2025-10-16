const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

console.log('🔍 COMPREHENSIVE CARD SCANNING TEST\n');

// Configuration
const API_BASE_URL = 'http://localhost:3000'; // Adjust if different
const SCAN_IMAGE_DIR = './tests/scan-image';
const TEST_CARDS = {
  pokemon: [
    { file: '42346.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'Need to identify' },
    { file: '42347.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'REPORTED ISSUE - investigate' },
    { file: '45120.jpg', expectedName: 'Clefable', expectedSet: 'JU', notes: 'Previous test case' },
    { file: '83440.jpg', expectedName: 'Abomasnow', expectedSet: 'MT', notes: 'Just fixed - should work' },
    { file: '83487.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'Need to identify' }
  ],
  yugioh: [
    { file: '22800.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'Yu-Gi-Oh test' },
    { file: '25712.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'Yu-Gi-Oh test' },
    { file: '26452.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'Yu-Gi-Oh test' },
    { file: '39337.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'Yu-Gi-Oh test' }
  ],
  onepiece: [
    { file: '453505.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'One Piece test' },
    { file: '453508.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'One Piece test' },
    { file: '548412.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'One Piece test' },
    { file: '552056.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'One Piece test' },
    { file: '617028.jpg', expectedName: 'Unknown', expectedSet: 'Unknown', notes: 'One Piece test' }
  ]
};

// Test results storage
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: 0,
  details: []
};

// Helper function to scan a single card
async function scanCard(game, cardInfo) {
  const imagePath = path.join(SCAN_IMAGE_DIR, game, cardInfo.file);
  
  console.log(`\n🔍 Testing ${game}/${cardInfo.file}`);
  console.log(`   Expected: ${cardInfo.expectedName} (${cardInfo.expectedSet})`);
  console.log(`   Notes: ${cardInfo.notes}`);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.log(`   ❌ ERROR: File not found`);
    testResults.errors++;
    return { status: 'error', error: 'File not found' };
  }
  
  try {
    // Prepare form data
    const formData = new FormData();
    const fileStream = fs.createReadStream(imagePath);
    formData.append('image', fileStream);
    formData.append('game', game);
    
    // Make API request
    console.log(`   📤 Sending to API...`);
    const response = await axios.post(`${API_BASE_URL}/api/scan`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (response.status === 200 && response.data) {
      const result = response.data;
      console.log(`   ✅ API Response received`);
      console.log(`   📊 OCR Text: "${result.ocrText?.substring(0, 100)}..."`);
      console.log(`   🎯 Detected Name: "${result.detectedName || 'None'}"`);
      console.log(`   📦 Detected Set: "${result.detectedSet || 'None'}" (${result.confidence || 0}%)`);
      
      if (result.searchResults && result.searchResults.length > 0) {
        const topResult = result.searchResults[0];
        console.log(`   🎯 Top Result: ${topResult.name} [${topResult.cardId}] (${topResult.confidence}%)`);
        console.log(`   📍 Set: ${topResult.setName || 'Unknown'}`);
      } else {
        console.log(`   ❌ No search results found`);
      }
      
      // Analyze the result for card 42347.jpg specifically
      if (cardInfo.file === '42347.jpg') {
        console.log(`\n   🔍 DETAILED ANALYSIS FOR 42347.jpg:`);
        console.log(`   OCR Quality: ${result.ocrText ? 'Good' : 'Poor'}`);
        console.log(`   Name Detection: ${result.detectedName ? 'Working' : 'Failed'}`);
        console.log(`   Set Detection: ${result.detectedSet ? 'Working' : 'Failed'}`);
        
        if (result.debug) {
          console.log(`   Debug Info: ${JSON.stringify(result.debug, null, 2)}`);
        }
      }
      
      return {
        status: 'success',
        result: result
      };
      
    } else {
      console.log(`   ❌ API Error: Invalid response`);
      testResults.errors++;
      return { status: 'error', error: 'Invalid API response' };
    }
    
  } catch (error) {
    console.log(`   ❌ REQUEST ERROR: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    testResults.errors++;
    return { status: 'error', error: error.message };
  }
}

// Main test function
async function runCardScanningTests() {
  console.log('🚀 Starting comprehensive card scanning tests...\n');
  
  // Check if server is running
  try {
    await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running or not responding');
    console.log('Please start the server first: npm run dev or node server.js\n');
    return;
  }
  
  // Test each game category
  for (const [game, cards] of Object.entries(TEST_CARDS)) {
    console.log(`\n🎮 ========== TESTING ${game.toUpperCase()} CARDS ==========`);
    
    for (const cardInfo of cards) {
      testResults.total++;
      const result = await scanCard(game, cardInfo);
      
      testResults.details.push({
        game,
        file: cardInfo.file,
        expected: cardInfo,
        result: result
      });
      
      if (result.status === 'success') {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
      
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Print summary
  console.log(`\n\n📊 ========== TEST SUMMARY ==========`);
  console.log(`Total cards tested: ${testResults.total}`);
  console.log(`✅ Successful scans: ${testResults.passed}`);
  console.log(`❌ Failed scans: ${testResults.failed}`);
  console.log(`🚨 Errors: ${testResults.errors}`);
  console.log(`📈 Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // Focus on problematic cards
  console.log(`\n🔍 ========== ISSUES TO INVESTIGATE ==========`);
  const problemCards = testResults.details.filter(detail => 
    detail.result.status === 'error' || 
    detail.file === '42347.jpg' ||
    (detail.result.status === 'success' && (!detail.result.result.detectedName || !detail.result.result.detectedSet))
  );
  
  if (problemCards.length > 0) {
    problemCards.forEach(detail => {
      console.log(`\n   📋 ${detail.game}/${detail.file}:`);
      console.log(`      Expected: ${detail.expected.expectedName} (${detail.expected.expectedSet})`);
      if (detail.result.status === 'success') {
        console.log(`      Got: ${detail.result.result.detectedName || 'None'} (${detail.result.result.detectedSet || 'None'})`);
      } else {
        console.log(`      Error: ${detail.result.error}`);
      }
      console.log(`      Notes: ${detail.expected.notes}`);
    });
  } else {
    console.log(`   🎉 No major issues found!`);
  }
  
  // Save detailed results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `card-scan-test-results-${timestamp}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Detailed results saved to: ${resultFile}`);
}

// Run the tests
runCardScanningTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});