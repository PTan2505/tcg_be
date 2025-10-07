/**
 * Test improved OCR extraction specifically for card names
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');

async function testImprovedOCR() {
  console.log('🧪 Testing Improved OCR Card Name Extraction\n');

  const baseURL = 'http://localhost:3000';
  
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

    // 2. Test specifically with Yu-Gi-Oh card (Dark Magician)
    console.log('🎴 Testing Yu-Gi-Oh card name extraction...');
    
    const imagePath = path.join('/home/phuctan/Desktop/Project/tcg_be/tests/scan-image', 'yugioh.jpg');
    
    if (!fs.existsSync(imagePath)) {
      console.log('⚠️  yugioh.jpg not found');
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'yugioh.jpg');
    formData.append('gameType', 'yugioh'); // Provide game type to focus on OCR
    
    const scanResponse = await fetch(`${baseURL}/api/cards/scan/enhanced`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (scanResponse.ok) {
      const scanData = await scanResponse.json();
      const pipeline = scanData.data.pipeline;
      
      console.log('📋 OCR Results:');
      console.log(`  🎯 Game Type: ${pipeline.step1_gameType.detected}`);
      console.log(`  📝 Extracted Card Name: "${pipeline.step2_ocr.cardName}"`);
      console.log(`  📊 OCR Confidence: ${pipeline.step2_ocr.confidence}%`);
      console.log(`  🔢 Primary Stats:`, pipeline.step2_ocr.primaryStats);
      console.log(`  🔍 Search Strategy: ${pipeline.step3_search.strategy}`);
      console.log(`  📦 Candidates Found: ${pipeline.step3_search.candidatesFound}`);
      
      if (scanData.data.topMatch) {
        console.log(`\n🏆 Top Match:`);
        console.log(`  Name: ${scanData.data.topMatch.name}`);
        console.log(`  Confidence: ${scanData.data.topMatch.confidence}`);
        console.log(`  Match Reason: ${scanData.data.topMatch.matchReason}`);
        
        // Check if we got "Dark Magician" correctly
        if (scanData.data.topMatch.name.toLowerCase().includes('dark magician')) {
          console.log(`  ✅ SUCCESS: Correctly identified Dark Magician!`);
        } else if (pipeline.step2_ocr.cardName.toLowerCase().includes('dark magician')) {
          console.log(`  ✅ SUCCESS: OCR extracted "Dark Magician" correctly!`);
        } else {
          console.log(`  ⚠️  Expected "Dark Magician", got different result`);
        }
      }
      
      console.log(`\n⏱️  Total Processing Time: ${scanData.data.scanTime}ms`);
      
    } else {
      const errorData = await scanResponse.json();
      console.log(`❌ Scan failed: ${errorData.error}`);
    }

    // 3. Test with Pokemon card for comparison
    console.log('\n🎴 Testing Pokemon card for comparison...');
    
    const pokemonImagePath = path.join('/home/phuctan/Desktop/Project/tcg_be/tests/scan-image', 'pokemon.jpg');
    
    if (fs.existsSync(pokemonImagePath)) {
      const pokemonImageBuffer = fs.readFileSync(pokemonImagePath);
      const pokemonFormData = new FormData();
      pokemonFormData.append('image', new Blob([pokemonImageBuffer]), 'pokemon.jpg');
      // Don't provide game type - test auto-detection
      
      const pokemonScanResponse = await fetch(`${baseURL}/api/cards/scan/enhanced`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: pokemonFormData
      });

      if (pokemonScanResponse.ok) {
        const pokemonScanData = await pokemonScanResponse.json();
        const pokemonPipeline = pokemonScanData.data.pipeline;
        
        console.log(`  🎯 Auto-detected: ${pokemonPipeline.step1_gameType.detected} (${pokemonPipeline.step1_gameType.confidence}%)`);
        console.log(`  📝 Card Name: "${pokemonPipeline.step2_ocr.cardName}"`);
        
        if (pokemonScanData.data.topMatch) {
          console.log(`  🏆 Match: ${pokemonScanData.data.topMatch.name} (${pokemonScanData.data.topMatch.confidence})`);
        }
      }
    }

    console.log('\n🎉 Improved OCR testing complete!');
    console.log('\n📋 Key Improvements:');
    console.log('  ✨ Better image preprocessing (higher resolution, contrast)');
    console.log('  🧠 Smart text line reconstruction');
    console.log('  🎯 Multiple card name detection strategies');
    console.log('  📍 Spatial analysis using bounding boxes');
    console.log('  🔧 Game-specific text pattern recognition');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Server is running: bun run dev');
    console.log('2. Google Cloud Vision API is configured');
    console.log('3. Sample images exist in tests/scan-image/');
  }
}

testImprovedOCR();