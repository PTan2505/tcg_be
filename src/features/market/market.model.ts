import { model, Schema, Types } from 'mongoose';

export interface MarketListing {
  sellerId: Types.ObjectId;
  gameType: string;
  cardName: string;
  setCode?: string;
  priceTokens: number;
  images: string[];
  status: 'available' | 'reserved' | 'sold' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

const MarketListingSchema = new Schema<MarketListing>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gameType: { type: String, required: true },
    cardName: { type: String, required: true },
    setCode: { type: String },
    priceTokens: { type: Number, required: true, min: 0 },
    images: [{ type: String }],
    status: { type: String, enum: ['available', 'reserved', 'sold', 'removed'], default: 'available' },
  },
  { timestamps: true }
);

const MarketListingModel = model<MarketListing>('MarketListing', MarketListingSchema);
export default MarketListingModel;
