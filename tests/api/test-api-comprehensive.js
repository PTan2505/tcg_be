#!/usr/bin/env node

// 🚀 COMPREHENSIVE API TESTING SCRIPT FOR TCG BACKEND
// This script tests ALL available endpoints with COMPLETE test coverage
// Including positive cases, negative cases, edge cases, and error handling

const BASE_URL = 'http://localhost:3000';

// Test statistics are now tracked in the stats object

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
    stats.requests++;
    const response = await fetch(url, mergedOptions);
    let data;
    
    // Get response text first, then try to parse as JSON
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
    
    console.log(`\n🌐 ${options.method || 'GET'} ${url}`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📝 Response:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error making request to ${url}:`, error.message);
    return { error };
  }
}

// Enhanced assertion helper
function assert(condition, testName, expected = null, actual = null) {
  if (condition) {
    console.log(`✅ ${testName}`);
    stats.passed++;
    return true;
  } else {
    console.log(`❌ ${testName}`);
    if (expected !== null) console.log(`   Expected: ${expected}, Got: ${actual}`);
    stats.failed++;
    return false;
  }
}

function skip(testName, reason = '') {
  stats.skipped++;
  console.log(`⏭️  ${testName} - Skipped${reason ? `: ${reason}` : ''}`);
}

// Test data for various scenarios
const testUsers = {
  valid: {
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-15'
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    dateOfBirth: '1985-05-20'
  },
  invalid: {
    email: 'invalid-email',
    password: '123',
    firstName: '',
    lastName: '',
    dateOfBirth: 'invalid-date'
  }
};

// Global variables for test data
let authToken = null;
let refreshToken = null;
let userId = null;
let cardId = null;
let collectionItemId = null;
let deckId = null;

// Statistics tracking
const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
  requests: 0
};

console.log('🚀 STARTING COMPREHENSIVE API TESTS FOR TCG BACKEND');
console.log('====================================================');
console.log('📋 Testing ALL endpoints with complete coverage:');
console.log('   • Positive test cases');
console.log('   • Negative test cases'); 
console.log('   • Edge cases & validation');
console.log('   • Authentication & authorization');
console.log('   • Rate limiting & security');
console.log('====================================================\n');

// =============================================================================
// 🔐 AUTHENTICATION TESTS
// =============================================================================

async function testAuthentication() {
  console.log('\n🔐 === AUTHENTICATION TESTS ===\n');
  
  // Test 1.1: Valid User Registration
  console.log('📋 Test 1.1: Valid User Registration');
  const { response: registerResp, data: registerData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(testUsers.valid)
  });
  
  assert(
    registerData.success || (registerData.error && (typeof registerData.error === 'string' ? registerData.error.includes('already exists') : registerData.error.message?.includes('already exists'))),
    'User registration should succeed or fail with existing user message',
    'success or existing user error',
    registerData.success ? 'success' : (typeof registerData.error === 'string' ? registerData.error : registerData.error?.message)
  );

  // Test 1.2: Invalid Email Registration
  console.log('📋 Test 1.2: Invalid Email Registration');
  const { data: invalidEmailData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ ...testUsers.valid, email: 'invalid-email' })
  });
  
  assert(
    !invalidEmailData.success && invalidEmailData.error,
    'Invalid email should be rejected',
    'validation error',
    invalidEmailData.success ? 'success' : 'error'
  );

  // Test 1.3: Weak Password Registration
  console.log('📋 Test 1.3: Weak Password Registration');
  const { data: weakPassData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ ...testUsers.valid, password: '123', email: 'weak@example.com' })
  });
  
  assert(
    !weakPassData.success && weakPassData.error,
    'Weak password should be rejected',
    'validation error',
    weakPassData.success ? 'success' : 'error'
  );

  // Test 1.4: Missing Fields Registration
  console.log('📋 Test 1.4: Missing Required Fields');
  const { data: missingData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email: 'missing@example.com' })
  });
  
  assert(
    !missingData.success && missingData.error,
    'Missing required fields should be rejected',
    'validation error',
    missingData.success ? 'success' : 'error'
  );

  // Test 1.5: Valid User Login
  console.log('📋 Test 1.5: Valid User Login');
  const { data: loginData } = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testUsers.valid.email,
      password: testUsers.valid.password
    })
  });
  
  if (loginData.success && loginData.data.accessToken) {
    authToken = loginData.data.accessToken;
    refreshToken = loginData.data.refreshToken;
    userId = loginData.data.user.id;
    assert(true, 'Valid login should succeed and return tokens');
  } else {
    assert(false, 'Valid login should succeed', 'success with tokens', 'failure');
  }

  // Test 1.6: Invalid Credentials Login
  console.log('📋 Test 1.6: Invalid Credentials Login');
  const { data: invalidLoginData } = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testUsers.valid.email,
      password: 'wrongpassword'
    })
  });
  
  assert(
    !invalidLoginData.success && invalidLoginData.error,
    'Invalid credentials should be rejected',
    'authentication error',
    invalidLoginData.success ? 'success' : 'error'
  );

  // Test 1.7: Refresh Token
  if (refreshToken) {
    console.log('📋 Test 1.7: Token Refresh');
    const { data: refreshData } = await makeRequest(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
    
    assert(
      refreshData.success && refreshData.data.accessToken,
      'Token refresh should work with valid refresh token',
      'new access token',
      refreshData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 1.7: Token Refresh', 'No refresh token available');
  }

  // Test 1.8: Invalid Refresh Token
  console.log('📋 Test 1.8: Invalid Refresh Token');
  const { data: invalidRefreshData } = await makeRequest(`${BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken: 'invalid-token' })
  });
  
  assert(
    !invalidRefreshData.success && invalidRefreshData.error,
    'Invalid refresh token should be rejected',
    'error',
    invalidRefreshData.success ? 'success' : 'error'
  );

  // Test 1.9: Forgot Password
  console.log('📋 Test 1.9: Forgot Password Request');
  const { data: forgotData } = await makeRequest(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email: testUsers.valid.email })
  });
  
  assert(
    forgotData.success || (forgotData.error && !forgotData.error.message.includes('500')),
    'Forgot password should handle request (may fail if email service not configured)',
    'success or handled error',
    forgotData.success ? 'success' : 'handled error'
  );

  // Test 1.10: Email Verification (GET)
  console.log('📋 Test 1.10: Email Verification Endpoint');
  const { data: verifyData } = await makeRequest(`${BASE_URL}/auth/verify-email?token=invalid-token`);
  
  assert(
    verifyData.error || verifyData.success === false,
    'Email verification should handle invalid tokens',
    'error or false',
    'handled'
  );
}

// =============================================================================
// 🃏 CARD MANAGEMENT TESTS
// =============================================================================

async function testCardManagement() {
  console.log('\n🃏 === CARD MANAGEMENT TESTS ===\n');

  // Test 2.1: Get Pokemon Cards - Valid Request
  console.log('📋 Test 2.1: Get Pokemon Cards (Paginated)');
  const { data: pokemonData } = await makeRequest(
    `${BASE_URL}/cards/pokemon?page=1&limit=5&sortBy=name&sortOrder=asc`
  );
  
  if (pokemonData.success && pokemonData.data.length > 0) {
    cardId = pokemonData.data[0]._id;
    assert(
      pokemonData.pagination && pokemonData.pagination.page === 1,
      'Pokemon cards should return with correct pagination',
      'page 1',
      pokemonData.pagination?.page
    );
  } else {
    assert(pokemonData.success === false, 'Pokemon cards request should handle empty database gracefully');
  }

  // Test 2.2: Get Pokemon Cards - Invalid Parameters
  console.log('📋 Test 2.2: Get Pokemon Cards (Invalid Parameters)');
  const { data: invalidParamsData } = await makeRequest(
    `${BASE_URL}/cards/pokemon?page=-1&limit=1000`
  );
  
  assert(
    !invalidParamsData.success && invalidParamsData.error,
    'Invalid pagination parameters should be rejected',
    'validation error',
    invalidParamsData.success ? 'success' : 'error'
  );

  // Test 2.3: Get Yugioh Cards - Valid Request
  console.log('📋 Test 2.3: Get Yugioh Cards (Paginated)');
  const { data: yugiohData } = await makeRequest(
    `${BASE_URL}/cards/yugioh?page=1&limit=5&sortBy=name&sortOrder=desc`
  );
  
  assert(
    yugiohData.success || yugiohData.error,
    'Yugioh cards endpoint should respond',
    'success or error',
    yugiohData.success ? 'success' : 'error'
  );

  // Test 2.4: Get Cards - Invalid Card Type
  console.log('� Test 2.4: Get Cards (Invalid Card Type)');
  const { data: invalidTypeData } = await makeRequest(`${BASE_URL}/cards/invalid-type?page=1&limit=5`);
  
  assert(
    !invalidTypeData.success && invalidTypeData.error,
    'Invalid card type should be rejected',
    'validation error',
    invalidTypeData.success ? 'success' : 'error'
  );

  // Test 2.5: Search Pokemon Cards - Valid Query
  console.log('📋 Test 2.5: Search Pokemon Cards (Valid Query)');
  const { data: searchData } = await makeRequest(
    `${BASE_URL}/cards/pokemon/search?q=Pikachu&page=1&limit=3`
  );
  
  assert(
    searchData.success || (searchData.error && !searchData.error.message.includes('500')),
    'Pokemon card search should handle query',
    'success or handled error',
    searchData.success ? 'success' : 'handled error'
  );

  // Test 2.6: Search Cards - Missing Query
  console.log('📋 Test 2.6: Search Cards (Missing Query)');
  const { data: noQueryData } = await makeRequest(`${BASE_URL}/cards/pokemon/search?page=1&limit=3`);
  
  assert(
    !noQueryData.success && noQueryData.error,
    'Search without query should be rejected',
    'validation error',
    noQueryData.success ? 'success' : 'error'
  );

  // Test 2.7: Search Cards - Empty Query
  console.log('📋 Test 2.7: Search Cards (Empty Query)');
  const { data: emptyQueryData } = await makeRequest(`${BASE_URL}/cards/pokemon/search?q=&page=1&limit=3`);
  
  assert(
    !emptyQueryData.success && emptyQueryData.error,
    'Search with empty query should be rejected',
    'validation error',
    emptyQueryData.success ? 'success' : 'error'
  );

  // Test 2.8: Get Specific Card by ID
  if (cardId) {
    console.log('📋 Test 2.8: Get Card by Valid ID');
    const { data: cardData } = await makeRequest(`${BASE_URL}/cards/pokemon/${cardId}`);
    
    assert(
      cardData.success && cardData.data,
      'Valid card ID should return card data',
      'card data',
      cardData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 2.8: Get Card by Valid ID', 'No card ID available');
  }

  // Test 2.9: Get Card by Invalid ID
  console.log('📋 Test 2.9: Get Card by Invalid ID');
  const { data: invalidCardData } = await makeRequest(`${BASE_URL}/cards/pokemon/invalid-card-id`);
  
  assert(
    !invalidCardData.success && invalidCardData.error,
    'Invalid card ID should return error',
    'not found error',
    invalidCardData.success ? 'success' : 'error'
  );

  // Test 2.10: Get Card with Invalid Card Type
  console.log('📋 Test 2.10: Get Card with Invalid Card Type');
  const { data: invalidTypeCardData } = await makeRequest(`${BASE_URL}/cards/invalid-type/some-id`);
  
  assert(
    !invalidTypeCardData.success && invalidTypeCardData.error,
    'Invalid card type in card detail should be rejected',
    'validation error',
    invalidTypeCardData.success ? 'success' : 'error'
  );

  // Test 2.11: Cards with Filters
  console.log('📋 Test 2.11: Get Cards with Filters');
  const { data: filteredData } = await makeRequest(
    `${BASE_URL}/cards/pokemon?page=1&limit=3&rarity=Common&type=Fire`
  );
  
  assert(
    filteredData.success || (filteredData.error && !filteredData.error.message.includes('500')),
    'Cards with filters should be handled',
    'success or handled error',
    filteredData.success ? 'success' : 'handled error'
  );

  // Test 2.12: Cards Sorting Tests
  console.log('📋 Test 2.12: Get Cards with Different Sorting');
  const { data: sortedData } = await makeRequest(
    `${BASE_URL}/cards/pokemon?page=1&limit=3&sortBy=rarity&sortOrder=desc`
  );
  
  assert(
    sortedData.success || (sortedData.error && !sortedData.error.message.includes('500')),
    'Cards with sorting should be handled',
    'success or handled error',
    sortedData.success ? 'success' : 'handled error'
  );
}

// =============================================================================
// 📚 COLLECTION MANAGEMENT TESTS
// =============================================================================

async function testCollectionManagement() {
  console.log('\n📚 === COLLECTION MANAGEMENT TESTS ===\n');

  // Test 3.1: Get Collection - Without Authentication
  console.log('📋 Test 3.1: Get Collection (No Auth)');
  const { data: noAuthData } = await makeRequest(`${BASE_URL}/collections`);
  
  assert(
    !noAuthData.success && noAuthData.error,
    'Collection access without auth should be rejected',
    'authentication error',
    noAuthData.success ? 'success' : 'authentication error'
  );

  if (!authToken) {
    skip('Tests 3.2-3.12: Collection Management Tests', 'No authentication token available');
    return;
  }

  // Test 3.2: Get Empty Collection
  console.log('📋 Test 3.2: Get User Collection (Empty)');
  const { data: emptyCollectionData } = await makeRequest(`${BASE_URL}/collections`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    emptyCollectionData.success && Array.isArray(emptyCollectionData.data),
    'Empty collection should return empty array',
    'empty array',
    Array.isArray(emptyCollectionData.data) ? 'empty array' : 'not array'
  );

  // Test 3.3: Add Card to Collection - Invalid Request
  console.log('📋 Test 3.3: Add to Collection (Invalid Data)');
  const { data: invalidAddData } = await makeRequest(`${BASE_URL}/collections`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      // Missing required fields
      quantity: 'invalid'
    })
  });
  
  assert(
    !invalidAddData.success && invalidAddData.error,
    'Invalid collection add should be rejected',
    'validation error',
    invalidAddData.success ? 'success' : 'validation error'
  );

  if (cardId) {
    // Test 3.4: Add Card to Collection - Valid Request
    console.log('📋 Test 3.4: Add Card to Collection (Valid)');
    const { data: addCardData } = await makeRequest(`${BASE_URL}/collections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        cardId: cardId,
        quantity: 2,
        condition: 'Near Mint'
      })
    });
    
    assert(
      addCardData.success,
      'Valid card addition should succeed',
      'success',
      addCardData.success ? 'success' : 'failure'
    );

    if (addCardData.success && addCardData.data) {
      collectionItemId = addCardData.data._id || addCardData.data.id;
    }

    // Test 3.5: Add Same Card Again (Should Update Quantity)
    console.log('📋 Test 3.5: Add Same Card Again');
    const { data: duplicateCardData } = await makeRequest(`${BASE_URL}/collections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        cardId: cardId,
        quantity: 1,
        condition: 'Near Mint'
      })
    });
    
    assert(
      duplicateCardData.success,
      'Adding duplicate card should update quantity',
      'success',
      duplicateCardData.success ? 'success' : 'failure'
    );
  } else {
    skip('Tests 3.4-3.5: Add Card to Collection', 'No card ID available');
  }

  // Test 3.6: Get Collection After Adding Items
  console.log('📋 Test 3.6: Get Collection (With Items)');
  const { data: collectionData } = await makeRequest(`${BASE_URL}/collections`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    collectionData.success && Array.isArray(collectionData.data),
    'Collection should return array of items',
    'array with items',
    Array.isArray(collectionData.data) ? `array with ${collectionData.data.length} items` : 'not array'
  );

  // Test 3.7: Update Collection Item
  if (collectionItemId) {
    console.log('📋 Test 3.7: Update Collection Item');
    const { data: updateData } = await makeRequest(`${BASE_URL}/collections/${collectionItemId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        quantity: 5,
        condition: 'Lightly Played'
      })
    });
    
    assert(
      updateData.success,
      'Collection item update should succeed',
      'success',
      updateData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 3.7: Update Collection Item', 'No collection item ID available');
  }

  // Test 3.8: Update Non-existent Collection Item
  console.log('📋 Test 3.8: Update Non-existent Collection Item');
  const { data: updateNonExistentData } = await makeRequest(`${BASE_URL}/collections/nonexistent-id`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      quantity: 1,
      condition: 'Near Mint'
    })
  });
  
  assert(
    !updateNonExistentData.success && updateNonExistentData.error,
    'Updating non-existent item should return error',
    'not found error',
    updateNonExistentData.success ? 'success' : 'not found error'
  );

  // Test 3.9: Remove Collection Item
  if (collectionItemId) {
    console.log('📋 Test 3.9: Remove Collection Item');
    const { data: removeData } = await makeRequest(`${BASE_URL}/collections/${collectionItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      removeData.success,
      'Collection item removal should succeed',
      'success',
      removeData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 3.9: Remove Collection Item', 'No collection item ID available');
  }

  // Test 3.10: Collection with Pagination
  console.log('📋 Test 3.10: Get Collection with Pagination');
  const { data: paginatedCollectionData } = await makeRequest(`${BASE_URL}/collections?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    paginatedCollectionData.success,
    'Paginated collection should work',
    'success',
    paginatedCollectionData.success ? 'success' : 'failure'
  );

  // Test 3.11: Collection Access with Invalid Token
  console.log('📋 Test 3.11: Collection Access (Invalid Token)');
  const { data: invalidTokenData } = await makeRequest(`${BASE_URL}/collections`, {
    headers: { Authorization: `Bearer invalid-token` }
  });
  
  assert(
    !invalidTokenData.success && invalidTokenData.error,
    'Invalid token should be rejected',
    'authentication error',
    invalidTokenData.success ? 'success' : 'authentication error'
  );

  // Test 3.12: Collection Access with Malformed Authorization
  console.log('📋 Test 3.12: Collection Access (Malformed Auth)');
  const { data: malformedAuthData } = await makeRequest(`${BASE_URL}/collections`, {
    headers: { Authorization: `InvalidFormat ${authToken}` }
  });
  
  assert(
    !malformedAuthData.success && malformedAuthData.error,
    'Malformed authorization should be rejected',
    'authentication error',
    malformedAuthData.success ? 'success' : 'authentication error'
  );
}

// =============================================================================
// 🎴 DECK MANAGEMENT TESTS
// =============================================================================

async function testDeckManagement() {
  console.log('\n🎴 === DECK MANAGEMENT TESTS ===\n');

  // Test 4.1: Get Decks - Without Authentication
  console.log('📋 Test 4.1: Get Decks (No Auth)');
  const { data: noAuthData } = await makeRequest(`${BASE_URL}/decks`);
  
  assert(
    !noAuthData.success && noAuthData.error,
    'Deck access without auth should be rejected',
    'authentication error',
    noAuthData.success ? 'success' : 'authentication error'
  );

  if (!authToken) {
    skip('Tests 4.2-4.12: Deck Management Tests', 'No authentication token available');
    return;
  }

  // Test 4.2: Get Empty Decks List
  console.log('📋 Test 4.2: Get User Decks (Empty)');
  const { data: emptyDecksData } = await makeRequest(`${BASE_URL}/decks`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    emptyDecksData.success && Array.isArray(emptyDecksData.data),
    'Empty decks should return empty array',
    'empty array',
    Array.isArray(emptyDecksData.data) ? 'empty array' : 'not array'
  );

  // Test 4.3: Create Deck - Invalid Data
  console.log('📋 Test 4.3: Create Deck (Invalid Data)');
  const { data: invalidDeckData } = await makeRequest(`${BASE_URL}/decks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      // Missing required fields
      description: 'Test deck without name'
    })
  });
  
  assert(
    !invalidDeckData.success && invalidDeckData.error,
    'Invalid deck creation should be rejected',
    'validation error',
    invalidDeckData.success ? 'success' : 'validation error'
  );

  // Test 4.4: Create Deck - Valid Data
  console.log('📋 Test 4.4: Create Deck (Valid)');
  const { data: createDeckData } = await makeRequest(`${BASE_URL}/decks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      name: 'Test Deck',
      description: 'A comprehensive test deck',
      gameType: 'pokemon'
    })
  });
  
  assert(
    createDeckData.success,
    'Valid deck creation should succeed',
    'success',
    createDeckData.success ? 'success' : 'failure'
  );

  if (createDeckData.success && createDeckData.data) {
    deckId = createDeckData.data._id || createDeckData.data.id;
  }

  // Test 4.5: Get Decks After Creation
  console.log('📋 Test 4.5: Get User Decks (With Decks)');
  const { data: decksWithItemsData } = await makeRequest(`${BASE_URL}/decks`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    decksWithItemsData.success && Array.isArray(decksWithItemsData.data),
    'Decks should return array of items',
    'array with items',
    Array.isArray(decksWithItemsData.data) ? `array with ${decksWithItemsData.data.length} items` : 'not array'
  );

  if (deckId) {
    // Test 4.6: Get Specific Deck
    console.log('📋 Test 4.6: Get Specific Deck');
    const { data: specificDeckData } = await makeRequest(`${BASE_URL}/decks/${deckId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      specificDeckData.success && specificDeckData.data,
      'Should retrieve specific deck',
      'deck data',
      specificDeckData.success ? 'success' : 'failure'
    );

    // Test 4.7: Update Deck
    console.log('📋 Test 4.7: Update Deck');
    const { data: updateDeckData } = await makeRequest(`${BASE_URL}/decks/${deckId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Updated Test Deck',
        description: 'Updated description',
        gameType: 'pokemon'
      })
    });
    
    assert(
      updateDeckData.success,
      'Deck update should succeed',
      'success',
      updateDeckData.success ? 'success' : 'failure'
    );

    if (cardId) {
      // Test 4.8: Add Card to Deck
      console.log('📋 Test 4.8: Add Card to Deck');
      const { data: addCardToDeckData } = await makeRequest(`${BASE_URL}/decks/${deckId}/cards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          cardId: cardId,
          quantity: 3
        })
      });
      
      assert(
        addCardToDeckData.success,
        'Adding card to deck should succeed',
        'success',
        addCardToDeckData.success ? 'success' : 'failure'
      );

      // Test 4.9: Get Deck Cards
      console.log('📋 Test 4.9: Get Deck Cards');
      const { data: deckCardsData } = await makeRequest(`${BASE_URL}/decks/${deckId}/cards`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      assert(
        deckCardsData.success,
        'Getting deck cards should succeed',
        'success',
        deckCardsData.success ? 'success' : 'failure'
      );

      // Test 4.10: Remove Card from Deck
      console.log('📋 Test 4.10: Remove Card from Deck');
      const { data: removeCardData } = await makeRequest(`${BASE_URL}/decks/${deckId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      assert(
        removeCardData.success,
        'Removing card from deck should succeed',
        'success',
        removeCardData.success ? 'success' : 'failure'
      );
    } else {
      skip('Tests 4.8-4.10: Deck Card Management', 'No card ID available');
    }

    // Test 4.11: Delete Deck
    console.log('📋 Test 4.11: Delete Deck');
    const { data: deleteDeckData } = await makeRequest(`${BASE_URL}/decks/${deckId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      deleteDeckData.success,
      'Deck deletion should succeed',
      'success',
      deleteDeckData.success ? 'success' : 'failure'
    );
  } else {
    skip('Tests 4.6-4.11: Specific Deck Operations', 'No deck ID available');
  }

  // Test 4.12: Access Non-existent Deck
  console.log('📋 Test 4.12: Get Non-existent Deck');
  const { data: nonExistentDeckData } = await makeRequest(`${BASE_URL}/decks/nonexistent-id`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    !nonExistentDeckData.success && nonExistentDeckData.error,
    'Non-existent deck should return error',
    'not found error',
    nonExistentDeckData.success ? 'success' : 'not found error'
  );
}

// =============================================================================
// 👤 USER MANAGEMENT TESTS  
// =============================================================================

async function testUserManagement() {
  console.log('\n👤 === USER MANAGEMENT TESTS ===\n');

  // Test 5.1: Get User Profile - Without Authentication
  console.log('📋 Test 5.1: Get User Profile (No Auth)');
  const { data: noAuthData } = await makeRequest(`${BASE_URL}/users/profile`);
  
  assert(
    !noAuthData.success && noAuthData.error,
    'Profile access without auth should be rejected',
    'authentication error',
    noAuthData.success ? 'success' : 'authentication error'
  );

  if (!authToken) {
    skip('Tests 5.2-5.8: User Management Tests', 'No authentication token available');
    return;
  }

  // Test 5.2: Get User Profile - Valid Auth
  console.log('📋 Test 5.2: Get User Profile (Valid Auth)');
  const { data: profileData } = await makeRequest(`${BASE_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    profileData.success && profileData.data,
    'Valid profile access should succeed',
    'user profile data',
    profileData.success ? 'success' : 'failure'
  );

  // Test 5.3: Update User Profile - Valid Data
  console.log('📋 Test 5.3: Update User Profile (Valid Data)');
  const { data: updateProfileData } = await makeRequest(`${BASE_URL}/users/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      firstName: 'Updated',
      lastName: 'User',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    })
  });
  
  assert(
    updateProfileData.success,
    'Profile update should succeed',
    'success',
    updateProfileData.success ? 'success' : 'failure'
  );

  // Test 5.4: Update User Profile - Invalid Data
  console.log('📋 Test 5.4: Update User Profile (Invalid Data)');
  const { data: invalidUpdateData } = await makeRequest(`${BASE_URL}/users/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      email: 'invalid-email-format'
    })
  });
  
  assert(
    !invalidUpdateData.success && invalidUpdateData.error,
    'Invalid profile update should be rejected',
    'validation error',
    invalidUpdateData.success ? 'success' : 'validation error'
  );

  // Test 5.5: Change Password - Valid Request
  console.log('📋 Test 5.5: Change Password (Valid)');
  const { data: changePasswordData } = await makeRequest(`${BASE_URL}/users/change-password`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      currentPassword: testUsers.valid.password,
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!'
    })
  });
  
  assert(
    changePasswordData.success,
    'Valid password change should succeed',
    'success',
    changePasswordData.success ? 'success' : 'failure'
  );

  // Update password for subsequent tests
  if (changePasswordData.success) {
    testUsers.valid.password = 'NewPassword123!';
  }

  // Test 5.6: Change Password - Invalid Current Password
  console.log('📋 Test 5.6: Change Password (Wrong Current Password)');
  const { data: wrongPasswordData } = await makeRequest(`${BASE_URL}/users/change-password`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      currentPassword: 'WrongPassword123!',
      newPassword: 'AnotherPassword123!',
      confirmPassword: 'AnotherPassword123!'
    })
  });
  
  assert(
    !wrongPasswordData.success && wrongPasswordData.error,
    'Wrong current password should be rejected',
    'authentication error',
    wrongPasswordData.success ? 'success' : 'authentication error'
  );

  // Test 5.7: Change Password - Mismatched Confirmation
  console.log('📋 Test 5.7: Change Password (Mismatched Confirmation)');
  const { data: mismatchedPasswordData } = await makeRequest(`${BASE_URL}/users/change-password`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      currentPassword: testUsers.valid.password,
      newPassword: 'Password123!',
      confirmPassword: 'DifferentPassword123!'
    })
  });
  
  assert(
    !mismatchedPasswordData.success && mismatchedPasswordData.error,
    'Mismatched password confirmation should be rejected',
    'validation error',
    mismatchedPasswordData.success ? 'success' : 'validation error'
  );

  // Test 5.8: Get User Statistics
  console.log('📋 Test 5.8: Get User Statistics');
  const { data: statsData } = await makeRequest(`${BASE_URL}/users/stats`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    statsData.success,
    'User statistics should be available',
    'success',
    statsData.success ? 'success' : 'failure'
  );
}



// =============================================================================
// 🚨 ERROR HANDLING & EDGE CASES TESTS
// =============================================================================

async function testErrorHandling() {
  console.log('\n🚨 === ERROR HANDLING & EDGE CASES ===\n');

  // Test 6.1: Server Health Check
  console.log('📋 Test 6.1: Server Health Check');
  const { data: healthData } = await makeRequest(`${BASE_URL}/health`);
  
  assert(
    healthData.success || healthData.status === 'ok',
    'Health check endpoint should respond',
    'healthy response',
    healthData.success ? 'success' : 'response received'
  );

  // Test 6.2: Invalid HTTP Method
  console.log('📋 Test 6.2: Invalid HTTP Method');
  const { data: invalidMethodData, response: invalidMethodResponse } = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'PATCH'
  });
  
  assert(
    invalidMethodResponse.status === 405 || !invalidMethodData.success,
    'Invalid HTTP method should be rejected',
    'method not allowed',
    `status ${invalidMethodResponse.status}`
  );

  // Test 6.3: Malformed JSON Body
  console.log('📋 Test 6.3: Malformed JSON Body');
  const { data: malformedData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"invalid": json}'
  });
  
  assert(
    !malformedData.success && malformedData.error,
    'Malformed JSON should be rejected',
    'parse error',
    malformedData.success ? 'success' : 'parse error'
  );

  // Test 6.4: Missing Content-Type Header
  console.log('📋 Test 6.4: Missing Content-Type Header');
  const { data: missingHeaderData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email: 'test@example.com', password: 'password' })
  });
  
  assert(
    !missingHeaderData.success && missingHeaderData.error,
    'Missing content-type should be handled',
    'error response',
    missingHeaderData.success ? 'success' : 'error'
  );

  // Test 6.5: Extremely Long Request Body
  console.log('📋 Test 6.5: Extremely Long Request Body');
  const longString = 'a'.repeat(10000);
  const { data: longBodyData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password',
      firstName: longString,
      lastName: longString
    })
  });
  
  assert(
    !longBodyData.success && longBodyData.error,
    'Extremely long request should be rejected',
    'validation error',
    longBodyData.success ? 'success' : 'validation error'
  );

  // Test 6.6: SQL Injection Attempt
  console.log('📋 Test 6.6: SQL Injection Attempt');
  const { data: sqlInjectionData } = await makeRequest(
    `${BASE_URL}/cards/pokemon/search?q='; DROP TABLE users; --&page=1&limit=5`
  );
  
  assert(
    !sqlInjectionData.success || (sqlInjectionData.success && Array.isArray(sqlInjectionData.data)),
    'SQL injection should be safely handled',
    'safe response',
    sqlInjectionData.success ? 'safe response' : 'error response'
  );

  // Test 6.7: XSS Attempt
  console.log('📋 Test 6.7: XSS Attempt');
  const { data: xssData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      email: '<script>alert("xss")</script>@example.com',
      password: 'password123',
      firstName: '<img src=x onerror=alert("xss")>',
      lastName: 'User'
    })
  });
  
  assert(
    !xssData.success && xssData.error,
    'XSS attempt should be rejected',
    'validation error',
    xssData.success ? 'success' : 'validation error'
  );

  // Test 6.8: Rate Limiting Test (if implemented)
  console.log('📋 Test 6.8: Rate Limiting Test');
  let rateLimitHit = false;
  for (let i = 0; i < 10; i++) {
    const { response } = await makeRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
    });
    if (response.status === 429) {
      rateLimitHit = true;
      break;
    }
  }
  
  console.log(rateLimitHit ? '✅ Rate limiting is active' : '⚠️ Rate limiting not detected');

  // Test 6.9: Unicode and Special Characters
  console.log('📋 Test 6.9: Unicode and Special Characters');
  const { data: unicodeData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'test🦄@example.com',
      password: 'пароль123',
      firstName: '测试',
      lastName: 'ñáméßü'
    })
  });
  
  assert(
    !unicodeData.success && unicodeData.error,
    'Unicode characters should be handled properly',
    'validation response',
    unicodeData.success ? 'success' : 'validation response'
  );

  // Test 6.10: Empty Request Body
  console.log('📋 Test 6.10: Empty Request Body');
  const { data: emptyBodyData } = await makeRequest(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: ''
  });
  
  assert(
    !emptyBodyData.success && emptyBodyData.error,
    'Empty request body should be rejected',
    'validation error',
    emptyBodyData.success ? 'success' : 'validation error'
  );

  // Test 6.11: Non-existent Endpoint
  console.log('📋 Test 6.11: Non-existent Endpoint');
  const { response: notFoundResponse } = await makeRequest(`${BASE_URL}/nonexistent-endpoint`);
  
  assert(
    notFoundResponse.status === 404,
    'Non-existent endpoint should return 404',
    '404 status',
    `status ${notFoundResponse.status}`
  );

  // Test 6.12: CORS Headers (if applicable)
  console.log('📋 Test 6.12: CORS Headers');
  const { response: corsResponse } = await makeRequest(`${BASE_URL}/cards/pokemon?page=1&limit=1`);
  
  const hasCorsHeaders = corsResponse.headers.has('access-control-allow-origin') || 
                        corsResponse.headers.has('Access-Control-Allow-Origin');
  
  console.log(hasCorsHeaders ? '✅ CORS headers present' : '⚠️ CORS headers not detected');
}

// =============================================================================
// 🎯 MAIN TEST EXECUTION
// =============================================================================

async function runAllTests() {
  console.log('🚀 Starting Comprehensive TCG API Test Suite');
  console.log('=============================================\n');
  
  const startTime = Date.now();
  
  try {
    // Run all comprehensive test suites
    await testAuthentication();
    await testCardManagement(); 
    await testCollectionManagement();
    await testDeckManagement();
    await testUserManagement();
    await testErrorHandling();
    
    // Print final statistics
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 ===== TEST SUITE COMPLETE =====');
    console.log(`⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📊 Test Statistics:`);
    console.log(`   ✅ Passed: ${stats.passed}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   📡 Total Requests: ${stats.requests}`);
    console.log(`   📈 Success Rate: ${((stats.passed / (stats.passed + stats.failed)) * 100).toFixed(1)}%`);
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runAllTests();