import { Context } from "hono";
import { Types } from "mongoose";
import { UserCardService } from "../collections/userCard.service";
import { CardScanService } from "./cardScan.service";

export class CardScanController {
  private cardScanService: CardScanService;
  private userCardService: UserCardService;

  constructor() {
    this.cardScanService = new CardScanService();
    this.userCardService = new UserCardService();
  }

  /**
   * Scan a card image and return potential matches
   */
  scanCard = async (c: Context) => {
    try {
      const user = c.get("user");
      const body = await c.req.parseBody();
      
      // Extract form data
      const gameType = body.gameType as string;
      const image = body.image as File;
      
      // Parse optional fields
      let location, userPreferences;
      try {
        location = body.location ? JSON.parse(body.location as string) : undefined;
        userPreferences = body.userPreferences ? JSON.parse(body.userPreferences as string) : undefined;
      } catch (parseError) {
        return c.json({
          success: false,
          error: "Invalid JSON in location or userPreferences fields"
        }, 400);
      }

      // Validate required fields
      if (!gameType || !['pokemon', 'yugioh', 'onepiece'].includes(gameType)) {
        return c.json({
          success: false,
          error: "Valid gameType is required (pokemon, yugioh, or onepiece)"
        }, 400);
      }

      if (!image || !(image instanceof File)) {
        return c.json({
          success: false,
          error: "Image file is required"
        }, 400);
      }

      // Validate file type
      if (!image.type.startsWith('image/')) {
        return c.json({
          success: false,
          error: "File must be an image"
        }, 400);
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (image.size > maxSize) {
        return c.json({
          success: false,
          error: "Image file too large. Maximum size is 10MB"
        }, 400);
      }

      // Convert file to buffer
      const imageBuffer = Buffer.from(await image.arrayBuffer());

      // Scan the card
      const scanResult = await this.cardScanService.scanCard(
        imageBuffer,
        gameType,
        user._id,
        {
          userPreferences,
          location,
          maxResults: 10
        }
      );

      return c.json({
        success: true,
        data: scanResult,
        message: scanResult.requiresSetSelection 
          ? "Multiple cards found. Please select the correct one."
          : "Card identified successfully"
      });

    } catch (error: any) {
      console.error("Card scan error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to scan card"
      }, 500);
    }
  };

  /**
   * Scan a card image using visual similarity matching
   */
  visualScanCard = async (c: Context) => {
    try {
      const user = c.get("user");
      const body = await c.req.parseBody();
      
      // Extract form data
      const gameType = body.gameType as string;
      const image = body.image as File;
      
      // Parse optional scan options
      let scanOptions;
      try {
        scanOptions = body.scanOptions ? JSON.parse(body.scanOptions as string) : {};
      } catch {
        scanOptions = {};
      }

      // Validate required fields
      if (!gameType || !['pokemon', 'yugioh', 'onepiece'].includes(gameType)) {
        return c.json({
          success: false,
          error: "Valid gameType is required (pokemon, yugioh, or onepiece)"
        }, 400);
      }

      if (!image || !(image instanceof File)) {
        return c.json({
          success: false,
          error: "Image file is required"
        }, 400);
      }

      // Convert File to Buffer
      const arrayBuffer = await image.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      console.log(`🎨 Visual scan request: ${gameType} card, image size: ${imageBuffer.length} bytes`);

      // Perform visual similarity scan
      const scanResult = await this.cardScanService.scanCardByVisualSimilarity(
        imageBuffer,
        gameType as 'pokemon' | 'yugioh' | 'onepiece',
        user.userId,
        {
          maxCandidates: scanOptions.maxCandidates || 500,
          minSimilarity: scanOptions.minSimilarity || 0.4,
          maxResults: scanOptions.maxResults || 10
        }
      );

      return c.json({
        success: true,
        data: scanResult,
        message: scanResult.requiresSetSelection 
          ? "Multiple visually similar cards found. Please select the correct one."
          : "Card identified by visual similarity successfully"
      });

    } catch (error: any) {
      console.error("Visual card scan error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to scan card visually"
      }, 500);
    }
  };

  /**
   * Confirm card selection and add to user's collection
   */
  confirmCardSelection = async (c: Context) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      const {
        selectedCardId,
        quantity = 1,
        condition = 'near_mint',
        isFirstEdition,
        notes,
        gameType // Add gameType to the request body
      } = body;

      // Validate required fields
      if (!selectedCardId || !Types.ObjectId.isValid(selectedCardId)) {
        return c.json({
          success: false,
          error: "Valid selectedCardId is required"
        }, 400);
      }

      if (!gameType || !['pokemon', 'yugioh', 'onepiece'].includes(gameType)) {
        return c.json({
          success: false,
          error: "Valid gameType is required (pokemon, yugioh, or onepiece)"
        }, 400);
      }

      if (quantity < 1 || quantity > 100) {
        return c.json({
          success: false,
          error: "Quantity must be between 1 and 100"
        }, 400);
      }

      const validConditions = ['mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor'];
      if (!validConditions.includes(condition)) {
        return c.json({
          success: false,
          error: `Condition must be one of: ${validConditions.join(', ')}`
        }, 400);
      }

      // Add card to user's collection
      // Map gameType to CardCategory
      const categoryMap = {
        'pokemon': 'PokemonCard',
        'yugioh': 'YugiohCard',
        'onepiece': 'Card' // Using the general Card model for One Piece
      };

      const category = categoryMap[gameType as keyof typeof categoryMap] || 'Card';

      const userCard = await this.userCardService.addCardToCollection(
        user._id,
        selectedCardId,
        category as any
      );

      // Update scan history with the selected card
      await this.cardScanService.updateScanHistoryWithSelection(
        user._id,
        selectedCardId
      );

      return c.json({
        success: true,
        data: userCard,
        message: "Card added to collection successfully"
      }, 201);

    } catch (error: any) {
      console.error("Card selection confirmation error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to confirm card selection"
      }, 500);
    }
  };

  /**
   * Fuzzy search for cards (manual lookup)
   */
  fuzzySearchCards = async (c: Context) => {
    try {
      const { query, gameType, setCode, maxResults = 10, includeVariants = true } = c.req.query();

      // Validate required fields
      if (!query || query.trim().length === 0) {
        return c.json({
          success: false,
          error: "Search query is required"
        }, 400);
      }

      if (!gameType || !['pokemon', 'yugioh', 'onepiece'].includes(gameType)) {
        return c.json({
          success: false,
          error: "Valid gameType is required (pokemon, yugioh, or onepiece)"
        }, 400);
      }

      const maxResultsNum = parseInt(String(maxResults));
      if (maxResultsNum < 1 || maxResultsNum > 50) {
        return c.json({
          success: false,
          error: "maxResults must be between 1 and 50"
        }, 400);
      }

      const matches = await this.cardScanService.fuzzySearchCards(
        query,
        gameType,
        {
          setCode,
          maxResults: maxResultsNum,
          includeVariants: includeVariants === 'true'
        }
      );

      return c.json({
        success: true,
        data: {
          matches,
          query,
          totalMatches: matches.length
        },
        message: "Search completed successfully"
      });

    } catch (error: any) {
      console.error("Fuzzy search error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to search cards"
      }, 500);
    }
  };

  /**
   * Get user's scan history
   */
  getScanHistory = async (c: Context) => {
    try {
      const user = c.get("user");
      const { 
        page = '1', 
        limit = '20', 
        gameType, 
        startDate, 
        endDate 
      } = c.req.query();

      // Validate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1) {
        return c.json({
          success: false,
          error: "Page must be greater than 0"
        }, 400);
      }

      if (limitNum < 1 || limitNum > 100) {
        return c.json({
          success: false,
          error: "Limit must be between 1 and 100"
        }, 400);
      }

      // Validate gameType if provided
      if (gameType && !['pokemon', 'yugioh', 'onepiece'].includes(gameType)) {
        return c.json({
          success: false,
          error: "GameType must be pokemon, yugioh, or onepiece"
        }, 400);
      }

      // Validate dates if provided
      let startDateObj, endDateObj;
      if (startDate) {
        startDateObj = new Date(startDate);
        if (isNaN(startDateObj.getTime())) {
          return c.json({
            success: false,
            error: "Invalid startDate format"
          }, 400);
        }
      }

      if (endDate) {
        endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          return c.json({
            success: false,
            error: "Invalid endDate format"
          }, 400);
        }
      }

      const result = await this.cardScanService.getScanHistory(user._id, {
        page: pageNum,
        limit: limitNum,
        gameType,
        startDate: startDateObj,
        endDate: endDateObj
      });

      return c.json({
        success: true,
        data: {
          scans: result.scans,
          pagination: {
            currentPage: pageNum,
            totalScans: result.total,
            hasMore: result.hasMore,
            limit: limitNum
          }
        },
        message: "Scan history retrieved successfully"
      });

    } catch (error: any) {
      console.error("Get scan history error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to get scan history"
      }, 500);
    }
  };

  /**
   * Batch scan multiple cards
   */
  batchScanCards = async (c: Context) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();

      const { gameType, cards } = body;

      // Validate required fields
      if (!gameType || !['pokemon', 'yugioh', 'onepiece'].includes(gameType)) {
        return c.json({
          success: false,
          error: "Valid gameType is required (pokemon, yugioh, or onepiece)"
        }, 400);
      }

      if (!Array.isArray(cards) || cards.length === 0) {
        return c.json({
          success: false,
          error: "Cards array is required and must not be empty"
        }, 400);
      }

      if (cards.length > 10) {
        return c.json({
          success: false,
          error: "Maximum 10 cards per batch scan"
        }, 400);
      }

      // Validate each card entry
      for (const card of cards) {
        if (!card.tempId || !card.imageData) {
          return c.json({
            success: false,
            error: "Each card must have tempId and imageData"
          }, 400);
        }
      }

      // Process each card scan
      const results = [];
      for (const cardData of cards) {
        try {
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(cardData.imageData, 'base64');
          
          const scanResult = await this.cardScanService.scanCard(
            imageBuffer,
            gameType,
            user._id,
            { maxResults: 5 }
          );

          results.push({
            tempId: cardData.tempId,
            success: true,
            scanResult,
            userNotes: cardData.userNotes
          });

        } catch (error: any) {
          results.push({
            tempId: cardData.tempId,
            success: false,
            error: error.message || "Failed to scan card"
          });
        }
      }

      return c.json({
        success: true,
        data: {
          results,
          totalProcessed: cards.length,
          successfulScans: results.filter(r => r.success).length
        },
        message: "Batch scan completed"
      });

    } catch (error: any) {
      console.error("Batch scan error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to process batch scan"
      }, 500);
    }
  };

  /**
   * Get scanning statistics for the user
   */
  getScanStats = async (c: Context) => {
    try {
      const user = c.get("user");

      // TODO: Implement scan statistics
      // For now return mock data
      const stats = {
        totalScans: 0,
        successfulScans: 0,
        averageConfidence: 0,
        gameTypeBreakdown: {
          pokemon: 0,
          yugioh: 0,
          onepiece: 0
        },
        recentActivity: {
          thisWeek: 0,
          thisMonth: 0
        }
      };

      return c.json({
        success: true,
        data: stats,
        message: "Scan statistics retrieved successfully"
      });

    } catch (error: any) {
      console.error("Get scan stats error:", error);
      return c.json({
        success: false,
        error: error.message || "Failed to get scan statistics"
      }, 500);
    }
  };
}