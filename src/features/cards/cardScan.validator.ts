import { z } from "zod";

// Schema for card scanning request
export const cardScanSchema = z.object({
  gameType: z.enum(['pokemon', 'yugioh', 'onepiece'], {
    message: "Game type must be 'pokemon', 'yugioh', or 'onepiece'"
  }),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  userPreferences: z.object({
    preferredSets: z.array(z.string()).optional(),
    priceRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    }).optional()
  }).optional()
});

// Schema for card selection confirmation
export const cardSelectionSchema = z.object({
  selectedCardId: z.string().min(1, "Selected card ID is required"),
  gameType: z.enum(['pokemon', 'yugioh', 'onepiece'], {
    message: "Game type must be 'pokemon', 'yugioh', or 'onepiece'"
  }),
  quantity: z.number().int().min(1).max(100).default(1),
  condition: z.enum(['mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor']).default('near_mint'),
  isFirstEdition: z.boolean().optional(),
  notes: z.string().max(500).optional()
});

// Schema for getting scan history
export const scanHistorySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0, "Page must be positive").optional(),
  limit: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0 && val <= 50, "Limit must be between 1 and 50").optional(),
  gameType: z.enum(['pokemon', 'yugioh', 'onepiece']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Schema for card fuzzy search (for manual card lookup)
export const cardFuzzySearchSchema = z.object({
  query: z.string().min(1, "Search query is required").max(100),
  gameType: z.enum(['pokemon', 'yugioh', 'onepiece']),
  setCode: z.string().optional(),
  maxResults: z.number().int().min(1).max(20).default(10),
  includeVariants: z.boolean().default(true)
});

// Schema for batch card scanning
export const batchScanSchema = z.object({
  gameType: z.enum(['pokemon', 'yugioh', 'onepiece']),
  cards: z.array(z.object({
    tempId: z.string(), // Temporary ID for matching response
    imageData: z.string(), // Base64 encoded image or file reference
    userNotes: z.string().max(200).optional()
  })).min(1).max(10) // Limit batch size
});

export type CardScanRequest = z.infer<typeof cardScanSchema>;
export type CardSelectionRequest = z.infer<typeof cardSelectionSchema>;
export type ScanHistoryRequest = z.infer<typeof scanHistorySchema>;
export type CardFuzzySearchRequest = z.infer<typeof cardFuzzySearchSchema>;
export type BatchScanRequest = z.infer<typeof batchScanSchema>;