import { Types } from "mongoose";
import NotificationModel, { Notification } from "../../database/models/notification";

export class NotificationService {
  async createNotification(data: {
    recipient: Types.ObjectId;
    sender: Types.ObjectId;
    type: Notification['type'];
    post?: Types.ObjectId;
    comment?: Types.ObjectId;
  }): Promise<Notification> {
    // Don't create notification for self-actions
    if (data.recipient.toString() === data.sender.toString()) {
      return null as any;
    }

    // Check if similar notification already exists (to avoid spam)
    const existingNotification = await NotificationModel.findOne({
      recipient: data.recipient,
      sender: data.sender,
      type: data.type,
      post: data.post,
      comment: data.comment,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (existingNotification) {
      // Update timestamp instead of creating new notification
      existingNotification.createdAt = new Date();
      existingNotification.isRead = false;
      return await existingNotification.save();
    }

    const notification = new NotificationModel(data);
    return await notification.save();
  }

  async getNotifications(userId: Types.ObjectId, page: number = 1, limit: number = 20): Promise<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      NotificationModel.find({ recipient: userId })
        .populate('sender', 'firstName lastName avatarUrl')
        .populate('post', 'content')
        .populate('comment', 'content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({ recipient: userId })
    ]);

    return {
      notifications: notifications as Notification[],
      total,
      hasMore: total > skip + limit
    };
  }

  async markAsRead(notificationId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const result = await NotificationModel.updateOne(
      { _id: notificationId, recipient: userId },
      { isRead: true }
    );
    return result.modifiedCount > 0;
  }

  async markAllAsRead(userId: Types.ObjectId): Promise<number> {
    const result = await NotificationModel.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    return result.modifiedCount;
  }

  async getUnreadCount(userId: Types.ObjectId): Promise<number> {
    return await NotificationModel.countDocuments({
      recipient: userId,
      isRead: false
    });
  }

  async deleteNotification(notificationId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const result = await NotificationModel.deleteOne({
      _id: notificationId,
      recipient: userId
    });
    return result.deletedCount > 0;
  }
}