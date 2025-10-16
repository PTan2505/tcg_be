/**
 * Test the Enhanced 4-Step Card Scanning Pipeline
 * This script tests each step with the provided sample images
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');

async function testEnhanced4StepPipeline() {
  console.log('🧪 Testing Enhanced 4-Step Card Scanning Pipeline\n');

  const baseURL = 'http://localhost:3000';
  
  try {
    // 1. First, get auth token
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

    // 2. Test the pipeline demo endpoint
    console.log('📋 Testing pipeline demo endpoint...');
    const demoResponse = await fetch(`${baseURL}/api/cards/scan/pipeline-demo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (demoResponse.ok) {
      const demoData = await demoResponse.json();
      console.log('✅ Pipeline demo endpoint working');
      console.log('📊 Pipeline steps:', Object.keys(demoData.data.steps).join(', '));
    }
    console.log('');

    // 3. Test with each sample image
    const testImages = [
      { file: 'pokemon.jpg', expectedType: 'pokemon', description: 'Pokemon card' },
      { file: 'yugioh.jpg', expectedType: 'yugioh', description: 'Yu-Gi-Oh card' },
      { file: 'onepiece.jpg', expectedType: 'onepiece', description: 'One Piece card' }
    ];

    for (const testImage of testImages) {
      console.log(`🎴 Testing ${testImage.description} (${testImage.file})...`);
      
      try {
        const imagePath = path.join('/home/phuctan/Desktop/Project/tcg_be/tests/scan-image', testImage.file);
        
        if (!fs.existsSync(imagePath)) {
          console.log(`⚠️  Image not found: ${imagePath}`);
          continue;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer]), testImage.file);
        // Don't provide gameType to test auto-detection
        
        const scanResponse = await fetch(`${baseURL}/api/cards/scan/enhanced`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (scanResponse.ok) {
          const scanData = await scanResponse.json();
          const pipeline = scanData.data.pipeline;
          
          console.log(`  📸 Step 1 - Game Detection: ${pipeline.step1_gameType.detected} (${pipeline.step1_gameType.confidence}%)`);
          console.log(`  🔤 Step 2 - OCR: "${pipeline.step2_ocr.cardName}" (${pipeline.step2_ocr.confidence}%)`);
          console.log(`  🔍 Step 3 - Search: ${pipeline.step3_search.strategy} (${pipeline.step3_search.candidatesFound} found)`);
          console.log(`  📦 Step 4 - Results: ${pipeline.step4_results.allCandidates} candidates`);
          
          if (scanData.data.topMatch) {
            console.log(`  🏆 Top Match: ${scanData.data.topMatch.name} (${scanData.data.topMatch.confidence})`);
          }
          
          console.log(`  ⏱️  Total Time: ${scanData.data.scanTime}ms`);
          
          // Verify game type detection
          if (pipeline.step1_gameType.detected === testImage.expectedType) {
            console.log(`  ✅ Game type correctly detected!`);
          } else {
            console.log(`  ⚠️  Expected ${testImage.expectedType}, got ${pipeline.step1_gameType.detected}`);
          }
          
        } else {
          const errorData = await scanResponse.json();
          console.log(`  ❌ Scan failed: ${errorData.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error testing ${testImage.file}:`, error.message);
      }
      
      console.log('');
    }

    // 4. Test performance with provided game type
    console.log('🚀 Testing performance with provided game type...');
    const imagePath = path.join('/home/phuctan/Desktop/Project/tcg_be/tests/scan-image', 'yugioh.jpg');
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'yugioh.jpg');
      formData.append('gameType', 'yugioh'); // Provide game type
      
      const startTime = Date.now();
      const scanResponse = await fetch(`${baseURL}/api/cards/scan/enhanced`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const endTime = Date.now();
      
      if (scanResponse.ok) {
        const scanData = await scanResponse.json();
        console.log(`  ✅ Scan with provided game type: ${endTime - startTime}ms`);
        console.log(`  📊 Pipeline skipped Step 1 (game detection): ${scanData.data.pipeline.step1_gameType.provided}`);
      }
    }

    console.log('\n🎉 Enhanced 4-Step Pipeline testing complete!');
    console.log('\n📋 Summary:');
    console.log('  📸 Step 1: Game Type Classifier - Auto-detects Pokemon/Yu-Gi-Oh/One Piece');
    console.log('  🔤 Step 2: Enhanced OCR - Extracts game-specific text patterns');
    console.log('  🔍 Step 3: Smart Search - Multiple search strategies with confidence');
    console.log('  📦 Step 4: Intelligent Results - Ranked matches with detailed metadata');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Server is running: bun run dev');
    console.log('2. Google Cloud Vision API is configured');
    console.log('3. Sample images exist in tests/scan-image/');
    console.log('4. Database has card data');
  }
}

testEnhanced4StepPipeline();