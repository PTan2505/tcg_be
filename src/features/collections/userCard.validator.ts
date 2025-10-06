import { z } from 'zod';
import { CardCategory } from '../../database/models/userCard';

export const addCardSchema = z.object({
  cardId: z.string().min(1, 'ID thẻ là bắt buộc'),
  category: z.nativeEnum(CardCategory, { message: "Danh mục thẻ không hợp lệ" })
});

export const removeCardSchema = z.object({
  cardId: z.string().min(1, 'ID thẻ là bắt buộc'),
  category: z.nativeEnum(CardCategory, { message: "Danh mục thẻ không hợp lệ" })
});

export const getUserCardsQuerySchema = z.object({
  category: z.nativeEnum(CardCategory, { message: "Danh mục thẻ không hợp lệ" }).optional(),
  sortBy: z.enum(['name', 'addedAt', 'rarity', 'type'], { message: "Sắp xếp theo không hợp lệ" }).optional(),
  sortOrder: z.enum(['asc', 'desc'], { message: "Thứ tự sắp xếp không hợp lệ" }).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1, "Giới hạn phải lớn hơn 0").max(100, "Giới hạn không được quá 100")).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0, "Offset phải lớn hơn hoặc bằng 0")).optional(),
  search: z.string().optional(),
  type: z.string().optional(),
  set: z.string().optional(),
  rarity: z.string().optional()
});