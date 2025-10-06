# Card Scanning API Documentation

## Overview

The Card Scanning API provides functionality to scan physical trading cards using image recognition and add them to user collections. The system handles multiple card matches across different sets and provides intelligent ranking and selection.

## Base URL
```
/api/cards/scan
```

## Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

## Rate Limits
- **General scanning endpoints**: 60 requests per minute
- **Card scan**: 20 requests per minute (most resource intensive)
- **Batch scan**: 5 requests per minute (highly resource intensive)

---

## Endpoints

### 1. Scan Card Image

Scan a card image and get potential matches with confidence scores.

**Endpoint:** `POST /api/cards/scan/scan`

**Content-Type:** `multipart/form-data`

**Request Body:**
```typescript
{
  image: File, // Required: Image file (max 10MB)
  gameType: 'pokemon' | 'yugioh' | 'onepiece', // Required
  location?: string, // Optional: JSON string with {lat: number, lng: number}
  userPreferences?: string // Optional: JSON string with preferences
}
```

**Example Request:**
```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('gameType', 'onepiece');
formData.append('location', JSON.stringify({ lat: 40.7128, lng: -74.0060 }));
formData.append('userPreferences', JSON.stringify({
  preferredSets: ['OP01', 'OP02'],
  priceRange: { min: 0, max: 50 }
}));

const response = await fetch('/api/cards/scan/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token-here'
  },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "matches": [
      {
        "cardId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "productId": 453505,
        "name": "Trafalgar Law (002)",
        "cleanName": "Trafalgar Law",
        "setInfo": {
          "setName": "Romance Dawn",
          "setCode": "OP01-002",
          "groupId": 3188,
          "rarity": "L",
          "abbreviation": "OP01"
        },
        "confidence": 0.95,
        "imageUrl": "https://tcgplayer-cdn.tcgplayer.com/product/453505_200w.jpg",
        "estimatedValue": 0.36,
        "gameType": "onepiece"
      },
      {
        "cardId": "64f1a2b3c4d5e6f7a8b9c0d2",
        "productId": 545834,
        "name": "Trafalgar Law (047)",
        "cleanName": "Trafalgar Law",
        "setInfo": {
          "setName": "500 Years in the Future",
          "setCode": "OP07-047",
          "groupId": 23387,
          "rarity": "R",
          "abbreviation": "OP07"
        },
        "confidence": 0.88,
        "imageUrl": "https://tcgplayer-cdn.tcgplayer.com/product/545834_200w.jpg",
        "estimatedValue": 0.21,
        "gameType": "onepiece"
      }
    ],
    "requiresSetSelection": true,
    "scanConfidence": 0.92,
    "totalMatches": 2
  },
  "message": "Multiple cards found. Please select the correct one."
}
```

### 2. Confirm Card Selection

Select a specific card from scan results and add it to the user's collection.

**Endpoint:** `POST /api/cards/scan/confirm`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "selectedCardId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "gameType": "onepiece",
  "quantity": 1,
  "condition": "near_mint",
  "isFirstEdition": false,
  "notes": "Pulled from booster pack"
}
```

**Fields:**
- `selectedCardId` (required): ID of the selected card from scan results
- `gameType` (required): Game type for proper categorization
- `quantity` (optional): Number of cards to add (1-100, default: 1)
- `condition` (optional): Card condition (default: "near_mint")
  - Valid values: `mint`, `near_mint`, `excellent`, `good`, `light_played`, `played`, `poor`
- `isFirstEdition` (optional): Whether it's a first edition card
- `notes` (optional): User notes about the card (max 500 characters)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d4",
    "cardId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "category": "Card",
    "addedAt": "2025-10-05T12:00:00.000Z"
  },
  "message": "Card added to collection successfully"
}
```

### 3. Fuzzy Search Cards

Manual card lookup when scanning fails or for browsing cards.

**Endpoint:** `GET /api/cards/scan/search`

**Query Parameters:**
- `q` (required): Search query
- `gameType` (required): Game type
- `setCode` (optional): Filter by set code
- `maxResults` (optional): Maximum results (1-50, default: 10)
- `includeVariants` (optional): Include variant cards (default: true)

**Example Request:**
```
GET /api/cards/scan/search?q=Luffy&gameType=onepiece&maxResults=5&setCode=OP01
```

**Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "cardId": "64f1a2b3c4d5e6f7a8b9c0d1",
        "productId": 453506,
        "name": "Monkey.D.Luffy (003) (Parallel)",
        "setInfo": {
          "setName": "Romance Dawn",
          "setCode": "OP01-003",
          "rarity": "L"
        },
        "confidence": 0.98,
        "estimatedValue": 225.77
      }
    ],
    "query": "Luffy",
    "totalMatches": 1
  },
  "message": "Search completed successfully"
}
```

### 4. Get Scan History

Retrieve user's scanning history with pagination and filters.

**Endpoint:** `GET /api/cards/scan/history`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (1-100, default: 20)
- `gameType` (optional): Filter by game type
- `startDate` (optional): Start date filter (ISO 8601)
- `endDate` (optional): End date filter (ISO 8601)

**Example Request:**
```
GET /api/cards/scan/history?page=1&limit=10&gameType=onepiece&startDate=2025-10-01T00:00:00.000Z
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scans": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "scannedAt": "2025-10-05T12:00:00.000Z",
        "gameType": "onepiece",
        "selectedCard": "64f1a2b3c4d5e6f7a8b9c0d2",
        "confidence": 0.95,
        "scanDuration": 1250
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalScans": 25,
      "hasMore": true,
      "limit": 10
    }
  },
  "message": "Scan history retrieved successfully"
}
```

### 5. Batch Scan Cards

Scan multiple cards at once for bulk collection building.

**Endpoint:** `POST /api/cards/scan/batch`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "gameType": "onepiece",
  "cards": [
    {
      "tempId": "temp_1",
      "imageData": "base64-encoded-image-data",
      "userNotes": "First card from new pack"
    },
    {
      "tempId": "temp_2",
      "imageData": "base64-encoded-image-data",
      "userNotes": "Second card"
    }
  ]
}
```

**Constraints:**
- Maximum 10 cards per batch
- Each image must be base64 encoded
- Each card needs a unique `tempId` for response matching

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "tempId": "temp_1",
        "success": true,
        "scanResult": {
          "matches": [...],
          "requiresSetSelection": false,
          "scanConfidence": 0.94
        },
        "userNotes": "First card from new pack"
      },
      {
        "tempId": "temp_2",
        "success": false,
        "error": "Could not recognize card"
      }
    ],
    "totalProcessed": 2,
    "successfulScans": 1
  },
  "message": "Batch scan completed"
}
```

### 6. Get Scan Statistics

Get user's scanning statistics and performance metrics.

**Endpoint:** `GET /api/cards/scan/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalScans": 156,
    "successfulScans": 142,
    "averageConfidence": 0.87,
    "gameTypeBreakdown": {
      "pokemon": 45,
      "yugioh": 23,
      "onepiece": 74
    },
    "recentActivity": {
      "thisWeek": 12,
      "thisMonth": 38
    }
  },
  "message": "Scan statistics retrieved successfully"
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created (card added to collection)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **413**: Payload Too Large (image file too big)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

### Common Error Messages

**File Upload Errors:**
- "Image file is required"
- "File must be an image"
- "Image file too large. Maximum size is 10MB"

**Validation Errors:**
- "Valid gameType is required (pokemon, yugioh, or onepiece)"
- "Selected card ID is required"
- "Quantity must be between 1 and 100"
- "Condition must be one of: mint, near_mint, excellent, good, light_played, played, poor"

**Rate Limit Errors:**
- "Rate limit exceeded. Please try again later."

---

## Integration Examples

### React Native with Expo Camera

```typescript
import { Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

const scanCard = async (imageUri: string, gameType: string) => {
  try {
    // Resize image for better upload performance
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 800 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    const formData = new FormData();
    formData.append('image', {
      uri: manipulatedImage.uri,
      type: 'image/jpeg',
      name: 'card-scan.jpg'
    } as any);
    formData.append('gameType', gameType);

    const response = await fetch('/api/cards/scan/scan', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${userToken}`,
      }
    });

    const result = await response.json();
    
    if (result.success) {
      if (result.data.requiresSetSelection) {
        // Show set selection modal
        showSetSelectionModal(result.data.matches);
      } else {
        // Auto-add best match
        await confirmCardSelection(result.data.matches[0].cardId);
      }
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Scan failed:', error);
    Alert.alert('Scan Error', error.message);
  }
};

const confirmCardSelection = async (cardId: string) => {
  const response = await fetch('/api/cards/scan/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      selectedCardId: cardId,
      gameType: 'onepiece',
      quantity: 1,
      condition: 'near_mint'
    })
  });

  const result = await response.json();
  if (result.success) {
    Alert.alert('Success', 'Card added to collection!');
  }
};
```

### Web Application Example

```javascript
const handleFileUpload = async (file, gameType) => {
  if (!file || !file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  const formData = new FormData();
  formData.append('image', file);
  formData.append('gameType', gameType);

  try {
    setLoading(true);
    
    const response = await fetch('/api/cards/scan/scan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const result = await response.json();
    
    if (result.success) {
      setScanResults(result.data);
    } else {
      setError(result.error);
    }
  } catch (error) {
    setError('Failed to scan card');
  } finally {
    setLoading(false);
  }
};
```

---

## Best Practices

### 1. Image Quality
- Use good lighting for scanning
- Ensure card is flat and fully visible
- Avoid shadows and glare
- Higher resolution images give better results

### 2. Error Handling
- Always handle network errors gracefully
- Provide fallback manual search when scanning fails
- Show user-friendly error messages

### 3. Performance
- Resize images before upload to reduce bandwidth
- Implement loading states during scanning
- Cache scan results when possible

### 4. User Experience
- Show scanning progress indicators
- Provide visual feedback for successful scans
- Allow users to review and edit scan results

### 5. Rate Limiting
- Implement client-side rate limiting
- Handle 429 responses gracefully
- Show appropriate user feedback for rate limits

This API provides a comprehensive solution for card scanning with intelligent duplicate handling, making it easy for users to build their digital card collections by scanning physical cards.