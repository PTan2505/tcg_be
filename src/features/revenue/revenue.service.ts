import RevenueModel from "../../database/models/revenue";
import { getMessage } from "../../shared/constants/messages";
import AppError from "../../shared/errors/AppError";

interface RevenueQuery {
  startDate?: string;
  endDate?: string;
  revenueType?: "premium_subscription" | "marketplace_commission";
  groupBy?: "day" | "month" | "year";
}

class RevenueService {
  /**
   * Get total revenue with optional filters
   */
  async getTotalRevenue(query: RevenueQuery = {}) {
    const { startDate, endDate, revenueType } = query;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const result = await (RevenueModel as any).getTotalRevenue(
      start,
      end,
      revenueType
    );

    return {
      totalRevenue: result.totalRevenue || 0,
      count: result.count || 0,
      period: {
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
      },
      revenueType: revenueType || "all",
    };
  }

  /**
   * Get revenue breakdown by type
   */
  async getRevenueByType(query: RevenueQuery = {}) {
    const { startDate, endDate } = query;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const result = await (RevenueModel as any).getRevenueByType(start, end);

    // Calculate total for percentages
    const totalRevenue = result.reduce(
      (sum: number, item: any) => sum + item.totalRevenue,
      0
    );

    return {
      breakdown: result.map((item: any) => ({
        revenueType: item._id,
        totalRevenue: item.totalRevenue,
        count: item.count,
        percentage:
          totalRevenue > 0
            ? Number(((item.totalRevenue / totalRevenue) * 100).toFixed(2))
            : 0,
      })),
      totalRevenue,
      period: {
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
      },
    };
  }

  /**
   * Get revenue over time with grouping
   */
  async getRevenueByDateRange(query: RevenueQuery = {}) {
    const { startDate, endDate, groupBy = "day" } = query;

    if (!startDate || !endDate) {
      throw new AppError(getMessage("REVENUE.DATE_RANGE_REQUIRED"), 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new AppError(getMessage("REVENUE.INVALID_DATE_RANGE"), 400);
    }

    const result = await (RevenueModel as any).getRevenueByDateRange(
      start,
      end,
      groupBy
    );

    return {
      timeline: result.map((item: any) => ({
        period: item._id,
        totalRevenue: item.totalRevenue,
        premiumRevenue: item.premiumRevenue,
        commissionRevenue: item.commissionRevenue,
        count: item.count,
      })),
      groupBy,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    };
  }

  /**
   * Get revenue statistics summary
   */
  async getRevenueSummary(query: RevenueQuery = {}) {
    const { startDate, endDate } = query;

    // Get total revenue for current period
    const total = await this.getTotalRevenue({ startDate, endDate });

    // Calculate previous period for revenueChange
    let revenueChange = 0;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const periodLength = end.getTime() - start.getTime();

      const prevStart = new Date(start.getTime() - periodLength);
      const prevEnd = new Date(start.getTime() - 1); // Day before current period

      const previousTotal = await this.getTotalRevenue({
        startDate: prevStart.toISOString(),
        endDate: prevEnd.toISOString(),
      });

      if (previousTotal.totalRevenue > 0) {
        revenueChange =
          ((total.totalRevenue - previousTotal.totalRevenue) /
            previousTotal.totalRevenue) *
          100;
      } else if (total.totalRevenue > 0) {
        revenueChange = 100; // 100% increase if previous was 0
      }
    }

    // Get breakdown by type
    const breakdown = await this.getRevenueByType({ startDate, endDate });

    // Calculate percentages
    const premiumItem = breakdown.breakdown.find(
      (b: any) => b.revenueType === "premium_subscription"
    );
    const commissionItem = breakdown.breakdown.find(
      (b: any) => b.revenueType === "marketplace_commission"
    );

    const premiumRevenue = premiumItem?.totalRevenue || 0;
    const commissionRevenue = commissionItem?.totalRevenue || 0;

    return {
      totalRevenue: total.totalRevenue,
      revenueChange: Number(revenueChange.toFixed(2)), // Frontend expects this field
      totalTransactions: total.count,
      breakdown: {
        premiumSubscriptions: {
          revenue: premiumRevenue,
          count: premiumItem?.count || 0,
          percentage:
            total.totalRevenue > 0
              ? Number(((premiumRevenue / total.totalRevenue) * 100).toFixed(2))
              : 0,
        },
        marketplaceCommissions: {
          revenue: commissionRevenue,
          count: commissionItem?.count || 0,
          percentage:
            total.totalRevenue > 0
              ? Number(
                  ((commissionRevenue / total.totalRevenue) * 100).toFixed(2)
                )
              : 0,
        },
      },
      period: {
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
      },
    };
  }

  /**
   * Get recent revenue records with pagination
   */
  async getRecentRevenue(
    page = 1,
    limit = 20,
    revenueType?: string,
    startDate?: string,
    endDate?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (revenueType) {
      query.revenueType = revenueType;
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      RevenueModel.find(query)
        .populate("userId", "username email firstName lastName avatar")
        .populate(
          "orderId",
          "orderType amount currency isPaid provider paymentInfo createdAt"
        )
        .populate(
          "transactionId",
          "priceTokens status buyer seller listing createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RevenueModel.countDocuments(query),
    ]);

    // Transform records to match frontend expectations
    const transformedRecords = records.map((record: any) => ({
      _id: record._id,
      revenueType: record.revenueType,
      amount: record.amount,
      currency: record.currency,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      metadata: record.metadata,
      // User info for RevenueDetailsModal
      user: record.userId
        ? {
            _id: record.userId._id,
            username: record.userId.username,
            email: record.userId.email,
            firstName: record.userId.firstName,
            lastName: record.userId.lastName,
            avatar: record.userId.avatar,
          }
        : null,
      // Related order info for RevenueDetailsModal
      relatedOrder: record.orderId
        ? {
            _id: record.orderId._id,
            orderType: record.orderId.orderType,
            amount: record.orderId.amount,
            currency: record.orderId.currency,
            isPaid: record.orderId.isPaid,
            provider: record.orderId.provider,
            createdAt: record.orderId.createdAt,
          }
        : null,
      // Payment info for RevenueDetailsModal
      paymentInfo: record.orderId?.paymentInfo || null,
      // Transaction info for marketplace commissions
      relatedTransaction: record.transactionId
        ? {
            _id: record.transactionId._id,
            priceTokens: record.transactionId.priceTokens,
            status: record.transactionId.status,
            buyer: record.transactionId.buyer,
            seller: record.transactionId.seller,
            listing: record.transactionId.listing,
            createdAt: record.transactionId.createdAt,
          }
        : null,
    }));

    return {
      records: transformedRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new RevenueService();
