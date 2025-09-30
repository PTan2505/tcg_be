# Deck API Routes

This module provides two distinct sets of deck functionality:

## 1. User Decks (`/api/decks/user`)
These are custom decks that users can create, modify, and manage. All routes require authentication.

### Endpoints:

**POST** `/api/decks/user/` - Create new deck
- Body: `{ name, description?, category, format, isPublic?, tags? }`
- Authentication: Required
- Returns: Created deck object

**GET** `/api/decks/user/` - Get user's decks
- Authentication: Required
- Returns: Array of user's decks

**GET** `/api/decks/user/:deckId` - Get specific deck
- Can view owned decks or public decks
- Authentication: Required
- Returns: Deck object with cards

**PATCH** `/api/decks/user/:deckId` - Update deck
- Body: `{ name?, description?, format?, isPublic?, tags? }`
- Authentication: Required (owner only)
- Returns: Updated deck object

**DELETE** `/api/decks/user/:deckId` - Delete deck
- Authentication: Required (owner only)
- Returns: Success message

**POST** `/api/decks/user/:deckId/cards` - Add card to deck
- Body: `{ cardId, category, quantity }`
- Authentication: Required (owner only, must own the card)
- Returns: Updated deck object

**DELETE** `/api/decks/user/:deckId/cards/:cardId` - Remove card from deck
- Authentication: Required (owner only)
- Returns: Updated deck object

**PATCH** `/api/decks/user/:deckId/cards/:cardId` - Update card quantity
- Body: `{ quantity }`
- Authentication: Required (owner only)
- Returns: Updated deck object

**GET** `/api/decks/user/:deckId/validate` - Validate deck format
- Authentication: Required (owner or public deck)
- Returns: Validation result with errors/warnings

**POST** `/api/decks/user/:deckId/duplicate` - Duplicate deck
- Body: `{ name }`
- Can duplicate public decks or owned decks
- Authentication: Required
- Returns: New deck object

## 2. Pokemon Recommended Decks (`/api/decks/pokemon`)
These are official Pokemon TCG recommended deck builds. All routes are public and read-only.

### Endpoints:

**GET** `/api/decks/pokemon/` - Get all Pokemon decks
- Query params: `page=1&limit=20&types=Fire,Water`
- Returns: Paginated list of Pokemon decks

**GET** `/api/decks/pokemon/search` - Search Pokemon decks
- Query params: `q=searchterm&types=Fire,Water`
- Returns: Array of matching decks

**GET** `/api/decks/pokemon/types` - Get decks by types
- Query params: `types=Fire,Water` (required)
- Returns: Array of decks matching the specified types

**GET** `/api/decks/pokemon/id/:deckId` - Get deck by database ID
- Returns: Full deck object with populated card details

**GET** `/api/decks/pokemon/ext/:deckExtId` - Get deck by external ID
- External ID format: `d-base1-1`, `d-base2-1`, etc.
- Returns: Full deck object with populated card details

**GET** `/api/decks/pokemon/id/:deckId/stats` - Get deck statistics
- Returns: Deck stats (total cards, types breakdown, rarity breakdown)

## Rate Limits
- User deck operations: 100 requests per minute
- Pokemon deck viewing: 200 requests per minute

## Data Models

### User Deck Schema
```typescript
{
  name: string;
  description?: string;
  userId: ObjectId;
  category: 'POKEMON' | 'YUGIOH';
  format: 'STANDARD' | 'EXPANDED' | 'UNLIMITED' | 'CUSTOM';
  cards: Array<{
    cardId: ObjectId;
    category: string;
    quantity: number;
  }>;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Pokemon Deck Schema
```typescript
{
  deckExtId: string; // e.g., "d-base1-1"
  name: string; // e.g., "2-Player Starter Set"
  types: string[]; // e.g., ["Fire", "Fighting", "Colorless"]
  cards: Array<{
    card: ObjectId; // References PokemonCard
    count: number;
  }>;
}
```

## Error Responses
All endpoints return standardized error responses:
```typescript
{
  success: false;
  error: {
    name: string;
    field: string;
    message: string;
  }
}
```

## Success Responses
All endpoints return standardized success responses:
```typescript
{
  success: true;
  message: string;
  data: any;
}
```