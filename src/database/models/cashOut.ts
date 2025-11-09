import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBankInfo {
  bankName?: string;
  bankFullName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface ICashOut extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  bankInfo: IBankInfo;
  isCashOut: boolean;
  processedAt: Date | null;
  processedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const BankInfoSchema = new Schema<IBankInfo>(
  {
    bankName: { type: String },
    bankFullName: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },
  },
  { _id: false }
);

const cashOutSchema = new Schema<ICashOut>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    amount: { type: Number, required: true },
    bankInfo: { type: BankInfoSchema, default: {} },
    isCashOut: { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  { timestamps: true }
);

const CashOut: Model<ICashOut> = mongoose.model<ICashOut>(
  "cashouts",
  cashOutSchema
);

export default CashOut;
