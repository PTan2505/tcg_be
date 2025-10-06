#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Test the scan history saving by doing a simple scan
async function testScanHistorySaving() {
  try {
    console.log('🧪 Testing Scan History Saving...\n');
    
    const testFile = 'tests/scan-image/yugioh.jpg';
    
    if (!fs.existsSync(testFile)) {
      console.log('❌ Test file not found');
      return;
    }

    console.log(`🔍 Testing scan history with ${testFile}`);

    const form = new FormData();
    form.append('cardImage', fs.createReadStream(testFile));

    const response = await axios.post('http://localhost:3000/test/test-scan', form, {
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    });

    const result = response.data;
    
    console.log('📊 SCAN RESULT:');
    console.log(`🎮 Game Type: ${result.gameType}`);
    console.log(`🔤 Extracted Name: "${result.extractedText.cardName}"`);
    console.log(`📈 Confidence: ${result.confidence}%`);
    console.log(`📋 Candidates Found: ${result.searchResults.length}`);
    
    console.log('\n✅ Test completed successfully!');
    console.log('💡 Note: Test endpoint doesn\'t save scan history, but main API should work now.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Check server and run test
async function main() {
  try {
    await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running\n');
    await testScanHistorySaving();
  } catch (error) {
    console.log('❌ Server is not running. Please start it first.\n');
  }
}

main().catch(console.error);