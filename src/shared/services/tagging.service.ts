import { Types } from "mongoose";
import CommentModel from "../../database/models/comment";
import FriendshipModel from "../../database/models/friendship";
import PostModel from "../../database/models/post";
import UserModel from "../../database/models/user";
import { NotificationService } from "./notification.service";

export class TaggingService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Extract usernames from text content
   */
  extractUsernamesFromContent(content: string): string[] {
    const usernameRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = content.match(usernameRegex);
    return matches ? matches.map(match => match.substring(1).toLowerCase()) : [];
  }

  /**
   * Validate and get user IDs for tagged usernames based on context
   */
  async validateAndGetTaggedUsers(
    content: string,
    authorId: Types.ObjectId,
    context: {
      type: 'post' | 'comment' | 'reply';
      postId?: Types.ObjectId;
      parentCommentId?: Types.ObjectId;
    }
  ): Promise<Types.ObjectId[]> {
    const extractedUsernames = this.extractUsernamesFromContent(content);
    if (extractedUsernames.length === 0) {
      return [];
    }

    // Get friends list
    const friendships = await FriendshipModel.find({
      $or: [
        { requester: authorId, status: 'accepted' },
        { recipient: authorId, status: 'accepted' }
      ]
    }).populate('requester recipient', 'username');

    const friendUsernames = new Set<string>();
    friendships.forEach(friendship => {
      const friend = friendship.requester._id.toString() === authorId.toString() 
        ? friendship.recipient 
        : friendship.requester;
      friendUsernames.add((friend as any).username.toLowerCase());
    });

    // Get allowed usernames based on context
    const allowedUsernames = new Set(friendUsernames);

    if (context.type === 'reply' && context.postId && context.parentCommentId) {
      // For replies, also allow post owner and comment owner
      const [post, parentComment] = await Promise.all([
        PostModel.findById(context.postId).populate('author', 'username'),
        CommentModel.findById(context.parentCommentId).populate('author', 'username')
      ]);

      if (post?.author) {
        allowedUsernames.add((post.author as any).username.toLowerCase());
      }
      if (parentComment?.author) {
        allowedUsernames.add((parentComment.author as any).username.toLowerCase());
      }
    }

    // Filter extracted usernames to only allowed ones
    const validUsernames = extractedUsernames.filter(username => 
      allowedUsernames.has(username.toLowerCase())
    );

    if (validUsernames.length === 0) {
      return [];
    }

    // Get user IDs for valid usernames (case-insensitive search)
    const users = await UserModel.find({
      username: { $in: validUsernames.map(username => new RegExp(`^${username}$`, 'i')) }
    }).select('_id username');

    return users.map(user => user._id);
  }

  /**
   * Send notifications to tagged users
   */
  async sendTagNotifications(
    taggedUserIds: Types.ObjectId[],
    authorId: Types.ObjectId,
    context: {
      type: 'post' | 'comment';
      postId: Types.ObjectId;
      commentId?: Types.ObjectId;
      content: string;
    }
  ): Promise<void> {
    const author = await UserModel.findById(authorId).select('firstName lastName username');
    if (!author) return;

    const notificationPromises = taggedUserIds.map(async (userId) => {
      // Don't notify if user is tagging themselves
      if (userId.toString() === authorId.toString()) return;

      const message = context.type === 'post' 
        ? `${author.firstName} ${author.lastName} tagged you in a post`
        : `${author.firstName} ${author.lastName} tagged you in a comment`;

      const relatedData = context.type === 'post' 
        ? { postId: context.postId }
        : { postId: context.postId, commentId: context.commentId };

      await this.notificationService.createNotification({
        recipient: userId,
        sender: authorId,
        type: context.type === 'post' ? 'post_tag' : 'comment_tag',
        post: context.postId,
        comment: context.commentId
      });
    });

    await Promise.all(notificationPromises);
  }

  /**
   * Process tags for a post
   */
  async processPostTags(
    content: string,
    authorId: Types.ObjectId,
    postId: Types.ObjectId
  ): Promise<Types.ObjectId[]> {
    const taggedUserIds = await this.validateAndGetTaggedUsers(content, authorId, {
      type: 'post'
    });

    if (taggedUserIds.length > 0) {
      await this.sendTagNotifications(taggedUserIds, authorId, {
        type: 'post',
        postId,
        content
      });
    }

    return taggedUserIds;
  }

  /**
   * Process tags for a comment
   */
  async processCommentTags(
    content: string,
    authorId: Types.ObjectId,
    postId: Types.ObjectId,
    commentId: Types.ObjectId,
    parentCommentId?: Types.ObjectId
  ): Promise<Types.ObjectId[]> {
    const context = parentCommentId 
      ? { type: 'reply' as const, postId, parentCommentId }
      : { type: 'comment' as const, postId };

    const taggedUserIds = await this.validateAndGetTaggedUsers(content, authorId, context);

    if (taggedUserIds.length > 0) {
      await this.sendTagNotifications(taggedUserIds, authorId, {
        type: 'comment',
        postId,
        commentId,
        content
      });
    }

    return taggedUserIds;
  }

  /**
   * Get taggable users for a given context (for frontend suggestions)
   */
  async getTaggableUsers(
    authorId: Types.ObjectId,
    context: {
      type: 'post' | 'comment' | 'reply';
      postId?: Types.ObjectId;
      parentCommentId?: Types.ObjectId;
    }
  ): Promise<{ _id: Types.ObjectId; username: string; firstName: string; lastName: string }[]> {
    // Get friends
    const friendships = await FriendshipModel.find({
      $or: [
        { requester: authorId, status: 'accepted' },
        { recipient: authorId, status: 'accepted' }
      ]
    }).populate('requester recipient', 'username firstName lastName');

    const taggableUsers = new Map<string, any>();
    
    // Add friends
    friendships.forEach(friendship => {
      const friend = friendship.requester._id.toString() === authorId.toString() 
        ? friendship.recipient 
        : friendship.requester;
      taggableUsers.set(friend._id.toString(), friend);
    });

    // For replies, also add post owner and comment owner
    if (context.type === 'reply' && context.postId && context.parentCommentId) {
      const [post, parentComment] = await Promise.all([
        PostModel.findById(context.postId).populate('author', 'username firstName lastName'),
        CommentModel.findById(context.parentCommentId).populate('author', 'username firstName lastName')
      ]);

      if (post?.author) {
        taggableUsers.set((post.author as any)._id.toString(), post.author);
      }
      if (parentComment?.author) {
        taggableUsers.set((parentComment.author as any)._id.toString(), parentComment.author);
      }
    }

    return Array.from(taggableUsers.values());
  }
}