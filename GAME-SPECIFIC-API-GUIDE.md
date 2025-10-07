# 🎯 Game-Specific API Parameters Guide for Frontend

## 📋 Overview

Swagger documentation đã được cập nhật để phân loại rõ ràng các parameters theo từng game type, giúp frontend developer dễ dàng hiểu và implement các filter phù hợp.

## 🎮 Phân loại Parameters theo Game Type

### 📊 Common Parameters (Tất cả Game Types)

Các parameters này có thể sử dụng cho tất cả loại game:

```typescript
interface CommonParams {
  // Pagination
  page?: number;           // 📄 [ALL GAMES] Page number
  limit?: number;          // 📄 [ALL GAMES] Items per page (max 100)
  
  // Search & Sort
  search?: string;         // 🔍 [ALL GAMES] Fuzzy search for names
  sortBy?: string;         // 📊 [ALL GAMES] Sort field
  sortOrder?: 'asc' | 'desc'; // 📊 [ALL GAMES] Sort direction
  
  // Basic Filters
  rarity?: string;         // 💎 [ALL GAMES] Card rarity
  setId?: string;          // 📦 [ALL GAMES] Card set ID
  minPrice?: number;       // 💰 [ALL GAMES] Min price filter
  maxPrice?: number;       // 💰 [ALL GAMES] Max price filter
  description?: string;    // 📝 [ALL GAMES] Search in card text
}
```

### 🏴‍☠️ One Piece Specific Parameters

```typescript
interface OnePieceParams extends CommonParams {
  // One Piece Card Types
  cardType?: 'Leader' | 'Character' | 'Event' | 'Stage';
  
  // One Piece Unique Fields
  color?: 'Red' | 'Green' | 'Blue' | 'Purple' | 'Black' | 'Yellow';
  cost?: number;           // Energy cost (0-10)
  power?: number;          // Character power (1000-12000)
  life?: number;           // Leader life points (4-5)
  
  // One Piece Attributes
  attribute?: 'Strike' | 'Slash' | 'Ranged' | 'Special';
  subtype?: 'Straw Hat Crew' | 'Marine' | 'Whitebeard Pirates' | 'Big Mom Pirates';
}
```

**Example API Call:**
```bash
GET /api/cards/public/onepiece?search=zoro&cardType=Leader&color=Green&power=5000
```

### 🎮 Pokemon Specific Parameters

```typescript
interface PokemonParams extends CommonParams {
  // Pokemon Card Types (actually Pokemon types/colors)
  cardType?: 'Fire' | 'Water' | 'Lightning' | 'Grass' | 'Fighting' | 'Psychic' | 'Colorless' | 'Metal' | 'Fairy' | 'Darkness';
  
  // Pokemon Unique Fields
  hp?: number;             // Pokemon HP (10-340)
  stage?: 'Basic' | 'Stage 1' | 'Stage 2' | 'BREAK' | 'GX' | 'V' | 'VMAX' | 'VSTAR';
  
  // Note: color, attribute, subtype NOT used for Pokemon
}
```

**Example API Call:**
```bash
GET /api/cards/public/pokemon?search=pikachu&hp=60&stage=Basic&cardType=Lightning
```

### 🃏 Yu-Gi-Oh Specific Parameters

```typescript
interface YuGiOhParams extends CommonParams {
  // Yu-Gi-Oh Card Types
  cardType?: 'Monster' | 'Spell' | 'Trap';
  
  // Yu-Gi-Oh Monster Fields
  defense?: number;        // Monster defense (0-5000)
  level?: number;          // Monster level/rank (1-12)
  
  // Yu-Gi-Oh Attributes
  attribute?: 'FIRE' | 'WATER' | 'EARTH' | 'WIND' | 'LIGHT' | 'DARK' | 'DIVINE';
  subtype?: 'Warrior' | 'Spellcaster' | 'Dragon' | 'Machine' | 'Beast' | 'Zombie' | 'Fiend';
  monsterType?: string;    // Same as subtype but more specific
  
  // Note: color, cost, power, life, hp, stage NOT used for Yu-Gi-Oh
}
```

**Example API Call:**
```bash
GET /api/cards/public/yugioh?search=dragon&cardType=Monster&attribute=FIRE&level=4&defense=1500
```

## 🔍 Extended Data Structure

### 🏴‍☠️ One Piece Extended Data
```typescript
interface OnePieceExtendedData {
  extNumber: string;       // Card number (e.g., "ST12-001")
  extRarity: string;       // Card rarity (e.g., "L", "R", "C")
  extCardType: string;     // "Leader", "Character", "Event", "Stage"
  extDescription: string;  // Card effect text
  extColor: string;        // "Red", "Green", "Blue;Green" (multiple colors)
  extAttribute: string;    // "Strike", "Slash", "Ranged"
  extLife?: number;        // Leader life points (4-5)
  extPower?: number;       // Character power (1000-12000)
  extCost: number;         // Energy cost (0-10)
  extSubtypes: string;     // "Straw Hat Crew", "Marine"
}
```

### 🎮 Pokemon Extended Data
```typescript
interface PokemonExtendedData {
  extNumber: string;       // Card number (e.g., "SM65")
  extRarity: string;       // "Promo", "Rare", "Common"
  extCardType: string;     // Pokemon type: "Lightning", "Fire", "Water"
  extDescription?: string; // Card description
  extHP: number;          // Pokemon HP (10-340)
  extStage: string;       // "Basic", "Stage 1", "Stage 2"
  extAttack1?: string;    // First attack description
  extAttack2?: string;    // Second attack description
  extWeakness?: string;   // "Fx2" (Fire x2)
  extResistance?: string; // "M-20" (Metal -20)
  extRetreatCost?: number; // Energy to retreat
}
```

### 🃏 Yu-Gi-Oh Extended Data
```typescript
interface YuGiOhExtendedData {
  extNumber: string;       // Card number (e.g., "JUSH-EN040")
  extRarity: string;       // "Super Rare", "Ultra Rare"
  extCardType: string;     // "Monster", "Spell", "Trap"
  extDescription: string;  // Card effect text
  extAttribute?: string;   // "FIRE", "WATER", "EARTH" (for monsters)
  extDefense?: number;     // Monster defense points
  extLevel?: number;       // Monster level/rank
  extMonsterType?: string; // "Warrior", "Dragon", "Spellcaster"
  extSubtypes?: string;    // Monster type classification
}
```

## 🛠️ Frontend Implementation Guide

### 1. Dynamic Filter UI Based on Game Type

```typescript
const getAvailableFilters = (gameType: 'pokemon' | 'yugioh' | 'onepiece') => {
  const commonFilters = ['search', 'rarity', 'minPrice', 'maxPrice'];
  
  switch (gameType) {
    case 'onepiece':
      return [...commonFilters, 'cardType', 'color', 'cost', 'power', 'life', 'attribute', 'subtype'];
    
    case 'pokemon':
      return [...commonFilters, 'cardType', 'hp', 'stage'];
    
    case 'yugioh':
      return [...commonFilters, 'cardType', 'defense', 'level', 'attribute', 'subtype', 'monsterType'];
    
    default:
      return commonFilters;
  }
};
```

### 2. Type-Safe API Calls

```typescript
// One Piece search
const searchOnePieceCards = async (params: OnePieceParams) => {
  const url = new URL('/api/cards/public/onepiece', API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return fetch(url.toString());
};

// Pokemon search
const searchPokemonCards = async (params: PokemonParams) => {
  const url = new URL('/api/cards/public/pokemon', API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return fetch(url.toString());
};

// Yu-Gi-Oh search
const searchYuGiOhCards = async (params: YuGiOhParams) => {
  const url = new URL('/api/cards/public/yugioh', API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  return fetch(url.toString());
};
```

### 3. Form Validation

```typescript
const validateGameSpecificParams = (gameType: string, params: any) => {
  const errors: string[] = [];
  
  switch (gameType) {
    case 'onepiece':
      if (params.color && !['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'].includes(params.color)) {
        errors.push('Invalid One Piece color');
      }
      if (params.cost && (params.cost < 0 || params.cost > 10)) {
        errors.push('One Piece cost must be 0-10');
      }
      break;
      
    case 'pokemon':
      if (params.hp && (params.hp < 10 || params.hp > 340)) {
        errors.push('Pokemon HP must be 10-340');
      }
      if (params.color) {
        errors.push('Color parameter not used for Pokemon');
      }
      break;
      
    case 'yugioh':
      if (params.level && (params.level < 1 || params.level > 12)) {
        errors.push('Yu-Gi-Oh level must be 1-12');
      }
      if (params.hp || params.color || params.cost) {
        errors.push('HP, color, cost not used for Yu-Gi-Oh');
      }
      break;
  }
  
  return errors;
};
```

## 🎨 UI/UX Recommendations

### Filter Grouping
```tsx
const FilterUI = ({ gameType }: { gameType: GameType }) => {
  return (
    <div className="filters">
      {/* Common filters always visible */}
      <FilterGroup title="🔍 Search & Basic Filters">
        <SearchInput />
        <RaritySelect />
        <PriceRange />
      </FilterGroup>
      
      {/* Game-specific filters */}
      {gameType === 'onepiece' && (
        <FilterGroup title="🏴‍☠️ One Piece Filters">
          <ColorSelect options={['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow']} />
          <CostSlider min={0} max={10} />
          <PowerInput />
          <AttributeSelect options={['Strike', 'Slash', 'Ranged']} />
        </FilterGroup>
      )}
      
      {gameType === 'pokemon' && (
        <FilterGroup title="🎮 Pokemon Filters">
          <HPSlider min={10} max={340} />
          <StageSelect options={['Basic', 'Stage 1', 'Stage 2', 'GX', 'V', 'VMAX']} />
          <TypeSelect options={['Fire', 'Water', 'Lightning', 'Grass']} />
        </FilterGroup>
      )}
      
      {gameType === 'yugioh' && (
        <FilterGroup title="🃏 Yu-Gi-Oh Filters">
          <LevelSlider min={1} max={12} />
          <DefenseInput />
          <AttributeSelect options={['FIRE', 'WATER', 'EARTH', 'WIND']} />
          <MonsterTypeSelect />
        </FilterGroup>
      )}
    </div>
  );
};
```

## ✅ Validation & Testing

Để test API parameters:

```bash
# One Piece - test color filter (should work)
curl "http://localhost:3000/api/cards/public/onepiece?color=Red&cardType=Leader"

# Pokemon - test HP filter (should work)  
curl "http://localhost:3000/api/cards/public/pokemon?hp=60&stage=Basic"

# Yu-Gi-Oh - test level filter (should work)
curl "http://localhost:3000/api/cards/public/yugioh?level=4&cardType=Monster"

# Invalid - Pokemon with color (should be ignored)
curl "http://localhost:3000/api/cards/public/pokemon?color=Red&hp=60"
```

## 🎯 Key Benefits

1. **🔍 Clear Parameter Categorization**: Frontend developers biết chính xác parameter nào dùng cho game nào
2. **📖 Emoji-based Documentation**: Dễ đọc và nhận biết trong Swagger UI
3. **🎮 Game-Specific Examples**: Mỗi parameter có example values phù hợp
4. **⚡ Type Safety**: TypeScript interfaces cho từng game type
5. **🛠️ Better UX**: Frontend có thể hide/show filters dựa theo game type

Swagger documentation giờ đây rất rõ ràng cho frontend developers để implement filtering logic phù hợp với từng loại game! 🎉