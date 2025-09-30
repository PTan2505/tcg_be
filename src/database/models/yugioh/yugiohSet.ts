import mongoose, { Document, Schema } from 'mongoose';

export interface IYugiohSet extends Document {
  // Set identification
  setName: string; // Official set name (e.g., "Battles of Legend: Relentless Revenge")
  setCode: string; // Set code (e.g., "BLRR-EN084")
  
  // Set-specific rarity and pricing information
  setRarity: string; // Card rarity in this set (e.g., "Secret Rare")
  setRarityCode?: string; // Rarity code (e.g., "(ScR)")
  setPrice?: string; // Price in this set ($ value, e.g., "4.08")
  
  // Additional set information
  releaseDate?: Date; // Set release date
  description?: string; // Set description
  series?: string; // Series or category
  
  // TCGPlayer specific data
  setEdition?: string; // Set edition information
  setUrl?: string; // TCGPlayer URL for this set
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

const YugiohSetSchema = new Schema<IYugiohSet>({
  // Set identification
  setName: { 
    type: String, 
    required: true,
    index: true 
  },
  setCode: { 
    type: String, 
    required: true,
    unique: true,
    index: true 
  },
  
  // Set-specific rarity and pricing information
  setRarity: { 
    type: String, 
    required: true,
    index: true 
  },
  setRarityCode: String,
  setPrice: String,
  
  // Additional set information
  releaseDate: {
    type: Date,
    index: true
  },
  description: String,
  series: {
    type: String,
    index: true
  },
  
  // TCGPlayer specific data
  setEdition: String,
  setUrl: String
}, {
  timestamps: true,
  collection: 'yugiohsets'
});

// Create compound indexes for efficient queries
YugiohSetSchema.index({ setName: 'text', description: 'text' }); // Text search on set names and description
YugiohSetSchema.index({ setName: 1, setRarity: 1 }); // Filter by set name and rarity
YugiohSetSchema.index({ series: 1, releaseDate: 1 }); // Filter by series and release date
YugiohSetSchema.index({ setRarity: 1, setPrice: 1 }); // Filter by rarity and price

export const YugiohSet = mongoose.model<IYugiohSet>('YugiohSet', YugiohSetSchema);