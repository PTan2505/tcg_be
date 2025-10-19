import { model, Schema, Types } from 'mongoose';

export interface Order {
  userId: Types.ObjectId;
  orderType: 'premium' | 'tokens' | string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  provider?: string; // e.g., 'momo'
  providerOrderId?: string;
  tokenCount?: number; // if orderType === 'tokens'
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<Order>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  orderType: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'VND' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  provider: { type: String },
  providerOrderId: { type: String },
  tokenCount: { type: Number },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

const OrderModel = model<Order>('Order', OrderSchema);
export default OrderModel;
