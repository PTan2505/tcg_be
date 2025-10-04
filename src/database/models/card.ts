import mongoose, { Document, Schema } from 'mongoose';

// Interface for TCG Player price data
interface ITCGPlayerPrice {
  productId: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  directLowPrice?: number;
  subTypeName?: string;
}

// Interface for card images
interface ICardImage {
  small?: string;
  large?: string;
  normal?: string;
  holofoil?: string;
}

// Base interface for all cards
export interface ICard extends Document {
  // Core identification from TCGPlayer CSV
  productId: number; // TCG Player Product ID (unique)
  tcgplayerSku?: string;
  
  // Card set reference
  cardSet: mongoose.Types.ObjectId; // Reference to CardSet
  
  // Basic card information
  name: string;
  cleanName?: string; // Name without set info/extras
  imageUrl?: string;
  categoryId: number; // From CardSet
  groupId: number; // From CardSet
  gameType: 'pokemon' | 'yugioh' | 'onepiece';
  
  // Card specific attributes (varies by game)
  setCode?: string; // Set abbreviation + number (e.g., "PAL 001")
  number?: string; // Card number in set
  rarity?: string;
  
  // Pricing information from CSV
  tcgPlayerPrice?: ITCGPlayerPrice;
  
  // Images
  images?: ICardImage;
  
  // Extended URL and ID info
  url?: string;
  extendedData?: Record<string, any>; // For game-specific data that doesn't fit the base model
  
  // Status flags
  isActive?: boolean;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  lastPriceUpdate?: Date;
}

const CardSchema = new Schema<ICard>({
  // Core identification
  productId: { 
    type: Number, 
    required: true, 
    unique: true,
    index: true 
  },
  tcgplayerSku: { 
    type: String,
    sparse: true,
    index: true 
  },
  
  // Card set reference
  cardSet: { 
    type: Schema.Types.ObjectId, 
    ref: 'CardSet',
    required: true,
    index: true 
  },
  
  // Basic card information
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  cleanName: { 
    type: String,
    index: true 
  },
  imageUrl: String,
  categoryId: { 
    type: Number, 
    required: true,
    index: true 
  },
  groupId: { 
    type: Number, 
    required: true,
    index: true 
  },
  gameType: { 
    type: String, 
    required: true,
    enum: ['pokemon', 'yugioh', 'onepiece'],
    index: true 
  },
  
  // Card specific attributes
  setCode: { 
    type: String,
    index: true 
  },
  number: { 
    type: String,
    index: true 
  },
  rarity: { 
    type: String,
    index: true 
  },
  
  // Pricing information
  tcgPlayerPrice: {
    productId: Number,
    lowPrice: Number,
    midPrice: Number,
    highPrice: Number,
    marketPrice: Number,
    directLowPrice: Number,
    subTypeName: String
  },
  
  // Images
  images: {
    small: String,
    large: String,
    normal: String,
    holofoil: String
  },
  
  // Extended URL and ID info
  url: String,
  extendedData: { 
    type: Schema.Types.Mixed,
    default: {} 
  },
  
  // Status flags
  isActive: { 
    type: Boolean,
    default: true,
    index: true 
  },
  
  // Price update tracking
  lastPriceUpdate: Date
}, {
  timestamps: true,
  collection: 'cards'
});

// Create compound indexes for common queries
CardSchema.index({ name: 'text' }); // Text search
CardSchema.index({ gameType: 1, rarity: 1 }); // Filter by game and rarity
CardSchema.index({ gameType: 1, cardSet: 1 }); // Cards in specific game/set
CardSchema.index({ categoryId: 1, groupId: 1 }); // TCGPlayer category/group
CardSchema.index({ gameType: 1, name: 1 }); // Game-specific name search
CardSchema.index({ cardSet: 1, number: 1 }); // Set and card number
CardSchema.index({ 'tcgPlayerPrice.marketPrice': 1 }); // Price sorting
CardSchema.index({ lastPriceUpdate: 1 }); // Find cards needing price updates

export const Card = mongoose.model<ICard>('Card', CardSchema);