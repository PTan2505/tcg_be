import { Types } from 'mongoose';
import UserModel from '../../database/models/user';
import { NotificationService } from '../../shared/services/notification.service';
import { socketService } from '../../shared/services/socket.service';
import MarketListingModel from './market.model';
import MarketTransactionModel from './market.transaction.model';

class MarketService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }
  async createListing(sellerId: string, payload: any) {
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
    const listing = await MarketListingModel.findOne({ _id: listingId, sellerId: new Types.ObjectId(sellerId) });
    if (!listing) throw new Error('Listing not found or access denied');
    Object.assign(listing, payload);
    return await listing.save();
  }

  async removeListing(listingId: string, sellerId: string) {
    const listing = await MarketListingModel.findOne({ _id: listingId, sellerId: new Types.ObjectId(sellerId) });
    if (!listing) throw new Error('Listing not found or access denied');
    listing.status = 'removed';
    return await listing.save();
  }

  async buyListing(listingId: string, buyerId: string) {
    // Reserve listing and create transaction; hold tokens from buyer by decrementing balance (simple hold)
    const listing = await MarketListingModel.findById(listingId);
    if (!listing) throw new Error('Listing not found');
    if (listing.status !== 'available') throw new Error('Listing not available');

    const buyer = await UserModel.findById(buyerId);
    if (!buyer) throw new Error('Buyer not found');
    if (buyer.tokenBalance < listing.priceTokens) throw new Error('Insufficient token balance');

    // decrement buyer balance (hold)
    buyer.tokenBalance -= listing.priceTokens;
    await buyer.save();

    // mark listing reserved
    listing.status = 'reserved';
    await listing.save();

    const tx = await MarketTransactionModel.create({
      listingId: listing._id,
      buyerId: new Types.ObjectId(buyerId),
      sellerId: listing.sellerId,
      priceTokens: listing.priceTokens,
      status: 'processing',
    });

    // Notify seller that their listing has been reserved
    try {
      await this.notificationService.createNotification({
        recipient: listing.sellerId as any,
        sender: new Types.ObjectId(buyerId) as any,
        type: 'market:reserved',
        post: undefined,
        comment: undefined
      } as any);
      socketService.emitToUser((listing.sellerId as any).toString(), 'market:reserved', tx);
    } catch (e) {
      console.error('Failed to create/emit market reserved notification', e);
    }

    return tx;
  }

  async markShipped(transactionId: string, sellerId: string) {
    const tx = await MarketTransactionModel.findOne({ _id: transactionId, sellerId: new Types.ObjectId(sellerId) });
    if (!tx) throw new Error('Transaction not found or access denied');
    tx.status = 'shipped';
    await tx.save();

    // Notify buyer in DB and realtime
    try {
      await this.notificationService.createNotification({
        recipient: tx.buyerId as any,
        sender: tx.sellerId as any,
        type: 'market:shipped',
        post: undefined,
        comment: undefined
      } as any);
      socketService.emitToUser((tx.buyerId as any).toString(), 'market:shipped', tx);
    } catch (e) {
      console.error('Failed to create/emit market shipped notification', e);
    }
    return tx;
  }

  async confirmDelivered(transactionId: string, buyerId: string) {
    const tx = await MarketTransactionModel.findOne({ _id: transactionId, buyerId: new Types.ObjectId(buyerId) });
    if (!tx) throw new Error('Transaction not found or access denied');
    if (tx.status !== 'shipped') throw new Error('Transaction not shipped yet');

    tx.status = 'delivered';
    await tx.save();

    // transfer 95% to seller
    const seller = await UserModel.findById(tx.sellerId);
    if (!seller) throw new Error('Seller not found');
    const payout = Math.floor(tx.priceTokens * 0.95);
    seller.tokenBalance += payout;
    await seller.save();

    // mark listing sold
    await MarketListingModel.findByIdAndUpdate(tx.listingId, { status: 'sold' });

    // Notify seller in DB and realtime
    try {
      await this.notificationService.createNotification({
        recipient: tx.sellerId as any,
        sender: tx.buyerId as any,
        type: 'market:delivered',
        post: undefined,
        comment: undefined
      } as any);
      socketService.emitToUser((tx.sellerId as any).toString(), 'market:delivered', tx);
    } catch (e) {
      console.error('Failed to create/emit market delivered notification', e);
    }

    return tx;
  }

  async getListings(query: any = {}) {
    const q: any = { status: 'available' };
    if (query.gameType) q.gameType = query.gameType;
    if (query.cardName) q.cardName = { $regex: query.cardName, $options: 'i' };
    return await MarketListingModel.find(q).sort({ createdAt: -1 }).limit(100);
  }

  async getListingById(id: string) {
    return await MarketListingModel.findById(id);
  }
}

export default new MarketService();
