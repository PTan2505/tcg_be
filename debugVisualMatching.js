#!/usr/bin/env node

// Simple test for visual matching service
const { visualMatching } = require('./src/shared/services/visualMatching.service');
const fs = require('fs');

async function testVisualMatchingDirect() {
  try {
    console.log('🧪 Testing Visual Matching Service Directly...\n');
    
    // Load test image
    const imagePath = 'tests/scan-image/yugioh.jpg';
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Test image not found');
      return;
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`✅ Loaded test image: ${imageBuffer.length} bytes`);
    
    // Create mock candidates
    const mockCandidates = [
      {
        cardId: 'test1',
        imageUrl: 'https://via.placeholder.com/200x280/FF0000/FFFFFF?text=Test1',
        name: 'Test Card 1'
      },
      {
        cardId: 'test2', 
        imageUrl: 'https://via.placeholder.com/200x280/00FF00/FFFFFF?text=Test2',
        name: 'Test Card 2'
      }
    ];
    
    console.log('🖼️ Testing with mock candidates...');
    
    const results = await visualMatching.findVisualMatches(imageBuffer, mockCandidates, {
      maxCandidates: 2,
      similarityThreshold: 0.1,
      timeout: 15000
    });
    
    console.log('\n📊 Results:');
    console.log(`Found ${results.length} matches`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. Similarity: ${result.similarity}, Type: ${result.matchType}`);
    });
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    console.error(error.stack);
  }
}

testVisualMatchingDirect();