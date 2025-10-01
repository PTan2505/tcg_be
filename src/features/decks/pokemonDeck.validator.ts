import { z } from 'zod';

// Validation schemas for Pokemon deck routes (mostly for query parameters)

export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  types: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : undefined)
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  types: z.string().optional().transform(val => val ? val.split(',').filter(Boolean) : undefined)
});

export const typeFilterSchema = z.object({
  types: z.string().min(1, 'Types parameter is required').transform(val => val.split(',').filter(Boolean))
});

// Valid Pokemon types for validation
export const VALID_POKEMON_TYPES = [
  'Fire',
  'Water',
  'Grass',
  'Lightning',
  'Psychic',
  'Fighting',
  'Darkness',
  'Metal',
  'Fairy',
  'Dragon',
  'Colorless'
] as const;

export type PokemonType = typeof VALID_POKEMON_TYPES[number];