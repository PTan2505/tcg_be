import { z } from 'zod';

export const addCardSchema = z.object({
  cardId: z.string().min(1, 'ID thẻ là bắt buộc')
});

export const getUserCardsQuerySchema = z.object({
  gameType: z.enum(['pokemon', 'yugioh', 'onepiece'], { message: "Loại game không hợp lệ" }).optional(),
  sortBy: z.enum(['name', 'addedAt', 'rarity', 'gameType'], { message: "Sắp xếp theo không hợp lệ" }).optional(),
  sortOrder: z.enum(['asc', 'desc'], { message: "Thứ tự sắp xếp không hợp lệ" }).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1, "Giới hạn phải lớn hơn 0").max(100, "Giới hạn không được quá 100")).optional(),
  page: z.string().transform(Number).pipe(z.number().min(0, "page phải lớn hơn hoặc bằng 0")).optional(),
  search: z.string().optional(),
  rarity: z.string().optional(),
  setId: z.string().optional(),
  minPrice: z.string().transform(Number).pipe(z.number().min(0, "Giá tối thiểu phải lớn hơn hoặc bằng 0")).optional(),
  maxPrice: z.string().transform(Number).pipe(z.number().min(0, "Giá tối đa phải lớn hơn hoặc bằng 0")).optional()
});