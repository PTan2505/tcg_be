import mongoose, { Document, Schema } from 'mongoose';

export interface IDeckCard {
  cardId: Schema.Types.ObjectId;
  quantity: number;
}

export interface IDeck extends Document {
  name: string;
  description?: string;
  userId: Schema.Types.ObjectId;
  gameType: string;
  cards: IDeckCard[];
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DeckCardSchema = new Schema<IDeckCard>({
  cardId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Card'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  }
});

const DeckSchema = new Schema<IDeck>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameType: {
    type: String,
    enum: ['pokemon', 'yugioh', 'onepiece'],
    required: true
  },
  cards: [DeckCardSchema],
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }]
}, {
  timestamps: true
});

// Index for efficient queries
DeckSchema.index({ userId: 1, name: 1 });
DeckSchema.index({ gameType: 1 });
DeckSchema.index({ isPublic: 1 });

// Virtual to get total card count
DeckSchema.virtual('totalCards').get(function() {
  return this.cards.reduce((total, card) => total + card.quantity, 0);
});

// Virtual to get unique card count
DeckSchema.virtual('uniqueCards').get(function() {
  return this.cards.length;
});

export const Deck = mongoose.model<IDeck>('Deck', DeckSchema);