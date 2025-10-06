import { Context } from "hono";
import { Types } from "mongoose";
import { CommentService } from "../../shared/services/comment.service";
import { TaggingService } from "../../shared/services/tagging.service";

export class CommentController {
  private commentService: CommentService;
  private taggingService: TaggingService;

  constructor() {
    this.commentService = new CommentService();
    this.taggingService = new TaggingService();
  }

  createComment = async (c: Context) => {
    try {
      const user = c.get("user");
      const postId = c.req.param("postId");
      const body = await c.req.json();

      // Validate postId is a valid ObjectId
      if (!Types.ObjectId.isValid(postId)) {
        return c.json({
          success: false,
          error: "Invalid post ID format"
        }, 400);
      }

      const commentData = {
        ...body,
        author: new Types.ObjectId(user._id),
        post: new Types.ObjectId(postId),
        parentComment: body.parentComment ? new Types.ObjectId(body.parentComment) : undefined,
        tags: [], // Will be populated by tagging service
      };

      const comment = await this.commentService.createComment(commentData);

      // Process tags from content
      const taggedUserIds = await this.taggingService.processCommentTags(
        body.content,
        new Types.ObjectId(user._id),
        new Types.ObjectId(postId),
        comment._id,
        body.parentComment ? new Types.ObjectId(body.parentComment) : undefined
      );

      // Update comment with tagged users
      if (taggedUserIds.length > 0) {
        await this.commentService.updateComment(comment._id, new Types.ObjectId(user._id), body.content, taggedUserIds);
        comment.tags = taggedUserIds;
      }

      return c.json({
        success: true,
        data: comment,
        message: "Comment created successfully"
      }, 201);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to create comment"
      }, 500);
    }
  };

  getComments = async (c: Context) => {
    try {
      const postId = c.req.param("postId");
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "20");

      const result = await this.commentService.getComments(
        new Types.ObjectId(postId),
        page,
        limit
      );

      return c.json({
        success: true,
        data: result,
        message: "Comments retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting comments:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to get comments"
      }, 500);
    }
  };

  getReplies = async (c: Context) => {
    try {
      const commentId = c.req.param("commentId");
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "10");

      const result = await this.commentService.getReplies(
        new Types.ObjectId(commentId),
        page,
        limit
      );

      return c.json({
        success: true,
        data: result,
        message: "Replies retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting replies:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to get replies"
      }, 500);
    }
  };

  updateComment = async (c: Context) => {
    try {
      const user = c.get("user");
      const commentId = c.req.param("id");
      const { content, tags } = await c.req.json();

      const comment = await this.commentService.updateComment(
        new Types.ObjectId(commentId),
        new Types.ObjectId(user._id),
        content,
        tags?.map((id: string) => new Types.ObjectId(id))
      );

      if (!comment) {
        return c.json({
          success: false,
          error: "Comment not found or access denied"
        }, 404);
      }

      return c.json({
        success: true,
        data: comment,
        message: "Comment updated successfully"
      });
    } catch (error: any) {
      console.error("Error updating comment:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to update comment"
      }, 500);
    }
  };

  deleteComment = async (c: Context) => {
    try {
      const user = c.get("user");
      const commentId = c.req.param("id");

      const success = await this.commentService.deleteComment(
        new Types.ObjectId(commentId),
        new Types.ObjectId(user._id)
      );

      if (!success) {
        return c.json({
          success: false,
          error: "Comment not found or access denied"
        }, 404);
      }

      return c.json({
        success: true,
        message: "Comment deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to delete comment"
      }, 500);
    }
  };

  toggleReaction = async (c: Context) => {
    try {
      const user = c.get("user");
      const commentId = c.req.param("id");
      const { type } = await c.req.json();

      const result = await this.commentService.toggleReaction(
        new Types.ObjectId(commentId),
        new Types.ObjectId(user._id),
        type
      );

      return c.json({
        success: true,
        data: result,
        message: `Reaction ${result.action} successfully`
      });
    } catch (error: any) {
      console.error("Error toggling comment reaction:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to toggle comment reaction"
      }, 500);
    }
  };
}