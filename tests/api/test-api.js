#!/usr/bin/env node

// API Testing Script for TCG Backend
// This script tests all available endpoints with proper data

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    const data = await response.json();
    
    console.log(`\n🌐 ${options.method || 'GET'} ${url}`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📝 Response:`, JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error making request to ${url}:`, error.message);
    return { error };
  }
}

// Test data for registration and login
const testUser = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};

let authToken = null;
let userId = null;
let cardId = null;
let deckId = null;

console.log('🚀 Starting API Tests for TCG Backend');
console.log('=====================================\n');

// Test 1: Register a new user
async function testRegister() {
  console.log('📋 Test 1: User Registration');
  const { data } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(testUser)
  });
  
  if (data.success) {
    console.log('✅ Registration successful');
  } else {
    console.log('⚠️ Registration failed (user might already exist)');
  }
}

// Test 2: Login user
async function testLogin() {
  console.log('📋 Test 2: User Login');
  const { data } = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });
  
  if (data.success && data.data.accessToken) {
    authToken = data.data.accessToken;
    userId = data.data.user.id;
    console.log('✅ Login successful, token acquired');
  } else {
    console.log('❌ Login failed');
  }
}

// Test 3: Get Pokemon cards with pagination
async function testGetPokemonCards() {
  console.log('📋 Test 3: Get Pokemon Cards (Paginated)');
  const { data } = await makeRequest(
    `${BASE_URL}/cards/pokemon?page=1&limit=5&sortBy=name&sortOrder=asc`
  );
  
  if (data.success && data.data.length > 0) {
    cardId = data.data[0]._id;
    console.log(`✅ Found ${data.data.length} Pokemon cards`);
    console.log(`📄 Pagination:`, data.pagination);
  } else {
    console.log('⚠️ No Pokemon cards found or error occurred');
  }
}

// Test 4: Get Yugioh cards with pagination
async function testGetYugiohCards() {
  console.log('📋 Test 4: Get Yugioh Cards (Paginated)');
  const { data } = await makeRequest(
    `${BASE_URL}/cards/yugioh?page=1&limit=5&sortBy=name&sortOrder=asc`
  );
  
  if (data.success) {
    console.log(`✅ Found ${data.data.length} Yugioh cards`);
    console.log(`📄 Pagination:`, data.pagination);
  } else {
    console.log('⚠️ No Yugioh cards found or error occurred');
  }
}

// Test 5: Search Pokemon cards
async function testSearchPokemonCards() {
  console.log('📋 Test 5: Search Pokemon Cards');
  const { data } = await makeRequest(
    `${BASE_URL}/cards/pokemon/search?q=Pikachu&page=1&limit=3`
  );
  
  if (data.success) {
    console.log(`✅ Search completed, found ${data.data.length} results`);
  } else {
    console.log('⚠️ Search failed or no results');
  }
}

// Test 6: Get specific card by ID (if we have one)
async function testGetCardById() {
  if (!cardId) {
    console.log('📋 Test 6: Get Card by ID - Skipped (no card ID available)');
    return;
  }
  
  console.log('📋 Test 6: Get Card by ID');
  const { data } = await makeRequest(`${BASE_URL}/cards/pokemon/${cardId}`);
  
  if (data.success) {
    console.log('✅ Card retrieved successfully');
  } else {
    console.log('❌ Failed to get card by ID');
  }
}

// Test 7: Get user profile (requires authentication)
async function testGetUserProfile() {
  if (!authToken) {
    console.log('📋 Test 7: Get User Profile - Skipped (no auth token)');
    return;
  }
  
  console.log('📋 Test 7: Get User Profile');
  const { data } = await makeRequest(`${BASE_URL}/users/profile`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (data.success) {
    console.log('✅ User profile retrieved successfully');
  } else {
    console.log('❌ Failed to get user profile');
  }
}

// Test 8: Add card to user collection (requires authentication and card)
async function testAddCardToCollection() {
  if (!authToken || !cardId) {
    console.log('📋 Test 8: Add Card to Collection - Skipped (no auth token or card ID)');
    return;
  }
  
  console.log('📋 Test 8: Add Card to User Collection');
  const { data } = await makeRequest(`${BASE_URL}/user-cards`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      cardId: cardId,
      cardType: 'pokemon',
      quantity: 1
    })
  });
  
  if (data.success) {
    console.log('✅ Card added to collection successfully');
  } else {
    console.log('⚠️ Failed to add card to collection (might already exist)');
  }
}

// Test 9: Get user's card collection
async function testGetUserCards() {
  if (!authToken) {
    console.log('📋 Test 9: Get User Cards - Skipped (no auth token)');
    return;
  }
  
  console.log('📋 Test 9: Get User Card Collection');
  const { data } = await makeRequest(
    `${BASE_URL}/user-cards?page=1&limit=5&cardType=pokemon`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  if (data.success) {
    console.log(`✅ Retrieved ${data.data.length} cards from collection`);
  } else {
    console.log('❌ Failed to get user cards');
  }
}

// Test 10: Create a deck
async function testCreateDeck() {
  if (!authToken) {
    console.log('📋 Test 10: Create Deck - Skipped (no auth token)');
    return;
  }
  
  console.log('📋 Test 10: Create Deck');
  const { data } = await makeRequest(`${BASE_URL}/decks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Test Deck',
      description: 'A test deck created by the API test script',
      cardType: 'pokemon',
      isPublic: false
    })
  });
  
  if (data.success) {
    deckId = data.data._id;
    console.log('✅ Deck created successfully');
  } else {
    console.log('❌ Failed to create deck');
  }
}

// Test 11: Get user's decks
async function testGetUserDecks() {
  if (!authToken) {
    console.log('📋 Test 11: Get User Decks - Skipped (no auth token)');
    return;
  }
  
  console.log('📋 Test 11: Get User Decks');
  const { data } = await makeRequest(`${BASE_URL}/decks?page=1&limit=5`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  if (data.success) {
    console.log(`✅ Retrieved ${data.data.length} user decks`);
  } else {
    console.log('❌ Failed to get user decks');
  }
}

// Test 12: Test invalid endpoints (error handling)
async function testErrorHandling() {
  console.log('📋 Test 12: Error Handling Tests');
  
  // Test invalid card type
  await makeRequest(`${BASE_URL}/cards/invalid-type?page=1&limit=5`);
  
  // Test invalid card ID
  await makeRequest(`${BASE_URL}/cards/pokemon/invalid-id`);
  
  // Test search without query
  await makeRequest(`${BASE_URL}/cards/pokemon/search?page=1`);
  
  console.log('✅ Error handling tests completed');
}

// Main execution function
async function runAllTests() {
  try {
    await testRegister();
    await testLogin();
    await testGetPokemonCards();
    await testGetYugiohCards();
    await testSearchPokemonCards();
    await testGetCardById();
    await testGetUserProfile();
    await testAddCardToCollection();
    await testGetUserCards();
    await testCreateDeck();
    await testGetUserDecks();
    await testErrorHandling();
    
    console.log('\n🎉 All API tests completed!');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runAllTests();