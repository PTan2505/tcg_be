import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRevenue extends Document {
  revenueType: "premium_subscription" | "marketplace_commission";
  amount: number;
  currency: string;
  orderId?: mongoose.Types.ObjectId;
  transactionId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  description?: string;
  metadata?: {
    premiumDuration?: string;
    commissionRate?: number;
    originalAmount?: number;
    sellerPayout?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const revenueSchema = new Schema<IRevenue>(
  {
    revenueType: {
      type: String,
      enum: ["premium_subscription", "marketplace_commission"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "VND",
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      sparse: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "MarketTransaction",
      sparse: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    description: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
revenueSchema.index({ revenueType: 1, createdAt: -1 });
revenueSchema.index({ userId: 1, revenueType: 1 });
revenueSchema.index({ createdAt: -1 });

// Static methods for revenue analytics
revenueSchema.statics = {
  async getTotalRevenue(
    startDate?: Date,
    endDate?: Date,
    revenueType?: string
  ) {
    const match: any = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = startDate;
      if (endDate) match.createdAt.$lte = endDate;
    }
    if (revenueType) match.revenueType = revenueType;

    const result = await this.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { totalRevenue: 0, count: 0 };
  },

  async getRevenueByType(startDate?: Date, endDate?: Date) {
    const match: any = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = startDate;
      if (endDate) match.createdAt.$lte = endDate;
    }

    const result = await this.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$revenueType",
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return result;
  },

  async getRevenueByDateRange(
    startDate: Date,
    endDate: Date,
    groupBy: "day" | "month" | "year" = "day"
  ) {
    const groupFormat: any = {
      day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
      year: { $dateToString: { format: "%Y", date: "$createdAt" } },
    };

    const result = await this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: groupFormat[groupBy],
          totalRevenue: { $sum: "$amount" },
          premiumRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$revenueType", "premium_subscription"] },
                "$amount",
                0,
              ],
            },
          },
          commissionRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$revenueType", "marketplace_commission"] },
                "$amount",
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result;
  },
};

const RevenueModel: Model<IRevenue> = mongoose.model<IRevenue>(
  "Revenue",
  revenueSchema
);

export default RevenueModel;
