# API Testing with Python requests
# Requirements: pip install requests

import json
import sys

import requests

BASE_URL = "http://localhost:3000"


class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'


def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request and print formatted response"""
    url = f"{BASE_URL}{endpoint}"

    print(f"\n{Colors.BLUE}🌐 {method} {url}{Colors.END}")

    try:
        if headers is None:
            headers = {"Content-Type": "application/json"}

        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            print(f"{Colors.RED}❌ Unsupported method: {method}{Colors.END}")
            return None, None

        print(f"📊 Status: {response.status_code}")

        try:
            response_data = response.json()
            print(f"📝 Response: {json.dumps(response_data, indent=2)}")
            return response, response_data
        except json.JSONDecodeError:
            print(f"📝 Response: {response.text}")
            return response, None

    except requests.exceptions.RequestException as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.END}")
        return None, None


def main():
    print(f"{Colors.YELLOW}🚀 Starting Python API Tests{Colors.END}")
    print("=" * 40)

    # Test data
    test_user = {
        "email": "testuser@example.com",
        "password": "TestPassword123!",
        "name": "Test User"
    }

    auth_token = None
    card_id = None

    # Test 1: Register user
    print(f"\n{Colors.YELLOW}📋 Test 1: User Registration{Colors.END}")
    response, data = make_request("POST", "/auth/register", test_user)

    # Test 2: Login user
    print(f"\n{Colors.YELLOW}📋 Test 2: User Login{Colors.END}")
    login_data = {
        "email": test_user["email"],
        "password": test_user["password"]
    }
    response, data = make_request("POST", "/auth/login", login_data)

    if data and data.get("success") and "accessToken" in data.get("data", {}):
        auth_token = data["data"]["accessToken"]
        print(f"{Colors.GREEN}✅ Authentication token acquired{Colors.END}")

    # Test 3: Get Pokemon cards
    print(f"\n{Colors.YELLOW}📋 Test 3: Get Pokemon Cards{Colors.END}")
    response, data = make_request("GET", "/cards/pokemon?page=1&limit=5")

    if data and data.get("success") and data.get("data"):
        cards = data["data"]
        if cards:
            card_id = cards[0].get("_id")
            print(f"{Colors.GREEN}✅ Found {len(cards)} Pokemon cards{Colors.END}")

    # Test 4: Get Yugioh cards
    print(f"\n{Colors.YELLOW}📋 Test 4: Get Yugioh Cards{Colors.END}")
    make_request("GET", "/cards/yugioh?page=1&limit=5")

    # Test 5: Search Pokemon cards
    print(f"\n{Colors.YELLOW}📋 Test 5: Search Pokemon Cards{Colors.END}")
    make_request("GET", "/cards/pokemon/search?q=Pikachu&limit=3")

    # Test 6: Get card by ID (if available)
    if card_id:
        print(f"\n{Colors.YELLOW}📋 Test 6: Get Card by ID{Colors.END}")
        make_request("GET", f"/cards/pokemon/{card_id}")
    else:
        print(f"\n{Colors.YELLOW}📋 Test 6: Get Card by ID - Skipped (no card ID){Colors.END}")

    # Authenticated tests
    if auth_token:
        auth_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        }

        # Test 7: Get user profile
        print(f"\n{Colors.YELLOW}📋 Test 7: Get User Profile{Colors.END}")
        make_request("GET", "/users/profile", headers=auth_headers)

        # Test 8: Add card to collection (if card_id available)
        if card_id:
            print(f"\n{Colors.YELLOW}📋 Test 8: Add Card to Collection{Colors.END}")
            card_data = {
                "cardId": card_id,
                "cardType": "pokemon",
                "quantity": 1
            }
            make_request("POST", "/user-cards", card_data, auth_headers)

        # Test 9: Get user cards
        print(f"\n{Colors.YELLOW}📋 Test 9: Get User Cards{Colors.END}")
        make_request("GET", "/user-cards?page=1&limit=5", headers=auth_headers)

        # Test 10: Create deck
        print(f"\n{Colors.YELLOW}📋 Test 10: Create Deck{Colors.END}")
        deck_data = {
            "name": "Test Deck",
            "description": "Test deck from Python script",
            "cardType": "pokemon",
            "isPublic": False
        }
        make_request("POST", "/decks", deck_data, auth_headers)

        # Test 11: Get user decks
        print(f"\n{Colors.YELLOW}📋 Test 11: Get User Decks{Colors.END}")
        make_request("GET", "/decks?page=1&limit=5", headers=auth_headers)

    else:
        print(f"\n{Colors.YELLOW}📋 Skipping authenticated tests (no token){Colors.END}")

    # Test 12: Error handling
    print(f"\n{Colors.YELLOW}📋 Test 12: Error Handling{Colors.END}")
    make_request("GET", "/cards/invalid-type")
    make_request("GET", "/cards/pokemon/invalid-id")
    make_request("GET", "/cards/pokemon/search")

    print(f"\n{Colors.GREEN}🎉 All Python tests completed!{Colors.END}")


if __name__ == "__main__":
    main()
