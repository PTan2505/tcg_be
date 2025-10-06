#!/usr/bin/env node

const axios = require('axios');

// Test the consolidated route functionality
async function testConsolidatedRoutes() {
  try {
    console.log('🧪 Testing Consolidated Card Routes...\n');
    
    const baseUrl = 'http://localhost:3000/api/cards';
    
    // Test 1: Browse all cards by type (no search)
    console.log('📋 Test 1: Browse all Pokemon cards (no search)');
    try {
      const browseResponse = await axios.get(`${baseUrl}/public/pokemon?page=1&limit=5`, {
        timeout: 10000
      });
      
      if (browseResponse.data.success && browseResponse.data.data.cards) {
        console.log(`✅ Found ${browseResponse.data.data.cards.length} cards`);
        console.log(`   Total: ${browseResponse.data.data.pagination.total}`);
        console.log(`   First card: ${browseResponse.data.data.cards[0]?.name || 'N/A'}`);
      }
    } catch (error) {
      console.log(`❌ Browse test failed: ${error.message}`);
    }
    
    // Test 2: Search cards by type (with search query)
    console.log('\n🔍 Test 2: Search Pokemon cards for "Pikachu"');
    try {
      const searchResponse = await axios.get(`${baseUrl}/public/pokemon?search=Pikachu&page=1&limit=5`, {
        timeout: 10000
      });
      
      if (searchResponse.data.success && searchResponse.data.data.cards) {
        console.log(`✅ Found ${searchResponse.data.data.cards.length} matching cards`);
        console.log(`   Total matches: ${searchResponse.data.data.pagination.total}`);
        searchResponse.data.data.cards.slice(0, 3).forEach((card, index) => {
          console.log(`   ${index + 1}. ${card.name}`);
        });
      }
    } catch (error) {
      console.log(`❌ Search test failed: ${error.message}`);
    }
    
    // Test 3: Verify old search route no longer exists
    console.log('\n🚫 Test 3: Verify old /search route is removed');
    try {
      await axios.get(`${baseUrl}/public/pokemon/search?q=test`, {
        timeout: 5000
      });
      console.log('⚠️  Old search route still exists (unexpected)');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Old search route properly removed (404 as expected)');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Route consolidation testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check server and run tests
async function main() {
  try {
    await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ Server is running\n');
    await testConsolidatedRoutes();
  } catch (error) {
    console.log('❌ Server is not running. Please start it first.\n');
  }
}

main().catch(console.error);