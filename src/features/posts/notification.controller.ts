import { Context } from "hono";
import { NotificationService } from "../../shared/services/notification.service";
import {
  ensureObjectId,
  isValidObjectId,
  toObjectId,
} from "../../shared/utils/validation.utils";

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  getNotifications = async (c: Context) => {
    try {
      const user = c.get("user");
      console.log(
        "🔍 Debug - Notification User object:",
        JSON.stringify(user, null, 2)
      );

      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "20");

      // Validate user ID
      if (!user?._id) {
        return c.json(
          {
            success: false,
            error: "User ID is required",
          },
          400
        );
      }

      console.log(
        "🔍 Debug - Notification User ID type:",
        typeof user._id,
        "Value:",
        user._id
      );

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return c.json(
          {
            success: false,
            error: "Invalid pagination parameters",
          },
          400
        );
      }

      const result = await this.notificationService.getNotifications(
        ensureObjectId(user._id),
        page,
        limit
      );

      return c.json({
        success: true,
        data: result,
        message: "Notifications retrieved successfully",
      });
    } catch (error: any) {
      console.error("Error getting notifications:", error);
      return c.json(
        {
          success: false,
          error: error.message || "Failed to get notifications",
        },
        500
      );
    }
  };

  markAsRead = async (c: Context) => {
    try {
      const user = c.get("user");
      const notificationId = c.req.param("id");

      // Validate notificationId
      if (!isValidObjectId(notificationId)) {
        return c.json(
          {
            success: false,
            error: "Invalid notification ID format",
          },
          400
        );
      }
      const success = await this.notificationService.markAsRead(
        toObjectId(notificationId),
        ensureObjectId(user._id)
      );

      if (!success) {
        return c.json(
          {
            success: false,
            error: "Notification not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      return c.json(
        {
          success: false,
          error: error.message || "Failed to mark notification as read",
        },
        500
      );
    }
  };

  markAllAsRead = async (c: Context) => {
    try {
      const user = c.get("user");

      const count = await this.notificationService.markAllAsRead(
        ensureObjectId(user._id)
      );

      return c.json({
        success: true,
        data: { markedCount: count },
        message: `${count} notifications marked as read`,
      });
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      return c.json(
        {
          success: false,
          error: error.message || "Failed to mark all notifications as read",
        },
        500
      );
    }
  };

  getUnreadCount = async (c: Context) => {
    try {
      const user = c.get("user");

      const count = await this.notificationService.getUnreadCount(
        ensureObjectId(user._id)
      );

      return c.json({
        success: true,
        data: { unreadCount: count },
        message: "Unread count retrieved successfully",
      });
    } catch (error: any) {
      console.error("Error getting unread count:", error);
      return c.json(
        {
          success: false,
          error: error.message || "Failed to get unread count",
        },
        500
      );
    }
  };

  deleteNotification = async (c: Context) => {
    try {
      const user = c.get("user");
      const notificationId = c.req.param("id");

      // Validate notificationId
      if (!isValidObjectId(notificationId)) {
        return c.json(
          {
            success: false,
            error: "Invalid notification ID format",
          },
          400
        );
      }

      const success = await this.notificationService.deleteNotification(
        toObjectId(notificationId),
        ensureObjectId(user._id)
      );

      if (!success) {
        return c.json(
          {
            success: false,
            error: "Notification not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      return c.json(
        {
          success: false,
          error: error.message || "Failed to delete notification",
        },
        500
      );
    }
  };
}
