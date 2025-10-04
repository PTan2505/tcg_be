# TCG Backend API Routes - Unified Model

## 🃏 Card Routes (`/api/cards`)

### Public Routes (No Authentication)
- `GET /api/cards/public/stats` - Get card statistics for all game types
- `GET /api/cards/public/:type/stats` - Get card statistics for specific game type
- `GET /api/cards/public/:type` - Get cards by game type (pokemon/yugioh/onepiece)
- `GET /api/cards/public/:type/search` - Search cards by game type
- `GET /api/cards/public/product/:productId` - Get card by TCGPlayer Product ID

### Authenticated Routes
- `GET /api/cards/` - Get all cards with pagination and filtering
- `GET /api/cards/:type` - Get cards by game type with pagination
- `GET /api/cards/:type/search` - Search cards within game type
- `GET /api/cards/sets/:setId` - Get cards by set ID
- `GET /api/cards/stats` - Get overall card statistics
- `GET /api/cards/:type/stats` - Get statistics for specific game type
- `GET /api/cards/card/:cardId` - Get specific card by ID
- `GET /api/cards/product/:productId` - Get card by TCGPlayer Product ID

### Query Parameters
- `page` - Page number for pagination
- `limit` - Items per page (1-100)
- `search` - Search term for card names
- `sortBy` - Sort field (name, price, number)
- `sortOrder` - Sort direction (asc, desc)
- `rarity` - Filter by rarity
- `setId` - Filter by set ID
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter

## 📦 Set Routes (`/api/sets`)

### Public Routes (No Authentication)
- `GET /api/sets/public/stats` - Get set statistics for all game types
- `GET /api/sets/public/:type/stats` - Get set statistics for specific game type
- `GET /api/sets/public/:type` - Get sets by game type
- `GET /api/sets/public/:type/search` - Search sets by game type

### Authenticated Routes
- `GET /api/sets/` - Get all sets with pagination and filtering
- `GET /api/sets/stats` - Get overall set statistics
- `GET /api/sets/:type/stats` - Get statistics for specific game type
- `GET /api/sets/:type/search` - Search sets within game type
- `GET /api/sets/:type/:setId` - Get specific set by ID within game type
- `GET /api/sets/group/:groupId` - Get set by TCGPlayer Group ID
- `GET /api/sets/:type` - Get sets by game type with pagination

### Query Parameters
- `page` - Page number for pagination
- `limit` - Items per page (1-100)
- `search` - Search term for set names/descriptions
- `sortBy` - Sort field (publishedOn, name)
- `sortOrder` - Sort direction (asc, desc)
- `isSupplemental` - Filter by supplemental sets (true/false)
- `categoryId` - Filter by TCGPlayer category ID

## 🎴 User Collection Routes (`/api/user-cards`)

### Authenticated Routes
- `GET /api/user-cards/` - Get user's card collection
- `POST /api/user-cards/` - Add card to collection
- `DELETE /api/user-cards/:cardId` - Remove card from collection
- `GET /api/user-cards/search` - Search user's collection

## 🎯 Deck Routes (`/api/decks`)

### Authenticated Routes
- `GET /api/decks/` - Get user's decks
- `POST /api/decks/` - Create new deck
- `GET /api/decks/:deckId` - Get specific deck
- `PUT /api/decks/:deckId` - Update deck
- `DELETE /api/decks/:deckId` - Delete deck
- `POST /api/decks/:deckId/cards` - Add card to deck
- `DELETE /api/decks/:deckId/cards/:cardId` - Remove card from deck

## 🏷️ Supported Game Types

- `pokemon` - Pokemon Trading Card Game
- `yugioh` - Yu-Gi-Oh! Trading Card Game  
- `onepiece` - One Piece Card Game

## 📊 Unified Data Model

All cards are now stored in a single `Card` collection with:
- `productId` - TCGPlayer unique identifier
- `gameType` - Game type (pokemon/yugioh/onepiece)
- `name` - Card name
- `cleanName` - Normalized name for searching
- `cardSet` - Reference to CardSet document
- `rarity` - Card rarity
- `number` - Card number in set
- `tcgPlayerPrice` - Current pricing information
- `isActive` - Whether card is available

All sets are stored in a single `CardSet` collection with:
- `categoryId` - TCGPlayer category ID
- `groupId` - TCGPlayer group ID
- `gameType` - Game type
- `name` - Set name
- `abbreviation` - Set abbreviation
- `publishedOn` - Release date
- `isSupplemental` - Whether it's a supplemental set

## 🔒 Authentication

Most routes require JWT authentication via `Authorization: Bearer <token>` header.
Public routes are available for testing and mobile app integration.

## ⚡ Caching

- Card routes: 10-15 minute cache
- Set routes: 15-30 minute cache
- Statistics: 30 minute cache
- Search results: 10 minute cache

## 📈 Rate Limiting

- 300 requests per minute for authenticated routes
- Public routes have separate, more permissive limits