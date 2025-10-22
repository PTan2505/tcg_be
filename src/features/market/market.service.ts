import { Types } from "mongoose";
import UserModel from "../../database/models/user";
import { getMessage } from "../../shared/constants/messages";
import AppError from "../../shared/errors/AppError";
import { NotificationService } from "../../shared/services/notification.service";
import { socketService } from "../../shared/services/socket.service";
import MarketListingModel from "./market.model";
import MarketTransactionModel from "./market.transaction.model";

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

    // Notify seller that their listing has been reserved
    try {
      await this.notificationService.createNotification({
        recipient: listing.sellerId as any,
        sender: new Types.ObjectId(buyerId) as any,
        type: "market:reserved",
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
        sender: tx.sellerId as any,
        type: "market:shipped",
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
    const payout = Math.floor(tx.priceTokens * 0.95);
    seller.tokenBalance += payout;
    await seller.save();

    // mark listing sold
    await MarketListingModel.findByIdAndUpdate(tx.listingId, {
      status: "sold",
    });

    // Notify seller in DB and realtime
    try {
      await this.notificationService.createNotification({
        recipient: tx.sellerId as any,
        sender: tx.buyerId as any,
        type: "market:delivered",
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
    return await MarketListingModel.find(q).sort({ createdAt: -1 }).limit(100);
  }

  async getListingById(id: string) {
    return await MarketListingModel.findById(id);
  }

  // Get listings created by a specific seller (all statuses)
  async getListingsBySeller(sellerId: string, query: any = {}) {
    const q: any = { sellerId: new Types.ObjectId(sellerId) };
    if (query.gameType) q.gameType = query.gameType;
    if (query.cardName) q.cardName = { $regex: query.cardName, $options: "i" };
    return await MarketListingModel.find(q)
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
        sender: tx.buyerId as any,
        type: "market:cancelled",
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
