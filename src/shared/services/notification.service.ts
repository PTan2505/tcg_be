import { Types } from "mongoose";
import NotificationModel, {
  Notification,
} from "../../database/models/notification";
import { socketService } from "./socket.service";

export class NotificationService {
  async createNotification(data: {
    recipient: Types.ObjectId;
    sender: object;
    type: Notification["type"];
    post?: Types.ObjectId;
    comment?: Types.ObjectId;
    transaction?: Types.ObjectId;
  }): Promise<Notification> {
    try {
      console.log("🔔 createNotification called", {
        recipient:
          data.recipient && data.recipient.toString
            ? data.recipient.toString()
            : data.recipient,
        sender:
          data.sender && data.sender.toString
            ? data.sender.toString()
            : data.sender,
        type: data.type,
      });
    } catch (e) {
      console.warn("🔔 createNotification - failed to stringify input", e);
    }

    // Defensive: ensure recipient and sender exist
    if (!data || !data.recipient || !data.sender) {
      console.warn(
        "🔔 createNotification - missing recipient or sender, skipping creation",
        { data }
      );
      return null as any;
    }

    // Don't create notification for self-actions
    try {
      if (data.recipient.toString() === data.sender.toString()) {
        console.log(
          "🔔 createNotification - recipient equals sender, ignoring"
        );
        return null as any;
      }
    } catch (e) {
      console.warn(
        "🔔 createNotification - error comparing recipient and sender",
        e
      );
    }

    // Check if similar notification already exists (to avoid spam)
    const existingNotification = await NotificationModel.findOne({
      recipient: data.recipient,
      sender: data.sender,
      type: data.type,
      post: data.post,
      comment: data.comment,
      transaction: data.transaction,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    });

    if (existingNotification) {
      // Update timestamp instead of creating new notification
      existingNotification.createdAt = new Date();
      existingNotification.isRead = false;
      const saved = await existingNotification.save();
      // Emit realtime update to recipient via WebSocket
      try {
        socketService.emitToUser(
          data.recipient.toString(),
          "notification",
          saved
        );
      } catch (e) {}
      console.log("🔔 createNotification - updated existing notification", {
        id: saved._id.toString(),
      });
      return saved;
    }

    const notification = new NotificationModel(data);
    const saved = await notification.save();
    try {
      socketService.emitToUser(
        data.recipient.toString(),
        "notification",
        saved
      );
    } catch (e) {}
    console.log("🔔 createNotification - saved new notification", {
      id: saved._id.toString(),
    });
    return saved;
  }

  async getNotifications(
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      NotificationModel.find({ recipient: userId })
        .populate("post", "content")
        .populate("comment", "content")
        .populate("transaction")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({ recipient: userId }),
    ]);

    return {
      notifications: notifications as Notification[],
      total,
      hasMore: total > skip + limit,
    };
  }

  async markAsRead(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<boolean> {
    const find = await NotificationModel.findOne({
      _id: notificationId,
      recipient: userId,
    });
    console.log(find);

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
    // Emit realtime update for unread count / list refresh
    try {
      const unread = await this.getUnreadCount(userId);
      socketService.emitToUser(userId.toString(), "notifications:readAll", {
        unread,
      });
    } catch (e) {}
    return result.modifiedCount;
  }

  async getUnreadCount(userId: Types.ObjectId): Promise<number> {
    return await NotificationModel.countDocuments({
      recipient: userId,
      isRead: false,
    });
  }

  async deleteNotification(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<boolean> {
    const result = await NotificationModel.deleteOne({
      _id: notificationId,
      recipient: userId,
    });
    return result.deletedCount > 0;
  }
}
