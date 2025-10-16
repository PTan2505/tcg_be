/**
 * Test Enhanced Scanning Pipeline with Known Cards
 * Tests the specific cards in the scan-image folder
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');

async function testKnownCards() {
  console.log('🧪 Testing Enhanced Pipeline with Known Cards\n');

  const baseURL = 'http://localhost:3000';
  
  // Expected results for each test image
  const expectedResults = {
    'yugioh.jpg': {
      expectedCard: 'Dark Magician',
      gameType: 'yugioh',
      description: 'Classic Yu-Gi-Oh monster card'
    },
    'pokemon.jpg': {
      expectedCard: 'Alakazam',
      gameType: 'pokemon',
      description: 'Psychic-type Pokemon from Base Set'
    },
    'onepiece.jpg': {
      expectedCard: 'Trafalgar Law',
      gameType: 'onepiece',
      description: 'One Piece character card'
    }
  };
  
  try {
    // 1. Get auth token
    console.log('🔐 Getting authentication token...');
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gmail.com',
        password: 'Admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ Authentication successful\n');

    // 2. Test each image
    for (const [filename, expected] of Object.entries(expectedResults)) {
      console.log(`🎴 Testing ${filename} (Expected: ${expected.expectedCard})...`);
      
      try {
        const imagePath = path.join('/home/phuctan/Desktop/Project/tcg_be/tests/scan-image', filename);
        
        if (!fs.existsSync(imagePath)) {
          console.log(`  ⚠️  Image not found: ${filename}`);
          continue;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer]), filename);
        // Don't provide gameType to test auto-detection
        
        const startTime = Date.now();
        const scanResponse = await fetch(`${baseURL}/api/cards/scan/enhanced`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const endTime = Date.now();

        if (scanResponse.ok) {
          const scanData = await scanResponse.json();
          const pipeline = scanData.data.pipeline;
          
          console.log(`  📸 Step 1 - Game Detection: ${pipeline.step1_gameType.detected} (${pipeline.step1_gameType.confidence}%)`);
          console.log(`  🔤 Step 2 - OCR Card Name: "${pipeline.step2_ocr.cardName}"`);
          console.log(`  📊 Step 2 - OCR Confidence: ${pipeline.step2_ocr.confidence}%`);
          console.log(`  🔍 Step 3 - Search Strategy: ${pipeline.step3_search.strategy}`);
          console.log(`  📦 Step 4 - Candidates Found: ${pipeline.step3_search.candidatesFound}`);
          
          // Check results
          let gameTypeCorrect = pipeline.step1_gameType.detected === expected.gameType;
          let cardNameInOCR = pipeline.step2_ocr.cardName.toLowerCase().includes(expected.expectedCard.toLowerCase().split(' ')[0]);
          let topMatchCorrect = false;
          
          if (scanData.data.topMatch) {
            console.log(`  🏆 Top Match: ${scanData.data.topMatch.name} (${scanData.data.topMatch.confidence})`);
            topMatchCorrect = scanData.data.topMatch.name.toLowerCase().includes(expected.expectedCard.toLowerCase().split(' ')[0]);
          }
          
          // Evaluation
          console.log(`  📋 Results:`);
          console.log(`    Game Type: ${gameTypeCorrect ? '✅' : '❌'} (Expected: ${expected.gameType}, Got: ${pipeline.step1_gameType.detected})`);
          console.log(`    OCR Name: ${cardNameInOCR ? '✅' : '❌'} (Expected: "${expected.expectedCard}", Got: "${pipeline.step2_ocr.cardName}")`);
          console.log(`    Top Match: ${topMatchCorrect ? '✅' : '❌'} (Expected: "${expected.expectedCard}", Got: "${scanData.data.topMatch?.name || 'No match'}")`);
          console.log(`    Processing Time: ${endTime - startTime}ms`);
          
          if (gameTypeCorrect && (cardNameInOCR || topMatchCorrect)) {
            console.log(`  🎉 OVERALL: SUCCESS`);
          } else {
            console.log(`  ⚠️  OVERALL: NEEDS IMPROVEMENT`);
          }
          
        } else {
          const errorData = await scanResponse.json();
          console.log(`  ❌ Scan failed: ${errorData.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error testing ${filename}:`, error.message);
      }
      
      console.log('');
    }

    console.log('🎉 Testing complete!\n');
    
    console.log('📋 Summary:');
    console.log('If any tests failed, the issues might be:');
    console.log('1. OCR not extracting the correct card name');
    console.log('2. Game type classification incorrect');
    console.log('3. Database missing the specific cards');
    console.log('4. Search algorithm not finding matches');
    console.log('5. Image quality or preprocessing issues');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Server is running: bun run dev');
    console.log('2. Google Cloud Vision API is configured');
    console.log('3. Database has the expected cards');
  }
}

testKnownCards();