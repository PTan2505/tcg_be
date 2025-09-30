import { z } from 'zod';
import { CardCategory } from '../../database/models/userCard';

export const addCardSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  category: z.nativeEnum(CardCategory)
});

export const removeCardSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  category: z.nativeEnum(CardCategory)
});

export const getUserCardsQuerySchema = z.object({
  category: z.nativeEnum(CardCategory).optional(),
  sortBy: z.enum(['name', 'addedAt', 'rarity', 'type']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  search: z.string().optional(),
  type: z.string().optional(),
  set: z.string().optional(),
  rarity: z.string().optional()
});