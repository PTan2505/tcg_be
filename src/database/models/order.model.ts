import { model, Schema, Types } from 'mongoose';

export interface Order {
  userId: Types.ObjectId;
  orderType: 'premium' | 'tokens' | string;
  amount: number;
  currency: string;
  provider?: string; // e.g., 'momo'
  paymentInfo?: any;
  tokenCount?: number; // if orderType === 'tokens'
  isPaid?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<Order>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    orderType: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "VND" },
    provider: { type: String },
    paymentInfo: { type: Schema.Types.Mixed },
    tokenCount: { type: Number },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const OrderModel = model<Order>('Order', OrderSchema);
export default OrderModel;
