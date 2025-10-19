import { Context } from "hono";
import { Types } from "mongoose";
import { createErrorResponse } from '../../shared/constants/messages';
import AppError from '../../shared/errors/AppError';
import { PostService } from "../../shared/services/post.service";
import { S3Service } from "../../shared/services/s3.service";
import { TaggingService } from "../../shared/services/tagging.service";

export class PostController {
  private postService: PostService;
  private s3Service: S3Service;
  private taggingService: TaggingService;

  constructor() {
    this.postService = new PostService();
    this.s3Service = new S3Service();
    this.taggingService = new TaggingService();
  }

  createPost = async (c: Context) => {
    try {
  const user = c.get("user");
  const v = c.get("validatedData");
  const body = v ?? (await c.req.json());
      
      const postData = {
        ...body,
        author: new Types.ObjectId(user._id),
        cardReferences: body.cardReferences?.map((ref: any) => ({
          cardId: new Types.ObjectId(ref.cardId),
          cardType: ref.cardType
        })),
        deckReferences: body.deckReferences?.map((id: string) => new Types.ObjectId(id)),
        tags: [], // Will be populated by tagging service
      };

      const post = await this.postService.createPost(postData);
      
      // Process tags from content
      const taggedUserIds = await this.taggingService.processPostTags(
        body.content,
        new Types.ObjectId(user._id),
        post._id
      );

      // Update post with tagged users
      if (taggedUserIds.length > 0) {
        await this.postService.updatePost(post._id, new Types.ObjectId(user._id), { tags: taggedUserIds });
        post.tags = taggedUserIds;
      }
      
      return c.json({
        success: true,
        data: post,
        message: "Post created successfully"
      }, 201);
    } catch (error: any) {
      console.error("Error creating post:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to create post');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  createPostWithFiles = async (c: Context) => {
    try {
      const user = c.get("user");
      const formData = await c.req.formData();
      
      // Extract text fields
      const content = formData.get('content')?.toString() || '';
      const privacyRaw = formData.get('privacy')?.toString() || 'public';
      const cardReferences = formData.get('cardReferences') ? 
        JSON.parse(formData.get('cardReferences')!.toString()) : [];
      const deckReferences = formData.get('deckReferences') ? 
        JSON.parse(formData.get('deckReferences')!.toString()) : [];
      const tags = formData.get('tags') ? 
        JSON.parse(formData.get('tags')!.toString()) : [];

      // Validate privacy setting
      const validPrivacyOptions = ['public', 'friends', 'private'];
      const privacy = validPrivacyOptions.includes(privacyRaw) ? 
        privacyRaw as 'public' | 'friends' | 'private' : 'public';

      // Validate required fields
      if (!content || content.trim().length === 0) {
        return c.json({
          success: false,
          error: "Content is required"
        }, 400);
      }

      // Handle file uploads
      const imageUrls: string[] = [];
      const files = formData.getAll('images') as File[];
      
      for (const file of files) {
        if (file && file.size > 0) {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            return c.json({
              success: false,
              error: `Invalid file type: ${file.type}. Only images are allowed.`
            }, 400);
          }

          // Validate file size (5MB limit)
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (file.size > maxSize) {
            return c.json({
              success: false,
              error: `File too large: ${file.name}. Maximum size is 5MB.`
            }, 400);
          }

          try {
            // Convert file to buffer
            const buffer = Buffer.from(await file.arrayBuffer());
            
            // Upload to S3
            const imageUrl = await this.s3Service.uploadFile('posts',buffer, file.name, file.type);
            imageUrls.push(imageUrl);
          } catch (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            return c.json({
              success: false,
              error: `Failed to upload image: ${file.name}`
            }, 500);
          }
        }
      }

      // Create post data
      const postData = {
        content,
        privacy,
        images: imageUrls,
        author: new Types.ObjectId(user._id),
        cardReferences: cardReferences.map((ref: any) => ({
          cardId: new Types.ObjectId(ref.cardId),
          cardType: ref.cardType
        })),
        deckReferences: deckReferences.map((id: string) => new Types.ObjectId(id)),
        tags: [], // Will be populated by tagging service
      };

      const post = await this.postService.createPost(postData);
      
      // Process tags from content
      const taggedUserIds = await this.taggingService.processPostTags(
        content,
        new Types.ObjectId(user._id),
        post._id
      );

      // Update post with tagged users
      if (taggedUserIds.length > 0) {
        await this.postService.updatePost(post._id, new Types.ObjectId(user._id), { tags: taggedUserIds });
        post.tags = taggedUserIds;
      }
      
      return c.json({
        success: true,
        data: post,
        message: "Post created successfully with images"
      }, 201);
    } catch (error: any) {
      console.error("Error creating post with files:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to create post');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  getFeed = async (c: Context) => {
    try {
      const user = c.get("user");
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "10");

      const result = await this.postService.getFeed(
        new Types.ObjectId(user._id),
        page,
        limit
      );

      return c.json({
        success: true,
        data: result,
        message: "Feed retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting feed:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to get feed');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  getPost = async (c: Context) => {
    try {
      const user = c.get("user");
      const postId = c.req.param("id");

      // Validate postId is a valid ObjectId
      if (!Types.ObjectId.isValid(postId)) {
        return c.json({
          success: false,
          error: "Invalid post ID format"
        }, 400);
      }

      const post = await this.postService.getPostById(
        new Types.ObjectId(postId),
        new Types.ObjectId(user._id)
      );

      if (!post) {
        return c.json({
          success: false,
          error: "Post not found or access denied"
        }, 404);
      }

      return c.json({
        success: true,
        data: post,
        message: "Post retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting post:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to get post');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  updatePost = async (c: Context) => {
    try {
      const user = c.get("user");
      const postId = c.req.param("id");
      const body = await c.req.json();

      // Validate postId is a valid ObjectId
      if (!Types.ObjectId.isValid(postId)) {
        return c.json({
          success: false,
          error: "Invalid post ID format"
        }, 400);
      }

      const updateData = {
        ...body,
        tags: body.tags?.map((id: string) => new Types.ObjectId(id)),
      };

      const post = await this.postService.updatePost(
        new Types.ObjectId(postId),
        new Types.ObjectId(user._id),
        updateData
      );

      if (!post) {
        return c.json({
          success: false,
          error: "Post not found or access denied"
        }, 404);
      }

      return c.json({
        success: true,
        data: post,
        message: "Post updated successfully"
      });
    } catch (error: any) {
      console.error("Error updating post:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to update post');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  deletePost = async (c: Context) => {
    try {
      const user = c.get("user");
      const postId = c.req.param("id");

      // Validate postId is a valid ObjectId
      if (!Types.ObjectId.isValid(postId)) {
        return c.json({
          success: false,
          error: "Invalid post ID format"
        }, 400);
      }

      const success = await this.postService.deletePost(
        new Types.ObjectId(postId),
        new Types.ObjectId(user._id)
      );

      if (!success) {
        return c.json({
          success: false,
          error: "Post not found or access denied"
        }, 404);
      }

      return c.json({
        success: true,
        message: "Post deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting post:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to delete post');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  toggleReaction = async (c: Context) => {
    try {
      const user = c.get("user");
      const postId = c.req.param("id");
      const { type } = await c.req.json();

      // Validate postId is a valid ObjectId
      if (!Types.ObjectId.isValid(postId)) {
        return c.json({
          success: false,
          error: "Invalid post ID format"
        }, 400);
      }

      const result = await this.postService.toggleReaction(
        new Types.ObjectId(postId),
        new Types.ObjectId(user._id),
        type
      );

      return c.json({
        success: true,
        data: result,
        message: `Reaction ${result.action} successfully`
      });
    } catch (error: any) {
      console.error("Error toggling reaction:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to toggle reaction');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  getUserPosts = async (c: Context) => {
    try {
      const currentUser = c.get("user");
      const userId = c.req.param("userId");
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "10");

      const result = await this.postService.getUserPosts(
        new Types.ObjectId(userId),
        new Types.ObjectId(currentUser._id),
        page,
        limit
      );

      return c.json({
        success: true,
        data: result,
        message: "User posts retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting user posts:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to get user posts');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  getUploadUrl = async (c: Context) => {
    try {
      const { fileName, mimeType } = await c.req.json();

      const result = await this.s3Service.getSignedUrlForUpload(fileName, mimeType);

      return c.json({
        success: true,
        data: result,
        message: "Upload URL generated successfully"
      });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to generate upload URL');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };

  // Get taggable users for suggestions
  getTaggableUsers = async (c: Context) => {
    console.log("🚀 ENTERING getTaggableUsers method");
    try {
      const user = c.get("user");
      console.log("🔍 Debug - User object:", JSON.stringify(user, null, 2));
      
      const contextType = c.req.query("type") || "post"; // post, comment, reply
      const postId = c.req.query("postId");
      const parentCommentId = c.req.query("parentCommentId");

      console.log("🔍 Debug - Raw query params:", { 
        contextType, 
        postId: `'${postId}'`, 
        postIdType: typeof postId,
        postIdLength: postId?.length,
        parentCommentId: `'${parentCommentId}'`,
        parentCommentIdType: typeof parentCommentId
      });

      // Validate user ID
      if (!user?._id) {
        return c.json({
          success: false,
          error: "User ID is required"
        }, 400);
      }

      console.log("🔍 Debug - User ID type:", typeof user._id, "Value:", user._id);

      // Validate ObjectId format
      if (!Types.ObjectId.isValid(user._id)) {
        return c.json({
          success: false,
          error: "Invalid user ID format"
        }, 400);
      }

      const context: any = { type: contextType };
      if (postId && postId.trim() !== "") {
        if (!Types.ObjectId.isValid(postId)) {
          return c.json({
            success: false,
            error: "Invalid post ID format"
          }, 400);
        }
        context.postId = new Types.ObjectId(postId);
      }
      if (parentCommentId && parentCommentId.trim() !== "") {
        if (!Types.ObjectId.isValid(parentCommentId)) {
          return c.json({
            success: false,
            error: "Invalid parent comment ID format"
          }, 400);
        }
        context.parentCommentId = new Types.ObjectId(parentCommentId);
      }

      const taggableUsers = await this.taggingService.getTaggableUsers(
        new Types.ObjectId(user._id),
        context
      );

      return c.json({
        success: true,
        data: taggableUsers,
        message: "Taggable users retrieved successfully"
      });
    } catch (error: any) {
      console.error("Error getting taggable users:", error);
      if (error instanceof AppError) {
        const body = createErrorResponse(error.message);
        return new Response(JSON.stringify(body), { status: error.statusCode, headers: { 'Content-Type': 'application/json' } });
      }
      const body = createErrorResponse(error?.message || 'Failed to get taggable users');
      return new Response(JSON.stringify(body), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  };
}