import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content too long"),
  cardReferences: z.array(z.object({
    cardId: z.string(),
    cardType: z.enum(['pokemon', 'yugioh'])
  })).optional(),
  deckReferences: z.array(z.string()).optional(),
  privacy: z.enum(['public', 'friends', 'private']).default('public'),
  tags: z.array(z.string()).optional(),
});

// Schema for text-only posts (no images)
export const createTextPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content too long"),
  cardReferences: z.array(z.object({
    cardId: z.string(),
    cardType: z.enum(['pokemon', 'yugioh'])
  })).optional(),
  deckReferences: z.array(z.string()).optional(),
  privacy: z.enum(['public', 'friends', 'private']).default('public'),
});

export const updatePostSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content too long").optional(),
  privacy: z.enum(['public', 'friends', 'private']).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(500, "Content too long"),
  parentComment: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Content is required").max(500, "Content too long"),
});

export const reactionSchema = z.object({
  type: z.enum(['like', 'dislike'])
});

export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0, "Page must be positive").optional(),
  limit: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0 && val <= 50, "Limit must be between 1 and 50").optional(),
});

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/, "Invalid image type"),
});