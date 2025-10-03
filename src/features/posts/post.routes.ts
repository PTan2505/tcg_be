import { Hono } from "hono";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { validateRequest } from "../../shared/middlewares/validation.middleware";
import { CommentController } from "./comment.controller";
import { NotificationController } from "./notification.controller";
import { PostController } from "./post.controller";
import {
    createCommentSchema,
    createTextPostSchema,
    reactionSchema,
    updateCommentSchema,
    updatePostSchema,
    uploadUrlSchema
} from "./post.validator";

const postRoutes = new Hono();

// Initialize controllers
const postController = new PostController();
const commentController = new CommentController();
const notificationController = new NotificationController();

// Middleware - all routes require authentication
postRoutes.use("*", authMiddleware);

// Post routes
postRoutes.post("/", validateRequest(createTextPostSchema), postController.createPost);
postRoutes.post("/with-files", postController.createPostWithFiles);
postRoutes.get("/feed", postController.getFeed);
postRoutes.post("/upload-url", validateRequest(uploadUrlSchema), postController.getUploadUrl);
postRoutes.get("/taggable-users", postController.getTaggableUsers);
postRoutes.get("/user/:userId", postController.getUserPosts);

// Notification routes (must come before /:id route)
postRoutes.get("/notifications", notificationController.getNotifications);
postRoutes.get("/notifications/unread-count", notificationController.getUnreadCount);
postRoutes.put("/notifications/:id/read", notificationController.markAsRead);
postRoutes.put("/notifications/read-all", notificationController.markAllAsRead);
postRoutes.delete("/notifications/:id", notificationController.deleteNotification);

postRoutes.get("/:id", postController.getPost);
postRoutes.put("/:id", validateRequest(updatePostSchema), postController.updatePost);
postRoutes.delete("/:id", postController.deletePost);
postRoutes.post("/:id/reactions", validateRequest(reactionSchema), postController.toggleReaction);

// Comment routes
postRoutes.post("/:postId/comments", validateRequest(createCommentSchema), commentController.createComment);
postRoutes.get("/:postId/comments", commentController.getComments);
postRoutes.get("/comments/:commentId/replies", commentController.getReplies);
postRoutes.put("/comments/:id", validateRequest(updateCommentSchema), commentController.updateComment);
postRoutes.delete("/comments/:id", commentController.deleteComment);
postRoutes.post("/comments/:id/reactions", validateRequest(reactionSchema), commentController.toggleReaction);

export default postRoutes;