import { Types } from "mongoose";
import CommentModel, { Comment } from "../../database/models/comment";
import CommentReactionModel from "../../database/models/commentReaction";
import PostModel from "../../database/models/post";
import { NotificationService } from "./notification.service";

export class CommentService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async createComment(data: {
    author: Types.ObjectId;
    post: Types.ObjectId;
    parentComment?: Types.ObjectId;
    content: string;
    tags?: Types.ObjectId[];
  }): Promise<Comment> {
    const comment = new CommentModel(data);
    const savedComment = await comment.save();

    // Update post comment count
    await PostModel.updateOne(
      { _id: data.post },
      { $inc: { commentsCount: 1 } }
    );

    // Update parent comment reply count if it's a reply
    if (data.parentComment) {
      await CommentModel.updateOne(
        { _id: data.parentComment },
        { $inc: { repliesCount: 1 } }
      );
    }

    // Get post details for notifications
    const post = await PostModel.findById(data.post).lean();
    if (post) {
      // Notify post author
      if (data.parentComment) {
        // This is a reply - notify the parent comment author
        const parentComment = await CommentModel.findById(data.parentComment).lean();
        if (parentComment) {
          await this.notificationService.createNotification({
            recipient: parentComment.author,
            sender: data.author,
            type: 'comment_reply',
            post: data.post,
            comment: savedComment._id,
          });
        }
      } else {
        // This is a direct comment on the post - notify post author
        await this.notificationService.createNotification({
          recipient: post.author,
          sender: data.author,
          type: 'post_comment',
          post: data.post,
          comment: savedComment._id,
        });
      }

      // Notify tagged users
      if (data.tags && data.tags.length > 0) {
        for (const taggedUserId of data.tags) {
          await this.notificationService.createNotification({
            recipient: taggedUserId,
            sender: data.author,
            type: 'comment_tag',
            post: data.post,
            comment: savedComment._id,
          });
        }
      }
    }

    return savedComment;
  }

  async getComments(postId: Types.ObjectId, page: number = 1, limit: number = 20): Promise<{
    comments: Comment[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    // Get top-level comments (no parent)
    const [comments, total] = await Promise.all([
      CommentModel.find({ post: postId, parentComment: null })
        .populate('author', 'firstName lastName avatarUrl')
        .populate('tags', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommentModel.countDocuments({ post: postId, parentComment: null })
    ]);

    return {
      comments: comments as Comment[],
      total,
      hasMore: total > skip + limit
    };
  }

  async getReplies(commentId: Types.ObjectId, page: number = 1, limit: number = 10): Promise<{
    replies: Comment[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      CommentModel.find({ parentComment: commentId })
        .populate('author', 'firstName lastName avatarUrl')
        .populate('tags', 'firstName lastName avatarUrl')
        .sort({ createdAt: 1 }) // Oldest first for replies
        .skip(skip)
        .limit(limit)
        .lean(),
      CommentModel.countDocuments({ parentComment: commentId })
    ]);

    return {
      replies: replies as Comment[],
      total,
      hasMore: total > skip + limit
    };
  }

  async updateComment(commentId: Types.ObjectId, userId: Types.ObjectId, content: string, tags?: Types.ObjectId[]): Promise<Comment | null> {
    const comment = await CommentModel.findOneAndUpdate(
      { _id: commentId, author: userId },
      { content, tags },
      { new: true }
    ).populate('author', 'firstName lastName avatarUrl')
     .populate('tags', 'firstName lastName avatarUrl');

    // Create notifications for newly tagged users
    if (comment && tags) {
      for (const taggedUserId of tags) {
        await this.notificationService.createNotification({
          recipient: taggedUserId,
          sender: userId,
          type: 'comment_tag',
          post: comment.post,
          comment: commentId,
        });
      }
    }

    return comment;
  }

  async deleteComment(commentId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const comment = await CommentModel.findOne({ _id: commentId, author: userId });
    if (!comment) return false;

    // Count all replies to be deleted
    const repliesToDelete = await CommentModel.countDocuments({ parentComment: commentId });
    const totalCommentsToDelete = 1 + repliesToDelete; // Comment itself + all replies

    // Delete the comment and all its replies
    await Promise.all([
      CommentModel.deleteMany({ 
        $or: [
          { _id: commentId },
          { parentComment: commentId }
        ]
      }),
      CommentReactionModel.deleteMany({
        comment: { 
          $in: await CommentModel.find({ 
            $or: [
              { _id: commentId },
              { parentComment: commentId }
            ]
          }).distinct('_id')
        }
      })
    ]);

    // Update post comment count
    await PostModel.updateOne(
      { _id: comment.post },
      { $inc: { commentsCount: -totalCommentsToDelete } }
    );

    // Update parent comment reply count if this was a reply
    if (comment.parentComment) {
      await CommentModel.updateOne(
        { _id: comment.parentComment },
        { $inc: { repliesCount: -1 } }
      );
    }

    return true;
  }

  async toggleReaction(commentId: Types.ObjectId, userId: Types.ObjectId, type: 'like'): Promise<{
    success: boolean;
    action: 'added' | 'removed';
    likesCount: number;
  }> {
    const comment = await CommentModel.findById(commentId);
    if (!comment) throw new Error('Comment not found');

    const existingReaction = await CommentReactionModel.findOne({
      comment: commentId,
      user: userId
    });

    let action: 'added' | 'removed';
    
    if (!existingReaction) {
      // Add new like reaction
      await CommentReactionModel.create({
        comment: commentId,
        user: userId,
        type: 'like'
      });
      action = 'added';

      // Create notification
      await this.notificationService.createNotification({
        recipient: comment.author,
        sender: userId,
        type: 'comment_like',
        post: comment.post,
        comment: commentId,
      });
    } else {
      // Remove existing like reaction (unlike)
      await CommentReactionModel.deleteOne({ _id: existingReaction._id });
      action = 'removed';
    }

    // Update likes count only
    const likesCount = await CommentReactionModel.countDocuments({ comment: commentId, type: 'like' });

    await CommentModel.updateOne(
      { _id: commentId },
      { likesCount }
    );

    return {
      success: true,
      action,
      likesCount
    };
  }

  async getCommentById(commentId: Types.ObjectId): Promise<Comment | null> {
    return await CommentModel.findById(commentId)
      .populate('author', 'firstName lastName avatarUrl')
      .populate('tags', 'firstName lastName avatarUrl')
      .lean() as Comment;
  }
}