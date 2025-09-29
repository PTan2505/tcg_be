# Yu-Gi-Oh! Models Documentation

## Overview

This document describes the normalized database structure for Yu-Gi-Oh! cards, which separates card information from set information to create a proper relational database design.

## Model Structure

### YugiohCard Model

The `YugiohCard` model stores core card information without embedded set data. This follows database normalization principles.

#### Key Features:
- **Primary Key**: `cardExtId` (maps to API's `id` field - 8-digit passcode)
- **Secondary Key**: `konamiId` (Konami's internal ID, different from passcode)
- **Converted Naming**: All fields use camelCase instead of snake_case
- **Optimized Indexes**: Compound indexes for common query patterns

#### Core Fields:
```typescript
interface IYugiohCard {
  // Identification
  cardExtId: number;          // API 'id' - 8-digit passcode
  konamiId?: string;          // Konami ID
  name: string;               // Card name
  
  // Type Information
  type: string;               // "Normal Monster", "Effect Monster", etc.
  frameType?: string;         // "normal", "effect", "synchro", etc.
  desc: string;               // Card description/effect
  
  // Monster Stats (when applicable)
  atk?: number;
  def?: number;
  level?: number;             // Level/RANK
  race?: string;              // Spellcaster, Warrior, etc.
  attribute?: string;         // WIND, FIRE, WATER, etc.
  
  // Special Monster Types
  scale?: number;             // Pendulum Scale
  linkval?: number;           // Link Value
  linkmarkers?: string[];     // Link Markers
  
  // Nested Arrays (camelCase converted)
  cardImages?: ICardImage[];
  cardPrices?: ICardPrice[];
  banlistInfo?: IBanlistInfo;
  
  // Additional Data (misc=yes)
  ygoprodeckUrl?: string;
  betaName?: string;
  views?: number;
  formats?: string[];
  // ... more fields
}
```

### YugiohSet Model

The `YugiohSet` model stores information about which sets each card appears in, including rarity and pricing for each appearance.

#### Key Features:
- **Relationship**: References `YugiohCard` via `cardExtId`
- **Unique Constraint**: Prevents duplicate `cardExtId + setCode` combinations
- **Set-Specific Data**: Stores rarity and price per set appearance

#### Core Fields:
```typescript
interface IYugiohSet {
  // Identification
  setName: string;            // "Battles of Legend: Relentless Revenge"
  setCode: string;            // "BLRR-EN084"
  
  // Relationship
  cardExtId: number;          // References YugiohCard
  
  // Set-Specific Information
  setRarity: string;          // "Secret Rare"
  setRarityCode?: string;     // "(ScR)"
  setPrice?: string;          // "4.08" ($ value)
  
  // TCGPlayer Data (optional)
  setEdition?: string;
  setUrl?: string;
}
```

## API Response Mapping

### Original API Response
```json
{
  "id": 6983839,
  "name": "Tornado Dragon",
  "card_sets": [
    {
      "set_name": "Battles of Legend: Relentless Revenge",
      "set_code": "BLRR-EN084",
      "set_rarity": "Secret Rare",
      "set_rarity_code": "(ScR)",
      "set_price": "4.08"
    }
  ],
  "card_images": [
    {
      "id": 6983839,
      "image_url": "https://...",
      "image_url_small": "https://...",
      "image_url_cropped": "https://..."
    }
  ]
}
```

### Normalized Database Storage

#### YugiohCard Document
```javascript
{
  cardExtId: 6983839,
  name: "Tornado Dragon",
  cardImages: [{
    id: 6983839,
    imageUrl: "https://...",
    imageUrlSmall: "https://...",
    imageUrlCropped: "https://..."
  }]
  // ... other card fields (no card_sets)
}
```

#### YugiohSet Documents
```javascript
[
  {
    cardExtId: 6983839,
    setName: "Battles of Legend: Relentless Revenge",
    setCode: "BLRR-EN084",
    setRarity: "Secret Rare",
    setRarityCode: "(ScR)",
    setPrice: "4.08"
  },
  {
    cardExtId: 6983839,
    setName: "Duel Devastator",
    setCode: "DUDE-EN019",
    setRarity: "Ultra Rare",
    setRarityCode: "(UR)",
    setPrice: "1.4"
  }
  // ... one document per set appearance
]
```

## Database Indexes

### YugiohCard Indexes
- `cardExtId`: Unique primary key
- `konamiId`: Sparse index for Konami ID lookups
- `name`: Text search
- `type`, `race`, `attribute`, `level`, `atk`, `def`: Query filtering
- Compound indexes for common query patterns

### YugiohSet Indexes
- `{cardExtId, setCode}`: Unique compound to prevent duplicates
- `cardExtId`: Foreign key reference
- `setName`, `setRarity`: Filtering and grouping
- Text index on `setName` for search

## Query Examples

### Get a card with all its sets
```typescript
const card = await YugiohCard.findOne({ cardExtId: 6983839 });
const sets = await YugiohSet.find({ cardExtId: 6983839 });
```

### Get all cards in a specific set
```typescript
const setCards = await YugiohSet.find({ setName: "Maximum Crisis" });
const cardIds = setCards.map(s => s.cardExtId);
const cards = await YugiohCard.find({ cardExtId: { $in: cardIds } });
```

### Search cards by rarity
```typescript
const rareCards = await YugiohSet.find({ setRarity: "Secret Rare" });
```

## Migration Strategy

1. **migrateData.ts**: Converts existing embedded structure to normalized
2. **importData.ts**: Imports fresh data from API in normalized format
3. **Backward compatibility**: Old model kept until migration is complete

## Benefits of Normalization

1. **Reduced Redundancy**: Set information stored once per card-set combination
2. **Easier Queries**: Search by set, rarity, or price without nested array queries
3. **Better Performance**: Indexed relationships for faster joins
4. **Data Integrity**: Unique constraints prevent duplicate entries
5. **Scalability**: Easier to add set-specific features in the future

## File Structure

```
src/database/models/yugioh/
├── index.ts           # Exports both models
├── yugiohCard.ts      # Card model (normalized)
├── yugiohSet.ts       # Set model (normalized)
└── yugiohModel.ts     # Legacy model (to be deprecated)

scripts/yugioh/
├── importData.ts      # Fresh import script
└── migrateData.ts     # Migration script
```