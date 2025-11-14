import { UpdateResult } from "mongodb";
import mongoose, { Types } from "mongoose";
import RevenueModel from "../../database/models/revenue";
import UserModel from "../../database/models/user";
import { getMessage } from "../../shared/constants/messages";
import AppError from "../../shared/errors/AppError";
import { NotificationService } from "../../shared/services/notification.service";
import { socketService } from "../../shared/services/socket.service";
import tokenTransactionService from "../tokenTransactions/tokenTransaction.service";
import MarketListingModel from "./market.model";
import MarketTransactionModel from "./market.transaction.model";

const commission = Number(process.env.PERCENT_PER_TRANSACTION || "10") / 100;
class MarketService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }
  async createListing(sellerId: string, payload: any) {
    // Disallow market listings for freemium users
    const seller = await UserModel.findById(sellerId);
    if (seller && !seller.isPremium) {
      throw new AppError(getMessage("PREMIUM.MARKET_DISABLED"), 403);
    }

    const listing = await MarketListingModel.create({
      sellerId: new Types.ObjectId(sellerId),
      gameType: payload.gameType,
      cardName: payload.cardName,
      setCode: payload.setCode,
      priceTokens: payload.priceTokens,
      images: payload.images || [],
    });
    return listing;
  }

  async updateListing(listingId: string, sellerId: string, payload: any) {
    const listing = await MarketListingModel.findOne({
      _id: listingId,
      sellerId: new Types.ObjectId(sellerId),
    });
    if (!listing)
      throw new AppError(getMessage("MARKET.LISTING_NOT_FOUND"), 404);
    Object.assign(listing, payload);
    return await listing.save();
  }

  async removeListing(listingId: string, sellerId: string) {
    const listing = await MarketListingModel.findOne({
      _id: listingId,
      sellerId: new Types.ObjectId(sellerId),
    });
    if (!listing)
      throw new AppError(getMessage("MARKET.LISTING_NOT_FOUND"), 404);
    listing.status = "removed";
    return await listing.save();
  }

  async buyListing(listingId: string, buyerId: string) {
    // Reserve listing and create transaction; hold tokens from buyer by decrementing balance (simple hold)
    const listing = await MarketListingModel.findById(listingId);
    if (!listing)
      throw new AppError(getMessage("MARKET.LISTING_NOT_FOUND"), 404);
    if (listing.status !== "available")
      throw new AppError(getMessage("MARKET.LISTING_NOT_AVAILABLE"), 400);

    const buyer = await UserModel.findById(buyerId);
    if (!buyer) throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);

    // Disallow marketplace purchases for freemium users
    if (!buyer.isPremium) {
      throw new AppError(getMessage("PREMIUM.MARKET_DISABLED"), 403);
    }

    if (buyer.tokenBalance < listing.priceTokens)
      throw new AppError(getMessage("MARKET.INSUFFICIENT_TOKENS"), 400);

    // decrement buyer balance (hold)
    buyer.tokenBalance -= listing.priceTokens;
    await buyer.save();

    // mark listing reserved
    listing.status = "reserved";
    await listing.save();

    const tx = await MarketTransactionModel.create({
      listingId: listing._id,
      buyerId: new Types.ObjectId(buyerId),
      sellerId: listing.sellerId,
      priceTokens: listing.priceTokens,
      status: "processing",
    });

    // Log token transaction for market purchase
    try {
      await tokenTransactionService.createTransaction({
        userId: buyer._id,
        amount: -listing.priceTokens, // Negative for debit
        transactionType: "market_purchase",
        description: `Mua "${listing.cardName}" (${listing.setCode || "N/A"})`,
        referenceId: tx._id?.toString(),
        referenceModel: "MarketTransaction",
      });
    } catch (e) {
      console.error("Failed to create token transaction record", e);
    }

    // Notify seller that their listing has been reserved
    try {
      await this.notificationService.createNotification({
        recipient: listing.sellerId as any,
        sender: buyer,
        type: "market:reserved",
        transaction: tx._id,
        post: undefined,
        comment: undefined,
      } as any);
      socketService.emitToUser(
        (listing.sellerId as any).toString(),
        "market:reserved",
        tx
      );
    } catch (e) {
      console.error("Failed to create/emit market reserved notification", e);
    }

    return tx;
  }

  // Bulk buy multiple listings in a single transaction. Returns created transactions.
  async bulkBuy(buyerId: string, listingIds: string[]) {
    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      throw new AppError(
        getMessage("MARKET.INVALID_INPUT") || "No listings provided",
        400
      );
    }

    // dedupe ids
    const uniqueIds = Array.from(new Set(listingIds));

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Load listings
      const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
      const listings = await MarketListingModel.find({
        _id: { $in: objectIds },
      }).session(session);
      if (listings.length !== uniqueIds.length) {
        throw new AppError(
          getMessage("MARKET.LISTING_NOT_FOUND") ||
            "One or more listings not found",
          404
        );
      }

      // Ensure all listings are available
      for (const l of listings) {
        if (l.status !== "available") {
          throw new AppError(
            getMessage("MARKET.LISTING_NOT_AVAILABLE") ||
              "One or more listings not available",
            400
          );
        }
      }

      // Calculate total price
      const total = listings.reduce(
        (sum, l) => sum + (l.priceTokens as number),
        0
      );

      // Load buyer and check balance & premium status
      const buyer = await UserModel.findById(buyerId).session(session);
      if (!buyer) throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
      if (!buyer.isPremium)
        throw new AppError(getMessage("PREMIUM.MARKET_DISABLED"), 403);
      if (buyer.tokenBalance < total)
        throw new AppError(getMessage("MARKET.INSUFFICIENT_TOKENS"), 400);

      // Decrement buyer balance (hold)
      buyer.tokenBalance -= total;
      await buyer.save({ session });

      // Reserve listings (atomic update)
      const updateResult = (await MarketListingModel.updateMany(
        { _id: { $in: objectIds }, status: "available" },
        { $set: { status: "reserved" } },
        { session }
      )) as unknown as UpdateResult;

      // Prefer modifiedCount from modern drivers, fall back to matchedCount
      const modified =
        updateResult.modifiedCount ?? updateResult.matchedCount ?? 0;
      if (modified !== listings.length) {
        throw new AppError(
          getMessage("MARKET.LISTING_NOT_AVAILABLE") ||
            "Failed to reserve all listings",
          400
        );
      }

      // Create transactions
      const txDocs = listings.map((l) => ({
        listingId: l._id,
        buyerId: new Types.ObjectId(buyerId),
        sellerId: l.sellerId,
        priceTokens: l.priceTokens,
        status: "processing",
      }));

      const txs = await MarketTransactionModel.insertMany(txDocs, { session });

      // Log token transactions for each purchase (within transaction)
      try {
        for (let i = 0; i < listings.length; i++) {
          const listing = listings[i];
          await tokenTransactionService.createTransaction({
            userId: buyer._id,
            amount: -(listing.priceTokens as number), // Negative for debit
            transactionType: "market_purchase",
            description: `Mua "${listing.cardName}" (${
              listing.setCode || "N/A"
            })`,
            referenceId: txs[i]._id?.toString(),
            referenceModel: "MarketTransaction",
          });
        }
      } catch (e) {
        console.error(
          "Failed to create token transaction records for bulk buy",
          e
        );
      }

      await session.commitTransaction();
      session.endSession();

      // After commit, notify sellers and emit sockets
      for (const tx of txs) {
        try {
          const listing = listings.find(
            (l) => l._id.toString() === (tx.listingId as any).toString()
          );
          const sellerId = (tx.sellerId as any).toString();
          const buyerDoc = buyer; // from earlier
          await this.notificationService.createNotification({
            recipient: tx.sellerId as any,
            sender: buyerDoc,
            type: "market:reserved",
            transaction: tx._id,
            post: undefined,
            comment: undefined,
          } as any);
          socketService.emitToUser(sellerId, "market:reserved", tx);
        } catch (e) {
          console.error("Failed to notify seller for bulk buy tx", e);
        }
      }

      // Create a buyer-facing notification and emit the same event used for sellers
      try {
        // Build a lightweight sender snapshot for the notification (use buyer info)
        const buyerSnapshot = {
          _id: buyer._id,
          username: (buyer as any).username,
          firstName: (buyer as any).firstName,
          lastName: (buyer as any).lastName,
          avatarUrl: (buyer as any).avatarUrl,
        };

        // Create a single notification for the buyer using the same 'market:reserved' type
        await this.notificationService.createNotification({
          recipient: buyer._id as any,
          sender: buyerSnapshot as any,
          type: "market:reserved",
          // link to first transaction for convenience
          transaction: txs[0]._id as any,
        } as any);

        // Emit the same websocket event name 'market:reserved' to the buyer with the created transactions
        try {
          socketService.emitToUser(
            (buyer._id as any).toString(),
            "market:reserved",
            txs
          );
        } catch (e) {
          console.warn("Failed to emit reserved websocket to buyer", e);
        }
      } catch (e) {
        console.warn("Failed to create/emit buyer reserved notification", e);
      }

      return txs;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  async markShipped(transactionId: string, sellerId: string) {
    // Ensure seller is premium
    const seller = await UserModel.findById(sellerId);
    if (seller && !seller.isPremium) {
      throw new AppError(getMessage("PREMIUM.MARKET_DISABLED"), 403);
    }

    const tx = await MarketTransactionModel.findOne({
      _id: transactionId,
      sellerId: new Types.ObjectId(sellerId),
    });
    if (!tx) throw new AppError(getMessage("MARKET.LISTING_NOT_FOUND"), 404);
    tx.status = "shipped";
    await tx.save();

    // Notify buyer in DB and realtime
    try {
      await this.notificationService.createNotification({
        recipient: tx.buyerId as any,
        sender: seller,
        type: "market:shipped",
        transaction: tx._id,
        post: undefined,
        comment: undefined,
      } as any);
      socketService.emitToUser(
        (tx.buyerId as any).toString(),
        "market:shipped",
        tx
      );
    } catch (e) {
      console.error("Failed to create/emit market shipped notification", e);
    }
    return tx;
  }

  async confirmDelivered(transactionId: string, buyerId: string) {
    // Ensure buyer is premium
    const buyer = await UserModel.findById(buyerId);
    if (buyer && !buyer.isPremium) {
      throw new AppError(getMessage("PREMIUM.MARKET_DISABLED"), 403);
    }

    const tx = await MarketTransactionModel.findOne({
      _id: transactionId,
      buyerId: new Types.ObjectId(buyerId),
    });
    if (!tx) throw new AppError(getMessage("MARKET.LISTING_NOT_FOUND"), 404);
    if (tx.status !== "shipped")
      throw new AppError(getMessage("MARKET.TRANSACTION_NOT_SHIPPED"), 400);

    tx.status = "delivered";
    await tx.save();

    // transfer 95% to seller
    const seller = await UserModel.findById(tx.sellerId);
    if (!seller) throw new AppError(getMessage("MARKET.SELLER_NOT_FOUND"), 404);
    const payout = tx.priceTokens * (1 - commission);
    const commissionAmount = tx.priceTokens * commission;
    seller.tokenBalance += payout;
    await seller.save();

    // Log revenue from marketplace commission
    try {
      const listing = await MarketListingModel.findById(tx.listingId);
      await RevenueModel.create({
        revenueType: "marketplace_commission",
        amount: commissionAmount,
        currency: "VND",
        transactionId: tx._id,
        userId: seller._id,
        description: `Commission từ bán "${listing?.cardName || "N/A"}" (${
          listing?.setCode || "N/A"
        })`,
        metadata: {
          commissionRate: commission,
          originalAmount: tx.priceTokens,
          sellerPayout: payout,
        },
      });
    } catch (e) {
      console.error("Failed to log revenue record", e);
    }

    // mark listing sold
    await MarketListingModel.findByIdAndUpdate(tx.listingId, {
      status: "sold",
    });

    // Log token transaction for market sale
    try {
      const listing = await MarketListingModel.findById(tx.listingId);
      await tokenTransactionService.createTransaction({
        userId: seller._id,
        amount: payout, // Positive for credit
        transactionType: "market_sale",
        description: `Bán "${listing?.cardName || "N/A"}" (${
          listing?.setCode || "N/A"
        })`,
        referenceId: tx._id?.toString(),
        referenceModel: "MarketTransaction",
      });
    } catch (e) {
      console.error("Failed to create token transaction record", e);
    }

    // Notify seller in DB and realtime
    try {
      await this.notificationService.createNotification({
        recipient: tx.sellerId as any,
        sender: buyer,
        type: "market:delivered",
        transaction: tx._id,
        post: undefined,
        comment: undefined,
      } as any);
      socketService.emitToUser(
        (tx.sellerId as any).toString(),
        "market:delivered",
        tx
      );
    } catch (e) {
      console.error("Failed to create/emit market delivered notification", e);
    }

    return tx;
  }

  async getListings(query: any = {}) {
    const q: any = { status: "available" };
    if (query.gameType) q.gameType = query.gameType;
    if (query.cardName) q.cardName = { $regex: query.cardName, $options: "i" };
    return await MarketListingModel.find(q)
      .populate("sellerId")
      .sort({ createdAt: -1 })
      .limit(100);
  }

  async getListingById(id: string) {
    return await MarketListingModel.findById(id).populate("sellerId");
  }

  // Get listings created by a specific seller (all statuses)
  async getTransactionsBySeller(sellerId: string, query: any = {}) {
    const q: any = { sellerId: new Types.ObjectId(sellerId) };
    if (query.status) q.status = query.status;
    return await MarketTransactionModel.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({
        path: "listingId",
        select: "gameType cardName setCode images",
      })
      .populate({
        path: "buyerId",
        select: "username firstName lastName",
      });
  }

  // Get transactions where the user is the buyer
  async getTransactionsByBuyer(buyerId: string, query: any = {}) {
    const q: any = { buyerId: new Types.ObjectId(buyerId) };
    if (query.status) q.status = query.status;
    return await MarketTransactionModel.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({
        path: "listingId",
        select: "gameType cardName setCode images",
      })
      .populate({
        path: "sellerId",
        select: "username firstName lastName",
      });
  }

  // Buyer cancels a transaction within 24 hours of creation
  async cancelTransactionByBuyer(transactionId: string, buyerId: string) {
    const tx = await MarketTransactionModel.findOne({
      _id: transactionId,
      buyerId: new Types.ObjectId(buyerId),
    });
    if (!tx)
      throw new AppError(
        getMessage("MARKET.TRANSACTION_NOT_FOUND") || "Transaction not found",
        404
      );
    if (tx.status === "cancelled")
      throw new AppError(
        getMessage("MARKET.TRANSACTION_ALREADY_CANCELLED") ||
          "Transaction already cancelled",
        400
      );

    const createdAt = tx.createdAt as Date;
    const now = new Date();
    if (tx.status === "shipped" || tx.status === "delivered")
      throw new AppError(
        getMessage("MARKET.CANCEL_WINDOW_EXPIRED") || "Cancel window expired",
        400
      );

    // Refund buyer
    const buyer = await UserModel.findById(buyerId);
    if (!buyer)
      throw new AppError(
        getMessage("AUTH.USER_NOT_FOUND") || "Buyer not found",
        404
      );
    buyer.tokenBalance += tx.priceTokens;
    await buyer.save();

    // Mark tx cancelled
    tx.status = "cancelled";
    await tx.save();

    // Log token transaction for refund (cancelled purchase)
    try {
      const listing = await MarketListingModel.findById(tx.listingId);
      await tokenTransactionService.createTransaction({
        userId: buyer._id,
        amount: tx.priceTokens, // Positive for refund
        transactionType: "market_purchase", // Still market_purchase type, but positive amount
        description: `Hoàn tiền hủy mua "${listing?.cardName || "N/A"}"`,
        referenceId: tx._id?.toString(),
        referenceModel: "MarketTransaction",
      });
    } catch (e) {
      console.error("Failed to create token transaction record for refund", e);
    }

    // Make listing available again
    try {
      await MarketListingModel.findByIdAndUpdate(tx.listingId, {
        status: "available",
      });
    } catch (e) {
      console.warn("Failed to set listing available after cancel", e);
    }

    // Notifications
    try {
      await this.notificationService.createNotification({
        recipient: tx.sellerId as any,
        sender: buyer,
        type: "market:cancelled",
        transaction: tx._id,
        post: undefined,
        comment: undefined,
      } as any);
      socketService.emitToUser(
        (tx.sellerId as any).toString(),
        "market:cancelled",
        tx
      );
      socketService.emitToUser(
        (tx.buyerId as any).toString(),
        "market:cancelled",
        tx
      );
    } catch (e) {
      console.error("Failed to create/emit market cancelled notification", e);
    }

    return tx;
  }
}

export default new MarketService();
