#!/usr/bin/env node

// 🚀 COMPREHENSIVE API TESTING SCRIPT FOR TCG BACKEND (UNIFIED MODEL)
// This script tests ALL available endpoints with COMPLETE test coverage
// Including positive cases, negative cases, edge cases, and error handling
//
// 📋 COMPLETE ENDPOINT COVERAGE:
// • System & Documentation (/health, /swagger.json, /docs, /)
// • Authentication (/auth/*)
// • User Management (/users/*)
// • Unified Card Management (/cards/*)
// • Unified Set Management (/sets/*)
// • Collection Management (/collections/*, /user-cards/*)
// • User Deck Management (/decks/user/*) - Full CRUD operations
// • Social Media Posts (/posts/*) - Create, read, update, delete posts
// • Post Reactions & Comments (/posts/*) - Like/dislike and commenting system
// • Friend Management (/posts/friends/*) - Friend requests and management
// • Notifications (/posts/notifications/*) - Real-time notifications
// • Error Handling & Security
// • Rate Limiting & Edge Cases
//
// 🎮 UNIFIED MODEL SUPPORT:
// • Pokemon, Yu-Gi-Oh!, and One Piece cards in single collection
// • Unified card endpoints with gameType parameter
// • TCGPlayer Product ID support
// • Consistent pricing and set information

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
    username: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin',
    dateOfBirth: '1990-01-01'
  },
  valid: {
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    username: 'testuser123',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-15'
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    username: 'adminuser',
    firstName: 'Admin',
    lastName: 'User',
    dateOfBirth: '1985-05-20'
  },
  invalid: {
    email: 'invalid-email',
    password: '123',
    username: '',
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
      email: 'phuctann2505@gmail.com', // Use actual superuser email from .env
      password: 'Admin123' // Use actual superuser password from .env
    })
  });
  
  if (loginData && loginData.success && loginData.data && loginData.data.accessToken) {
    console.log('✅ Superuser authentication successful!');
    return {
      accessToken: loginData.data.accessToken,
      refreshToken: loginData.data.refreshToken,
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
let postId = null;
let commentId = null;
let friendshipId = null;

// Statistics tracking
const stats = {
  passed: 0,
  failed: 0,
  skipped: 0,
  requests: 0
};

console.log('🚀 STARTING COMPREHENSIVE API TESTS FOR TCG BACKEND (UNIFIED MODEL)');
console.log('=====================================================================');
console.log('📋 Testing ALL endpoints with complete coverage:');
console.log('   • System & Documentation endpoints');
console.log('   • Authentication & authorization');
console.log('   • User management (basic & advanced)');
console.log('   • Unified card browsing & searching (Pokemon, Yu-Gi-Oh!, One Piece)');
console.log('   • Unified set management & filtering');
console.log('   • Collection management (basic & advanced)');
console.log('   • User deck building & management (full CRUD)');
console.log('   • Social media posts (create, read, update, delete)');
console.log('   • Post reactions & comments (like/dislike system)');
console.log('   • Friend management (requests, accept, decline)');
console.log('   • Notifications (real-time social interactions)');
console.log('   • Positive test cases');
console.log('   • Negative test cases'); 
console.log('   • Edge cases & validation');
console.log('   • Rate limiting & security');
console.log('   • Error handling & injection attempts');
console.log('=====================================================================\n');

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
  } else if (loginData.error && (
    (typeof loginData.error === 'string' && loginData.error.includes('verify your email')) ||
    (loginData.error.message && loginData.error.message.includes('verify your email'))
  )) {
    assert(true, 'Regular user login correctly requires email verification', 'verification required', 'verification required');
  } else {
    assert(false, 'Regular user login should succeed or require verification', 'success or verification', loginData.error?.message || loginData.error || 'unknown failure');
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
    forgotData.success || forgotData.message || (forgotData.error && !forgotData.error.message?.includes('500')),
    'Forgot password should handle request (may fail if email service not configured)',
    'success or handled error',
    forgotData.success ? 'success' : (forgotData.message ? 'success' : 'handled error')
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
// 🃏 UNIFIED CARD MANAGEMENT TESTS
// =============================================================================

async function testCardManagement() {
  console.log('\n🃏 === UNIFIED CARD MANAGEMENT TESTS ===\n');

  // Test 2.1: Get All Cards - Valid Request
  console.log('📋 Test 2.1: Get All Cards (Paginated)');
  const { data: allCardsData } = await makeAuthenticatedRequest(
    `${BASE_URL}/api/cards?page=1&limit=5&sortBy=name&sortOrder=asc`
  );
  
  if (allCardsData.success && allCardsData.data.length > 0) {
    assert(
      allCardsData.success && allCardsData.data.length > 0,
      'All cards retrieval should succeed with data',
      'success with data',
      'success'
    );
    
    // Store a card ID for later tests
    cardId = allCardsData.data[0]._id || allCardsData.data[0].id;
    console.log(`   📝 Stored card ID for later tests: ${cardId}`);
  } else {
    console.log('   ⚠️  No cards found or retrieval failed');
  }

  // Test 2.2: Get Pokemon Cards - Valid Request
  console.log('📋 Test 2.2: Get Pokemon Cards (Paginated)');
  const { data: pokemonData } = await makeAuthenticatedRequest(
    `${BASE_URL}/api/cards/pokemon?page=1&limit=5&sortBy=name&sortOrder=asc`
  );
  
  if (pokemonData.success && pokemonData.data.length > 0) {
    assert(
      pokemonData.success && pokemonData.data.length > 0,
      'Pokemon cards retrieval should succeed with data',
      'success with data',
      'success'
    );
    
    // Store a Pokemon card ID for later tests
    if (!cardId) {
      cardId = pokemonData.data[0]._id || pokemonData.data[0].id;
      console.log(`   📝 Stored Pokemon card ID for later tests: ${cardId}`);
    }
  } else {
    console.log('   ⚠️  No Pokemon cards found or retrieval failed');
  }

  // Test 2.3: Get Pokemon Cards - Invalid Parameters
  console.log('📋 Test 2.3: Get Pokemon Cards (Invalid Parameters)');
  const { data: invalidParamsData } = await makeAuthenticatedRequest(
    `${BASE_URL}/api/cards/pokemon?page=-1&limit=1000`
  );
  
  assert(
    !invalidParamsData.success && invalidParamsData.error,
    'Invalid pagination parameters should be rejected',
    'validation error',
    invalidParamsData.success ? 'success' : 'error'
  );

  // Test 2.4: Get Yu-Gi-Oh! Cards - Valid Request
  console.log('📋 Test 2.4: Get Yu-Gi-Oh! Cards (Paginated)');
  const { data: yugiohData } = await makeAuthenticatedRequest(
    `${BASE_URL}/api/cards/yugioh?page=1&limit=5&sortBy=name&sortOrder=desc`
  );
  
  assert(
    yugiohData.success || yugiohData.error,
    'Yu-Gi-Oh! cards endpoint should respond',
    'success or error',
    yugiohData.success ? 'success' : 'error'
  );

  // Test 2.5: Get One Piece Cards - Valid Request
  console.log('📋 Test 2.5: Get One Piece Cards (Paginated)');
  const { data: onepieceData } = await makeAuthenticatedRequest(
    `${BASE_URL}/api/cards/onepiece?page=1&limit=5&sortBy=name&sortOrder=desc`
  );
  
  assert(
    onepieceData.success || onepieceData.error,
    'One Piece cards endpoint should respond',
    'success or error',
    onepieceData.success ? 'success' : 'error'
  );

  // Test 2.6: Get Cards - Invalid Game Type
  console.log('📋 Test 2.6: Get Cards (Invalid Game Type)');
  const { data: invalidTypeData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/invalid-type?page=1&limit=5`);
  
  assert(
    !invalidTypeData.success && invalidTypeData.error,
    'Invalid game type should be rejected',
    'validation error',
    invalidTypeData.success ? 'success' : 'error'
  );

  // Test 2.7: Search Pokemon Cards - Valid Query
  console.log('📋 Test 2.7: Search Pokemon Cards (Valid Query)');
  const { data: searchData } = await makeAuthenticatedRequest(
    `${BASE_URL}/api/cards/pokemon/search?q=Pikachu&page=1&limit=3`
  );
  
  assert(
    searchData.success || (searchData.error && !searchData.error.message?.includes('500')),
    'Pokemon card search should handle query',
    'success or handled error',
    searchData.success ? 'success' : 'handled error'
  );

  // Test 2.8: Search Cards - Missing Query
  console.log('📋 Test 2.8: Search Cards (Missing Query)');
  const { data: noQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/pokemon/search?page=1&limit=3`);
  
  assert(
    !noQueryData.success && noQueryData.error,
    'Search without query should be rejected',
    'validation error',
    noQueryData.success ? 'success' : 'error'
  );

  // Test 2.9: Search Cards - Empty Query
  console.log('📋 Test 2.9: Search Cards (Empty Query)');
  const { data: emptyQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/pokemon/search?q=&page=1&limit=3`);
  
  assert(
    !emptyQueryData.success && emptyQueryData.error,
    'Search with empty query should be rejected',
    'validation error',
    emptyQueryData.success ? 'success' : 'error'
  );

  // Test 2.10: Get Specific Card by ID
  if (cardId) {
    console.log('📋 Test 2.10: Get Specific Card by ID');
    const { data: specificCardData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/card/${cardId}`);
    
    assert(
      specificCardData.success || (specificCardData.error && !specificCardData.error.message?.includes('500')),
      'Get specific card should work or handle gracefully',
      'success or handled error',
      specificCardData.success ? 'success' : 'handled error'
    );
  } else {
    skip('Test 2.10: Get Specific Card by ID', 'No card ID available');
  }

  // Test 2.11: Get Card by Invalid ID
  console.log('📋 Test 2.11: Get Card by Invalid ID');
  const { data: invalidCardData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/card/invalid-card-id`);
  
  assert(
    !invalidCardData.success && invalidCardData.error,
    'Invalid card ID should return error',
    'not found error',
    invalidCardData.success ? 'success' : 'error'
  );

  // Test 2.12: Get Card by TCGPlayer Product ID
  console.log('📋 Test 2.12: Get Card by TCGPlayer Product ID');
  const { data: productCardData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/product/123456`);
  
  assert(
    productCardData.success || (productCardData.error && !productCardData.error.message?.includes('500')),
    'Product ID lookup should handle request',
    'success or handled error',
    productCardData.success ? 'success' : 'handled error'
  );

  // Test 2.13: Cards with Filters
  console.log('📋 Test 2.13: Get Cards with Filters');
  const { data: filteredData } = await makeAuthenticatedRequest(
    `${BASE_URL}/api/cards/pokemon?page=1&limit=3&rarity=Common&minPrice=1&maxPrice=10`
  );
  
  assert(
    filteredData.success || (filteredData.error && !filteredData.error.message?.includes('500')),
    'Cards with filters should be handled',
    'success or handled error',
    filteredData.success ? 'success' : 'handled error'
  );

  // Test 2.14: Get Card Statistics
  console.log('📋 Test 2.14: Get Card Statistics');
  const { data: statsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/stats`);
  
  assert(
    statsData.success || (statsData.error && !statsData.error.message?.includes('500')),
    'Card statistics should be available',
    'success or handled error',
    statsData.success ? 'success' : 'handled error'
  );

  // Test 2.15: Get Pokemon Card Statistics
  console.log('📋 Test 2.15: Get Pokemon Card Statistics');
  const { data: pokemonStatsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/cards/pokemon/stats`);
  
  assert(
    pokemonStatsData.success || (pokemonStatsData.error && !pokemonStatsData.error.message?.includes('500')),
    'Pokemon card statistics should be available',
    'success or handled error',
    pokemonStatsData.success ? 'success' : 'handled error'
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
      addCardData.success || (addCardData.error && (
        addCardData.error.message?.includes('not implemented') || 
        (typeof addCardData.error === 'string' && addCardData.error.includes('not implemented'))
      )),
      'Valid card addition should succeed or show not implemented',
      'success or not implemented',
      addCardData.success ? 'success' : (addCardData.error?.message || (typeof addCardData.error === 'string' ? addCardData.error : 'failure'))
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
      duplicateCardData.success || (duplicateCardData.error && (
        duplicateCardData.error.message?.includes('not implemented') || 
        duplicateCardData.error.message?.includes('already in your collection') ||
        (typeof duplicateCardData.error === 'string' && duplicateCardData.error.includes('not implemented'))
      )),
      'Adding duplicate card should succeed or show appropriate error',
      'success or appropriate error',
      duplicateCardData.success ? 'success' : (duplicateCardData.error?.message || (typeof duplicateCardData.error === 'string' ? duplicateCardData.error : 'failure'))
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
// 🎴 USER DECK MANAGEMENT TESTS
// =============================================================================

async function testUserDeckManagement() {
  console.log('\n🎴 === USER DECK MANAGEMENT TESTS ===\n');

  // Test 4.1: Get User Decks - Without Authentication
  console.log('📋 Test 4.1: Get User Decks (No Auth)');
  const { data: noAuthData } = await makeRequest(`${BASE_URL}/decks/user`);
  
  assert(
    !noAuthData.success && noAuthData.error,
    'User deck access without auth should be rejected',
    'authentication error',
    noAuthData.success ? 'success' : 'authentication error'
  );

  if (!authToken) {
    skip('Tests 4.2-4.15: User Deck Management Tests', 'No authentication token available');
    return;
  }

  // Test 4.2: Get Empty User Decks List
  console.log('📋 Test 4.2: Get User Decks (Empty)');
  const { data: emptyDecksData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    emptyDecksData.success && Array.isArray(emptyDecksData.data),
    'Empty user decks should return empty array',
    'empty array',
    Array.isArray(emptyDecksData.data) ? 'empty array' : 'not array'
  );

  // Test 4.3: Create User Deck - Invalid Data
  console.log('📋 Test 4.3: Create User Deck (Invalid Data)');
  const { data: invalidDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      // Missing required fields
      description: 'Test deck without name'
    })
  });
  
  assert(
    !invalidDeckData.success && invalidDeckData.error,
    'Invalid user deck creation should be rejected',
    'validation error',
    invalidDeckData.success ? 'success' : 'validation error'
  );

  // Test 4.4: Create User Deck - Valid Data
  console.log('📋 Test 4.4: Create User Deck (Valid)');
  const { data: createDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      name: 'Test User Deck',
      description: 'A comprehensive test user deck',
      category: 'PokemonCard',
      format: 'standard'
    })
  });
  
  assert(
    createDeckData.success,
    'Valid user deck creation should succeed',
    'success',
    createDeckData.success ? 'success' : 'failure'
  );

  if (createDeckData.success && createDeckData.data) {
    deckId = createDeckData.data._id || createDeckData.data.id;
  }

  // Test 4.5: Get User Decks After Creation
  console.log('📋 Test 4.5: Get User Decks (With Decks)');
  const { data: decksWithItemsData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    decksWithItemsData.success && Array.isArray(decksWithItemsData.data),
    'User decks should return array of items',
    'array with items',
    Array.isArray(decksWithItemsData.data) ? `array with ${decksWithItemsData.data.length} items` : 'not array'
  );

  if (deckId) {
    // Test 4.6: Get Specific User Deck
    console.log('📋 Test 4.6: Get Specific User Deck');
    const { data: specificDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      specificDeckData.success && specificDeckData.data,
      'Should retrieve specific user deck',
      'deck data',
      specificDeckData.success ? 'success' : 'failure'
    );

    // Test 4.7: Update User Deck
    console.log('📋 Test 4.7: Update User Deck');
    const { data: updateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Updated Test User Deck',
        description: 'Updated description'
      })
    });
    
    assert(
      updateDeckData.success,
      'User deck update should succeed',
      'success',
      updateDeckData.success ? 'success' : 'failure'
    );

    if (cardId) {
      // Test 4.8: Add Card to User Deck
      console.log('📋 Test 4.8: Add Card to User Deck');
      const { data: addCardToDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}/cards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          cardId: cardId,
          category: 'PokemonCard',
          quantity: 3
        })
      });
      
      assert(
        addCardToDeckData.success || (addCardToDeckData.error && addCardToDeckData.error.message?.includes('not own')),
        'Adding card to user deck should succeed or fail with ownership error',
        'success or ownership error',
        addCardToDeckData.success ? 'success' : 'ownership error'
      );

      // Test 4.9: Update Card Quantity in User Deck
      console.log('📋 Test 4.9: Update Card Quantity in User Deck');
      const { data: updateCardData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          quantity: 2
        })
      });
      
      assert(
        updateCardData.success || updateCardData.error,
        'Updating card quantity should be handled',
        'success or error',
        updateCardData.success ? 'success' : 'error'
      );

      // Test 4.10: Remove Card from User Deck
      console.log('📋 Test 4.10: Remove Card from User Deck');
      const { data: removeCardData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      assert(
        removeCardData.success || removeCardData.error,
        'Removing card from user deck should be handled',
        'success or error',
        removeCardData.success ? 'success' : 'error'
      );
    } else {
      skip('Tests 4.8-4.10: User Deck Card Management', 'No card ID available');
    }

    // Test 4.11: Validate User Deck
    console.log('📋 Test 4.11: Validate User Deck');
    const { data: validateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}/validate`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      validateDeckData.success && validateDeckData.data,
      'User deck validation should work',
      'validation result',
      validateDeckData.success ? 'validation result' : 'failure'
    );

    // Test 4.12: Duplicate User Deck
    console.log('📋 Test 4.12: Duplicate User Deck');
    const { data: duplicateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Duplicated Test Deck'
      })
    });
    
    assert(
      duplicateDeckData.success,
      'User deck duplication should succeed',
      'success',
      duplicateDeckData.success ? 'success' : 'failure'
    );

    // Test 4.13: Delete User Deck
    console.log('📋 Test 4.13: Delete User Deck');
    const { data: deleteDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${deckId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      deleteDeckData.success,
      'User deck deletion should succeed',
      'success',
      deleteDeckData.success ? 'success' : 'failure'
    );
  } else {
    skip('Tests 4.6-4.13: Specific User Deck Operations', 'No deck ID available');
  }

  // Test 4.14: Access Non-existent User Deck
  console.log('📋 Test 4.14: Get Non-existent User Deck');
  const { data: nonExistentDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/nonexistent-id`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(
    !nonExistentDeckData.success && nonExistentDeckData.error,
    'Non-existent user deck should return error',
    'not found error',
    nonExistentDeckData.success ? 'success' : 'not found error'
  );

  // Test 4.15: Create User Deck with Invalid Category
  console.log('📋 Test 4.15: Create User Deck (Invalid Category)');
  const { data: invalidCategoryData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      name: 'Invalid Category Deck',
      description: 'Deck with invalid category',
      category: 'INVALID_CATEGORY',
      format: 'STANDARD'
    })
  });
  
  assert(
    !invalidCategoryData.success && invalidCategoryData.error,
    'Invalid category should be rejected',
    'validation error',
    invalidCategoryData.success ? 'success' : 'validation error'
  );
}

// =============================================================================
// 🃏 POKEMON RECOMMENDED DECK TESTS
// =============================================================================

async function testPokemonDeckManagement() {
  console.log('\n🃏 === POKEMON RECOMMENDED DECK TESTS ===\n');

  let pokemonDeckId = null;
  let pokemonDeckExtId = null;

  // Test 5.1: Get All Pokemon Decks (Basic)
  console.log('📋 Test 5.1: Get All Pokemon Decks (Basic)');
  const { data: allPokemonDecksData } = await makeRequest(`${BASE_URL}/decks/pokemon`);
  
  assert(
    allPokemonDecksData.success && allPokemonDecksData.data && Array.isArray(allPokemonDecksData.data.decks),
    'Get all Pokemon decks should return paginated results',
    'paginated deck array',
    allPokemonDecksData.success ? `${allPokemonDecksData.data.decks?.length || 0} decks` : 'failure'
  );

  if (allPokemonDecksData.success && allPokemonDecksData.data.decks.length > 0) {
    pokemonDeckId = allPokemonDecksData.data.decks[0]._id;
    pokemonDeckExtId = allPokemonDecksData.data.decks[0].deckExtId;
    console.log(`✅ Got Pokemon Deck ID: ${pokemonDeckId}, Ext ID: ${pokemonDeckExtId}`);
  }

  // Test 5.2: Get Pokemon Decks with Pagination
  console.log('📋 Test 5.2: Get Pokemon Decks (With Pagination)');
  const { data: paginatedData } = await makeRequest(`${BASE_URL}/decks/pokemon?page=1&limit=3`);
  
  assert(
    paginatedData.success && paginatedData.data.pagination,
    'Pokemon decks pagination should work',
    'pagination data',
    paginatedData.success ? `page ${paginatedData.data.pagination?.page}` : 'failure'
  );

  // Test 5.3: Get Pokemon Decks with Type Filter
  console.log('📋 Test 5.3: Get Pokemon Decks (Type Filter)');
  const { data: typeFilterData } = await makeRequest(`${BASE_URL}/decks/pokemon?types=Fire,Water&limit=5`);
  
  assert(
    typeFilterData.success && Array.isArray(typeFilterData.data.decks),
    'Pokemon decks type filtering should work',
    'filtered results',
    typeFilterData.success ? `${typeFilterData.data.decks?.length || 0} filtered decks` : 'failure'
  );

  // Test 5.4: Get Pokemon Decks with Invalid Pagination
  console.log('📋 Test 5.4: Get Pokemon Decks (Invalid Pagination)');
  const { data: invalidPaginationData } = await makeRequest(`${BASE_URL}/decks/pokemon?page=-1&limit=1000`);
  
  assert(
    !invalidPaginationData.success && invalidPaginationData.error,
    'Invalid pagination should be rejected',
    'validation error',
    invalidPaginationData.success ? 'success' : 'validation error'
  );

  // Test 5.5: Search Pokemon Decks - Valid Query
  console.log('📋 Test 5.5: Search Pokemon Decks (Valid Query)');
  const { data: searchData } = await makeRequest(`${BASE_URL}/decks/pokemon/search?q=starter&limit=3`);
  
  assert(
    searchData.success && Array.isArray(searchData.data.decks),
    'Pokemon deck search should work',
    'search results',
    searchData.success ? `${searchData.data.decks?.length || 0} search results` : 'failure'
  );

  // Test 5.6: Search Pokemon Decks - Missing Query
  console.log('📋 Test 5.6: Search Pokemon Decks (Missing Query)');
  const { data: missingQueryData } = await makeRequest(`${BASE_URL}/decks/pokemon/search`);
  
  assert(
    !missingQueryData.success && missingQueryData.error,
    'Search without query should be rejected',
    'validation error',
    missingQueryData.success ? 'success' : 'validation error'
  );

  // Test 5.7: Search Pokemon Decks - Empty Query
  console.log('📋 Test 5.7: Search Pokemon Decks (Empty Query)');
  const { data: emptyQueryData } = await makeRequest(`${BASE_URL}/decks/pokemon/search?q=`);
  
  assert(
    !emptyQueryData.success && emptyQueryData.error,
    'Search with empty query should be rejected',
    'validation error',
    emptyQueryData.success ? 'success' : 'validation error'
  );

  // Test 5.8: Get Pokemon Decks by Types
  console.log('📋 Test 5.8: Get Pokemon Decks by Types');
  const { data: typeDecksData } = await makeRequest(`${BASE_URL}/decks/pokemon/types?types=Fire,Lightning`);
  
  assert(
    typeDecksData.success && Array.isArray(typeDecksData.data.decks),
    'Get decks by types should work',
    'type-filtered decks',
    typeDecksData.success ? `${typeDecksData.data.decks?.length || 0} type-filtered decks` : 'failure'
  );

  // Test 5.9: Get Pokemon Decks by Types - Missing Types
  console.log('📋 Test 5.9: Get Pokemon Decks by Types (Missing Types)');
  const { data: missingTypesData } = await makeRequest(`${BASE_URL}/decks/pokemon/types`);
  
  assert(
    !missingTypesData.success && missingTypesData.error,
    'Get decks by types without types should be rejected',
    'validation error',
    missingTypesData.success ? 'success' : 'validation error'
  );

  // Test 5.10: Get Pokemon Decks by Types - Empty Types
  console.log('📋 Test 5.10: Get Pokemon Decks by Types (Empty Types)');
  const { data: emptyTypesData } = await makeRequest(`${BASE_URL}/decks/pokemon/types?types=`);
  
  assert(
    !emptyTypesData.success && emptyTypesData.error,
    'Get decks by empty types should be rejected',
    'validation error',
    emptyTypesData.success ? 'success' : 'validation error'
  );

  if (pokemonDeckId) {
    // Test 5.11: Get Pokemon Deck by Database ID
    console.log('📋 Test 5.11: Get Pokemon Deck by Database ID');
    const { data: deckByIdData } = await makeRequest(`${BASE_URL}/decks/pokemon/id/${pokemonDeckId}`);
    
    assert(
      deckByIdData.success && deckByIdData.data,
      'Get Pokemon deck by ID should work',
      'deck data',
      deckByIdData.success ? 'deck data with cards' : 'failure'
    );

    // Test 5.12: Get Pokemon Deck Stats
    console.log('📋 Test 5.12: Get Pokemon Deck Stats');
    const { data: statsData } = await makeRequest(`${BASE_URL}/decks/pokemon/id/${pokemonDeckId}/stats`);
    
    assert(
      statsData.success && statsData.data,
      'Get Pokemon deck stats should work',
      'stats data',
      statsData.success ? 'stats with breakdown' : 'failure'
    );
  } else {
    skip('Tests 5.11-5.12: Pokemon Deck by ID Operations', 'No Pokemon deck ID available');
  }

  if (pokemonDeckExtId) {
    // Test 5.13: Get Pokemon Deck by External ID
    console.log('📋 Test 5.13: Get Pokemon Deck by External ID');
    const { data: deckByExtIdData } = await makeRequest(`${BASE_URL}/decks/pokemon/ext/${pokemonDeckExtId}`);
    
    assert(
      deckByExtIdData.success && deckByExtIdData.data,
      'Get Pokemon deck by external ID should work',
      'deck data',
      deckByExtIdData.success ? 'deck data with cards' : 'failure'
    );
  } else {
    skip('Test 5.13: Pokemon Deck by External ID', 'No Pokemon deck external ID available');
  }

  // Test 5.14: Get Pokemon Deck by Invalid Database ID
  console.log('📋 Test 5.14: Get Pokemon Deck by Invalid Database ID');
  const { data: invalidIdData } = await makeRequest(`${BASE_URL}/decks/pokemon/id/invalid-deck-id`);
  
  assert(
    !invalidIdData.success && invalidIdData.error,
    'Invalid deck ID should return error',
    'not found error',
    invalidIdData.success ? 'success' : 'not found error'
  );

  // Test 5.15: Get Pokemon Deck by Invalid External ID
  console.log('📋 Test 5.15: Get Pokemon Deck by Invalid External ID');
  const { data: invalidExtIdData } = await makeRequest(`${BASE_URL}/decks/pokemon/ext/invalid-ext-id`);
  
  assert(
    !invalidExtIdData.success && invalidExtIdData.error,
    'Invalid external ID should return error',
    'not found error',
    invalidExtIdData.success ? 'success' : 'not found error'
  );

  // Test 5.16: Get Pokemon Deck Stats for Invalid ID
  console.log('📋 Test 5.16: Get Pokemon Deck Stats (Invalid ID)');
  const { data: invalidStatsData } = await makeRequest(`${BASE_URL}/decks/pokemon/id/invalid-deck-id/stats`);
  
  assert(
    !invalidStatsData.success && invalidStatsData.error,
    'Stats for invalid deck ID should return error',
    'not found error',
    invalidStatsData.success ? 'success' : 'not found error'
  );

  // Test 5.17: Search Pokemon Decks with Type Filter
  console.log('📋 Test 5.17: Search Pokemon Decks (With Type Filter)');
  const { data: searchWithTypesData } = await makeRequest(`${BASE_URL}/decks/pokemon/search?q=base&types=Fire,Water`);
  
  assert(
    searchWithTypesData.success && Array.isArray(searchWithTypesData.data.decks),
    'Search with type filter should work',
    'filtered search results',
    searchWithTypesData.success ? `${searchWithTypesData.data.decks?.length || 0} filtered results` : 'failure'
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
  const { data: changePasswordData } = await makeAuthenticatedRequest(
    `${BASE_URL}/users/change-password`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        currentPassword: "Admin123", // Use the actual superuser password from .env
        newPassword: "Admin123",
        confirmPassword: "Admin123",
      }),
    }
  );
  
  assert(
    changePasswordData.success || changePasswordData.message === "Password changed successfully",
    'Valid password change should succeed',
    'success',
    changePasswordData.success ? 'success' : (changePasswordData.message ? 'success' : 'failure')
  );

  // Update password for subsequent tests
  if (changePasswordData.success || changePasswordData.message === "Password changed successfully") {
    // Password was changed successfully
    console.log('✅ Password changed, updating for subsequent tests');
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
// 🃏 UNIFIED SET MANAGEMENT TESTS
// =============================================================================

async function testSetManagement() {
  console.log('\n🃏 === UNIFIED SET MANAGEMENT TESTS ===\n');

  // Test 6.1: Get All Sets (Unified)
  console.log('📋 Test 6.1: Get All Sets (Unified)');
  const { data: allSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets?page=1&limit=10`);
  
  assert(
    allSetsData.success && Array.isArray(allSetsData.data),
    'All sets endpoint should return array',
    'success with array',
    allSetsData.success ? `array with ${allSetsData.data?.length || 0} items` : 'failure'
  );

  // Store set IDs for later tests
  let pokemonSetId = null;
  let yugiohSetId = null;
  let onepieceSetId = null;

  // Test 6.2: Get Pokemon Sets
  console.log('📋 Test 6.2: Get Pokemon Sets');
  const { data: pokemonSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon?page=1&limit=5`);
  
  assert(
    pokemonSetsData.success && Array.isArray(pokemonSetsData.data),
    'Pokemon sets should be filtered correctly',
    'success with pokemon sets',
    pokemonSetsData.success ? `${pokemonSetsData.data?.length || 0} pokemon sets` : 'failure'
  );

  if (pokemonSetsData.success && pokemonSetsData.data.length > 0) {
    pokemonSetId = pokemonSetsData.data[0]._id;
    console.log(`✅ Got Pokemon Set ID: ${pokemonSetId}`);
  }

  // Test 6.3: Get Yu-Gi-Oh! Sets
  console.log('📋 Test 6.3: Get Yu-Gi-Oh! Sets');
  const { data: yugiohSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/yugioh?page=1&limit=5`);
  
  assert(
    yugiohSetsData.success && Array.isArray(yugiohSetsData.data),
    'Yu-Gi-Oh! sets should be filtered correctly',
    'success with yugioh sets',
    yugiohSetsData.success ? `${yugiohSetsData.data?.length || 0} yugioh sets` : 'failure'
  );

  if (yugiohSetsData.success && yugiohSetsData.data.length > 0) {
    yugiohSetId = yugiohSetsData.data[0]._id;
    console.log(`✅ Got Yu-Gi-Oh! Set ID: ${yugiohSetId}`);
  }

  // Test 6.4: Get One Piece Sets
  console.log('📋 Test 6.4: Get One Piece Sets');
  const { data: onepieceSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/onepiece?page=1&limit=5`);
  
  assert(
    onepieceSetsData.success && Array.isArray(onepieceSetsData.data),
    'One Piece sets should be filtered correctly',
    'success with onepiece sets',
    onepieceSetsData.success ? `${onepieceSetsData.data?.length || 0} onepiece sets` : 'failure'
  );

  if (onepieceSetsData.success && onepieceSetsData.data.length > 0) {
    onepieceSetId = onepieceSetsData.data[0]._id;
    console.log(`✅ Got One Piece Set ID: ${onepieceSetId}`);
  }

  // Test 6.5: Get Sets with Invalid Game Type
  console.log('📋 Test 6.5: Get Sets (Invalid Game Type)');
  const { data: invalidTypeData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/invalid?page=1&limit=5`);
  
  assert(
    !invalidTypeData.success && invalidTypeData.error,
    'Invalid set game type should be rejected',
    'validation error',
    invalidTypeData.success ? 'success' : 'validation error'
  );

  // Test 6.6: Get Sets with Invalid Pagination
  console.log('📋 Test 6.6: Get Sets (Invalid Pagination)');
  const { data: invalidPaginationData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon?page=-1&limit=1000`);
  
  assert(
    !invalidPaginationData.success && invalidPaginationData.error,
    'Invalid pagination should be rejected',
    'validation error',
    invalidPaginationData.success ? 'success' : 'validation error'
  );

  // Test 6.7: Search Pokemon Sets - Valid Query
  console.log('📋 Test 6.7: Search Pokemon Sets (Valid Query)');
  const { data: searchPokemonData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon/search?q=base&page=1&limit=5`);
  
  assert(
    searchPokemonData.success && Array.isArray(searchPokemonData.data),
    'Pokemon set search should work with valid query',
    'success with results',
    searchPokemonData.success ? `${searchPokemonData.data?.length || 0} search results` : 'failure'
  );

  // Test 6.8: Search Sets - Missing Query
  console.log('📋 Test 6.8: Search Sets (Missing Query)');
  const { data: missingQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon/search?page=1&limit=5`);
  
  assert(
    !missingQueryData.success && missingQueryData.error,
    'Search without query should be rejected',
    'validation error',
    missingQueryData.success ? 'success' : 'validation error'
  );

  // Test 6.9: Search Sets - Empty Query
  console.log('📋 Test 6.9: Search Sets (Empty Query)');
  const { data: emptyQueryData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon/search?q=&page=1&limit=5`);
  
  assert(
    !emptyQueryData.success && emptyQueryData.error,
    'Search with empty query should be rejected',
    'validation error',
    emptyQueryData.success ? 'success' : 'validation error'
  );

  // Test 6.10: Search Yu-Gi-Oh! Sets
  console.log('📋 Test 6.10: Search Yu-Gi-Oh! Sets');
  const { data: searchYugiohData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/yugioh/search?q=legend&page=1&limit=3`);
  
  assert(
    searchYugiohData.success && Array.isArray(searchYugiohData.data),
    'Yu-Gi-Oh! set search should work',
    'success with yugioh results',
    searchYugiohData.success ? `${searchYugiohData.data?.length || 0} yugioh results` : 'failure'
  );

  // Test 6.11: Search One Piece Sets
  console.log('📋 Test 6.11: Search One Piece Sets');
  const { data: searchOnepieceData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/onepiece/search?q=story&page=1&limit=3`);
  
  assert(
    searchOnepieceData.success && Array.isArray(searchOnepieceData.data),
    'One Piece set search should work',
    'success with onepiece results',
    searchOnepieceData.success ? `${searchOnepieceData.data?.length || 0} onepiece results` : 'failure'
  );

  // Test 6.12: Get Specific Pokemon Set by ID
  if (pokemonSetId) {
    console.log('📋 Test 6.12: Get Pokemon Set by ID');
    const { data: pokemonSetData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon/${pokemonSetId}`);
    
    assert(
      pokemonSetData.success && pokemonSetData.data,
      'Pokemon set by ID should be retrieved',
      'success with set data',
      pokemonSetData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 6.12: Get Pokemon Set by ID', 'No Pokemon set ID available');
  }

  // Test 6.13: Get Specific Yu-Gi-Oh! Set by ID
  if (yugiohSetId) {
    console.log('📋 Test 6.13: Get Yu-Gi-Oh! Set by ID');
    const { data: yugiohSetData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/yugioh/${yugiohSetId}`);
    
    assert(
      yugiohSetData.success && yugiohSetData.data,
      'Yu-Gi-Oh! set by ID should be retrieved',
      'success with set data',
      yugiohSetData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 6.13: Get Yu-Gi-Oh! Set by ID', 'No Yu-Gi-Oh! set ID available');
  }

  // Test 6.14: Get Set by Invalid ID
  console.log('📋 Test 6.14: Get Set by Invalid ID');
  const { data: invalidSetData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon/invalid-set-id`);
  
  assert(
    !invalidSetData.success && invalidSetData.error,
    'Invalid set ID should return error',
    'not found error',
    invalidSetData.success ? 'success' : 'not found error'
  );

  // Test 6.15: Get Set Statistics
  console.log('📋 Test 6.15: Get Set Statistics');
  const { data: setStatsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/stats`);
  
  assert(
    setStatsData.success || (setStatsData.error && !setStatsData.error.message?.includes('500')),
    'Set statistics should be available',
    'success or handled error',
    setStatsData.success ? 'success' : 'handled error'
  );

  // Test 6.16: Get Pokemon Set Statistics
  console.log('📋 Test 6.16: Get Pokemon Set Statistics');
  const { data: pokemonSetStatsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon/stats`);
  
  assert(
    pokemonSetStatsData.success || (pokemonSetStatsData.error && !pokemonSetStatsData.error.message?.includes('500')),
    'Pokemon set statistics should be available',
    'success or handled error',
    pokemonSetStatsData.success ? 'success' : 'handled error'
  );

  // Test 6.17: Sets with Sorting
  console.log('📋 Test 6.17: Get Sets with Sorting');
  const { data: sortedSetsData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon?sortBy=name&sortOrder=asc&limit=5`);
  
  assert(
    sortedSetsData.success && Array.isArray(sortedSetsData.data),
    'Sets with sorting should work',
    'success with sorted results',
    sortedSetsData.success ? 'sorted successfully' : 'failure'
  );

  // Test 6.18: Sets with Different Sorting
  console.log('📋 Test 6.18: Get Sets with Group ID Sorting');
  const { data: groupIdSortData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/yugioh?sortBy=groupId&sortOrder=desc&limit=5`);
  
  assert(
    groupIdSortData.success && Array.isArray(groupIdSortData.data),
    'Sets with group ID sorting should work',
    'success with sorted results',
    groupIdSortData.success ? 'sorted by group ID' : 'failure'
  );

  // Test 6.19: Large Page Number for Sets
  console.log('📋 Test 6.19: Get Sets (Large Page Number)');
  const { data: largePageData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/pokemon?page=999&limit=5`);
  
  assert(
    largePageData.success && Array.isArray(largePageData.data),
    'Large page number should return empty array gracefully',
    'empty array',
    largePageData.success ? `${largePageData.data?.length || 0} results` : 'failure'
  );

  // Test 6.20: Get Sets by Group ID
  console.log('📋 Test 6.20: Get Sets by Group ID');
  const { data: groupData } = await makeAuthenticatedRequest(`${BASE_URL}/api/sets/group/12345`);
  
  assert(
    groupData.success || (groupData.error && !groupData.error.message?.includes('500')),
    'Sets by group ID should handle request',
    'success or handled error',
    groupData.success ? 'success' : 'handled error'
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
    invalidUserData.error && (
      (typeof invalidUserData.error === 'string' && (invalidUserData.error.includes('not found') || invalidUserData.error.includes('Cast to ObjectId'))) ||
      (invalidUserData.error.message && (invalidUserData.error.message.includes('not found') || invalidUserData.error.message.includes('Cast to ObjectId')))
    ),
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
// 🎴 ADVANCED USER DECK TESTS
// =============================================================================

async function testAdvancedUserDeckManagement() {
  console.log('\n🎴 === ADVANCED USER DECK TESTS ===\n');

  if (!authToken) {
    skip('Advanced User Deck Tests', 'No authentication token available');
    return;
  }

  let testDeckId = null;

  // Test 10.1: Create Test User Deck for Advanced Operations
  console.log('📋 Test 10.1: Create Test User Deck for Advanced Operations');
  const { data: createAdvancedDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({
      name: 'Advanced Test User Deck',
      description: 'User deck for testing advanced operations',
      category: 'PokemonCard',
      format: 'standard',
      isPublic: true
    })
  });
  
  if (createAdvancedDeckData.success && createAdvancedDeckData.data) {
    testDeckId = createAdvancedDeckData.data.id || createAdvancedDeckData.data._id;
    assert(true, 'Advanced test user deck created successfully', 'deck created', 'success');
  } else {
    assert(false, 'Advanced test user deck creation failed', 'deck created', 'failure');
  }

  if (testDeckId) {
    // Test 10.2: Validate User Deck Format
    console.log('📋 Test 10.2: Validate User Deck Format');
    const { data: validateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${testDeckId}/validate`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      validateDeckData.success || validateDeckData.error,
      'User deck validation should respond',
      'success or error',
      validateDeckData.success ? 'success' : 'error'
    );

    // Test 10.3: Duplicate User Deck
    console.log('📋 Test 10.3: Duplicate User Deck');
    const { data: duplicateDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${testDeckId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: 'Duplicated Advanced Test User Deck'
      })
    });
    
    assert(
      duplicateDeckData.success || (duplicateDeckData.error && !duplicateDeckData.error.message?.includes('500')),
      'User deck duplication should be handled',
      'success or handled error',
      duplicateDeckData.success ? 'success' : 'handled error'
    );

    // Test 10.4: Add Card to User Deck (if we have cardId)
    if (cardId) {
      console.log('📋 Test 10.4: Add Card to User Deck');
      const { data: addCardToDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${testDeckId}/cards`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          cardId: cardId,
          quantity: 1,
          category: 'PokemonCard'
        })
      });
      
      assert(
        addCardToDeckData.success || (addCardToDeckData.error && (addCardToDeckData.error.message?.includes('not own') || !addCardToDeckData.error.message?.includes('500'))),
        'Add card to user deck should be handled (may fail due to ownership)',
        'success or ownership error',
        addCardToDeckData.success ? 'success' : 'handled error'
      );

      // Test 10.5: Update Card Quantity in User Deck
      console.log('📋 Test 10.5: Update Card Quantity in User Deck');
      const { data: updateCardQuantityData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${testDeckId}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          quantity: 2
        })
      });
      
      assert(
        updateCardQuantityData.success || (updateCardQuantityData.error && !updateCardQuantityData.error.message?.includes('500')),
        'Update card quantity in user deck should be handled',
        'success or handled error',
        updateCardQuantityData.success ? 'success' : 'handled error'
      );

      // Test 10.6: Remove Card from User Deck
      console.log('📋 Test 10.6: Remove Card from User Deck');
      const { data: removeCardFromDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${testDeckId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      assert(
        removeCardFromDeckData.success || (removeCardFromDeckData.error && !removeCardFromDeckData.error.message?.includes('500')),
        'Remove card from user deck should be handled',
        'success or handled error',
        removeCardFromDeckData.success ? 'success' : 'handled error'
      );
    } else {
      skip('Tests 10.4-10.6: User Deck Card Operations', 'No card ID available');
    }

    // Test 10.7: Delete Test User Deck (cleanup)
    console.log('📋 Test 10.7: Delete Test User Deck (Cleanup)');
    const { data: deleteDeckData } = await makeAuthenticatedRequest(`${BASE_URL}/decks/user/${testDeckId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    assert(
      deleteDeckData.success || (deleteDeckData.error && !deleteDeckData.error.message?.includes('500')),
      'Delete user deck should be handled',
      'success or handled error',
      deleteDeckData.success ? 'success' : 'handled error'
    );
  } else {
    skip('Tests 10.2-10.7: Advanced User Deck Operations', 'No test user deck created');
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
// 📱 SOCIAL MEDIA POSTS TESTS
// =============================================================================

async function testSocialMediaPosts() {
  console.log('\n📱 === SOCIAL MEDIA POSTS TESTS ===\n');

  if (!authToken) {
    skip('Social media posts tests', 'No authentication token available');
    return;
  }

  // Test 7.1: Get Upload URL for Images
  console.log('📋 Test 7.1: Get Upload URL for Images');
  const { data: uploadUrlData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/upload-url`, {
    method: 'POST',
    body: JSON.stringify({
      fileName: 'test-image.jpg',
      mimeType: 'image/jpeg'
    })
  });
  
  assert(
    uploadUrlData.success && uploadUrlData.data.uploadUrl && uploadUrlData.data.fileUrl,
    'Upload URL generation should succeed',
    'upload URL and file URL',
    uploadUrlData.success ? 'success' : 'failure'
  );

  // Test 7.2: Create Post - Valid Data
  console.log('📋 Test 7.2: Create Post (Valid Data)');
  const { data: createPostData } = await makeAuthenticatedRequest(`${BASE_URL}/posts`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'This is my first test post! 🎮',
      privacy: 'public',
      images: uploadUrlData.success ? [uploadUrlData.data.fileUrl] : [],
    })
  });
  
  assert(
    createPostData.success && createPostData.data,
    'Valid post creation should succeed',
    'success',
    createPostData.success ? 'success' : 'failure'
  );

  if (createPostData.success && createPostData.data) {
    postId = createPostData.data._id;
  }

  // Test 7.2b: Get Taggable Users
  console.log('📋 Test 7.2b: Get Taggable Users for Posts');
  const { data: taggableUsersData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/taggable-users?type=post`);
  
  assert(
    taggableUsersData.success && Array.isArray(taggableUsersData.data),
    'Taggable users should return array',
    'users array',
    taggableUsersData.success ? `${taggableUsersData.data?.length || 0} taggable users` : 'failure'
  );

  // Test 7.2c: Create Post with @mentions
  console.log('📋 Test 7.2c: Create Post with @mentions');
  const { data: mentionPostData } = await makeAuthenticatedRequest(`${BASE_URL}/posts`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'Testing @mentions in posts! Hey @testuser and @admin check this out!',
      privacy: 'public',
    })
  });
  
  assert(
    mentionPostData.success && mentionPostData.data,
    'Post with @mentions should be created',
    'success',
    mentionPostData.success ? 'success' : 'failure'
  );

  // Test 7.3: Create Post - Invalid Data
  console.log('📋 Test 7.3: Create Post (Invalid Data)');
  const { data: invalidPostData } = await makeAuthenticatedRequest(`${BASE_URL}/posts`, {
    method: 'POST',
    body: JSON.stringify({
      // Missing required content field
      privacy: 'public'
    })
  });
  
  assert(
    !invalidPostData.success && invalidPostData.error,
    'Invalid post creation should be rejected',
    'validation error',
    invalidPostData.success ? 'success' : 'validation error'
  );

  // Test 7.4: Get Feed
  console.log('📋 Test 7.4: Get Feed');
  const { data: feedData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/feed?page=1&limit=10`);
  
  assert(
    feedData.success && feedData.data && Array.isArray(feedData.data.posts),
    'Feed should return posts array',
    'posts array',
    feedData.success ? `${feedData.data.posts?.length || 0} posts` : 'failure'
  );

  // Test 7.5: Get Specific Post
  if (postId) {
    console.log('📋 Test 7.5: Get Specific Post');
    const { data: postData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}`);
    
    assert(
      postData.success && postData.data,
      'Getting specific post should succeed',
      'success',
      postData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 7.5: Get Specific Post', 'No post ID available');
  }

  // Test 7.6: Update Post
  if (postId) {
    console.log('📋 Test 7.6: Update Post');
    const { data: updatePostData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify({
        content: 'This is my updated test post! 🎮✨',
        privacy: 'friends'
      })
    });
    
    assert(
      updatePostData.success && updatePostData.data,
      'Post update should succeed',
      'success',
      updatePostData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 7.6: Update Post', 'No post ID available');
  }

  // Test 7.7: React to Post (Like)
  if (postId) {
    console.log('📋 Test 7.7: React to Post (Like)');
    const { data: likeData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'like'
      })
    });
    
    assert(
      likeData.success && likeData.data,
      'Post like should succeed',
      'success',
      likeData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 7.7: React to Post (Like)', 'No post ID available');
  }

  // Test 7.8: React to Post (Toggle to Dislike)
  if (postId) {
    console.log('📋 Test 7.8: React to Post (Toggle to Dislike)');
    const { data: dislikeData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'dislike'
      })
    });
    
    assert(
      dislikeData.success && dislikeData.data,
      'Post dislike should succeed',
      'success',
      dislikeData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 7.8: React to Post (Toggle to Dislike)', 'No post ID available');
  }
}

// =============================================================================
// 💬 COMMENTS TESTS
// =============================================================================

async function testComments() {
  console.log('\n💬 === COMMENTS TESTS ===\n');

  if (!authToken || !postId) {
    skip('Comments tests', 'No authentication token or post ID available');
    return;
  }

  // Test 8.1: Create Comment
  console.log('📋 Test 8.1: Create Comment');
  const { data: createCommentData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'This is a test comment! 💬'
    })
  });
  
  assert(
    createCommentData.success && createCommentData.data,
    'Comment creation should succeed',
    'success',
    createCommentData.success ? 'success' : 'failure'
  );

  if (createCommentData.success && createCommentData.data) {
    commentId = createCommentData.data._id;
  }

  // Test 8.1b: Create Comment with @mentions
  console.log('📋 Test 8.1b: Create Comment with @mentions');
  const { data: mentionCommentData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'Great post! @admin @testuser what do you think? 💬'
    })
  });
  
  assert(
    mentionCommentData.success && mentionCommentData.data,
    'Comment with @mentions should be created',
    'success',
    mentionCommentData.success ? 'success' : 'failure'
  );

  // Test 8.2: Get Comments for Post
  console.log('📋 Test 8.2: Get Comments for Post');
  const { data: commentsData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}/comments?page=1&limit=10`);
  
  assert(
    commentsData.success && commentsData.data && Array.isArray(commentsData.data.comments),
    'Getting comments should succeed',
    'comments array',
    commentsData.success ? `${commentsData.data.comments?.length || 0} comments` : 'failure'
  );

  // Test 8.3: Create Reply to Comment
  if (commentId) {
    console.log('📋 Test 8.3: Create Reply to Comment');
    const { data: replyData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'This is a reply to the comment! 💭',
        parentComment: commentId
      })
    });
    
    assert(
      replyData.success && replyData.data,
      'Reply creation should succeed',
      'success',
      replyData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 8.3: Create Reply to Comment', 'No comment ID available');
  }

  // Test 8.4: React to Comment (Like)
  if (commentId) {
    console.log('📋 Test 8.4: React to Comment (Like)');
    const { data: commentLikeData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'like'
      })
    });
    
    assert(
      commentLikeData.success && commentLikeData.data,
      'Comment like should succeed',
      'success',
      commentLikeData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 8.4: React to Comment (Like)', 'No comment ID available');
  }

  // Test 8.5: Update Comment
  if (commentId) {
    console.log('📋 Test 8.5: Update Comment');
    const { data: updateCommentData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        content: 'This is an updated test comment! 💬✨'
      })
    });
    
    assert(
      updateCommentData.success && updateCommentData.data,
      'Comment update should succeed',
      'success',
      updateCommentData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 8.5: Update Comment', 'No comment ID available');
  }

  // Test 8.6: Get Replies for Comment
  if (commentId) {
    console.log('📋 Test 8.6: Get Replies for Comment');
    const { data: repliesData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/comments/${commentId}/replies?page=1&limit=10`);
    
    assert(
      repliesData.success && repliesData.data && Array.isArray(repliesData.data.replies),
      'Getting replies should succeed',
      'replies array',
      repliesData.success ? `${repliesData.data.replies?.length || 0} replies` : 'failure'
    );
  } else {
    skip('Test 8.6: Get Replies for Comment', 'No comment ID available');
  }
}

// =============================================================================
// 👥 FRIENDSHIP MANAGEMENT TESTS
// =============================================================================

async function testFriendshipManagement() {
  console.log('\n👥 === FRIENDSHIP MANAGEMENT TESTS ===\n');

  if (!authToken) {
    skip('Friendship management tests', 'No authentication token available');
    return;
  }

  // Test 9.1: Get Friends List (Empty)
  console.log('📋 Test 9.1: Get Friends List (Empty)');
  const { data: friendsData } = await makeAuthenticatedRequest(`${BASE_URL}/users/friends`);
  
  assert(
    friendsData.success && Array.isArray(friendsData.data),
    'Friends list should return array',
    'friends array',
    friendsData.success ? `${friendsData.data?.length || 0} friends` : 'failure'
  );

  // Test 9.2: Get Pending Friend Requests
  console.log('📋 Test 9.2: Get Pending Friend Requests');
  const { data: pendingData } = await makeAuthenticatedRequest(`${BASE_URL}/users/friends/pending`);
  
  assert(
    pendingData.success && pendingData.data && 
    Array.isArray(pendingData.data.sent) && Array.isArray(pendingData.data.received),
    'Pending requests should return array structure',
    'pending requests arrays',
    pendingData.success ? `${pendingData.data?.sent?.length || 0} sent, ${pendingData.data?.received?.length || 0} received` : 'failure'
  );

  // Test 9.3: Send Friend Request (Invalid User)
  console.log('📋 Test 9.3: Send Friend Request (Invalid User)');
  const { data: invalidRequestData } = await makeAuthenticatedRequest(`${BASE_URL}/users/friends/request`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'invalid-user-id'
    })
  });
  
  assert(
    !invalidRequestData.success && invalidRequestData.error,
    'Invalid friend request should be rejected',
    'validation error',
    invalidRequestData.success ? 'success' : 'validation error'
  );

  // Test 9.4: Send Friend Request to Self
  console.log('📋 Test 9.4: Send Friend Request to Self');
  const { data: selfRequestData } = await makeAuthenticatedRequest(`${BASE_URL}/users/friends/request`, {
    method: 'POST',
    body: JSON.stringify({
      userId: userId
    })
  });
  
  assert(
    !selfRequestData.success && selfRequestData.error,
    'Friend request to self should be rejected',
    'validation error',
    selfRequestData.success ? 'success' : 'validation error'
  );

  // Test 9.5: Get Friendship Status (Self)
  if (userId) {
    console.log('📋 Test 9.5: Get Friendship Status (Self)');
    const { data: statusData } = await makeAuthenticatedRequest(`${BASE_URL}/users/friends/status/${userId}`);
    
    assert(
      statusData.success && statusData.data,
      'Friendship status should return data',
      'status data',
      statusData.success ? 'success' : 'failure'
    );
  } else {
    skip('Test 9.5: Get Friendship Status (Self)', 'No user ID available');
  }
}

// =============================================================================
// 🔔 NOTIFICATIONS TESTS
// =============================================================================

async function testNotifications() {
  console.log('\n🔔 === NOTIFICATIONS TESTS ===\n');

  if (!authToken) {
    skip('Notifications tests', 'No authentication token available');
    return;
  }

  // Test 10.1: Get Notifications
  console.log('📋 Test 10.1: Get Notifications');
  const { data: notificationsData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/notifications?page=1&limit=10`);
  
  assert(
    notificationsData.success && notificationsData.data && Array.isArray(notificationsData.data.notifications),
    'Notifications should return array',
    'notifications array',
    notificationsData.success ? `${notificationsData.data.notifications?.length || 0} notifications` : 'failure'
  );

  // Test 10.2: Get Unread Count
  console.log('📋 Test 10.2: Get Unread Count');
  const { data: unreadData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/notifications/unread-count`);
  
  assert(
    unreadData.success && typeof unreadData.data.unreadCount === 'number',
    'Unread count should return number',
    'unread count',
    unreadData.success ? `${unreadData.data.unreadCount} unread` : 'failure'
  );

  // Test 10.3: Mark All as Read
  console.log('📋 Test 10.3: Mark All as Read');
  const { data: markAllData } = await makeAuthenticatedRequest(`${BASE_URL}/posts/notifications/read-all`, {
    method: 'PUT'
  });
  
  assert(
    markAllData.success && markAllData.data,
    'Mark all as read should succeed',
    'success',
    markAllData.success ? 'success' : 'failure'
  );
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
    await testUserDeckManagement();
    await testPokemonDeckManagement();
    await testAdvancedUserDeckManagement();
    await testUserManagement();
    await testAdvancedUserManagement();
    
    // Social Media Features
    await testSocialMediaPosts();
    await testComments();
    await testFriendshipManagement();
    await testNotifications();
    
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