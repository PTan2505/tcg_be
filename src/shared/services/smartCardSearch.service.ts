/**
 * Smart Card Search Service
 * Finds best matching cards using multiple search strategies
 */

import axios from "axios";
import fs from "fs/promises";
import Fuse from "fuse.js";
import path from "path";
import { Card } from "../../database/models/card";
import { cardNumberFuzzySearch } from "./cardNumberFuzzySearch.service";

const logger = {
  error: (...args: any[]) => console.error("[SEARCH]", ...args),
  info: (...args: any[]) => console.log("[SEARCH]", ...args),
  warn: (...args: any[]) => console.warn("[SEARCH]", ...args),
};

export interface CardMatch {
  card: any;
  confidence: number;
  matchReason: string;
  score: number;
  matchedFields: string[];
}

export interface SearchResult {
  topMatch: CardMatch | null;
  candidates: CardMatch[];
  searchStrategy: string;
  totalCandidates: number;
  processingTime: number;
  hasExtractedName: boolean;
}

export class SmartCardSearchService {
  private fuseInstances: Map<string, Fuse<any>> = new Map();

  constructor() {
    // Initialize Fuse.js instances for each game type (try artifact first)
    this.initializeFuseInstances();
  }

  /**
   * Helper method to safely check if a card has a valid name
   */
  private hasValidName(card: any): boolean {
    return (
      card && card.name && typeof card.name === "string" && card.name.length > 0
    );
  }

  /**
   * Find best matching cards using extracted text data
   */
  async findBestMatches(
    gameType: "pokemon" | "yugioh" | "onepiece",
    extractedText: any,
    limit: number = 20
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `🔍 Searching for ${gameType} card: "${extractedText.cardName}"`
      );

      // Check if we have a valid extracted name
      const hasValidName =
        extractedText.cardName &&
        extractedText.cardName !== "Unknown Card" &&
        extractedText.cardName.length > 2;

      // Get all cards for the game type with populated cardSet for setName
      const allCards = await Card.find({ gameType })
        .populate("cardSet", "name abbreviation")
        .lean();

      if (allCards.length === 0) {
        return {
          topMatch: null,
          candidates: [],
          searchStrategy: "no_cards_found",
          totalCandidates: 0,
          processingTime: Date.now() - startTime,
          hasExtractedName: hasValidName,
        };
      }

      if (hasValidName) {
        // Name-based search: Find exact matches and candidates
        return this.searchByExtractedName(
          allCards,
          extractedText,
          startTime,
          limit
        );
      } else {
        // Visual-based search: Use fuzzy matching and stats
        return this.searchByVisualMatching(
          allCards,
          extractedText,
          startTime,
          limit
        );
      }
    } catch (error) {
      logger.error("Search error:", error);
      return {
        topMatch: null,
        candidates: [],
        searchStrategy: "error",
        totalCandidates: 0,
        processingTime: Date.now() - startTime,
        hasExtractedName: false,
      };
    }
  }

  /**
   * Search when we have extracted Pokemon name
   * Top match: Best set context match, Candidates: Same name different sets
   */
  private searchByExtractedName(
    allCards: any[],
    extractedText: any,
    startTime: number,
    limit: number
  ): SearchResult {
    const cardName = extractedText.cardName;
    logger.info(`🔍 Name-based search for: "${cardName}"`);

    // Find all cards with the same name (exact match)
    const sameNameCards = allCards.filter(
      (card) =>
        this.hasValidName(card) &&
        card.name.toLowerCase() === cardName.toLowerCase()
    );

    if (sameNameCards.length === 0) {
      // Fallback to fuzzy search if no exact matches
      const fuzzyMatches = this.fuzzyNameMatchWithCache(
        allCards,
        cardName,
        extractedText.gameType || "pokemon"
      );

      return {
        topMatch: fuzzyMatches[0] || null,
        candidates: fuzzyMatches.slice(1, limit),
        searchStrategy: "fuzzy_name_fallback",
        totalCandidates: fuzzyMatches.length,
        processingTime: Date.now() - startTime,
        hasExtractedName: true,
      };
    }

    // Use set context to find the best match
    const setContextMatches = this.exactNameMatchWithSetPriority(
      sameNameCards,
      cardName,
      extractedText.allText
    );

    // Top match is the best set context match
    const topMatch = setContextMatches[0] || null;

    // Candidates are other cards with the same name
    const candidates = sameNameCards
      .filter(
        (card) =>
          !topMatch || card._id.toString() !== topMatch.card._id.toString()
      )
      .map((card) => ({
        card,
        confidence: 85, // Good confidence for same name different set
        matchReason: "Same name, different set",
        score: 85,
        matchedFields: ["name"],
      }))
      .slice(0, limit - 1); // Reserve space for top match

    logger.info(
      `🔍 Found top match: ${topMatch?.card.name} | ${candidates.length} candidates`
    );

    return {
      topMatch,
      candidates,
      searchStrategy: "exact_name_with_candidates",
      totalCandidates: sameNameCards.length,
      processingTime: Date.now() - startTime,
      hasExtractedName: true,
    };
  }

  /**
   * Search when we don't have extracted name - use visual/statistical matching
   */
  private searchByVisualMatching(
    allCards: any[],
    extractedText: any,
    startTime: number,
    limit: number
  ): SearchResult {
    logger.info(`🔍 Visual-based search (no extracted name)`);

    // Try multiple visual/statistical strategies
    const strategies = [
      () =>
        this.statBasedMatch(
          allCards,
          extractedText.primaryStats,
          extractedText.gameType || "pokemon"
        ),
      () =>
        this.combinedTextMatch(
          allCards,
          extractedText.allText,
          extractedText.gameType || "pokemon"
        ),
      () => this.broadTextSearch(allCards, extractedText.allText),
    ];

    let bestMatches: CardMatch[] = [];
    let usedStrategy = "";

    // Try each strategy until we get good results
    for (const [index, strategy] of strategies.entries()) {
      const matches = strategy();

      if (matches.length > 0 && matches[0].confidence > 60) {
        bestMatches = matches.slice(0, limit);
        usedStrategy = `visual_${this.getVisualStrategyName(index)}`;
        break;
      }

      // Keep the best results so far
      if (matches.length > 0 && bestMatches.length === 0) {
        bestMatches = matches.slice(0, limit);
        usedStrategy = `visual_${this.getVisualStrategyName(index)}`;
      }
    }

    const topMatch = bestMatches[0] || null;
    const candidates = bestMatches.slice(1);

    logger.info(
      `🔍 Visual search found: ${topMatch?.card.name} | ${candidates.length} candidates`
    );

    return {
      topMatch,
      candidates,
      searchStrategy: usedStrategy,
      totalCandidates: bestMatches.length,
      processingTime: Date.now() - startTime,
      hasExtractedName: false,
    };
  }

  private getVisualStrategyName(index: number): string {
    const names = ["stat_based", "text_combined", "broad_text"];
    return names[index] || "unknown";
  }

  /**
   * Find best matches within a specific set
   * Used when set detection has high confidence
   */
  async findBestMatchesInSet(
    gameType: "pokemon" | "yugioh" | "onepiece",
    extractedText: any,
    setCode: string,
    limit: number = 15
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `🎯 Searching for ${gameType} card: "${extractedText.cardName}" in set: ${setCode}`
      );

      // First, find the CardSet by abbreviation and gameType
      const { CardSet } = await import("../../database/models/cardSet");
      const cardSet = await CardSet.findOne({
        abbreviation: setCode,
        gameType: gameType,
      }).lean();

      if (!cardSet) {
        logger.info(
          `🎯 CardSet not found for abbreviation: ${setCode} and gameType: ${gameType}`
        );
        return {
          topMatch: null,
          candidates: [],
          searchStrategy: "set_not_found",
          totalCandidates: 0,
          processingTime: Date.now() - startTime,
          hasExtractedName: Boolean(
            extractedText.cardName && extractedText.cardName !== "Unknown Card"
          ),
        };
      }

      logger.info(`🎯 Found CardSet: ${cardSet.name} (ID: ${cardSet._id})`);

      // Then find cards in that set
      const setCards = await Card.find({
        cardSet: cardSet._id,
        gameType: gameType,
      }).lean();

      logger.info(
        `🎯 Found ${setCards.length} cards in set ${setCode} (${cardSet.name})`
      );

      if (setCards.length === 0) {
        return {
          topMatch: null,
          candidates: [],
          searchStrategy: "set_specific_no_cards",
          totalCandidates: 0,
          processingTime: Date.now() - startTime,
          hasExtractedName: Boolean(
            extractedText.cardName && extractedText.cardName !== "Unknown Card"
          ),
        };
      }

      // Use same strategies but only on set-specific cards
      logger.info(
        `🎯 Running search strategies on ${setCards.length} cards from set ${setCode}`
      );
      const strategies = [
        () => this.exactNameMatch(setCards, extractedText.cardName),
        () => this.fuzzyNameMatch(setCards, extractedText.cardName, gameType),
        () =>
          this.statBasedMatch(setCards, extractedText.primaryStats, gameType),
        () => this.combinedTextMatch(setCards, extractedText.allText, gameType),
        () => this.partialNameMatch(setCards, extractedText.cardName),
      ];

      let bestMatches: CardMatch[] = [];
      let usedStrategy = "";

      // Try each strategy
      for (const [index, strategy] of strategies.entries()) {
        const matches = strategy();

        if (matches.length > 0 && matches[0].confidence > 60) {
          // Lower threshold for set-specific
          bestMatches = matches.slice(0, limit);
          usedStrategy = `set_specific_${this.getStrategyName(index)}`;
          logger.info(
            `🎯 Strategy ${index + 1} (${this.getStrategyName(index)}) found ${
              matches.length
            } matches`
          );
          if (matches.length > 0) {
            logger.info(
              `   Top result: ${matches[0].card.name} [ID: ${matches[0].card._id}] (${matches[0].confidence}%)`
            );
          }
          break;
        }

        if (matches.length > 0 && bestMatches.length === 0) {
          bestMatches = matches.slice(0, limit);
          usedStrategy = `set_specific_${this.getStrategyName(index)}`;
        }
      }

      // If still no matches, try broader search within the set
      if (bestMatches.length === 0) {
        bestMatches = this.broadTextSearch(
          setCards,
          extractedText.allText
        ).slice(0, limit);
        usedStrategy = "set_specific_broad_search";
        logger.info(
          `🎯 Broad search in set found ${bestMatches.length} matches`
        );
      }

      const processingTime = Date.now() - startTime;
      logger.info(
        `🎯 Set-specific search complete: ${bestMatches.length} matches found in ${processingTime}ms`
      );

      // Log top matches for debugging
      if (bestMatches.length > 0) {
        logger.info(`🎯 Top matches in ${setCode}:`);
        bestMatches.slice(0, 3).forEach((match, index) => {
          logger.info(
            `   ${index + 1}. ${match.card.name} [ID: ${match.card._id}] (${
              match.confidence
            }% - ${match.matchReason})`
          );
        });
      }

      const topMatch = bestMatches[0] || null;
      const candidates = bestMatches.slice(1);

      return {
        topMatch,
        candidates,
        searchStrategy: usedStrategy,
        totalCandidates: setCards.length,
        processingTime,
        hasExtractedName: Boolean(
          extractedText.cardName && extractedText.cardName !== "Unknown Card"
        ),
      };
    } catch (error) {
      logger.error("Error in set-specific card search:", error);
      throw error;
    }
  }

  /**
   * Strategy 1: Exact name match with set context priority
   */
  private exactNameMatchWithSetPriority(
    cards: any[],
    cardName: string,
    fullText: string
  ): CardMatch[] {
    if (!cardName || cardName === "Unknown Card") return [];

    console.log(`🔍 DEBUG: Searching for exact match of "${cardName}"`);

    // Clean the card name - remove common prefixes and suffixes
    let cleanCardName = cardName.trim();

    // Remove "Pok mon" or "Pokemon" prefix
    cleanCardName = cleanCardName.replace(
      /^(?:Pok[eé]?mon\s+|Pokemon\s+)/i,
      ""
    );

    // Don't remove variant numbers for cards like "Clefable (1)"
    if (!cleanCardName.includes("(")) {
      // Remove common suffixes only if no variant number
      cleanCardName = cleanCardName.replace(
        /\s+(?:HP|ex|EX|GX|V|VMAX).*$/i,
        ""
      );
      cleanCardName = cleanCardName.replace(/\s+\d+.*$/i, "");
    }

    console.log(`🔍 DEBUG: Cleaned name: "${cleanCardName}"`);

    // Extract set clues from the full text
    const setClues = this.extractSetClues(fullText);

    // Try exact match with cleaned name first
    let matches = cards.filter(
      (card) =>
        this.hasValidName(card) &&
        card.name.toLowerCase() === cleanCardName.toLowerCase()
    );

    console.log(
      `🔍 DEBUG: Found ${matches.length} exact matches for "${cleanCardName}"`
    );
    if (matches.length > 0) {
      console.log(
        `🔍 DEBUG: First match: ${matches[0].name} (${matches[0].number})`
      );
    }

    // If no exact match, try the original name
    if (matches.length === 0) {
      matches = cards.filter(
        (card) =>
          this.hasValidName(card) &&
          card.name.toLowerCase() === cardName.toLowerCase()
      );
      console.log(
        `🔍 DEBUG: Found ${matches.length} matches for original name "${cardName}"`
      );
    }

    // If still no match, try partial matching for cases like "Clefable (1)"
    if (matches.length === 0) {
      matches = cards.filter(
        (card) =>
          this.hasValidName(card) &&
          (card.name.toLowerCase().includes(cleanCardName.toLowerCase()) ||
            cleanCardName.toLowerCase().includes(card.name.toLowerCase()))
      );
      console.log(`🔍 DEBUG: Found ${matches.length} partial matches`);
    }

    // Score and sort matches based on set context and card number patterns
    const scoredMatches = matches.map((card) => {
      let contextScore = 95; // Base confidence

      // Boost score if card number appears in text
      if (card.number && fullText.includes(card.number)) {
        contextScore += 20;
      }

      // Boost score based on set indicators
      setClues.forEach((clue) => {
        if (
          card.setCode &&
          card.setCode.toLowerCase().includes(clue.toLowerCase())
        ) {
          contextScore += 15;
        }
      });

      // Special handling for Jungle set cards - prioritize "(1)" variants
      if (fullText.includes("1/64") || fullText.includes("1 64")) {
        if (
          card.setCode === "JU" ||
          card.setName?.toLowerCase().includes("jungle")
        ) {
          if (this.hasValidName(card) && card.name.includes("(1)")) {
            contextScore += 50; // Strong boost for "(1)" variant in Jungle set
          } else if (card.number === "01/64" || card.number === "1/64") {
            contextScore += 30; // Boost for matching card number
          }
        }
      }

      // General variant prioritization based on context
      if (
        this.hasValidName(card) &&
        card.name.includes("(1)") &&
        (fullText.includes("1 64") || fullText.includes("01/64"))
      ) {
        contextScore += 40;
      }

      // Cap the confidence at 100
      contextScore = Math.min(contextScore, 100);

      return {
        card,
        confidence: contextScore,
        matchReason: "Exact name match with set context",
        score: contextScore,
        matchedFields: ["name", "context"],
      };
    });

    // Sort by confidence score
    return scoredMatches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract set clues from OCR text
   */
  private extractSetClues(fullText: string): string[] {
    const clues: string[] = [];

    // Look for set codes
    const setCodes = fullText.match(
      /\b(JU|BS|FO|TR|G1|G2|N1|N2|N3|N4|LC|AQ|SK|EX|DP|PL|HS|BW|XY|SM|SW)\b/gi
    );
    if (setCodes) {
      clues.push(...setCodes);
    }

    // Look for card numbers that indicate specific sets
    const cardNumbers = fullText.match(/\b(\d{1,3}\/\d{1,3})\b/g);
    if (cardNumbers) {
      clues.push(...cardNumbers);
    }

    // Look for year indicators
    const years = fullText.match(/\b(199[8-9]|20[0-2][0-9])\b/g);
    if (years) {
      clues.push(...years);
    }

    return clues;
  }

  /**
   * Strategy 2: Exact name matching (fallback)
   */
  private exactNameMatch(cards: any[], cardName: string): CardMatch[] {
    if (!cardName || cardName === "Unknown Card") return [];

    // Clean the card name - remove common prefixes and suffixes
    let cleanCardName = cardName.trim();

    // Remove "Pok mon" or "Pokemon" prefix
    cleanCardName = cleanCardName.replace(
      /^(?:Pok[eé]?mon\s+|Pokemon\s+)/i,
      ""
    );

    // Remove common suffixes
    cleanCardName = cleanCardName.replace(/\s+(?:HP|ex|EX|GX|V|VMAX).*$/i, "");
    cleanCardName = cleanCardName.replace(/\s+\d+.*$/i, "");
    cleanCardName = cleanCardName.replace(/\s+\(\d+\).*$/i, "");

    // Try exact match with cleaned name first
    let matches = cards.filter(
      (card) =>
        this.hasValidName(card) &&
        card.name.toLowerCase() === cleanCardName.toLowerCase()
    );

    // If no exact match, try the original name
    if (matches.length === 0) {
      matches = cards.filter(
        (card) =>
          this.hasValidName(card) &&
          card.name.toLowerCase() === cardName.toLowerCase()
      );
    }

    // If still no match, try partial matching for cases like "Clefable (1)"
    if (matches.length === 0) {
      matches = cards.filter(
        (card) =>
          this.hasValidName(card) &&
          (card.name.toLowerCase().includes(cleanCardName.toLowerCase()) ||
            cleanCardName.toLowerCase().includes(card.name.toLowerCase()))
      );
    }

    return matches.map((card) => ({
      card,
      confidence: 95,
      matchReason: "Exact name match",
      score: 95,
      matchedFields: ["name"],
    }));
  }

  /**
   * Strategy 2: Fuzzy name matching using Fuse.js (for set-specific search)
   */
  private fuzzyNameMatch(
    cards: any[],
    cardName: string,
    gameType: string
  ): CardMatch[] {
    if (!cardName || cardName === "Unknown Card") return [];

    logger.info(
      `🔍 Fuzzy search for "${cardName}" in ${cards.length} set-specific cards`
    );

    // For set-specific search, create new Fuse instance with only set cards
    const fuse = this.createFuseInstance(cards);
    const results = fuse.search(cardName, { limit: 10 });

    const matches = results
      .map((result: any) => ({
        card: result.item,
        confidence: Math.round((1 - result.score!) * 100),
        matchReason: `Fuzzy name match (${Math.round(
          (1 - result.score!) * 100
        )}% similarity)`,
        score: Math.round((1 - result.score!) * 100),
        matchedFields: ["name"],
      }))
      .filter((match: any) => match.confidence > 60);

    logger.info(`🔍 Set-specific fuzzy search found ${matches.length} matches`);
    return matches;
  }

  /**
   * Strategy 2: Fuzzy name matching using cached Fuse.js (for full database search)
   */
  private fuzzyNameMatchWithCache(
    cards: any[],
    cardName: string,
    gameType: string
  ): CardMatch[] {
    if (!cardName || cardName === "Unknown Card") return [];

    // For full database search, use cached Fuse instance
    const fuse = this.getFuseInstance(gameType, cards);
    const results = fuse.search(cardName, { limit: 10 });

    return results
      .map((result: any) => ({
        card: result.item,
        confidence: Math.round((1 - result.score!) * 100),
        matchReason: `Fuzzy name match (${Math.round(
          (1 - result.score!) * 100
        )}% similarity)`,
        score: Math.round((1 - result.score!) * 100),
        matchedFields: ["name"],
      }))
      .filter((match: any) => match.confidence > 60);
  }

  /**
   * Strategy 3: Statistics-based matching
   */
  private statBasedMatch(
    cards: any[],
    primaryStats: any,
    gameType: string
  ): CardMatch[] {
    if (!primaryStats || Object.keys(primaryStats).length === 0) return [];

    const matches: CardMatch[] = [];

    for (const card of cards) {
      let score = 0;
      const matchedFields: string[] = [];

      // Game-specific stat matching
      if (gameType === "pokemon") {
        if (
          primaryStats.HP &&
          card.hp &&
          card.hp.toString() === primaryStats.HP
        ) {
          score += 40;
          matchedFields.push("HP");
        }
      } else if (gameType === "yugioh") {
        if (
          primaryStats.ATK &&
          card.attack &&
          card.attack.toString() === primaryStats.ATK
        ) {
          score += 30;
          matchedFields.push("ATK");
        }
        if (
          primaryStats.DEF &&
          card.defense &&
          card.defense.toString() === primaryStats.DEF
        ) {
          score += 30;
          matchedFields.push("DEF");
        }
        if (
          primaryStats.Level &&
          card.level &&
          card.level.toString() === primaryStats.Level
        ) {
          score += 20;
          matchedFields.push("Level");
        }
      } else if (gameType === "onepiece") {
        if (
          primaryStats.Power &&
          card.power &&
          card.power.toString() === primaryStats.Power
        ) {
          score += 40;
          matchedFields.push("Power");
        }
        if (
          primaryStats.Cost &&
          card.cost &&
          card.cost.toString() === primaryStats.Cost
        ) {
          score += 20;
          matchedFields.push("Cost");
        }
      }

      if (score > 20) {
        matches.push({
          card,
          confidence: Math.min(85, score),
          matchReason: `Statistics match: ${matchedFields.join(", ")}`,
          score,
          matchedFields,
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Strategy 4: Combined text analysis
   */
  private combinedTextMatch(
    cards: any[],
    allText: string,
    gameType: string
  ): CardMatch[] {
    if (!allText || allText.length < 10) return [];

    const textWords = allText
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const matches: CardMatch[] = [];

    for (const card of cards) {
      if (!this.hasValidName(card)) continue;

      let score = 0;
      const matchedFields: string[] = [];

      // Check name words
      const nameWords = card.name.toLowerCase().split(/\s+/);
      const nameMatches = nameWords.filter((word: string) =>
        textWords.includes(word)
      );
      if (nameMatches.length > 0) {
        score += nameMatches.length * 15;
        matchedFields.push("name_words");
      }

      // Check description/effect text if available
      if (card.text || card.effect || card.description) {
        const cardText = (
          card.text ||
          card.effect ||
          card.description
        ).toLowerCase();
        const commonWords = textWords.filter((word) => cardText.includes(word));
        if (commonWords.length > 2) {
          score += Math.min(20, commonWords.length * 3);
          matchedFields.push("description");
        }
      }

      // Check set name
      if (card.setName) {
        const setWords = card.setName.toLowerCase().split(/\s+/);
        const setMatches = setWords.filter((word: string) =>
          textWords.includes(word)
        );
        if (setMatches.length > 0) {
          score += setMatches.length * 5;
          matchedFields.push("set_name");
        }
      }

      if (score > 15) {
        matches.push({
          card,
          confidence: Math.min(80, score),
          matchReason: `Text analysis: ${matchedFields.join(", ")}`,
          score,
          matchedFields,
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Strategy 5: Partial name matching
   */
  private partialNameMatch(cards: any[], cardName: string): CardMatch[] {
    if (!cardName || cardName === "Unknown Card") return [];

    const searchTerms = cardName
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2);
    const matches: CardMatch[] = [];

    for (const card of cards) {
      if (!this.hasValidName(card)) continue;

      const cardNameLower = card.name.toLowerCase();
      let matchedTerms = 0;

      for (const term of searchTerms) {
        if (cardNameLower.includes(term)) {
          matchedTerms++;
        }
      }

      if (matchedTerms > 0) {
        const confidence = Math.round((matchedTerms / searchTerms.length) * 70);
        matches.push({
          card,
          confidence,
          matchReason: `Partial name match (${matchedTerms}/${searchTerms.length} terms)`,
          score: confidence,
          matchedFields: ["partial_name"],
        });
      }
    }

    return matches
      .filter((match) => match.confidence > 30)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Broad text search (fallback)
   */
  private broadTextSearch(cards: any[], allText: string): CardMatch[] {
    if (!allText) return [];

    const words = allText
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);
    const matches: CardMatch[] = [];

    for (const card of cards) {
      let score = 0;
      const cardText = `${card.name} ${card.setName || ""} ${
        card.text || ""
      }`.toLowerCase();

      for (const word of words) {
        if (cardText.includes(word)) {
          score += 1;
        }
      }

      if (score > 0) {
        const confidence = Math.min(60, score * 5);
        matches.push({
          card,
          confidence,
          matchReason: `Broad text search (${score} matching words)`,
          score: confidence,
          matchedFields: ["broad_text"],
        });
      }
    }

    return matches
      .filter((match) => match.confidence > 20)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Initialize Fuse.js instances for fuzzy searching
   */
  private async initializeFuseInstances() {
    const gameTypes = ["pokemon", "yugioh", "onepiece"];

    for (const gameType of gameTypes) {
      try {
        // Try to load prebuilt Fuse-ready artifact from local cache first
        const cacheDir = path.resolve("data", "cache");
        const localFile = path.join(cacheDir, `fuse-cards-${gameType}.json`);
        let cards: any[] = [];
        let loadedFromArtifact = false;

        try {
          const raw = await fs.readFile(localFile, "utf-8");
          cards = JSON.parse(raw);
          loadedFromArtifact = true;
          logger.info(
            `📚 Loaded fuse-cards artifact from ${localFile} (${cards.length} entries)`
          );
        } catch (localErr) {
          // If artifact not found locally, prefer per-game explicit env URL, then fallback to base URL
          const perGameEnvMap: Record<string, string | undefined> = {
            pokemon: process.env.FUSE_CARDS_POKEMON_URL,
            yugioh: process.env.FUSE_CARDS_YUGIOH_URL,
            onepiece: process.env.FUSE_CARDS_ONEPIECE_URL,
          };

          const perUrl = perGameEnvMap[gameType];
          if (perUrl) {
            try {
              const resp = await axios.get(perUrl, { timeout: 10000 });
              cards = resp.data;
              loadedFromArtifact = true;
              logger.info(
                `📚 Fetched fuse-cards-${gameType} from ${perUrl} (${cards.length} entries)`
              );
            } catch (remoteErr) {
              logger.warn(
                `⚠️ Failed to fetch fuse-cards-${gameType} from ${perUrl}:`,
                (remoteErr as any)?.message || remoteErr
              );
            }
          } else {
            // Try the generic base URL if provided
            const baseUrl = process.env.FUSE_CARDS_BASE_URL; // optional base URL where artifacts are hosted
            if (baseUrl) {
              try {
                const url = `${baseUrl.replace(
                  /\/$/,
                  ""
                )}/fuse-cards-${gameType}.json`;
                const resp = await axios.get(url, { timeout: 10000 });
                cards = resp.data;
                loadedFromArtifact = true;
                logger.info(
                  `📚 Fetched fuse-cards from ${url} (${cards.length} entries)`
                );
              } catch (remoteErr) {
                logger.warn(
                  `⚠️ Failed to fetch fuse-cards-${gameType} from ${baseUrl}:`,
                  (remoteErr as any)?.message || remoteErr
                );
              }
            }
          }
        }

        if (!loadedFromArtifact) {
          // Fall back to DB build
          cards = await Card.find({ gameType })
            .populate("cardSet", "name abbreviation")
            .lean();
          logger.info(
            `📚 Built fuse list from DB for ${gameType}: ${cards.length} cards`
          );
        }

        const fuse = new Fuse(cards, {
          keys: [
            { name: "name", weight: 0.8 },
            { name: "setName", weight: 0.2 },
          ],
          threshold: 0.4,
          includeScore: true,
        });

        this.fuseInstances.set(gameType, fuse);
        logger.info(
          `📚 Initialized Fuse.js for ${gameType}: ${cards.length} cards`
        );
      } catch (error) {
        logger.error(`Failed to initialize Fuse.js for ${gameType}:`, error);
      }
    }
  }

  /**
   * Get or create Fuse.js instance for game type (for full database search)
   */
  private getFuseInstance(gameType: string, cards: any[]): Fuse<any> {
    let fuse = this.fuseInstances.get(gameType);

    if (!fuse) {
      fuse = new Fuse(cards, {
        keys: [
          { name: "name", weight: 0.8 },
          { name: "setName", weight: 0.2 },
        ],
        threshold: 0.4,
        includeScore: true,
      });

      this.fuseInstances.set(gameType, fuse);
    }

    return fuse;
  }

  /**
   * Create new Fuse.js instance for specific card set (for set-specific search)
   */
  private createFuseInstance(cards: any[]): Fuse<any> {
    return new Fuse(cards, {
      keys: [
        { name: "name", weight: 0.8 },
        { name: "setName", weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }

  /**
   * Get all card variants with the same name for visual matching (Enhanced)
   */
  async getAllCardVariants(
    gameType: "pokemon" | "yugioh" | "onepiece",
    cardName: string,
    maxVariants: number = 50
  ): Promise<
    Array<{
      cardId: string;
      imageUrl: string;
      name: string;
      setCode?: string;
      rarity?: string;
    }>
  > {
    try {
      logger.info(
        `🔍 Getting enhanced variants of "${cardName}" for ${gameType}`
      );

      // Enhanced search strategy with multiple approaches
      const searchStrategies = [
        // 1. Exact name match (highest priority)
        () =>
          Card.find({
            gameType,
            name: {
              $regex: new RegExp(
                `^${cardName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i"
              ),
            },
          }),

        // 2. Name contains all major words
        () => {
          const majorWords = cardName
            .split(/\s+/)
            .filter((word) => word.length > 2);
          if (majorWords.length > 0) {
            const wordRegexes = majorWords.map(
              (word) =>
                new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
            );
            return Card.find({
              gameType,
              name: { $all: wordRegexes },
            });
          }
          return Card.find({ _id: { $exists: false } }); // Empty result
        },

        // 3. Fuzzy matching with different name variations
        () => {
          const variations = this.generateNameVariations(cardName);
          const orConditions = variations.map((variation) => ({
            name: {
              $regex: new RegExp(
                variation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
              ),
            },
          }));

          return Card.find({
            gameType,
            $or: orConditions,
          });
        },

        // 4. Partial name matching (broader search)
        () =>
          Card.find({
            gameType,
            name: {
              $regex: new RegExp(
                cardName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
              ),
            },
          }),
      ];

      let allVariants: any[] = [];
      const seenCardIds = new Set<string>();

      // Execute search strategies in order of priority
      for (const [index, strategy] of searchStrategies.entries()) {
        try {
          const strategyResults = await strategy()
            .select("_id name imageUrl setCode rarity gameType setName")
            .lean()
            .limit(maxVariants);

          logger.info(
            `Strategy ${index + 1}: Found ${
              strategyResults.length
            } potential variants`
          );

          // Add unique variants
          for (const card of strategyResults) {
            if (
              !seenCardIds.has(card._id.toString()) &&
              card.imageUrl &&
              card.imageUrl.trim() !== ""
            ) {
              seenCardIds.add(card._id.toString());
              allVariants.push(card);
            }
          }

          // Stop if we have enough variants from high-priority strategies
          if (allVariants.length >= maxVariants * 0.7 && index < 2) {
            logger.info(
              `Got sufficient variants (${
                allVariants.length
              }) from high-priority strategy ${index + 1}`
            );
            break;
          }
        } catch (error) {
          logger.warn(`Search strategy ${index + 1} failed:`, error);
        }
      }

      // Sort variants by relevance (exact matches first, then by set name, etc.)
      allVariants.sort((a, b) => {
        // Exact name matches first
        const aExact = a.name.toLowerCase() === cardName.toLowerCase() ? 1 : 0;
        const bExact = b.name.toLowerCase() === cardName.toLowerCase() ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        // Then by name length (shorter names are often base cards)
        const lengthDiff = a.name.length - b.name.length;
        if (Math.abs(lengthDiff) > 0) return lengthDiff;

        // Finally alphabetically by set name
        return (a.setName || "").localeCompare(b.setName || "");
      });

      const finalVariants = allVariants.slice(0, maxVariants).map((card) => ({
        cardId: card._id.toString(),
        imageUrl: card.imageUrl!,
        name: card.name,
        setCode: card.setCode,
        rarity: card.rarity,
      }));

      logger.info(
        `🔍 Enhanced search found ${finalVariants.length} unique variants with images`
      );

      // Log some examples for debugging
      if (finalVariants.length > 0) {
        logger.info("Sample variants:");
        finalVariants.slice(0, 3).forEach((variant, index) => {
          logger.info(
            `  ${index + 1}. ${variant.name} (${
              variant.setCode || "Unknown set"
            })`
          );
        });
      }

      return finalVariants;
    } catch (error) {
      logger.error("Error getting enhanced card variants:", error);
      return [];
    }
  }

  /**
   * Generate name variations for better matching
   */
  private generateNameVariations(cardName: string): string[] {
    const variations = [cardName];

    // Remove common suffixes/prefixes
    const commonSuffixes = ["EX", "GX", "V", "VMAX", "ex", "gx", "v", "vmax"];
    const commonPrefixes = ["Team", "Dark", "Light", "Shining"];

    let baseName = cardName;

    // Try removing suffixes
    for (const suffix of commonSuffixes) {
      const pattern = new RegExp(`\\s+${suffix}\\s*$`, "i");
      if (pattern.test(baseName)) {
        const withoutSuffix = baseName.replace(pattern, "").trim();
        if (withoutSuffix.length > 0) {
          variations.push(withoutSuffix);
          baseName = withoutSuffix; // Use this for further processing
        }
      }
    }

    // Try removing prefixes
    for (const prefix of commonPrefixes) {
      const pattern = new RegExp(`^${prefix}\\s+`, "i");
      if (pattern.test(baseName)) {
        const withoutPrefix = baseName.replace(pattern, "").trim();
        if (withoutPrefix.length > 0) {
          variations.push(withoutPrefix);
        }
      }
    }

    // Add variations with common card type words
    const cardTypes = ["Pokémon", "Pokemon", "Card"];
    for (const type of cardTypes) {
      variations.push(`${baseName} ${type}`);
    }

    // Remove duplicates and return
    return [...new Set(variations)].filter((v) => v.length > 0);
  }

  /**
   * Find cards by exact card numbers with name validation
   * This is the NEW PRIORITY method for card scanning
   */
  async findByCardNumbers(
    gameType: "pokemon" | "yugioh" | "onepiece",
    cardNumbers: string[],
    extractedCardName: string = "",
    limit: number = 20
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      logger.info(`🎯 Searching by card numbers: ${cardNumbers.join(", ")}`);

      // Query cards by extNumber (exact match)
      const exactMatches = await Card.find({
        gameType,
        $or: cardNumbers.map((number) => ({
          "extendedData.extNumber": number,
        })),
      }).lean();

      logger.info(`🔍 Found ${exactMatches.length} exact card number matches`);

      if (exactMatches.length === 0) {
        return {
          topMatch: null,
          candidates: [],
          searchStrategy: "card_number_exact",
          totalCandidates: 0,
          processingTime: Date.now() - startTime,
          hasExtractedName: Boolean(
            extractedCardName && extractedCardName.trim().length > 0
          ),
        };
      }

      // Score matches based on name similarity (if name provided)
      const matches: CardMatch[] = exactMatches.map((card: any) => {
        let confidence = 95; // High base confidence for exact number match
        let matchReason = `Exact card number match: ${card.extendedData?.extNumber}`;
        let matchedFields = ["cardNumber"];

        // Add name validation if card name was extracted from OCR
        if (
          extractedCardName &&
          extractedCardName.trim().length > 0 &&
          this.hasValidName(card)
        ) {
          const nameSimilarity = this.calculateStringSimilarity(
            extractedCardName.toLowerCase().trim(),
            card.name.toLowerCase().trim()
          );

          logger.info(
            `📝 Name comparison: "${extractedCardName}" vs "${card.name}" = ${(
              nameSimilarity * 100
            ).toFixed(1)}%`
          );

          if (nameSimilarity >= 0.8) {
            confidence = Math.min(98, confidence + nameSimilarity * 10); // Boost for name match
            matchReason += ` + High name similarity (${(
              nameSimilarity * 100
            ).toFixed(1)}%)`;
            matchedFields.push("cardName");
          } else if (nameSimilarity >= 0.5) {
            confidence = Math.min(90, confidence + nameSimilarity * 5); // Moderate boost
            matchReason += ` + Partial name similarity (${(
              nameSimilarity * 100
            ).toFixed(1)}%)`;
            matchedFields.push("partialName");
          } else {
            confidence -= 15; // Penalize poor name match
            matchReason += ` - Name mismatch (${(nameSimilarity * 100).toFixed(
              1
            )}%)`;
          }
        }

        return {
          card,
          confidence,
          matchReason,
          score: confidence,
          matchedFields,
        };
      });

      // Sort by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence);

      const topMatches = matches.slice(0, limit);

      logger.info(
        `✅ Card number search completed: ${topMatches.length} validated matches`
      );
      if (topMatches.length > 0) {
        logger.info(
          `🏆 Top match: ${
            topMatches[0].card.name
          } (${topMatches[0].confidence.toFixed(1)}% confidence)`
        );
      }

      const topMatch = topMatches[0] || null;
      const candidates = topMatches.slice(1);

      return {
        topMatch,
        candidates,
        searchStrategy: "card_number_with_name_validation",
        totalCandidates: exactMatches.length,
        processingTime: Date.now() - startTime,
        hasExtractedName: Boolean(
          extractedCardName && extractedCardName.trim().length > 0
        ),
      };
    } catch (error: any) {
      logger.error("Card number search failed:", error);
      return {
        topMatch: null,
        candidates: [],
        searchStrategy: "card_number_search_failed",
        totalCandidates: 0,
        processingTime: Date.now() - startTime,
        hasExtractedName: Boolean(
          extractedCardName && extractedCardName.trim().length > 0
        ),
      };
    }
  }

  /**
   * Enhanced card number search with fuzzy matching and OCR error correction
   */
  async findByCardNumbersFuzzy(
    gameType: "pokemon" | "yugioh" | "onepiece",
    ocrText: string,
    extractedCardName?: string,
    limit: number = 20
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Fuzzy card number search for ${gameType}`);
      logger.info(`📝 OCR Text: "${ocrText}"`);
      if (extractedCardName) {
        logger.info(`📝 Extracted Name: "${extractedCardName}"`);
      }

      // Use fuzzy search service to find potential card numbers
      const cardNumberMatches = await cardNumberFuzzySearch.findCardNumbers(
        ocrText,
        gameType,
        limit * 2 // Get more candidates for better filtering
      );

      if (cardNumberMatches.length === 0) {
        logger.info("❌ No card number matches found via fuzzy search");
        return {
          topMatch: null,
          candidates: [],
          searchStrategy: "fuzzy_card_number_no_matches",
          totalCandidates: 0,
          processingTime: Date.now() - startTime,
          hasExtractedName: Boolean(
            extractedCardName && extractedCardName.trim().length > 0
          ),
        };
      }

      logger.info(
        `🎯 Found ${cardNumberMatches.length} potential card number matches`
      );

      // Get full card data for matched card numbers
      const validMatches: Array<{ cardId: string; match: any }> = [];

      for (const match of cardNumberMatches) {
        const cardData = await cardNumberFuzzySearch.getCardByNumber(
          match.cardNumber
        );
        if (cardData?.cardId) {
          validMatches.push({
            cardId: cardData.cardId.toString(),
            match: match,
          });
        }
      }

      if (validMatches.length === 0) {
        logger.info("❌ No valid card IDs found for matched card numbers");
        return {
          topMatch: null,
          candidates: [],
          searchStrategy: "fuzzy_card_number_no_valid_ids",
          totalCandidates: cardNumberMatches.length,
          processingTime: Date.now() - startTime,
          hasExtractedName: Boolean(
            extractedCardName && extractedCardName.trim().length > 0
          ),
        };
      }

      const cardIds = validMatches.map((vm) => vm.cardId);
      const fullCards = await Card.find({
        _id: { $in: cardIds },
        gameType,
      }).lean();

      if (fullCards.length === 0) {
        logger.info("❌ No full card data found for matched card numbers");
        return {
          topMatch: null,
          candidates: [],
          searchStrategy: "fuzzy_card_number_no_cards",
          totalCandidates: cardNumberMatches.length,
          processingTime: Date.now() - startTime,
          hasExtractedName: Boolean(
            extractedCardName && extractedCardName.trim().length > 0
          ),
        };
      }

      // Create enhanced matches with fuzzy search confidence
      const matches = fullCards
        .map((card) => {
          // Find corresponding card number match
          const validMatch = validMatches.find(
            (vm) => vm.cardId === card._id.toString()
          );

          if (!validMatch) return null;

          const cardNumberMatch = validMatch.match;

          let confidence = cardNumberMatch.confidence;
          let matchReason = `Fuzzy card number match: ${cardNumberMatch.cardNumber}`;
          let matchedFields = ["cardNumber"];

          // Add match type information
          switch (cardNumberMatch.matchType) {
            case "exact":
              matchReason += " (exact)";
              break;
            case "ocr_correction":
              matchReason += ` (OCR corrected: ${cardNumberMatch.corrections.join(
                ", "
              )})`;
              confidence = Math.min(confidence, 95); // Cap confidence for corrected matches
              break;
            case "fuzzy":
              matchReason += ` (fuzzy, edit distance: ${cardNumberMatch.editDistance})`;
              confidence = Math.min(confidence, 85); // Cap confidence for fuzzy matches
              break;
          }

          // Add name validation if available
          if (
            extractedCardName &&
            extractedCardName.trim().length > 0 &&
            this.hasValidName(card)
          ) {
            const nameSimilarity = this.calculateStringSimilarity(
              extractedCardName.toLowerCase().trim(),
              card.name.toLowerCase().trim()
            );

            logger.info(
              `📝 Name validation: "${extractedCardName}" vs "${
                card.name
              }" = ${(nameSimilarity * 100).toFixed(1)}%`
            );

            if (nameSimilarity >= 0.8) {
              confidence = Math.min(98, confidence + nameSimilarity * 8); // Boost for name match
              matchReason += ` + High name similarity (${(
                nameSimilarity * 100
              ).toFixed(1)}%)`;
              matchedFields.push("cardName");
            } else if (nameSimilarity >= 0.5) {
              confidence = Math.min(90, confidence + nameSimilarity * 4); // Moderate boost
              matchReason += ` + Partial name similarity (${(
                nameSimilarity * 100
              ).toFixed(1)}%)`;
              matchedFields.push("partialName");
            } else if (nameSimilarity < 0.3) {
              confidence -= 20; // Penalize poor name match more heavily
              matchReason += ` - Poor name match (${(
                nameSimilarity * 100
              ).toFixed(1)}%)`;
            }
          }

          return {
            card,
            confidence,
            matchReason,
            score: confidence,
            matchedFields,
          };
        })
        .filter((match): match is CardMatch => match !== null);

      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      const topMatches = matches.slice(0, limit);

      logger.info(
        `✅ Fuzzy card number search completed: ${topMatches.length} matches`
      );
      if (topMatches.length > 0) {
        logger.info(
          `🏆 Top match: ${
            topMatches[0].card.name
          } (${topMatches[0].confidence.toFixed(1)}% confidence)`
        );
        logger.info(
          `🔢 Card number: ${
            topMatches[0].card.extendedData?.extNumber || "N/A"
          }`
        );
      }

      const topMatch = topMatches[0] || null;
      const candidates = topMatches.slice(1);

      return {
        topMatch,
        candidates,
        searchStrategy: "fuzzy_card_number_with_validation",
        totalCandidates: cardNumberMatches.length,
        processingTime: Date.now() - startTime,
        hasExtractedName: Boolean(
          extractedCardName && extractedCardName.trim().length > 0
        ),
      };
    } catch (error: any) {
      logger.error("Fuzzy card number search failed:", error);
      return {
        topMatch: null,
        candidates: [],
        searchStrategy: "card_number_error",
        totalCandidates: 0,
        processingTime: Date.now() - startTime,
        hasExtractedName: Boolean(
          extractedCardName && extractedCardName.trim().length > 0
        ),
      };
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private getStrategyName(index: number): string {
    const names = [
      "exact_name_match_with_set_priority",
      "exact_name_match",
      "fuzzy_name_match",
      "stats_based_match",
      "combined_text_match",
      "partial_name_match",
    ];
    return names[index] || "unknown_strategy";
  }
}

export const smartCardSearch = new SmartCardSearchService();
