import mongoose, { Document, Schema } from 'mongoose';

export enum CardCategory {
  POKEMON = "PokemonCard",
  YUGIOH = "YugiohCard",
}

export interface IUserCard extends Document {
  userId: Schema.Types.ObjectId;
  cardId: Schema.Types.ObjectId;
  category: CardCategory;
  addedAt: Date;
  // You can add more fields like quantity, condition, etc. if needed
}

const UserCardSchema = new Schema<IUserCard>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardId: {
    type: Schema.Types.ObjectId,
    required: true,
    // We'll use refPath to dynamically reference different card collections
    refPath: 'category'
  },
  category: {
    type: String,
    enum: Object.values(CardCategory),
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound unique index
UserCardSchema.index(
  { userId: 1, cardId: 1, category: 1 },
  { unique: true }
);

export const UserCard = mongoose.model<IUserCard>('UserCard', UserCardSchema);
