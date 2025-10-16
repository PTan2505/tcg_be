import mongoose, { Document, Schema } from 'mongoose';

export interface IUserCard extends Document {
  userId: Schema.Types.ObjectId;
  cardId: Schema.Types.ObjectId;
  gameType: string;
  setId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
    ref: 'Card'
  },
  gameType: {
    type: String,
    required: true,
    enum: ['pokemon', 'yugioh', 'onepiece']
  },
  setId: {
    type: Schema.Types.ObjectId,
    ref: 'CardSet',
    required: true
  }
}, {
  timestamps: true
});

// Create compound unique index
UserCardSchema.index(
  { userId: 1, cardId: 1 },
  { unique: true }
);

// Add indexes for filtering
UserCardSchema.index({ userId: 1, gameType: 1 });
UserCardSchema.index({ userId: 1, setId: 1 });
UserCardSchema.index({ userId: 1, gameType: 1, setId: 1 });

export const UserCard = mongoose.model<IUserCard>('UserCard', UserCardSchema);
