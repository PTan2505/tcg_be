import mongoose, { Document, Model, Schema } from "mongoose";

export type TransactionType =
  | "buy_tokens"
  | "cashout"
  | "market_purchase"
  | "market_sale";

export interface ITokenTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number; // Positive for credit, negative for debit
  transactionType: TransactionType;
  referenceId?: mongoose.Types.ObjectId;
  referenceModel?: "Order" | "CashOut" | "MarketListing" | "MarketTransaction";
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const tokenTransactionSchema = new Schema<ITokenTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: ["buy_tokens", "cashout", "market_purchase", "market_sale"],
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      refPath: "referenceModel",
    },
    referenceModel: {
      type: String,
      enum: ["Order", "CashOut", "MarketListing", "MarketTransaction"],
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    // Make it immutable - prevent updates
    strict: true,
  }
);

// Add compound index for efficient queries
tokenTransactionSchema.index({ userId: 1, createdAt: -1 });
tokenTransactionSchema.index({ userId: 1, transactionType: 1, createdAt: -1 });

// Prevent updates after creation
tokenTransactionSchema.pre("save", function (next) {
  if (!this.isNew) {
    throw new Error(
      "TokenTransaction records cannot be modified after creation"
    );
  }
  next();
});

const TokenTransactionModel: Model<ITokenTransaction> =
  mongoose.model<ITokenTransaction>(
    "tokentransactions",
    tokenTransactionSchema
  );

export default TokenTransactionModel;
