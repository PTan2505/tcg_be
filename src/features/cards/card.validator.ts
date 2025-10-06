import { z } from 'zod';

export const cardTypeSchema = z.enum(['pokemon', 'yugioh'], { message: "Loại thẻ không hợp lệ" });

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1, "Trang phải lớn hơn 0")).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1, "Giới hạn phải lớn hơn 0").max(100, "Giới hạn không được quá 100")).optional()
});

export const getCardsQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1, "Trang phải lớn hơn 0")).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1, "Giới hạn phải lớn hơn 0").max(100, "Giới hạn không được quá 100")).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'rarity', 'type'], { message: "Sắp xếp theo không hợp lệ" }).optional(),
  sortOrder: z.enum(['asc', 'desc'], { message: "Thứ tự sắp xếp không hợp lệ" }).optional(),
  rarity: z.string().optional(),
  cardType: z.string().optional(),
  set: z.string().optional(),
  attribute: z.string().optional(),
  race: z.string().optional()
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Từ khóa tìm kiếm là bắt buộc'),
  page: z.string().transform(Number).pipe(z.number().min(1, "Trang phải lớn hơn 0")).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1, "Giới hạn phải lớn hơn 0").max(100, "Giới hạn không được quá 100")).optional(),
  sortBy: z.enum(['name', 'createdAt', 'rarity', 'type'], { message: "Sắp xếp theo không hợp lệ" }).optional(),
  sortOrder: z.enum(['asc', 'desc'], { message: "Thứ tự sắp xếp không hợp lệ" }).optional()
});