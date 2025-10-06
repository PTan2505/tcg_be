import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().min(1, "Nội dung là bắt buộc").max(2000, "Nội dung quá dài"),
  cardReferences: z.array(z.object({
    cardId: z.string(),
    cardType: z.enum(['pokemon', 'yugioh'], { message: "Loại thẻ không hợp lệ" })
  })).optional(),
  deckReferences: z.array(z.string()).optional(),
  privacy: z.enum(['public', 'friends', 'private'], { message: "Chế độ riêng tư không hợp lệ" }).default('public'),
  tags: z.array(z.string()).optional(),
});

// Schema for text-only posts (no images)
export const createTextPostSchema = z.object({
  content: z.string().min(1, "Nội dung là bắt buộc").max(2000, "Nội dung quá dài"),
  cardReferences: z.array(z.object({
    cardId: z.string(),
    cardType: z.enum(['pokemon', 'yugioh'], { message: "Loại thẻ không hợp lệ" })
  })).optional(),
  deckReferences: z.array(z.string()).optional(),
  privacy: z.enum(['public', 'friends', 'private'], { message: "Chế độ riêng tư không hợp lệ" }).default('public'),
});

export const updatePostSchema = z.object({
  content: z.string().min(1, "Nội dung là bắt buộc").max(2000, "Nội dung quá dài").optional(),
  privacy: z.enum(['public', 'friends', 'private'], { message: "Chế độ riêng tư không hợp lệ" }).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, "Nội dung là bắt buộc").max(500, "Nội dung quá dài"),
  parentComment: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Nội dung là bắt buộc").max(500, "Nội dung quá dài"),
});

export const reactionSchema = z.object({
  type: z.enum(['like'], { message: "Loại phản ứng không hợp lệ" })
});

export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0, "Trang phải lớn hơn 0").optional(),
  limit: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0 && val <= 50, "Giới hạn phải từ 1 đến 50").optional(),
});

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1, "Tên file là bắt buộc"),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/, "Loại hình ảnh không hợp lệ"),
});