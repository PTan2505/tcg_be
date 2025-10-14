import { Hono } from "hono";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { validateRequest } from "../../shared/middlewares/validation.middleware";
import { FriendshipController } from "../posts/friendship.controller";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import {
  blockUserSchema,
  changePasswordSchema,
  friendshipActionSchema,
  sendFriendRequestSchema,
  updateUserSchema,
} from "./user.validator";

const userRoutes = new Hono();

// Initialize dependencies
const userService = new UserService();
const userController = new UserController(userService);
const friendshipController = new FriendshipController();

// All routes require authentication
userRoutes.use('/*', authMiddleware);

// User profile routes
userRoutes.get("/profile", userController.getProfile);
userRoutes.put(
  "/change-password",
  validateRequest(changePasswordSchema),
  userController.changePassword
);
userRoutes.put(
  "/change-avatar",
  userController.changeAvatar
);

// Friendship routes (must come before generic /:id routes)
userRoutes.post("/friends/request", validateRequest(sendFriendRequestSchema), friendshipController.sendFriendRequest);
userRoutes.put("/friends/:id/respond", validateRequest(friendshipActionSchema), friendshipController.respondToFriendRequest);
userRoutes.delete("/friends/:id", friendshipController.unfriend);
userRoutes.post("/friends/block", validateRequest(blockUserSchema), friendshipController.blockUser);
userRoutes.delete("/friends/block/:id", friendshipController.unblockUser);
userRoutes.get("/friends", friendshipController.getFriends);
userRoutes.get("/friends/pending", friendshipController.getPendingRequests);
userRoutes.get("/friends/status/:userId", friendshipController.getFriendshipStatus);

// User management routes (must come after specific routes)
userRoutes.get("/", userController.getUsers);
userRoutes.get("/:id", userController.getUserById);
userRoutes.patch(
  "/:id",
  validateRequest(updateUserSchema),
  userController.updateUser
);
userRoutes.delete("/:id", userController.deleteUser);

// Admin endpoint to toggle premium status for a user
userRoutes.patch('/:id/premium', userController.setPremium);

export default userRoutes;
