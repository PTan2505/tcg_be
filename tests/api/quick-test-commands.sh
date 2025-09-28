# Quick Manual Testing Commands
# Copy and paste these commands in your terminal

# Make sure the server is running first:
# bun run dev

BASE_URL="http://localhost:3000"

echo "🚀 Quick API Tests - Copy these commands:"
echo "========================================"

echo ""
echo "1️⃣ Register a test user:"
echo 'curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "email": "testuser@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'"'"' | jq '"'"'.'"'"

echo ""
echo "2️⃣ Login and get token:"
echo 'TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '"'"'{
    "email": "testuser@example.com",
    "password": "TestPassword123!"
  }'"'"' | jq -r '"'"'.data.accessToken'"'"')
echo "Token: $TOKEN"'

echo ""
echo "3️⃣ Get Pokemon cards (first 5):"
echo 'curl "$BASE_URL/cards/pokemon?page=1&limit=5" | jq '"'"'.'"'"

echo ""
echo "4️⃣ Get Yugioh cards (first 5):"
echo 'curl "$BASE_URL/cards/yugioh?page=1&limit=5" | jq '"'"'.'"'"

echo ""
echo "5️⃣ Search for Pikachu cards:"
echo 'curl "$BASE_URL/cards/pokemon/search?q=Pikachu&limit=3" | jq '"'"'.'"'"

echo ""
echo "6️⃣ Get user profile (requires token):"
echo 'curl "$BASE_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '"'"'.'"'"

echo ""
echo "7️⃣ Get user card collection:"
echo 'curl "$BASE_URL/user-cards?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '"'"'.'"'"

echo ""
echo "8️⃣ Create a deck:"
echo 'curl -X POST "$BASE_URL/decks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '"'"'{
    "name": "My Test Deck",
    "description": "A deck for testing",
    "cardType": "pokemon",
    "isPublic": false
  }'"'"' | jq '"'"'.'"'"

echo ""
echo "9️⃣ Get user decks:"
echo 'curl "$BASE_URL/decks?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '"'"'.'"'"

echo ""
echo "🔟 Test error handling:"
echo 'curl "$BASE_URL/cards/invalid-type" | jq '"'"'.'"'"

echo ""
echo "📊 API Documentation:"
echo 'curl "$BASE_URL/swagger.json" | jq '"'"'.'"'"

echo ""
echo "🌐 Or visit: http://localhost:3000/docs for interactive API docs"