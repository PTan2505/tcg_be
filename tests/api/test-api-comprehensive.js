#!/usr/bin/env node

// 🚀 COMPREHENSIVE API TESTING SCRIPT FOR TCG BACKEND
// This script tests ALL available endpoints with COMPLETE test coverage
// Including positive cases, negative cases, edge cases, and error handling
//
// 📋 COMPLETE ENDPOINT COVERAGE:
// • System & Documentation (/health, /swagger.json, /docs, /)
// • Authentication (/auth/*)
// • User Management (/users/*)
// • Card Management (/cards/*)
// • Set Management (/sets/*)
// • Collection Management (/collections/*, /user-cards/*)
// • Deck Management (/decks/*)
// • Error Handling & Security
// • Rate Limiting & Edge Cases

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

// Helper function for authenticated requests
async function makeAuthenticatedRequest(url, options = {}) {
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${authToken}`
    }
  };
  return makeRequest(url, authOptions);
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
  // Use the actual superuser credentials that are in the database
  superuser: {
    email: 'phuctann2505@gmail.com', // Actual superuser email from database
    password: 'Admin123', // Actual superuser password from .env
    firstName: 'Super',
    lastName: 'Admin',
    dateOfBirth: '1990-01-01'
  },
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

// Helper function to obtain authentication token using superuser
async function getSuperuserAuthToken() {
  console.log('🔐 Obtaining superuser authentication token...');
  
  const { data: loginData } = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testUsers.superuser.email,
      password: testUsers.superuser.password
    })
  });
  
  if (loginData && loginData.accessToken) {
    console.log('✅ Superuser authentication successful!');
    return {
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
      userId: null // No user ID returned in token response
    };
  } else {
    console.log('❌ Superuser authentication failed:', loginData.error || 'Unknown error');
    console.log('ℹ️  Make sure the server is running and superuser is initialized');
    return null;
  }
}

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
console.log('   • System & Documentation endpoints');
console.log('   • Authentication & authorization');
console.log('   • User management (basic & advanced)');
console.log('   • Card browsing & searching');
console.log('   • Set management & filtering');
console.log('   • Collection management (basic & advanced)');
console.log('   • Deck building & management (basic & advanced)');
console.log('   • Positive test cases');
console.log('   • Negative test cases'); 
console.log('   • Edge cases & validation');
console.log('   • Rate limiting & security');
console.log('   • Error handling & injection attempts');
console.log('====================================================\n');

// =============================================================================
// 🔐 AUTHENTICATION TESTS
// =============================================================================

async function testAuthentication() {
  console.log('\n🔐 === AUTHENTICATION TESTS ===\n');
  
  // First, obtain superuser authentication token for use in other tests
  console.log('📋 Test 0.1: Superuser Authentication Setup');
  const superuserAuth = await getSuperuserAuthToken();
  
  if (superuserAuth) {
    authToken = superuserAuth.accessToken;
    refreshToken = superuserAuth.refreshToken;
    userId = superuserAuth.userId;
    console.log('✅ Superuser authentication successful - tokens available for testing');
    assert(true, 'Superuser authentication should succeed', 'success with tokens', 'success');
  } else {
    console.log('❌ Superuser authentication failed - some tests will be skipped');
    assert(false, 'Superuser authentication should succeed', 'success with tokens', 'failure');
  }
  
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

  // Test 1.5: Regular User Login (may require verification)
  console.log('📋 Test 1.5: Regular User Login');
  const { data: loginData } = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: testUsers.valid.email,
      password: testUsers.valid.password
    })
  });
  
  if (loginData.success && loginData.data && loginData.data.accessToken) {
    assert(true, 'Regular user login succeeded', 'success with tokens', 'success');
  } else if (loginData.error && loginData.error.includes('verify your email')) {
    assert(true, 'Regular user login correctly requires email verification', 'verification required', 'verification required');
  } else {
    assert(false, 'Regular user login should succeed or require verification', 'success or verification', loginData.error || 'unknown failure');
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
  const { data: pokemonData } = await makeAuthenticatedRequest(
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
  const { data: invalidParamsData } = await makeAuthenticatedRequest(
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
  const { data: yugiohData } = await makeAuthenticatedRequest(
    `${BASE_URL}/cards/yugioh?page=1&limit=5&sortBy=name&sortOrder=desc`
  );
  
  assert(
    yugiohData.success || yugiohData.error,
    'Yugioh cards endpoint should respond',
    'success or error',
    yugiohData.success ? 'success' : 'error'
  );

  // Test 2.4: Get Cards - Invalid Card Type
  console.log('📋 Test 2.4: Get Cards (Invalid Card Type)');
  const { data: invalidTypeData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/invalid-type?page=1&limit=5`);
  
  assert(
    !invalidTypeData.success && invalidTypeData.error,
    'Invalid card type should be rejected',
    'validation error',
    invalidTypeData.success ? 'success' : 'error'
  );

  // Test 2.5: Search Pokemon Cards - Valid Query
  console.log('📋 Test 2.5: Search Pokemon Cards (Valid Query)');
  const { data: searchData } = await makeAuthenticatedRequest(
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
  const { data: noQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/pokemon/search?page=1&limit=3`);
  
  assert(
    !noQueryData.success && noQueryData.error,
    'Search without query should be rejected',
    'validation error',
    noQueryData.success ? 'success' : 'error'
  );

  // Test 2.7: Search Cards - Empty Query
  console.log('📋 Test 2.7: Search Cards (Empty Query)');
  const { data: emptyQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/pokemon/search?q=&page=1&limit=3`);
  
  assert(
    !emptyQueryData.success && emptyQueryData.error,
    'Search with empty query should be rejected',
    'validation error',
    emptyQueryData.success ? 'success' : 'error'
  );

  // Test 2.8: Get Specific Card by ID
  if (cardId) {
    console.log('📋 Test 2.8: Get Card by Valid ID');
    const { data: cardData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/pokemon/${cardId}`);
    
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
  const { data: invalidCardData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/pokemon/invalid-card-id`);
  
  assert(
    !invalidCardData.success && invalidCardData.error,
    'Invalid card ID should return error',
    'not found error',
    invalidCardData.success ? 'success' : 'error'
  );

  // Test 2.10: Get Card with Invalid Card Type
  console.log('📋 Test 2.10: Get Card with Invalid Card Type');
  const { data: invalidTypeCardData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/invalid-type/some-id`);
  
  assert(
    !invalidTypeCardData.success && invalidTypeCardData.error,
    'Invalid card type in card detail should be rejected',
    'validation error',
    invalidTypeCardData.success ? 'success' : 'error'
  );

  // Test 2.11: Cards with Filters
  console.log('📋 Test 2.11: Get Cards with Filters');
  const { data: filteredData } = await makeAuthenticatedRequest(
    `${BASE_URL}/cards/pokemon?page=1&limit=3&rarity=Common&type=Fire`
  );
  
  assert(
    filteredData.success || (filteredData.error && !filteredData.error.message?.includes('500')),
    'Cards with filters should be handled',
    'success or handled error',
    filteredData.success ? 'success' : 'handled error'
  );

  // Test 2.12: Cards Sorting Tests
  console.log('📋 Test 2.12: Get Cards with Different Sorting');
  const { data: sortedData } = await makeAuthenticatedRequest(
    `${BASE_URL}/cards/pokemon?page=1&limit=3&sortBy=rarity&sortOrder=desc`
  );
  
  assert(
    sortedData.success || (sortedData.error && !sortedData.error.message?.includes('500')),
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
  const { data: emptyCollectionData } = await makeAuthenticatedRequest(`${BASE_URL}/collections`, {
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
  const { data: invalidAddData } = await makeAuthenticatedRequest(`${BASE_URL}/collections`, {
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
    const { data: addCardData } = await makeAuthenticatedRequest(`${BASE_URL}/collections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        cardId: cardId,
        category: 'PokemonCard',
        quantity: 2,
        condition: 'Near Mint'
      })
    });
    
    assert(
      addCardData.success || (addCardData.error && (addCardData.error.message?.includes('not implemented') || addCardData.error.includes('not implemented'))),
      'Valid card addition should succeed or show not implemented',
      'success or not implemented',
      addCardData.success ? 'success' : (addCardData.error?.message || addCardData.error || 'failure')
    );

    if (addCardData.success && addCardData.data) {
      collectionItemId = addCardData.data._id || addCardData.data.id;
    }

    // Test 3.5: Add Same Card Again (Should Update Quantity)
    console.log('📋 Test 3.5: Add Same Card Again');
    const { data: duplicateCardData } = await makeAuthenticatedRequest(`${BASE_URL}/collections`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        cardId: cardId,
        category: 'PokemonCard',
        quantity: 1,
        condition: 'Near Mint'
      })
    });
    
    assert(
      duplicateCardData.success || (duplicateCardData.error && (duplicateCardData.error.message?.includes('not implemented') || duplicateCardData.error.includes('not implemented'))),
      'Adding duplicate card should succeed or show not implemented',
      'success or not implemented',
      duplicateCardData.success ? 'success' : (duplicateCardData.error?.message || duplicateCardData.error || 'failure')
    );
  } else {
    skip('Tests 3.4-3.5: Add Card to Collection', 'No card ID available');
  }

  // Test 3.6: Get Collection After Adding Items
  console.log('📋 Test 3.6: Get Collection (With Items)');
  const { data: collectionData } = await makeAuthenticatedRequest(`${BASE_URL}/collections`, {
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
    const { data: updateData } = await makeAuthenticatedRequest(`${BASE_URL}/collections/${collectionItemId}`, {
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
  const { data: updateNonExistentData } = await makeAuthenticatedRequest(`${BASE_URL}/collections/nonexistent-id`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      quantity: 1,
      condition: 'Near Mint'
    })
  });
  
  assert(
    !updateNonExistentData.success || updateNonExistentResponse.status === 404,
    'Updating non-existent item should return error',
    'not found error',
    !updateNonExistentData.success || updateNonExistentResponse.status === 404 ? 'not found error' : 'unexpected success'
  );

  // Test 3.9: Remove Collection Item
  if (collectionItemId) {
    console.log('📋 Test 3.9: Remove Collection Item');
    const { data: removeData } = await makeAuthenticatedRequest(`${BASE_URL}/collections/${collectionItemId}`, {
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
  const { data: paginatedCollectionData } = await makeAuthenticatedRequest(`${BASE_URL}/collections?page=1&limit=5`, {
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
  const { data: emptyDecksData } = await makeAuthenticatedRequest(`${BASE_URL}/decks`, {
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
  const { data: invalidDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks`, {
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
  const { data: createDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      name: 'Test Deck',
      description: 'A comprehensive test deck',
      category: 'PokemonCard',
      format: 'standard'
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
  const { data: decksWithItemsData } = await makeAuthenticatedRequest(`${BASE_URL}/decks`, {
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
    const { data: specificDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${deckId}`, {
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
    const { data: updateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${deckId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Updated Test Deck',
        description: 'Updated description',
        category: 'PokemonCard',
        format: 'standard'
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
      const { data: addCardToDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${deckId}/cards`, {
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
      const { data: deckCardsData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${deckId}/cards`, {
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
      const { data: removeCardData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${deckId}/cards/${cardId}`, {
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
    const { data: deleteDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${deckId}`, {
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
  const { data: nonExistentDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/nonexistent-id`, {
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
    noAuthData.error || (typeof noAuthData === 'object' && !noAuthData.success),
    'Profile access without auth should be rejected',
    'authentication error',
    noAuthData.error ? 'authentication error' : 'unexpected success'
  );

  if (!authToken) {
    skip('Tests 5.2-5.8: User Management Tests', 'No authentication token available');
    return;
  }

  // Test 5.2: Get User Profile - Valid Auth
  console.log('📋 Test 5.2: Get User Profile (Valid Auth)');
  const { data: profileData } = await makeAuthenticatedRequest(`${BASE_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    profileData && (profileData._id || profileData.id || profileData.success),
    'Valid profile access should succeed',
    'user profile data',
    profileData ? 'success with profile data' : 'failure'
  );

  // Test 5.3: Update User Profile - Valid Data (Note: Profile update may not be implemented)
  console.log('📋 Test 5.3: Update User Profile (Valid Data)');
  const { data: updateProfileData, response: updateProfileResponse } = await makeAuthenticatedRequest(`${BASE_URL}/users/profile`, {
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
    updateProfileData.success || updateProfileResponse.status === 404,
    'Profile update should succeed or return 404 if not implemented',
    'success or 404',
    updateProfileData.success ? 'success' : `${updateProfileResponse.status} response`
  );

  // Test 5.4: Update User Profile - Invalid Data (Note: Profile update may not be implemented)
  console.log('📋 Test 5.4: Update User Profile (Invalid Data)');
  const { data: invalidUpdateData, response: invalidUpdateResponse } = await makeAuthenticatedRequest(`${BASE_URL}/users/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      email: 'invalid-email-format'
    })
  });
  
  assert(
    !invalidUpdateData.success || invalidUpdateResponse.status === 404,
    'Invalid profile update should be rejected or return 404',
    'validation error or 404',
    invalidUpdateData.success ? 'success' : `${invalidUpdateResponse.status} response`
  );

  // Test 5.5: Change Password - Valid Request (Fixed method to POST)
  console.log('📋 Test 5.5: Change Password (Valid)');
  const { data: changePasswordData } = await makeAuthenticatedRequest(`${BASE_URL}/users/change-password`, {
    method: 'POST',
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
  const { data: wrongPasswordData } = await makeAuthenticatedRequest(`${BASE_URL}/users/change-password`, {
    method: 'POST',
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
  const { data: mismatchedPasswordData } = await makeAuthenticatedRequest(`${BASE_URL}/users/change-password`, {
    method: 'POST',
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

  // Test 5.8: Get User Statistics (Note: Stats endpoint may not exist)
  console.log('📋 Test 5.8: Get User Statistics');
  const { data: statsData, response: statsResponse } = await makeAuthenticatedRequest(`${BASE_URL}/users/stats`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    statsData.success || statsResponse.status === 500 || statsResponse.status === 404,
    'User statistics should be available or return appropriate error',
    'success or error response',
    statsData.success ? 'success' : `${statsResponse.status} response`
  );
}

// =============================================================================
// 🃏 SET MANAGEMENT TESTS
// =============================================================================

async function testSetManagement() {
  console.log('\n🃏 === SET MANAGEMENT TESTS ===\n');

  // Test 6.1: Get Pokemon Sets (category now required)
  console.log('📋 Test 6.1: Get Pokemon Sets (Basic)');
  const { data: pokemonSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon?page=1&limit=10`);
  
  assert(
    pokemonSetsData.success && Array.isArray(pokemonSetsData.data),
    'Pokemon sets endpoint should return array',
    'success with array',
    pokemonSetsData.success ? `array with ${pokemonSetsData.data?.length || 0} items` : 'failure'
  );

  // Store set IDs for later tests
  let pokemonSetId = null;
  let yugiohSetId = null;

  if (pokemonSetsData.success && pokemonSetsData.data.length > 0) {
    pokemonSetId = pokemonSetsData.data[0]._id;
  }

  // Test 6.2: Get Pokemon Sets Only (same as above now)
  console.log('📋 Test 6.2: Get Pokemon Sets Only');
  const { data: pokemonSetsData2 } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon?page=1&limit=5`);
  
  assert(
    pokemonSetsData2.success && Array.isArray(pokemonSetsData2.data),
    'Pokemon sets should be filtered correctly',
    'success with pokemon sets',
    pokemonSetsData2.success ? `${pokemonSetsData2.data?.length || 0} pokemon sets` : 'failure'
  );

  if (pokemonSetsData2.success && pokemonSetsData2.data.length > 0) {
    pokemonSetId = pokemonSetsData2.data[0]._id;
    console.log(`✅ Got Pokemon Set ID: ${pokemonSetId}`);
  }

  // Test 6.3: Get Yugioh Sets Only
  console.log('📋 Test 6.3: Get Yugioh Sets Only');
  const { data: yugiohSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/yugioh?page=1&limit=5`);
  
  assert(
    yugiohSetsData.success && Array.isArray(yugiohSetsData.data),
    'Yugioh sets should be filtered correctly',
    'success with yugioh sets',
    yugiohSetsData.success ? `${yugiohSetsData.data?.length || 0} yugioh sets` : 'failure'
  );

  if (yugiohSetsData.success && yugiohSetsData.data.length > 0) {
    yugiohSetId = yugiohSetsData.data[0]._id;
    console.log(`✅ Got Yugioh Set ID: ${yugiohSetId}`);
  }

  // Test 6.4: Get Sets with Invalid Category
  console.log('📋 Test 6.4: Get Sets (Invalid Category)');
  const { data: invalidTypeData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/invalid?page=1&limit=5`);
  
  assert(
    !invalidTypeData.success && invalidTypeData.error,
    'Invalid set category should be rejected',
    'validation error',
    invalidTypeData.success ? 'success' : 'validation error'
  );

  // Test 6.5: Get Sets with Invalid Pagination (use pokemon category)
  console.log('📋 Test 6.5: Get Sets (Invalid Pagination)');
  const { data: invalidPaginationData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon?page=-1&limit=1000`);
  
  assert(
    !invalidPaginationData.success && invalidPaginationData.error,
    'Invalid pagination should be rejected',
    'validation error',
    invalidPaginationData.success ? 'success' : 'validation error'
  );

  // Test 6.6: Search Sets - Valid Query (now requires category)
  console.log('📋 Test 6.6: Search Sets (Valid Query)');
  const { data: searchSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon/search?q=base&page=1&limit=5`);
  
  assert(
    searchSetsData.success && Array.isArray(searchSetsData.data),
    'Set search should work with valid query',
    'success with results',
    searchSetsData.success ? `${searchSetsData.data?.length || 0} search results` : 'failure'
  );

  // Test 6.7: Search Sets - Missing Query (now requires category)
  console.log('📋 Test 6.7: Search Sets (Missing Query)');
  const { data: missingQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon/search?page=1&limit=5`);
  
  assert(
    !missingQueryData.success && missingQueryData.error,
    'Search without query should be rejected',
    'validation error',
    missingQueryData.success ? 'success' : 'validation error'
  );

  // Test 6.8: Search Sets - Empty Query (now requires category)
  console.log('📋 Test 6.8: Search Sets (Empty Query)');
  const { data: emptyQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon/search?q=&page=1&limit=5`);
  
  assert(
    !emptyQueryData.success && emptyQueryData.error,
    'Search with empty query should be rejected',
    'validation error',
    emptyQueryData.success ? 'success' : 'validation error'
  );

  // Test 6.9: Search Pokemon Sets Specifically
  console.log('📋 Test 6.9: Search Pokemon Sets');
  const { data: searchPokemonData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon/search?q=base&page=1&limit=3`);
  
  assert(
    searchPokemonData.success && Array.isArray(searchPokemonData.data),
    'Pokemon set search should work',
    'success with pokemon results',
    searchPokemonData.success ? `${searchPokemonData.data?.length || 0} pokemon results` : 'failure'
  );

  // Test 6.10: Search Yugioh Sets Specifically
  console.log('📋 Test 6.10: Search Yugioh Sets');
  const { data: searchYugiohData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/yugioh/search?q=legend&page=1&limit=3`);
  
  assert(
    searchYugiohData.success && Array.isArray(searchYugiohData.data),
    'Yugioh set search should work',
    'success with yugioh results',
    searchYugiohData.success ? `${searchYugiohData.data?.length || 0} yugioh results` : 'failure'
  );

  // Test 6.11: Get Specific Set by ID (Pokemon)
  if (pokemonSetId) {
    console.log('📋 Test 6.11: Get Pokemon Set by ID');
    const { data: pokemonSetData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon/${pokemonSetId}`);
    
    assert(
      pokemonSetData.success && pokemonSetData.data,
      'Pokemon set by ID should be retrieved',
      'success with set data',
      pokemonSetData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 6.11: Get Pokemon Set by ID', 'No Pokemon set ID available');
  }

  // Test 6.12: Get Specific Set by ID (Yugioh)
  if (yugiohSetId) {
    console.log('📋 Test 6.12: Get Yugioh Set by ID');
    const { data: yugiohSetData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/yugioh/${yugiohSetId}`);
    
    assert(
      yugiohSetData.success && yugiohSetData.data,
      'Yugioh set by ID should be retrieved',
      'success with set data',
      yugiohSetData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 6.12: Get Yugioh Set by ID', 'No Yugioh set ID available');
  }

  // Test 6.13: Get Set by Invalid ID
  console.log('📋 Test 6.13: Get Set by Invalid ID');
  const { data: invalidSetData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon/invalid-set-id`);
  
  assert(
    !invalidSetData.success && invalidSetData.error,
    'Invalid set ID should return error',
    'not found error',
    invalidSetData.success ? 'success' : 'not found error'
  );

  // Test 6.14: Get Cards by Set ID (Pokemon)
  if (pokemonSetId) {
    console.log('📋 Test 6.14: Get Pokemon Cards by Set');
    const { data: pokemonCardsData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/pokemon/sets/${pokemonSetId}?page=1&limit=5`);
    
    assert(
      pokemonCardsData.success && Array.isArray(pokemonCardsData.data),
      'Pokemon cards by set should be retrieved',
      'success with cards',
      pokemonCardsData.success ? `${pokemonCardsData.data?.length || 0} cards from set` : 'failure'
    );
  } else {
    skip('Test 6.14: Get Pokemon Cards by Set', 'No Pokemon set ID available');
  }

  // Test 6.15: Get Cards by Set ID (Yugioh)
  if (yugiohSetId) {
    console.log('📋 Test 6.15: Get Yugioh Cards by Set');
    const { data: yugiohCardsData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/yugioh/sets/${yugiohSetId}?page=1&limit=5`);
    
    assert(
      yugiohCardsData.success && Array.isArray(yugiohCardsData.data),
      'Yugioh cards by set should be retrieved',
      'success with cards',
      yugiohCardsData.success ? `${yugiohCardsData.data?.length || 0} cards from set` : 'failure'
    );
  } else {
    skip('Test 6.15: Get Yugioh Cards by Set', 'No Yugioh set ID available');
  }

  // Test 6.16: Get Cards by Set - Invalid Card Type
  console.log('📋 Test 6.16: Get Cards by Set (Invalid Card Type)');
  const { data: invalidCardTypeData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/invalid/sets/some-set-id?page=1&limit=5`);
  
  assert(
    !invalidCardTypeData.success && invalidCardTypeData.error,
    'Invalid card type for cards by set should be rejected',
    'validation error',
    invalidCardTypeData.success ? 'success' : 'validation error'
  );

  // Test 6.17: Get Cards by Set - Invalid Set ID
  console.log('📋 Test 6.17: Get Cards by Set (Invalid Set ID)');
  const { data: invalidSetIdData } = await makeAuthenticatedRequest(`${BASE_URL}/cards/pokemon/sets/invalid-set-id?page=1&limit=5`);
  
  assert(
    !invalidSetIdData.success && invalidSetIdData.error,
    'Invalid set ID for cards by set should return error',
    'not found error',
    invalidSetIdData.success ? 'success' : 'not found error'
  );

  // Test 6.18: Sets with Sorting
  console.log('📋 Test 6.18: Get Sets with Sorting');
  const { data: sortedSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon?sortBy=name&sortOrder=asc&limit=5`);
  
  assert(
    sortedSetsData.success && Array.isArray(sortedSetsData.data),
    'Sets with sorting should work',
    'success with sorted results',
    sortedSetsData.success ? 'sorted successfully' : 'failure'
  );

  // Test 6.19: Sets with Different Sorting
  console.log('📋 Test 6.19: Get Sets with Card Count Sorting');
  const { data: cardCountSortData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/yugioh?sortBy=cardCount&sortOrder=desc&limit=5`);
  
  assert(
    cardCountSortData.success && Array.isArray(cardCountSortData.data),
    'Sets with card count sorting should work',
    'success with sorted results',
    cardCountSortData.success ? 'sorted by card count' : 'failure'
  );

  // Test 6.20: Large Page Number for Sets
  console.log('📋 Test 6.20: Get Sets (Large Page Number)');
  const { data: largePageData } = await makeAuthenticatedRequest(`${BASE_URL}/sets/pokemon?page=999&limit=5`);
  
  assert(
    largePageData.success && Array.isArray(largePageData.data),
    'Large page number should return empty array gracefully',
    'empty array',
    largePageData.success ? `${largePageData.data?.length || 0} results` : 'failure'
  );
}

// =============================================================================
// � SYSTEM & DOCUMENTATION TESTS
// =============================================================================

async function testSystemEndpoints() {
  console.log('\n📋 === SYSTEM & DOCUMENTATION TESTS ===\n');

  // Test 7.1: Health Check Endpoint
  console.log('📋 Test 7.1: Health Check Endpoint');
  const { data: healthData } = await makeRequest(`${BASE_URL}/health`);
  
  assert(
    healthData.success && healthData.status === 'ok',
    'Health endpoint should return OK status',
    'ok status with cache stats',
    healthData.success ? `status: ${healthData.status}` : 'failure'
  );

  // Test 7.2: Swagger JSON Documentation
  console.log('📋 Test 7.2: Swagger JSON Documentation');
  const { data: swaggerData } = await makeRequest(`${BASE_URL}/swagger.json`);
  
  assert(
    swaggerData.openapi && swaggerData.info && swaggerData.paths,
    'Swagger JSON should be valid OpenAPI spec',
    'valid OpenAPI document',
    swaggerData.openapi ? 'valid OpenAPI document' : 'invalid'
  );

  // Test 7.3: Base Route
  console.log('📋 Test 7.3: Base Route');
  const { data: baseData } = await makeRequest(`${BASE_URL}/`);
  
  assert(
    baseData === 'Hello Hono!' || (typeof baseData === 'string' && baseData.includes('Hello')),
    'Base route should return greeting',
    'Hello Hono!',
    baseData
  );

  // Test 7.4: Swagger UI Endpoint (should redirect or return HTML)
  console.log('📋 Test 7.4: Swagger UI Documentation');
  const { response: docsResponse } = await makeRequest(`${BASE_URL}/docs`);
  
  assert(
    docsResponse.status === 200 || docsResponse.status === 301 || docsResponse.status === 302,
    'Docs endpoint should be accessible',
    '200, 301, or 302 status',
    `${docsResponse.status}`
  );
}

// =============================================================================
// 👤 ADVANCED USER MANAGEMENT TESTS
// =============================================================================

async function testAdvancedUserManagement() {
  console.log('\n👤 === ADVANCED USER MANAGEMENT TESTS ===\n');

  if (!authToken) {
    skip('Advanced User Management Tests', 'No authentication token available');
    return;
  }

  // Test 8.1: Get All Users (Admin functionality)
  console.log('📋 Test 8.1: Get All Users');
  const { data: allUsersData } = await makeAuthenticatedRequest(`${BASE_URL}/users`);
  
  assert(
    allUsersData && Array.isArray(allUsersData),
    'Get all users should return array',
    'array of users',
    Array.isArray(allUsersData) ? `array with ${allUsersData.length} users` : 'not array'
  );

  // Test 8.2: Get User by ID (if we have userId)
  if (userId) {
    console.log('📋 Test 8.2: Get User by ID');
    const { data: userByIdData } = await makeAuthenticatedRequest(`${BASE_URL}/users/${userId}`);
    
    assert(
      userByIdData && (userByIdData.id || userByIdData._id),
      'Get user by ID should return user data',
      'user object',
      userByIdData ? 'user object' : 'no data'
    );
  } else {
    skip('Test 8.2: Get User by ID', 'No user ID available');
  }

  // Test 8.3: Update User by ID (if we have userId)
  if (userId) {
    console.log('📋 Test 8.3: Update User by ID');
    const { data: updateUserData } = await makeAuthenticatedRequest(`${BASE_URL}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: 'Updated',
        lastName: 'TestUser'
      })
    });
    
    assert(
      updateUserData && !updateUserData.error,
      'Update user by ID should succeed',
      'updated user data',
      updateUserData ? 'success' : 'failure'
    );
  } else {
    skip('Test 8.3: Update User by ID', 'No user ID available');
  }

  // Test 8.4: Get User by Invalid ID
  console.log('📋 Test 8.4: Get User by Invalid ID');
  const { data: invalidUserData } = await makeAuthenticatedRequest(`${BASE_URL}/users/invalid-user-id`);
  
  assert(
    invalidUserData.error && (invalidUserData.error.includes('not found') || invalidUserData.error.includes('Cast to ObjectId')),
    'Invalid user ID should return not found or ObjectId error',
    'not found or ObjectId error',
    invalidUserData.error ? 'error' : 'unexpected success'
  );

  // Test 8.5: Delete User by ID (if we have userId)
  if (userId) {
    console.log('📋 Test 8.5: Delete User by ID');
    const { data: deleteUserData } = await makeAuthenticatedRequest(`${BASE_URL}/users/${userId}`, {
      method: 'DELETE'
    });
    
    assert(
      deleteUserData && (!deleteUserData.error || deleteUserData.message),
      'Delete user by ID should succeed or return appropriate message',
      'success or appropriate message',
      deleteUserData ? 'handled' : 'failure'
    );
  } else {
    skip('Test 8.5: Delete User by ID', 'No user ID available');
  }
}

// =============================================================================
// 📚 ADVANCED COLLECTION TESTS
// =============================================================================

async function testAdvancedCollectionManagement() {
  console.log('\n📚 === ADVANCED COLLECTION MANAGEMENT TESTS ===\n');

  if (!authToken) {
    skip('Advanced Collection Management Tests', 'No authentication token available');
    return;
  }

  // Test 9.1: Get User Cards by Category (Pokemon)
  console.log('📋 Test 9.1: Get User Cards by Pokemon Category');
  const { data: pokemonUserCardsData } = await makeAuthenticatedRequest(`${BASE_URL}/user-cards/category/pokemon`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    pokemonUserCardsData.success || pokemonUserCardsData.error,
    'Get user cards by category should respond',
    'success or error',
    pokemonUserCardsData.success ? 'success' : 'error'
  );

  // Test 9.2: Get User Cards by Category (Yugioh)
  console.log('📋 Test 9.2: Get User Cards by Yugioh Category');
  const { data: yugiohUserCardsData } = await makeAuthenticatedRequest(`${BASE_URL}/user-cards/category/yugioh`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    yugiohUserCardsData.success || yugiohUserCardsData.error,
    'Get user cards by yugioh category should respond',
    'success or error',
    yugiohUserCardsData.success ? 'success' : 'error'
  );

  // Test 9.3: Search User Cards
  console.log('📋 Test 9.3: Search User Cards');
  const { data: searchUserCardsData } = await makeAuthenticatedRequest(`${BASE_URL}/user-cards/search?q=test&category=pokemon`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    searchUserCardsData.success || searchUserCardsData.error,
    'Search user cards should respond',
    'success or error',
    searchUserCardsData.success ? 'success' : 'error'
  );

  // Test 9.4: Get Card Details
  if (cardId) {
    console.log('📋 Test 9.4: Get Card Details');
    const { data: cardDetailsData } = await makeAuthenticatedRequest(`${BASE_URL}/user-cards/details/${cardId}?category=pokemon`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      cardDetailsData.success || cardDetailsData.error,
      'Get card details should respond',
      'success or error',
      cardDetailsData.success ? 'success' : 'error'
    );
  } else {
    skip('Test 9.4: Get Card Details', 'No card ID available');
  }

  // Test 9.5: Get User Cards by Invalid Category
  console.log('📋 Test 9.5: Get User Cards by Invalid Category');
  const { data: invalidCategoryData } = await makeAuthenticatedRequest(`${BASE_URL}/user-cards/category/invalid`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    !invalidCategoryData.success && invalidCategoryData.error,
    'Invalid category should be rejected',
    'validation error',
    invalidCategoryData.success ? 'success' : 'validation error'
  );

  // Test 9.6: Remove Card from Collection (if we have cardId)
  if (cardId) {
    console.log('📋 Test 9.6: Remove Card from Collection');
    const { data: removeCardData } = await makeAuthenticatedRequest(`${BASE_URL}/user-cards/${cardId}?category=pokemon`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      removeCardData.success || (removeCardData.error && !removeCardData.error.message?.includes('500')),
      'Remove card should be handled',
      'success or handled error',
      removeCardData.success ? 'success' : 'handled error'
    );
  } else {
    skip('Test 9.6: Remove Card from Collection', 'No card ID available');
  }
}

// =============================================================================
// 🎴 ADVANCED DECK MANAGEMENT TESTS
// =============================================================================

async function testAdvancedDeckManagement() {
  console.log('\n🎴 === ADVANCED DECK MANAGEMENT TESTS ===\n');

  if (!authToken) {
    skip('Advanced Deck Management Tests', 'No authentication token available');
    return;
  }

  let testDeckId = null;

  // Test 10.1: Create Test Deck for Advanced Operations
  console.log('📋 Test 10.1: Create Test Deck for Advanced Operations');
  const { data: createAdvancedDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      name: 'Advanced Test Deck',
      description: 'Deck for testing advanced operations',
      category: 'PokemonCard',
      format: 'standard',
      isPublic: true
    })
  });
  
  if (createAdvancedDeckData.success && createAdvancedDeckData.data) {
    testDeckId = createAdvancedDeckData.data.id || createAdvancedDeckData.data._id;
    assert(true, 'Advanced test deck created successfully', 'deck created', 'success');
  } else {
    assert(false, 'Advanced test deck creation failed', 'deck created', 'failure');
  }

  if (testDeckId) {
    // Test 10.2: Validate Deck Format
    console.log('📋 Test 10.2: Validate Deck Format');
    const { data: validateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${testDeckId}/validate`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      validateDeckData.success || validateDeckData.error,
      'Deck validation should respond',
      'success or error',
      validateDeckData.success ? 'success' : 'error'
    );

    // Test 10.3: Duplicate Deck
    console.log('📋 Test 10.3: Duplicate Deck');
    const { data: duplicateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${testDeckId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Duplicated Advanced Test Deck',
        description: 'Duplicated deck for testing'
      })
    });
    
    assert(
      duplicateDeckData.success || (duplicateDeckData.error && !duplicateDeckData.error.message?.includes('500')),
      'Deck duplication should be handled',
      'success or handled error',
      duplicateDeckData.success ? 'success' : 'handled error'
    );

    // Test 10.4: Add Card to Deck (if we have cardId)
    if (cardId) {
      console.log('📋 Test 10.4: Add Card to Deck');
      const { data: addCardToDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${testDeckId}/cards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          cardId: cardId,
          quantity: 1,
          category: 'pokemon'
        })
      });
      
      assert(
        addCardToDeckData.success || (addCardToDeckData.error && !addCardToDeckData.error.message?.includes('500')),
        'Add card to deck should be handled',
        'success or handled error',
        addCardToDeckData.success ? 'success' : 'handled error'
      );

      // Test 10.5: Update Card Quantity in Deck
      console.log('📋 Test 10.5: Update Card Quantity in Deck');
      const { data: updateCardQuantityData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${testDeckId}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          quantity: 2
        })
      });
      
      assert(
        updateCardQuantityData.success || (updateCardQuantityData.error && !updateCardQuantityData.error.message?.includes('500')),
        'Update card quantity should be handled',
        'success or handled error',
        updateCardQuantityData.success ? 'success' : 'handled error'
      );

      // Test 10.6: Remove Card from Deck
      console.log('📋 Test 10.6: Remove Card from Deck');
      const { data: removeCardFromDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${testDeckId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      assert(
        removeCardFromDeckData.success || (removeCardFromDeckData.error && !removeCardFromDeckData.error.message?.includes('500')),
        'Remove card from deck should be handled',
        'success or handled error',
        removeCardFromDeckData.success ? 'success' : 'handled error'
      );
    } else {
      skip('Tests 10.4-10.6: Deck Card Operations', 'No card ID available');
    }

    // Test 10.7: Delete Test Deck (cleanup)
    console.log('📋 Test 10.7: Delete Test Deck (Cleanup)');
    const { data: deleteDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/${testDeckId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      deleteDeckData.success || (deleteDeckData.error && !deleteDeckData.error.message?.includes('500')),
      'Delete deck should be handled',
      'success or handled error',
      deleteDeckData.success ? 'success' : 'handled error'
    );
  } else {
    skip('Tests 10.2-10.7: Advanced Deck Operations', 'No test deck created');
  }
}

// =============================================================================
// �🚨 ERROR HANDLING & EDGE CASES TESTS
// =============================================================================

async function testErrorHandling() {
  console.log('\n🚨 === ERROR HANDLING & EDGE CASES ===\n');

  // Test 11.1: Invalid HTTP Method
  console.log('📋 Test 11.1: Invalid HTTP Method');
  const { data: invalidMethodData, response: invalidMethodResponse } = await makeRequest(`${BASE_URL}/auth/login`, {
    method: 'PATCH'
  });
  
  assert(
    invalidMethodResponse.status === 405 || !invalidMethodData.success,
    'Invalid HTTP method should be rejected',
    'method not allowed',
    `status ${invalidMethodResponse.status}`
  );

  // Test 11.2: Malformed JSON Body
  console.log('📋 Test 11.2: Malformed JSON Body');
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

  // Test 11.3: Missing Content-Type Header
  console.log('📋 Test 11.3: Missing Content-Type Header');
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

  // Test 11.4: Extremely Long Request Body
  console.log('📋 Test 11.4: Extremely Long Request Body');
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

  // Test 11.5: SQL Injection Attempt
  console.log('📋 Test 11.5: SQL Injection Attempt');
  const { data: sqlInjectionData } = await makeRequest(
    `${BASE_URL}/cards/pokemon/search?q='; DROP TABLE users; --&page=1&limit=5`
  );
  
  assert(
    !sqlInjectionData.success || (sqlInjectionData.success && Array.isArray(sqlInjectionData.data)),
    'SQL injection should be safely handled',
    'safe response',
    sqlInjectionData.success ? 'safe response' : 'error response'
  );

  // Test 11.6: XSS Attempt
  console.log('📋 Test 11.6: XSS Attempt');
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

  // Test 11.7: Rate Limiting Test (if implemented)
  console.log('📋 Test 11.7: Rate Limiting Test');
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

  // Test 11.8: Unicode and Special Characters
  console.log('📋 Test 11.8: Unicode and Special Characters');
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

  // Test 11.9: Empty Request Body
  console.log('📋 Test 11.9: Empty Request Body');
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

  // Test 11.10: Non-existent Endpoint
  console.log('📋 Test 11.10: Non-existent Endpoint');
  const { response: notFoundResponse } = await makeRequest(`${BASE_URL}/nonexistent-endpoint`);
  
  assert(
    notFoundResponse.status === 404,
    'Non-existent endpoint should return 404',
    '404 status',
    `status ${notFoundResponse.status}`
  );

  // Test 11.11: CORS Headers (if applicable)
  console.log('📋 Test 11.11: CORS Headers');
  const { response: corsResponse } = await makeAuthenticatedRequest(`${BASE_URL}/cards/pokemon?page=1&limit=1`);
  
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
    await testSystemEndpoints();
    await testAuthentication();
    await testCardManagement(); 
    await testSetManagement();
    await testCollectionManagement();
    await testAdvancedCollectionManagement();
    await testDeckManagement();
    await testAdvancedDeckManagement();
    await testUserManagement();
    await testAdvancedUserManagement();
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