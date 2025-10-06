import { Document, Schema, model } from 'mongoose';

export interface ICardSet extends Document {
  // Core set identification
  groupId: number; // Unique identifier from CSV
  name: string; // Set name
  abbreviation: string; // Set abbreviation/code
  
  // Game identification
  gameType: 'pokemon' | 'yugioh' | 'onepiece'; // Which game this set belongs to
  categoryId: number; // Category ID from CSV
  
  // Set status and dates
  isSupplemental: boolean; // Whether this is a supplemental set
  publishedOn: Date; // When the set was published
  modifiedOn: Date; // When the set was last modified
  
  // Optional additional metadata
  series?: string; // Series name (for Pokemon)
  description?: string; // Set description
  totalCards?: number; // Total number of cards in set
  printedTotal?: number; // Printed total (for Pokemon)
  
  // Images and URLs
  images?: {
    symbol?: string;
    logo?: string;
  };
  
  // TCGPlayer specific data
  setUrl?: string; // URL to set on TCGPlayer or similar
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

const CardSetSchema = new Schema<ICardSet>({
  // Core set identification
  groupId: { 
    type: Number, 
    required: true, 
    unique: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  abbreviation: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // Game identification
  gameType: { 
    type: String, 
    required: true,
    enum: ['pokemon', 'yugioh', 'onepiece'],
    index: true 
  },
  categoryId: { 
    type: Number, 
    required: true,
    index: true 
  },
  
  // Set status and dates
  isSupplemental: { 
    type: Boolean, 
    required: true,
    default: false 
  },
  publishedOn: { 
    type: Date, 
    required: true,
    index: true 
  },
  modifiedOn: { 
    type: Date, 
    required: true 
  },
  
  // Optional additional metadata
  series: {
    type: String,
    index: true
  },
  description: String,
  totalCards: Number,
  printedTotal: Number,
  
  // Images and URLs
  images: {
    symbol: String,
    logo: String,
    _id: false
  },
  
  // TCGPlayer specific data
  setUrl: String
}, {
  timestamps: true,
  collection: 'cardsets'
});

// Create compound indexes for efficient queries
CardSetSchema.index({ name: 'text', description: 'text' }); // Text search
CardSetSchema.index({ gameType: 1, publishedOn: -1 }); // Filter by game and sort by date
CardSetSchema.index({ gameType: 1, isSupplemental: 1 }); // Filter by game and supplemental status
CardSetSchema.index({ categoryId: 1, gameType: 1 }); // Filter by category and game
CardSetSchema.index({ abbreviation: 1, gameType: 1 }); // Unique abbreviation per game

export const CardSet = model<ICardSet>('CardSet', CardSetSchema);