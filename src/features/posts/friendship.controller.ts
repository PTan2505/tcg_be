import { Context } from "hono";
import { FriendshipService } from "../../shared/services/friendship.service";
import { areIdsEqual, ensureObjectId, isValidObjectId, toObjectId } from "../../shared/utils/validation.utils";

export class FriendshipController {
  private friendshipService: FriendshipService;

  constructor() {
    this.friendshipService = new FriendshipService();
  }

  sendFriendRequest = async (c: Context) => {
    try {
      const user = c.get("user");
      const { userId } = await c.req.json();

      // Validate userId is provided and is a valid ObjectId
      if (!userId) {
        return c.json({
          success: false,
          error: "User ID is required"
        }, 400);
      }

      if (!isValidObjectId(userId)) {
        return c.json({
          success: false,
          error: "Invalid user ID format"
        }, 400);
      }

      // Check if trying to send request to self
      if (areIdsEqual(user._id, userId)) {
        return c.json({
          success: false,
          error: "Cannot send friend request to yourself"
        }, 400);
      }

      const friendship = await this.friendshipService.sendFriendRequest(
        ensureObjectId(user._id),
        ensureObjectId(userId)
      );

      return c.json({
        success: true,
        data: friendship,
        message: "Friend request sent successfully"
      }, 201);
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to send friend request"
      }, 500);
    }
  };

  respondToFriendRequest = async (c: Context) => {
    try {
      const user = c.get("user");
      const friendshipId = c.req.param("id");
      const { action } = await c.req.json();

      // Validate friendshipId
      if (!isValidObjectId(friendshipId)) {
        return c.json({
          success: false,
          error: "Invalid friendship ID format"
        }, 400);
      }

      // Validate action
      if (!action || !['accept', 'decline'].includes(action)) {
        return c.json({
          success: false,
          error: "Action must be 'accept' or 'decline'"
        }, 400);
      }

      const friendship = await this.friendshipService.respondToFriendRequest(
        toObjectId(friendshipId),
        ensureObjectId(user._id),
        action
      );

      if (!friendship) {
        return c.json({
          success: false,
          error: "Friend request not found"
        }, 404);
      }

      return c.json({
        success: true,
        data: friendship,
        message: `Friend request ${action}ed successfully`
      });
    } catch (error: any) {
      console.error("Error responding to friend request:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to respond to friend request"
      }, 500);
    }
  };

  unfriend = async (c: Context) => {
    try {
      const user = c.get("user");
      const friendId = c.req.param("id");

      // Validate friendId
      if (!isValidObjectId(friendId)) {
        return c.json({
          success: false,
          error: "Invalid friend ID format"
        }, 400);
      }

      const success = await this.friendshipService.unfriend(
        ensureObjectId(user._id),
        toObjectId(friendId)
      );

      if (!success) {
        return c.json({
          success: false,
          error: "Friendship not found"
        }, 404);
      }

      return c.json({
        success: true,
        message: "Unfriended successfully"
      });
    } catch (error: any) {
      console.error("Error unfriending:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to unfriend"
      }, 500);
    }
  };

  blockUser = async (c: Context) => {
    try {
      const user = c.get("user");
      const { userId } = await c.req.json();

      // Validate userId
      if (!userId) {
        return c.json({
          success: false,
          error: "User ID is required"
        }, 400);
      }

      if (!isValidObjectId(userId)) {
        return c.json({
          success: false,
          error: "Invalid user ID format"
        }, 400);
      }

      // Check if trying to block self
      if (areIdsEqual(user._id, userId)) {
        return c.json({
          success: false,
          error: "Cannot block yourself"
        }, 400);
      }

      await this.friendshipService.blockUser(
        ensureObjectId(user._id),
        toObjectId(userId)
      );

      return c.json({
        success: true,
        message: "User blocked successfully"
      });
    } catch (error: any) {
      console.error("Error blocking user:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to block user"
      }, 500);
    }
  };

  unblockUser = async (c: Context) => {
    try {
      const user = c.get("user");
      const userId = c.req.param("id");

      // Validate userId
      if (!isValidObjectId(userId)) {
        return c.json({
          success: false,
          error: "Invalid user ID format"
        }, 400);
      }

      const success = await this.friendshipService.unblockUser(
        ensureObjectId(user._id),
        toObjectId(userId)
      );

      if (!success) {
        return c.json({
          success: false,
          error: "Block relationship not found"
        }, 404);
      }

      return c.json({
        success: true,
        message: "User unblocked successfully"
      });
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to unblock user"
      }, 500);
    }
  };

  getFriends = async (c: Context) => {
    try {
      const user = c.get("user");

      const friends = await this.friendshipService.getFriends(
        ensureObjectId(user._id)
      );

      return c.json({
        success: true,
        data: friends,
        message: "Friends retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting friends:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to get friends"
      }, 500);
    }
  };

  getPendingRequests = async (c: Context) => {
    try {
      const user = c.get("user");

      const requests = await this.friendshipService.getPendingRequests(
        ensureObjectId(user._id)
      );

      return c.json({
        success: true,
        data: requests,
        message: "Pending requests retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting pending requests:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to get pending requests"
      }, 500);
    }
  };

  getFriendshipStatus = async (c: Context) => {
    try {
      const user = c.get("user");
      const otherUserId = c.req.param("userId");

      // Validate otherUserId
      if (!isValidObjectId(otherUserId)) {
        return c.json({
          success: false,
          error: "Invalid user ID format"
        }, 400);
      }

      const status = await this.friendshipService.getFriendshipStatus(
        ensureObjectId(user._id),
        toObjectId(otherUserId)
      );

      return c.json({
        success: true,
        data: status,
        message: "Friendship status retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting friendship status:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to get friendship status"
      }, 500);
    }
  };
}