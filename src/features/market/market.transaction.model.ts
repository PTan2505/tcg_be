import { model, Schema, Types } from 'mongoose';

export interface MarketTransaction {
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  priceTokens: number;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const MarketTransactionSchema = new Schema<MarketTransaction>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'MarketListing', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    priceTokens: { type: Number, required: true },
    status: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
  },
  { timestamps: true }
);

const MarketTransactionModel = model<MarketTransaction>('MarketTransaction', MarketTransactionSchema);
export default MarketTransactionModel;
