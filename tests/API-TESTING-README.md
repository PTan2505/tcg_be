# API Testing Scripts

This folder contains multiple scripts to test the TCG Backend API endpoints. Choose the method that works best for you.

## Prerequisites

Make sure the server is running:
```bash
bun run dev
```

The server should be running on `http://localhost:3000`

## Available Test Scripts

### 1. Node.js Comprehensive Test (`test-api-comprehensive.js`)
**Most detailed testing with full coverage**

```bash
cd tests/api
node test-api-comprehensive.js
```

**Features:**
- ✅ Comprehensive test coverage
- ✅ Automatic token management
- ✅ Color-coded output
- ✅ Error handling validation
- ✅ Detailed response logging

### 2. Bash Script (`test-api-simple.sh`)
**Quick and simple using curl**

```bash
cd tests/api
./test-api-simple.sh
```

**Features:**
- ✅ No dependencies (uses curl)
- ✅ Automatic token extraction (if jq available)
- ✅ Color-coded output
- ✅ Fast execution

### 3. Python Script (`test-api.py`)
**Python-based testing**

**Install requirements:**
```bash
pip install requests
```

**Run:**
```bash
cd tests/api
python test-api.py
```

**Features:**
- ✅ Clean Python code
- ✅ JSON response formatting
- ✅ Color-coded output
- ✅ Error handling

### 4. Manual Commands (`quick-test-commands.sh`)
**Copy-paste commands for manual testing**

```bash
cd tests/api
cat quick-test-commands.sh
```

Then copy and paste individual commands in your terminal.

**Features:**
- ✅ Individual command testing
- ✅ Manual control over each test
- ✅ Great for debugging specific endpoints

### 5. Postman Collection (`postman-collection.json`)
**Import into Postman/Insomnia**

1. Open Postman or Insomnia
2. Import the `tests/api/postman-collection.json` file
3. Set the `baseUrl` variable to `http://localhost:3000`
4. Run the collection

**Features:**
- ✅ GUI-based testing
- ✅ Automatic variable management
- ✅ Request history
- ✅ Easy request modification

## Test Coverage

All scripts test these endpoints:

### Public Endpoints (No Authentication)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /cards/pokemon` - Get Pokemon cards with pagination
- `GET /cards/yugioh` - Get Yugioh cards with pagination
- `GET /cards/{type}/search` - Search cards
- `GET /cards/{type}/{id}` - Get specific card by ID

### Protected Endpoints (Requires Authentication)
- `GET /users/profile` - Get user profile
- `GET /user-cards` - Get user's card collection
- `POST /user-cards` - Add card to collection
- `GET /decks` - Get user's decks
- `POST /decks` - Create new deck

### Error Handling Tests
- Invalid card types
- Invalid card IDs
- Missing search queries
- Unauthorized access

## Sample Test Data

The scripts use this test user:
```json
{
  "email": "testuser@example.com",
  "password": "TestPassword123!",
  "name": "Test User"
}
```

## API Documentation

- **Swagger UI:** http://localhost:3000/docs
- **Swagger JSON:** http://localhost:3000/swagger.json

## Troubleshooting

### Common Issues:

1. **Connection Refused**
   ```
   Solution: Make sure the server is running with `bun run dev`
   ```

2. **Authentication Failures**
   ```
   Solution: Register the user first, then login to get a valid token
   ```

3. **No Cards Found**
   ```
   Solution: Import card data using the scripts in the /scripts folder
   ```

4. **Permission Denied on Shell Scripts**
   ```bash
   chmod +x *.sh
   ```

### Debug Mode

For detailed debugging, check the server logs in the terminal where you ran `bun run dev`.

## Expected Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // for paginated endpoints
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "field": "email",
    "message": "Invalid email format"
  }
}
```

## Rate Limiting

The API has rate limiting:
- **Cards endpoints:** 300 requests per minute
- **Other endpoints:** Check the middleware configuration

If you hit rate limits, wait a minute before retrying.

---

Choose the testing method that best fits your workflow and start testing! 🚀