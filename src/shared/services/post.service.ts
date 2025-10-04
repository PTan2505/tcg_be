import { Types } from "mongoose";
import CommentModel from "../../database/models/comment";
import FriendshipModel from "../../database/models/friendship";
import PostModel, { Post } from "../../database/models/post";
import PostReactionModel from "../../database/models/postReaction";
import { NotificationService } from "./notification.service";
import { S3Service } from "./s3.service";

export class PostService {
  private notificationService: NotificationService;
  private s3Service: S3Service;

  constructor() {
    this.notificationService = new NotificationService();
    this.s3Service = new S3Service();
  }

  async createPost(data: {
    author: Types.ObjectId;
    content: string;
    images?: string[];
    cardReferences?: { cardId: Types.ObjectId; cardType: 'pokemon' | 'yugioh' }[];
    deckReferences?: Types.ObjectId[];
    privacy?: 'public' | 'friends' | 'private';
    tags?: Types.ObjectId[];
  }): Promise<Post> {
    const post = new PostModel(data);
    const savedPost = await post.save();

    // Create notifications for tagged users
    if (data.tags && data.tags.length > 0) {
      for (const taggedUserId of data.tags) {
        await this.notificationService.createNotification({
          recipient: taggedUserId,
          sender: data.author,
          type: 'post_tag',
          post: savedPost._id,
        });
      }
    }

    return savedPost;
  }

  async getFeed(userId: Types.ObjectId, page: number = 1, limit: number = 10): Promise<{
    posts: Post[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    // Get user's friends for privacy filtering
    const friendships = await FriendshipModel.find({
      $or: [
        { requester: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    }).lean();

    const friendIds = friendships.map(f => 
      f.requester.toString() === userId.toString() ? f.recipient : f.requester
    );

    // Build privacy filter
    const privacyFilter = {
      $or: [
        { privacy: 'public' },
        { author: userId }, // User's own posts
        { 
          privacy: 'friends',
          author: { $in: friendIds }
        },
        { tags: userId } // Posts where user is tagged
      ]
    };

    const [posts, total] = await Promise.all([
      PostModel.find(privacyFilter)
        .populate('author', 'firstName lastName avatarUrl')
        .populate('tags', 'firstName lastName avatarUrl')
        .populate('cardReferences.cardId')
        .populate('deckReferences', 'name description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PostModel.countDocuments(privacyFilter)
    ]);

    return {
      posts: posts as Post[],
      total,
      hasMore: total > skip + limit
    };
  }

  async getPostById(postId: Types.ObjectId, userId: Types.ObjectId): Promise<Post | null> {
    const post = await PostModel.findById(postId)
      .populate('author', 'firstName lastName avatarUrl')
      .populate('tags', 'firstName lastName avatarUrl')
      .populate('cardReferences.cardId')
      .populate('deckReferences', 'name description')
      .lean();

    if (!post) return null;

    // Check if user can view this post
    const canView = await this.canUserViewPost(post as Post, userId);
    return canView ? post as Post : null;
  }

  async updatePost(postId: Types.ObjectId, userId: Types.ObjectId, updateData: {
    content?: string;
    privacy?: 'public' | 'friends' | 'private';
    tags?: Types.ObjectId[];
  }): Promise<Post | null> {
    const post = await PostModel.findOneAndUpdate(
      { _id: postId, author: userId },
      updateData,
      { new: true }
    ).populate('author', 'firstName lastName avatarUrl')
     .populate('tags', 'firstName lastName avatarUrl');

    // Create notifications for newly tagged users
    if (updateData.tags) {
      for (const taggedUserId of updateData.tags) {
        await this.notificationService.createNotification({
          recipient: taggedUserId,
          sender: userId,
          type: 'post_tag',
          post: postId,
        });
      }
    }

    return post;
  }

  async deletePost(postId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean> {
    const post = await PostModel.findOne({ _id: postId, author: userId });
    if (!post) return false;

    // Delete associated images from S3
    if (post.images && post.images.length > 0) {
      for (const imageUrl of post.images) {
        try {
          await this.s3Service.deleteFile(imageUrl);
        } catch (error) {
          console.error(`Failed to delete image: ${imageUrl}`, error);
        }
      }
    }

    // Delete the post and related data
    await Promise.all([
      PostModel.deleteOne({ _id: postId }),
      PostReactionModel.deleteMany({ post: postId }),
      CommentModel.deleteMany({ post: postId })
    ]);

    return true;
  }

  async toggleReaction(postId: Types.ObjectId, userId: Types.ObjectId, type: 'like' | 'dislike'): Promise<{
    success: boolean;
    action: 'added' | 'removed' | 'changed';
    likesCount: number;
    dislikesCount: number;
  }> {
    const post = await PostModel.findById(postId);
    if (!post) throw new Error('Post not found');

    const existingReaction = await PostReactionModel.findOne({
      post: postId,
      user: userId
    });

    let action: 'added' | 'removed' | 'changed';
    
    if (!existingReaction) {
      // Add new reaction
      await PostReactionModel.create({
        post: postId,
        user: userId,
        type
      });
      action = 'added';

      // Create notification
      await this.notificationService.createNotification({
        recipient: post.author,
        sender: userId,
        type: type === 'like' ? 'post_like' : 'post_dislike',
        post: postId,
      });
    } else if (existingReaction.type === type) {
      // Remove existing reaction
      await PostReactionModel.deleteOne({ _id: existingReaction._id });
      action = 'removed';
    } else {
      // Change reaction type
      existingReaction.type = type;
      await existingReaction.save();
      action = 'changed';

      // Create notification for new reaction type
      await this.notificationService.createNotification({
        recipient: post.author,
        sender: userId,
        type: type === 'like' ? 'post_like' : 'post_dislike',
        post: postId,
      });
    }

    // Update counts
    const [likesCount, dislikesCount] = await Promise.all([
      PostReactionModel.countDocuments({ post: postId, type: 'like' }),
      PostReactionModel.countDocuments({ post: postId, type: 'dislike' })
    ]);

    await PostModel.updateOne(
      { _id: postId },
      { likesCount, dislikesCount }
    );

    return {
      success: true,
      action,
      likesCount,
      dislikesCount
    };
  }

  async getUserPosts(userId: Types.ObjectId, viewerUserId: Types.ObjectId, page: number = 1, limit: number = 10): Promise<{
    posts: Post[];
    total: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    // Check privacy settings
    let privacyFilter: any = { author: userId };
    
    if (userId.toString() !== viewerUserId.toString()) {
      // Check if viewer is friend
      const friendship = await FriendshipModel.findOne({
        $or: [
          { requester: userId, recipient: viewerUserId, status: 'accepted' },
          { requester: viewerUserId, recipient: userId, status: 'accepted' }
        ]
      });

      if (friendship) {
        privacyFilter.privacy = { $in: ['public', 'friends'] };
      } else {
        privacyFilter.privacy = 'public';
      }
    }

    const [posts, total] = await Promise.all([
      PostModel.find(privacyFilter)
        .populate('author', 'firstName lastName avatarUrl')
        .populate('tags', 'firstName lastName avatarUrl')
        .populate('cardReferences.cardId')
        .populate('deckReferences', 'name description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PostModel.countDocuments(privacyFilter)
    ]);

    return {
      posts: posts as Post[],
      total,
      hasMore: total > skip + limit
    };
  }

  private async canUserViewPost(post: Post, userId: Types.ObjectId): Promise<boolean> {
    // Author can always view their own posts
    if (post.author.toString() === userId.toString()) return true;

    // Public posts can be viewed by anyone
    if (post.privacy === 'public') return true;

    // Tagged users can view the post
    if (post.tags && post.tags.some(tag => tag.toString() === userId.toString())) return true;

    // Private posts can only be viewed by author
    if (post.privacy === 'private') return false;

    // Friends-only posts require friendship
    if (post.privacy === 'friends') {
      const friendship = await FriendshipModel.findOne({
        $or: [
          { requester: post.author, recipient: userId, status: 'accepted' },
          { requester: userId, recipient: post.author, status: 'accepted' }
        ]
      });
      return !!friendship;
    }

    return false;
  }
}