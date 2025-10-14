#!/usr/bin/env bash
# Test freemium limits and feature blocks against a running local server
# Usage:
#   TOKEN="<jwt>" BASE="http://localhost:3000" SCAN_IMAGE=./test-image.jpg ./scripts/testFreemium.sh
# If SCAN_IMAGE is not provided, scan tests will be skipped.

set -euo pipefail

TOKEN=${TOKEN:-"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGVlMjk4ZjMwMzkzM2Q4M2M1MTBhZGMiLCJpYXQiOjE3NjA0Mzg3MDYsImV4cCI6MTc2MDUyNTEwNn0.8jT-NEvim4Kk33N4XPXdU3ZKTkU-jhGUUJEdlT3gPzw"}
BASE=${BASE:-http://localhost:3000}
SCAN_IMAGE=${SCAN_IMAGE:-}

AUTH_HEADER=( -H "Authorization: Bearer $TOKEN" )
JSON_HEADER=( -H "Content-Type: application/json" )

echo "Using BASE=$BASE"

# Helper to run curl and pretty-print status + body
run_req() {
  local method=$1; shift
  local url=$1; shift
  local bodyOpt=()
  if [[ "$method" == "POST" || "$method" == "PATCH" || "$method" == "PUT" ]]; then
    bodyOpt=("-d" "$@")
  fi

  echo -e "\n==> $method $url"
  if [[ ${#bodyOpt[@]} -gt 0 ]]; then
    echo "Payload: ${bodyOpt[1]}"
  fi

  # Capture status and body
  response=$(curl -s -w "\n--STATUS:%{http_code}" -X "$method" "$url" "${AUTH_HEADER[@]}" "${JSON_HEADER[@]}" "${bodyOpt[@]}") || true
  body=$(echo "$response" | sed -n '1,${p}')
  status=$(echo "$response" | awk -F"--STATUS:" '{print $2}')

  echo "HTTP $status"
  echo "$body" | jq -C . 2>/dev/null || echo "$body"
}

# Deck tests (freemium limit: 3)
echo "=== Deck creation test (expect success for first 3, 4th should be blocked) ==="
for i in 1 2 3 4; do
  payload=$(jq -n --arg name "Test Deck $i" '{name:$name, gameType:"pokemon", cards:[]}')
  echo "Creating deck #$i"
  # Legacy route for deck creation is /decks/user
  run_req POST "$BASE/decks/user" "$payload"
done

# Scan tests (freemium limit: 10)
if [[ -n "$SCAN_IMAGE" && -f "$SCAN_IMAGE" ]]; then
  echo "\n=== Enhanced scan test (10 allowed, 11th should be blocked) ==="
  for i in $(seq 1 11); do
    echo "Scan attempt #$i"
    # Use multipart form for scan endpoint
  response=$(curl -s -w "\n--STATUS:%{http_code}" -X POST "$BASE/cards/scan/enhanced" -H "Authorization: Bearer $TOKEN" -F "image=@$SCAN_IMAGE" -F "gameType=pokemon") || true
    body=$(echo "$response" | sed -n '1,${p}')
    status=$(echo "$response" | awk -F"--STATUS:" '{print $2}')
    echo "HTTP $status"
    echo "$body" | jq -C . 2>/dev/null || echo "$body"
  done
else
  echo "\n=== Skipping scan tests: SCAN_IMAGE not provided or file not found. Set SCAN_IMAGE=./test-image.jpg to run scans ==="
fi

# Collection test (freemium limit: 30 per game)
# Legacy collections route is mounted at /collections and accepts { gameType, cardId } on POST /
COLLECTION_URL="$BASE/collections"
if curl -s --head "$COLLECTION_URL" >/dev/null 2>&1; then
  echo "\n=== Collection add test (30 allowed, 31st blocked) ==="
  for i in $(seq 1 31); do
    cardId="test-card-$(date +%s)-$i"
    payload=$(jq -n --arg g "pokemon" --arg id "$cardId" '{gameType:$g, cardId:$id}')
    echo "Adding card #$i -> $cardId"
    run_req POST "$COLLECTION_URL" "$payload"
  done
else
  echo "\n=== Skipping collection tests: $COLLECTION_URL not reachable. Adjust COLLECTION_URL if your API differs ==="
fi

# Market listing test (should be blocked for freemium)
echo "\n=== Market listing test (freemium should be blocked) ==="
# Legacy market listings endpoint is POST /market
marketPayload=$(jq -n '{gameType:"pokemon", cardName:"Test Rare Card", priceTokens:100, images:[]}')
run_req POST "$BASE/market" "$marketPayload"

# Social tests: friend request, create post
echo "\n=== Social features (should be blocked for freemium) ==="
# Friend request (sendFriendRequestSchema expects { userId })
# Legacy users route is mounted at /users
friendPayload=$(jq -n --arg r "68e266ad4856ba30f08c1588" '{userId:$r}')
run_req POST "$BASE/users/friends/request" "$friendPayload"

# Create post
postPayload=$(jq -n --arg c "Hello from freemium test" '{content:$c}')
run_req POST "$BASE/posts" "$postPayload"

echo "\n=== Test script finished ==="

exit 0
