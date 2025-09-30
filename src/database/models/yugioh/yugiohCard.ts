import mongoose, { Document, Schema } from 'mongoose';

// Interface for card images
interface ICardImage {
  id: number;
  imageUrl: string;
  imageUrlSmall: string;
  imageUrlCropped: string;
}

// Interface for card prices
interface ICardPrice {
  cardmarketPrice?: string;
  tcgplayerPrice?: string;
  ebayPrice?: string;
  amazonPrice?: string;
  coolstuffincPrice?: string;
}

// Interface for banlist information
interface IBanlistInfo {
  banTcg?: string;
  banOcg?: string;
  banGoat?: string;
}

export interface IYugiohCard extends Document {
  // Core card identification
  cardExtId: number; // API 'id' field - 8-digit passcode
  konamiId?: string; // Konami ID (different from passcode)
  name: string;
  
  // Set references (card can appear in multiple sets)
  cardSets: mongoose.Types.ObjectId[]; // Array of references to YugiohSet
  
  // Card type and frame information
  type: string; // Normal Monster, Effect Monster, Synchro Monster, etc.
  frameType?: string; // normal, effect, synchro, spell, trap, etc.
  
  // Card description
  desc: string; // Card description/effect
  
  // Monster-specific attributes
  atk?: number;
  def?: number;
  level?: number; // Level/RANK for monsters
  race?: string; // Spellcaster, Warrior, Insect, etc. (also used for Spell/Trap types)
  attribute?: string; // WIND, FIRE, WATER, etc.
  
  // Archetype information
  archetype?: string;
  
  // Pendulum-specific
  scale?: number; // Pendulum Scale Value
  
  // Link Monster-specific
  linkval?: number; // Link Value
  linkmarkers?: string[]; // Link Markers array
  
  // Images array (converted from snake_case to camelCase)
  cardImages?: ICardImage[];
  
  // Prices array (converted from snake_case to camelCase)
  cardPrices?: ICardPrice[];
  
  // Banlist information (converted from snake_case to camelCase)
  banlistInfo?: IBanlistInfo;
  
  // Additional information (misc=yes response)
  ygoprodeckUrl?: string;
  betaName?: string;
  views?: number;
  viewsweek?: number;
  upvotes?: number;
  downvotes?: number;
  formats?: string[]; // tcg, ocg, master duel, goat, etc.
  treatedAs?: string; // If card is treated as another card
  tcgDate?: string; // Original TCG release date
  ocgDate?: string; // Original OCG release date
  mdRarity?: string; // Master Duel rarity
  hasEffect?: number; // 1 = true, 0 = false
  genesysPoints?: number; // Genesys format points (when format = genesys)
  
  // Staple information
  staple?: boolean;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const YugiohCardSchema = new Schema<IYugiohCard>({
  // Core card identification
  cardExtId: { 
    type: Number, 
    required: true, 
    unique: true,
    index: true 
  },
  konamiId: { 
    type: String, 
    sparse: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // Set references array
  cardSets: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'YugiohSet'
  }],
  
  // Card type and frame information
  type: { 
    type: String, 
    required: true,
    index: true 
  },
  frameType: { 
    type: String,
    index: true 
  },
  
  // Card description
  desc: { type: String, required: true },
  
  // Monster-specific attributes
  atk: { 
    type: Number,
    index: true 
  },
  def: { 
    type: Number,
    index: true 
  },
  level: { 
    type: Number,
    index: true 
  },
  race: { 
    type: String,
    index: true 
  },
  attribute: { 
    type: String,
    index: true 
  },
  
  // Archetype information
  archetype: { 
    type: String,
    index: true 
  },
  
  // Pendulum-specific
  scale: { 
    type: Number,
    index: true 
  },
  
  // Link Monster-specific
  linkval: { 
    type: Number,
    index: true 
  },
  linkmarkers: [{ type: String }],
  
  // Images array
  cardImages: [{
    id: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    imageUrlSmall: { type: String, required: true },
    imageUrlCropped: { type: String, required: true }
  }],
  
  // Prices array
  cardPrices: [{
    cardmarketPrice: String,
    tcgplayerPrice: String,
    ebayPrice: String,
    amazonPrice: String,
    coolstuffincPrice: String
  }],
  
  // Banlist information
  banlistInfo: {
    banTcg: String,
    banOcg: String,
    banGoat: String
  },
  
  // Additional information
  ygoprodeckUrl: String,
  betaName: String,
  views: { 
    type: Number,
    default: 0 
  },
  viewsweek: { 
    type: Number,
    default: 0 
  },
  upvotes: { 
    type: Number,
    default: 0 
  },
  downvotes: { 
    type: Number,
    default: 0 
  },
  formats: [{ type: String }],
  treatedAs: String,
  tcgDate: String,
  ocgDate: String,
  mdRarity: String,
  hasEffect: { 
    type: Number,
    enum: [0, 1] 
  },
  genesysPoints: { 
    type: Number,
    default: 0 
  },
  
  // Staple information
  staple: { 
    type: Boolean,
    default: false,
    index: true 
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'yugiohcards'
});

// Create compound indexes for common queries
YugiohCardSchema.index({ name: 'text', desc: 'text' }); // Text search
YugiohCardSchema.index({ type: 1, race: 1 }); // Filter by type and race
YugiohCardSchema.index({ attribute: 1, level: 1 }); // Filter by attribute and level
YugiohCardSchema.index({ atk: 1, def: 1 }); // Filter by ATK/DEF
YugiohCardSchema.index({ archetype: 1, type: 1 }); // Archetype filtering
YugiohCardSchema.index({ cardSets: 1 }); // Find cards in specific sets
YugiohCardSchema.index({ name: 1, cardSets: 1 }); // Cards by name in specific sets

export const YugiohCard = mongoose.model<IYugiohCard>('YugiohCard', YugiohCardSchema);