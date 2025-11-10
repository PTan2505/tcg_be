import mongoose from "mongoose";
import TokenTransactionModel, {
  TransactionType,
} from "../../database/models/tokenTransaction";

interface CreateTransactionParams {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  transactionType: TransactionType;
  description: string;
  referenceId?: string | mongoose.Types.ObjectId;
  referenceModel?: "Order" | "CashOut" | "MarketListing" | "MarketTransaction";
}

interface GetTransactionsQuery {
  page?: number;
  limit?: number;
  transactionType?: TransactionType;
  startDate?: string;
  endDate?: string;
}

class TokenTransactionService {
  /**
   * Create a new token transaction record
   * This should be called whenever a user's token balance changes
   */
  async createTransaction(params: CreateTransactionParams) {
    const transaction = await TokenTransactionModel.create({
      userId: new mongoose.Types.ObjectId(params.userId.toString()),
      amount: params.amount,
      transactionType: params.transactionType,
      description: params.description,
      referenceId: params.referenceId
        ? new mongoose.Types.ObjectId(params.referenceId.toString())
        : undefined,
      referenceModel: params.referenceModel,
    });

    return transaction;
  }

  /**
   * Get user's token transaction history with filters and pagination
   */
  async getUserTransactions(userId: string, query: GetTransactionsQuery = {}) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const { page = 1, limit = 20, transactionType, startDate, endDate } = query;

    // Build query
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    // Add transaction type filter
    if (transactionType) {
      filter.transactionType = transactionType;
    }

    // Add date range filters
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const lim = Math.min(100, Math.max(1, Number(limit))); // Max 100 items per page
    const skip = (pageNum - 1) * lim;

    // Get total count and transactions
    const [total, transactions] = await Promise.all([
      TokenTransactionModel.countDocuments(filter),
      TokenTransactionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / lim);

    // Calculate totals by type for summary
    const summary = await TokenTransactionModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$transactionType",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: lim,
        totalPages,
      },
      summary,
    };
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserStats(userId: string) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId");
    }

    const stats = await TokenTransactionModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] },
          },
          totalDebits: {
            $sum: { $cond: [{ $lt: ["$amount", 0] }, "$amount", 0] },
          },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    return (
      stats[0] || {
        totalCredits: 0,
        totalDebits: 0,
        totalTransactions: 0,
      }
    );
  }
}

export default new TokenTransactionService();
