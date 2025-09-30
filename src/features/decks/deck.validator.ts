import { z } from 'zod';
import { DeckFormat } from '../../database/models/deck';
import { CardCategory } from '../../database/models/userCard';

export const createDeckSchema = z.object({
  name: z.string().min(1, 'Deck name is required').max(100, 'Deck name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  category: z.nativeEnum(CardCategory),
  format: z.nativeEnum(DeckFormat),
  isPublic: z.boolean().optional().default(false),
  tags: z.array(z.string().max(50)).optional().default([])
});

export const updateDeckSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  format: z.nativeEnum(DeckFormat).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().max(50)).optional()
});

export const addCardToDeckSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  category: z.nativeEnum(CardCategory),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(4, 'Cannot add more than 4 of the same card')
});

export const updateCardQuantitySchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1').max(4, 'Cannot have more than 4 of the same card')
});

export const duplicateDeckSchema = z.object({
  name: z.string().min(1, 'New deck name is required').max(100, 'Deck name must be less than 100 characters')
});