# Card Scanning Solution: Handling Duplicate Cards Across Sets

## Problem Analysis

Based on your card data structure, the same card (like "Monkey.D.Luffy") appears across multiple sets with:
- **Same core attributes**: Name, stats, abilities, artwork
- **Different set information**: Set code, rarity variants, parallel prints, group IDs
- **Different product IDs**: Each variant has a unique TCGPlayer product ID

## Example Duplicate Scenarios

```csv
// Same character, different sets:
453505,Trafalgar Law (002),OP01-002,Romance Dawn
545834,Trafalgar Law (047),OP07-047,500 Years in the Future

// Same card, different variants:
453506,Monkey.D.Luffy (003) (Parallel),OP01-003,Romance Dawn
453508,Monkey.D.Luffy (024),OP01-024,Romance Dawn

// Same card, different rarities:
545834,Trafalgar Law (047),OP07-047,Normal R
545835,Trafalgar Law (047) (Parallel),OP07-047,Foil R
```

## Recommended Solution Architecture

### 1. Card Scanning Flow with Set Selection

```typescript
// Enhanced card scanning response
interface CardScanResult {
  success: boolean;
  matches: CardMatch[];
  requiresSetSelection: boolean;
  scanConfidence: number;
}

interface CardMatch {
  cardId: string;
  productId: number;
  name: string;
  setInfo: {
    setName: string;
    setCode: string;
    groupId: number;
    rarity: string;
  };
  confidence: number;
  imageUrl: string;
  estimatedValue: number;
}
```

### 2. Backend API Endpoints

#### A. Card Recognition Endpoint
```typescript
POST /api/cards/scan
Content-Type: multipart/form-data

// Request
{
  image: File,
  gameType: 'onepiece' | 'pokemon' | 'yugioh',
  location?: { lat: number, lng: number }, // For regional set preferences
  userPreferences?: {
    preferredSets: string[],
    priceRange?: { min: number, max: number }
  }
}

// Response
{
  success: true,
  data: {
    matches: [
      {
        cardId: "64f1a2b3c4d5e6f7a8b9c0d1",
        productId: 453505,
        name: "Trafalgar Law (002)",
        setInfo: {
          setName: "Romance Dawn",
          setCode: "OP01-002",
          groupId: 3188,
          rarity: "Leader"
        },
        confidence: 0.95,
        imageUrl: "https://tcgplayer-cdn.tcgplayer.com/product/453505_200w.jpg",
        estimatedValue: 0.36
      },
      {
        cardId: "64f1a2b3c4d5e6f7a8b9c0d2",
        productId: 545834,
        name: "Trafalgar Law (047)",
        setInfo: {
          setName: "500 Years in the Future",
          setCode: "OP07-047",
          groupId: 23387,
          rarity: "R"
        },
        confidence: 0.92,
        imageUrl: "https://tcgplayer-cdn.tcgplayer.com/product/545834_200w.jpg",
        estimatedValue: 0.21
      }
    ],
    requiresSetSelection: true,
    scanConfidence: 0.89
  }
}
```

#### B. Card Selection Confirmation
```typescript
POST /api/cards/confirm-scan
{
  selectedCardId: "64f1a2b3c4d5e6f7a8b9c0d1",
  quantity: 1,
  condition: "near_mint",
  isFirstEdition?: boolean,
  notes?: string
}
```

### 3. Enhanced Card Service

```typescript
// src/shared/services/cardScan.service.ts
export class CardScanService {
  async scanCard(
    imageBuffer: Buffer, 
    gameType: string, 
    options?: ScanOptions
  ): Promise<CardScanResult> {
    
    // 1. Image recognition (OCR + ML model)
    const recognitionResult = await this.recognizeCard(imageBuffer, gameType);
    
    // 2. Database search with fuzzy matching
    const potentialMatches = await this.findPotentialMatches(
      recognitionResult, 
      gameType
    );
    
    // 3. Rank matches by confidence and user preferences
    const rankedMatches = await this.rankMatches(
      potentialMatches, 
      options?.userPreferences
    );
    
    // 4. Determine if set selection is needed
    const requiresSetSelection = rankedMatches.length > 1 && 
      rankedMatches[0].confidence < 0.98;
    
    return {
      success: true,
      matches: rankedMatches,
      requiresSetSelection,
      scanConfidence: recognitionResult.confidence
    };
  }

  private async findPotentialMatches(
    recognition: RecognitionResult, 
    gameType: string
  ): Promise<CardMatch[]> {
    
    const searchCriteria = {
      gameType,
      $or: [
        // Exact name match
        { name: { $regex: recognition.cardName, $options: 'i' } },
        // Clean name match
        { cleanName: { $regex: recognition.cardName, $options: 'i' } },
        // Set code match (if detected)
        ...(recognition.setCode ? [{ setCode: recognition.setCode }] : [])
      ]
    };

    const matches = await Card.find(searchCriteria)
      .populate('cardSet')
      .limit(10)
      .lean();

    return matches.map(card => ({
      cardId: card._id.toString(),
      productId: card.productId,
      name: card.name,
      setInfo: {
        setName: card.cardSet.name,
        setCode: card.setCode,
        groupId: card.groupId,
        rarity: card.rarity
      },
      confidence: this.calculateConfidence(card, recognition),
      imageUrl: card.imageUrl,
      estimatedValue: card.tcgPlayerPrice?.marketPrice || 0
    }));
  }

  private calculateConfidence(card: any, recognition: RecognitionResult): number {
    let confidence = 0;
    
    // Name similarity (0.4 weight)
    const nameSimilarity = this.calculateStringSimilarity(
      card.cleanName || card.name, 
      recognition.cardName
    );
    confidence += nameSimilarity * 0.4;
    
    // Set code match (0.3 weight)
    if (recognition.setCode && card.setCode === recognition.setCode) {
      confidence += 0.3;
    }
    
    // Image similarity (0.2 weight) - if implemented
    if (recognition.imageFeatures && card.imageFeatures) {
      const imageSimilarity = this.calculateImageSimilarity(
        recognition.imageFeatures, 
        card.imageFeatures
      );
      confidence += imageSimilarity * 0.2;
    }
    
    // Recent set bonus (0.1 weight)
    const setAge = Date.now() - new Date(card.cardSet.publishedOn).getTime();
    const ageBonus = Math.max(0, 1 - (setAge / (365 * 24 * 60 * 60 * 1000))); // 1 year decay
    confidence += ageBonus * 0.1;
    
    return Math.min(confidence, 1.0);
  }
}
```

### 4. React Native Frontend Implementation

#### A. Camera Component with Smart Scanning
```typescript
// components/CardScanner.tsx
import React, { useState } from 'react';
import { Camera } from 'expo-camera';
import { Alert, View, TouchableOpacity, Text } from 'react-native';

export const CardScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<CardScanResult | null>(null);

  const handleScanCard = async (imageUri: string) => {
    setScanning(true);
    
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'card-scan.jpg'
      } as any);
      formData.append('gameType', 'onepiece');

      const response = await fetch('/api/cards/scan', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${userToken}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setScanResult(result.data);
        
        if (result.data.requiresSetSelection) {
          // Show set selection modal
          showSetSelectionModal(result.data.matches);
        } else {
          // Auto-add the best match
          await confirmCardSelection(result.data.matches[0]);
        }
      }
    } catch (error) {
      Alert.alert('Scan Error', 'Failed to scan card. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        onBarCodeScanned={undefined} // We're using manual capture
      >
        <View style={styles.overlay}>
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={() => takePicture()}
            disabled={scanning}
          >
            <Text>{scanning ? 'Scanning...' : 'Scan Card'}</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
};
```

#### B. Set Selection Modal
```typescript
// components/SetSelectionModal.tsx
import React from 'react';
import { Modal, FlatList, TouchableOpacity, Text, Image, View } from 'react-native';

interface SetSelectionModalProps {
  visible: boolean;
  matches: CardMatch[];
  onSelectCard: (card: CardMatch) => void;
  onCancel: () => void;
}

export const SetSelectionModal: React.FC<SetSelectionModalProps> = ({
  visible,
  matches,
  onSelectCard,
  onCancel
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Multiple Cards Found</Text>
        <Text style={styles.subtitle}>Select the correct card and set:</Text>
        
        <FlatList
          data={matches}
          keyExtractor={(item) => item.cardId}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.cardItem}
              onPress={() => onSelectCard(item)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.setInfo}>
                  {item.setInfo.setName} ({item.setInfo.setCode})
                </Text>
                <Text style={styles.rarity}>Rarity: {item.setInfo.rarity}</Text>
                <Text style={styles.value}>
                  Est. Value: ${item.estimatedValue?.toFixed(2) || 'N/A'}
                </Text>
                <Text style={styles.confidence}>
                  Match: {(item.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
        
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
```

### 5. Database Optimization for Scanning

#### A. Add Scanning-Specific Indexes
```typescript
// Add to card model
CardSchema.index({ 
  gameType: 1, 
  cleanName: 'text', 
  setCode: 1 
}, { 
  name: 'scan_optimization_index' 
});

CardSchema.index({ 
  gameType: 1, 
  'cardSet.publishedOn': -1 
}, { 
  name: 'recent_sets_index' 
});
```

#### B. Pre-computed Scan Metadata
```typescript
// Add to card schema for faster scanning
const CardSchema = new Schema({
  // ... existing fields
  
  // Scanning optimization fields
  scanKeywords: [String], // Extracted OCR-friendly text
  visualHash: String, // Perceptual image hash
  popularityScore: { type: Number, default: 0 }, // Based on collection frequency
  
  // Duplicate detection
  canonicalCardId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Card' 
  }, // Points to the "main" version of this card
  variants: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Card' 
  }], // All variants of this card
});
```

### 6. Advanced Features

#### A. Smart Set Suggestions
```typescript
// Suggest most likely set based on:
interface SetSuggestionFactors {
  userCollectionSets: string[]; // Sets user already collects
  recentReleases: string[]; // Recently released sets
  regionalPopularity: string[]; // Popular sets in user's region
  priceRange: { min: number, max: number }; // User's typical spending
}

const suggestMostLikelySet = (
  matches: CardMatch[], 
  factors: SetSuggestionFactors
): CardMatch[] => {
  return matches.sort((a, b) => {
    let scoreA = a.confidence;
    let scoreB = b.confidence;
    
    // Boost score for sets user already collects
    if (factors.userCollectionSets.includes(a.setInfo.setCode)) scoreA += 0.1;
    if (factors.userCollectionSets.includes(b.setInfo.setCode)) scoreB += 0.1;
    
    // Boost score for recent releases
    if (factors.recentReleases.includes(a.setInfo.setCode)) scoreA += 0.05;
    if (factors.recentReleases.includes(b.setInfo.setCode)) scoreB += 0.05;
    
    return scoreB - scoreA;
  });
};
```

#### B. Offline Scanning Support
```typescript
// Store lightweight card database for offline scanning
interface OfflineCardData {
  gameType: string;
  cardHashes: {
    [hash: string]: {
      name: string;
      setCode: string;
      possibleCards: string[]; // Card IDs to sync later
    }
  };
}

// Sync when back online
const syncOfflineScans = async (offlineScans: OfflineScan[]) => {
  for (const scan of offlineScans) {
    const fullCardData = await fetchCardDetails(scan.cardIds);
    await showSetSelectionModal(fullCardData);
  }
};
```

## Implementation Priority

### Phase 1: Basic Scanning (Week 1-2)
1. Card recognition API endpoint
2. Set selection modal in React Native
3. Database optimization for scanning queries

### Phase 2: Smart Features (Week 3-4)
1. Confidence scoring and ranking
2. User preference integration
3. Popular set suggestions

### Phase 3: Advanced Features (Week 5-6)
1. Offline scanning capability
2. Visual similarity matching
3. Collection-based recommendations

## Key Benefits

1. **User Experience**: Clear choice when multiple cards match
2. **Accuracy**: Higher confidence in card identification
3. **Performance**: Optimized database queries for fast scanning
4. **Flexibility**: Handles all card variants and rarities
5. **Offline Support**: Works without internet connection
6. **Smart Suggestions**: Learns from user behavior

This solution ensures users can accurately identify and add cards to their collection, even when the same character appears across multiple sets with different rarities and variants.