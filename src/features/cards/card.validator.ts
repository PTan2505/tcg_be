import { z } from 'zod';

export const cardTypeSchema = z.enum(['pokemon', 'yugioh']);

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional()
});

export const getCardsQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'rarity', 'type']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  rarity: z.string().optional(),
  cardType: z.string().optional(),
  set: z.string().optional(),
  attribute: z.string().optional(),
  race: z.string().optional()
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.enum(['name', 'createdAt', 'rarity', 'type']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});