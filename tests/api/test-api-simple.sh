#!/bin/bash

# Simple curl-based API testing script
# Usage: ./test-api-simple.sh

BASE_URL="http://localhost:3000"

echo "🚀 Starting Simple API Tests"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to make HTTP requests with curl
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    
    echo -e "\n${BLUE}🌐 $method $BASE_URL$endpoint${NC}"
    
    if [ "$method" = "GET" ]; then
        if [ -n "$auth_header" ]; then
            curl -s -w "\n📊 Status: %{http_code}\n" -H "Content-Type: application/json" -H "$auth_header" "$BASE_URL$endpoint" | jq '.' 2>/dev/null || curl -s -w "\n📊 Status: %{http_code}\n" -H "Content-Type: application/json" -H "$auth_header" "$BASE_URL$endpoint"
        else
            curl -s -w "\n📊 Status: %{http_code}\n" -H "Content-Type: application/json" "$BASE_URL$endpoint" | jq '.' 2>/dev/null || curl -s -w "\n📊 Status: %{http_code}\n" -H "Content-Type: application/json" "$BASE_URL$endpoint"
        fi
    else
        if [ -n "$auth_header" ]; then
            curl -s -w "\n📊 Status: %{http_code}\n" -X "$method" -H "Content-Type: application/json" -H "$auth_header" -d "$data" "$BASE_URL$endpoint" | jq '.' 2>/dev/null || curl -s -w "\n📊 Status: %{http_code}\n" -X "$method" -H "Content-Type: application/json" -H "$auth_header" -d "$data" "$BASE_URL$endpoint"
        else
            curl -s -w "\n📊 Status: %{http_code}\n" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" | jq '.' 2>/dev/null || curl -s -w "\n📊 Status: %{http_code}\n" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint"
        fi
    fi
}

# Test 1: Register a user
echo -e "${YELLOW}📋 Test 1: User Registration${NC}"
make_request "POST" "/auth/register" '{
  "email": "testuser@example.com",
  "password": "TestPassword123!",
  "name": "Test User"
}'

# Test 2: Login user
echo -e "${YELLOW}📋 Test 2: User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{
  "email": "testuser@example.com",
  "password": "TestPassword123!"
}' "$BASE_URL/auth/login")

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token (if jq is available)
if command -v jq &> /dev/null; then
    AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')
    if [ -n "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
        echo -e "${GREEN}✅ Token extracted: ${AUTH_TOKEN:0:20}...${NC}"
        AUTH_HEADER="Authorization: Bearer $AUTH_TOKEN"
    else
        echo -e "${RED}❌ Failed to extract token${NC}"
        AUTH_HEADER=""
    fi
else
    echo -e "${YELLOW}⚠️ jq not available, manual token extraction needed${NC}"
    AUTH_HEADER=""
fi

# Test 3: Get Pokemon cards
echo -e "${YELLOW}📋 Test 3: Get Pokemon Cards${NC}"
make_request "GET" "/cards/pokemon?page=1&limit=5"

# Test 4: Get Yugioh cards
echo -e "${YELLOW}📋 Test 4: Get Yugioh Cards${NC}"
make_request "GET" "/cards/yugioh?page=1&limit=5"

# Test 5: Search Pokemon cards
echo -e "${YELLOW}📋 Test 5: Search Pokemon Cards${NC}"
make_request "GET" "/cards/pokemon/search?q=Pikachu&limit=3"

# Test 6: Get user profile (if authenticated)
if [ -n "$AUTH_HEADER" ]; then
    echo -e "${YELLOW}📋 Test 6: Get User Profile${NC}"
    make_request "GET" "/users/profile" "" "$AUTH_HEADER"
    
    echo -e "${YELLOW}📋 Test 7: Get User Cards${NC}"
    make_request "GET" "/user-cards?page=1&limit=5" "" "$AUTH_HEADER"
    
    echo -e "${YELLOW}📋 Test 8: Create Deck${NC}"
    make_request "POST" "/decks" '{
      "name": "Test Deck",
      "description": "Test deck from script",
      "cardType": "pokemon",
      "isPublic": false
    }' "$AUTH_HEADER"
    
    echo -e "${YELLOW}📋 Test 9: Get User Decks${NC}"
    make_request "GET" "/decks?page=1&limit=5" "" "$AUTH_HEADER"
else
    echo -e "${YELLOW}📋 Skipping authenticated tests (no token)${NC}"
fi

# Test error handling
echo -e "${YELLOW}📋 Test 10: Error Handling${NC}"
echo -e "${BLUE}Testing invalid card type:${NC}"
make_request "GET" "/cards/invalid-type"

echo -e "${BLUE}Testing search without query:${NC}"
make_request "GET" "/cards/pokemon/search"

echo -e "\n${GREEN}🎉 All tests completed!${NC}"