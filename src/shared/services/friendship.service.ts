import { Types } from "mongoose";
import FriendshipModel, { Friendship } from "../../database/models/friendship";
import { NotificationService } from "./notification.service";

export class FriendshipService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async sendFriendRequest(requesterId: Types.ObjectId, recipientId: Types.ObjectId): Promise<Friendship> {
    // Disallow friendship actions for freemium users
    try {
      const requester = await (await import('../../database/models/user')).default.findById(requesterId.toString());
      if (requester && !requester.isPremium) {
        const { getMessage } = await import('../../shared/constants/messages');
        const AppErrorMod = await import('../../shared/errors/AppError');
        throw new AppErrorMod.default(getMessage('PREMIUM.SOCIAL_DISABLED'), 403);
      }
    } catch (e: any) {
      if (e instanceof Error) throw e;
    }
    // Check if trying to send request to self
    if (requesterId.toString() === recipientId.toString()) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if they're already friends or have pending request
    const existingFriendship = await FriendshipModel.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        throw new Error('Already friends');
      }
      if (existingFriendship.status === 'pending') {
        throw new Error('Friend request already sent');
      }
      if (existingFriendship.status === 'blocked') {
        throw new Error('Cannot send friend request');
      }
    }

    const friendship = new FriendshipModel({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    const savedFriendship = await friendship.save();

    // Create notification
    await this.notificationService.createNotification({
      recipient: recipientId,
      sender: requesterId,
      type: 'friend_request',
    });

    return savedFriendship;
  }

  async respondToFriendRequest(friendshipId: Types.ObjectId, userId: Types.ObjectId, action: 'accept' | 'decline'): Promise<Friendship | null> {
    const friendship = await FriendshipModel.findOneAndUpdate(
      { _id: friendshipId, recipient: userId, status: 'pending' },
      { status: action === 'accept' ? 'accepted' : 'declined' },
      { new: true }
    );

    if (friendship && action === 'accept') {
      // Create notification for acceptance
      await this.notificationService.createNotification({
        recipient: friendship.requester,
        sender: userId,
        type: 'friend_accept',
      });
    }

    return friendship;
  }

  async unfriend(userId: Types.ObjectId, friendId: Types.ObjectId): Promise<boolean> {
    const result = await FriendshipModel.deleteOne({
      $or: [
        { requester: userId, recipient: friendId, status: 'accepted' },
        { requester: friendId, recipient: userId, status: 'accepted' }
      ]
    });

    return result.deletedCount > 0;
  }

  async blockUser(blockerId: Types.ObjectId, blockedId: Types.ObjectId): Promise<boolean> {
    // Check if trying to block self
    if (blockerId.toString() === blockedId.toString()) {
      throw new Error('Cannot block yourself');
    }

    // Remove any existing friendship
    await FriendshipModel.deleteOne({
      $or: [
        { requester: blockerId, recipient: blockedId },
        { requester: blockedId, recipient: blockerId }
      ]
    });

    // Create block relationship
    await FriendshipModel.create({
      requester: blockerId,
      recipient: blockedId,
      status: 'blocked'
    });

    return true;
  }

  async unblockUser(blockerId: Types.ObjectId, blockedId: Types.ObjectId): Promise<boolean> {
    const result = await FriendshipModel.deleteOne({
      requester: blockerId,
      recipient: blockedId,
      status: 'blocked'
    });

    return result.deletedCount > 0;
  }

  async getFriends(userId: Types.ObjectId): Promise<any[]> {
    const friendships = await FriendshipModel.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    })
    .populate('requester', 'firstName lastName avatarUrl')
    .populate('recipient', 'firstName lastName avatarUrl')
    .lean();

    return friendships.map(friendship => {
      const friend = friendship.requester._id.toString() === userId.toString() 
        ? friendship.recipient 
        : friendship.requester;
      return {
        ...friend,
        friendshipId: friendship._id,
        friendsSince: friendship.createdAt
      };
    });
  }

  async getPendingRequests(userId: Types.ObjectId): Promise<{
    sent: Friendship[];
    received: Friendship[];
  }> {
    const [sent, received] = await Promise.all([
      FriendshipModel.find({ requester: userId, status: 'pending' })
        .populate('recipient', 'firstName lastName avatarUrl')
        .lean(),
      FriendshipModel.find({ recipient: userId, status: 'pending' })
        .populate('requester', 'firstName lastName avatarUrl')
        .lean()
    ]);

    return { sent: sent as Friendship[], received: received as Friendship[] };
  }

  async getFriendshipStatus(userId: Types.ObjectId, otherUserId: Types.ObjectId): Promise<{
    status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked' | 'blocked_by';
    friendshipId?: Types.ObjectId;
  }> {
    const friendship = await FriendshipModel.findOne({
      $or: [
        { requester: userId, recipient: otherUserId },
        { requester: otherUserId, recipient: userId }
      ]
    }).lean();

    if (!friendship) {
      return { status: 'none' };
    }

    if (friendship.status === 'blocked') {
      if (friendship.requester.toString() === userId.toString()) {
        return { status: 'blocked', friendshipId: friendship._id };
      } else {
        return { status: 'blocked_by', friendshipId: friendship._id };
      }
    }

    if (friendship.status === 'accepted') {
      return { status: 'friends', friendshipId: friendship._id };
    }

    if (friendship.status === 'pending') {
      if (friendship.requester.toString() === userId.toString()) {
        return { status: 'pending_sent', friendshipId: friendship._id };
      } else {
        return { status: 'pending_received', friendshipId: friendship._id };
      }
    }

    return { status: 'none' };
  }

  async areFriends(userId1: Types.ObjectId, userId2: Types.ObjectId): Promise<boolean> {
    const friendship = await FriendshipModel.findOne({
      $or: [
        { requester: userId1, recipient: userId2, status: 'accepted' },
        { requester: userId2, recipient: userId1, status: 'accepted' }
      ]
    });

    return !!friendship;
  }
}