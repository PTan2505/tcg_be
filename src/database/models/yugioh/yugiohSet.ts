import mongoose, { Document, Schema } from 'mongoose';

export interface IYugiohSet extends Document {
  // Set identification
  setName: string; // Official set name
  setCode: string; // Set code (e.g., "BLRR-EN084")
  
  // Card-specific set information
  cardExtId: number; // Reference to the YugiohCard
  setRarity: string; // Card rarity in this set
  setRarityCode?: string; // Rarity code (e.g., "(ScR)")
  setPrice?: string; // Price in this set ($ value)
  
  // TCGPlayer specific data (when tcgplayer_data=true)
  setEdition?: string; // Set edition information
  setUrl?: string; // TCGPlayer URL for this card in this set
  
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
    index: true 
  },
  
  // Card-specific set information
  cardExtId: { 
    type: Number, 
    required: true,
    ref: 'YugiohCard',
    index: true 
  },
  setRarity: { 
    type: String, 
    required: true,
    index: true 
  },
  setRarityCode: String,
  setPrice: String,
  
  // TCGPlayer specific data
  setEdition: String,
  setUrl: String
}, {
  timestamps: true,
  collection: 'yugiohsets'
});

// Create compound indexes for efficient queries
YugiohSetSchema.index({ cardExtId: 1, setCode: 1 }, { unique: true }); // Prevent duplicate entries
YugiohSetSchema.index({ setName: 1, setRarity: 1 }); // Filter by set and rarity
YugiohSetSchema.index({ setName: 'text' }); // Text search on set names

export const YugiohSet = mongoose.model<IYugiohSet>('YugiohSet', YugiohSetSchema);