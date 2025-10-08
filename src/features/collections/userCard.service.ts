import { Card } from '../../database/models/card';
import UserModel from '../../database/models/user';
import { IUserCard, UserCard } from '../../database/models/userCard';
import { GameType } from '../cards/card.service';

export interface IUserCardService {
  addCardToCollection(userId: string, cardId: string): Promise<IUserCard>;
  removeCardFromCollection(userId: string, cardId: string): Promise<void>;
  getUserCards(userId: string, options?: GetUserCardsOptions): Promise<UserCardWithDetails[]>;
  getUserCardsByGameType(userId: string, gameType: GameType, options?: GetUserCardsOptions): Promise<UserCardWithDetails[]>;
  searchUserCards(userId: string, query: string): Promise<UserCardWithDetails[]>;
  getCardDetails(cardId: string): Promise<any>;
  getUserCollectionSets(userId: string, gameType: GameType, options?: GetUserCollectionSetsOptions): Promise<GetUserCollectionSetsResult>;
}

export interface GetUserCardsOptions {
  gameType?: GameType;
  sortBy?: 'name' | 'addedAt' | 'rarity' | 'gameType';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  search?: string;
  filters?: {
    rarity?: string;
    setId?: string;
    minPrice?: number;
    maxPrice?: number;
  };
}

export interface GetUserCollectionSetsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'publishedOn' | 'cardCount';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationInfo {
  totalPages: number;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UserCollectionSet {
  _id: string;
  name: string;
  abbreviation: string;
  gameType: string;
  publishedOn?: Date;
  cardCount: number;
}

export interface GetUserCollectionSetsResult {
  sets: UserCollectionSet[];
  pagination: PaginationInfo;
}

export interface UserCardWithDetails {
  _id: string;
  userId: string;
  cardId: string;
  createdAt: Date;
  updatedAt: Date;
  cardDetails: {
    _id: string;
    name: string;
    cleanName: string;
    gameType: string;
    rarity: string;
    number: string;
    imageUrl: string;
    productId: number;
    tcgPlayerPrice?: any;
    extendedData?: any;
    cardSet?: {
      _id: string;
      name: string;
      abbreviation: string;
      gameType: string;
    } | null;
  };
}

export class UserCardService implements IUserCardService {
  async addCardToCollection(
    userId: string,
    cardId: string
  ): Promise<IUserCard> {
    // Verify user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify card exists and get card details
    const cardDetails = await this.getCardDetails(cardId);
    if (!cardDetails) {
      throw new Error("Card not found");
    }

    // Check if card is already in user's collection
    const existingCard = await UserCard.findOne({
      userId,
      cardId,
    });

    if (existingCard) {
      throw new Error("Card is already in your collection");
    }

    // Add card to collection with gameType and setId
    const userCard = new UserCard({
      userId,
      cardId,
      gameType: cardDetails.gameType,
      setId: cardDetails.cardSet?._id || cardDetails.cardSet,
    });

    return await userCard.save();
  }

  async removeCardFromCollection(
    userId: string,
    cardId: string
  ): Promise<void> {
    const result = await UserCard.findOneAndDelete({
      userId,
      cardId,
    });

    if (!result) {
      throw new Error("Card not found in your collection");
    }
  }

  async getUserCards(
    userId: string,
    options: GetUserCardsOptions = {}
  ): Promise<UserCardWithDetails[]> {
    const {
      sortBy = "addedAt",
      sortOrder = "desc",
      limit = 20,
      page = 1,
      search,
      gameType,
      filters = {},
    } = options;

    // Build query for UserCard using new fields
    const query: any = { userId };

    // Filter by gameType directly
    if (gameType) {
      query.gameType = gameType;
    }

    // Filter by setId directly
    if (filters.setId) {
      query.setId = filters.setId;
    }

     const skip = (page - 1) * limit;
    // Get user cards with card details populated
    let userCardsQuery = UserCard.find(query)
      .populate({
        path: "cardId",
        model: "Card",
        populate: {
          path: "cardSet",
          model: "CardSet",
        },
      })
      .skip(skip)
      .limit(limit);

    const userCards = await userCardsQuery.exec();

    // Filter and process results
    const cardsWithDetails = userCards.map((userCard) => {
      const cardDetails = userCard.cardId as any;

      if (!cardDetails || !cardDetails._id) {
        return null;
      }

      // Apply gameType filter
      if (gameType && cardDetails.gameType !== gameType) {
        return null;
      }

      // Apply search filter
      if (search && !this.matchesSearch(cardDetails, search)) {
        return null;
      }

      // Apply filters
      if (!this.matchesFilters(cardDetails, filters)) {
        return null;
      }

      return {
        _id: (userCard._id as any).toString(),
        userId: userCard.userId.toString(),
        cardId: cardDetails._id.toString(), // Just the card ID
        createdAt: userCard.createdAt,
        updatedAt: userCard.updatedAt,
        cardDetails: {
          _id: cardDetails._id.toString(),
          name: cardDetails.name,
          cleanName: cardDetails.cleanName,
          gameType: cardDetails.gameType,
          rarity: cardDetails.rarity,
          number: cardDetails.number,
          imageUrl: cardDetails.imageUrl,
          productId: cardDetails.productId,
          tcgPlayerPrice: cardDetails.tcgPlayerPrice,
          extendedData: cardDetails.extendedData,
          cardSet: cardDetails.cardSet
            ? {
                _id: cardDetails.cardSet._id?.toString(),
                name: cardDetails.cardSet.name,
                abbreviation: cardDetails.cardSet.abbreviation,
                gameType: cardDetails.cardSet.gameType,
              }
            : null,
        },
      } as UserCardWithDetails;
    });

    // Filter out null results
    const validCards = cardsWithDetails.filter(
      (card) => card !== null
    ) as UserCardWithDetails[];

    // Apply sorting
    validCards.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.cardDetails.name;
          bValue = b.cardDetails.name;
          break;
        case "addedAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "rarity":
          aValue = a.cardDetails.rarity;
          bValue = b.cardDetails.rarity;
          break;
        case "gameType":
          aValue = a.cardDetails.gameType;
          bValue = b.cardDetails.gameType;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return validCards;
  }

  async getUserCardsByGameType(
    userId: string,
    gameType: GameType,
    options: GetUserCardsOptions = {}
  ): Promise<UserCardWithDetails[]> {
    const {
      sortBy = "addedAt",
      sortOrder = "desc",
      limit = 50,
      page = 1,
      search,
      filters = {},
    } = options;

    const query: any = { userId, gameType };

    // Filter by setId directly
    if (filters.setId) {
      query.setId = filters.setId;
    }
     const skip = (page - 1) * limit;

    // Direct query using gameType field - much simpler!
    let userCardsQuery = UserCard.find(query)
      .populate({
        path: "cardId",
        model: "Card",
        populate: {
          path: "cardSet",
          model: "CardSet",
        },
      })
      .skip(skip)
      .limit(limit);

    const userCards = await userCardsQuery.exec();

    // Transform to match expected format
    const cardsWithDetails = userCards.map((userCard) => {
      const cardDetails = userCard.cardId as any;

      if (!cardDetails || !cardDetails._id) {
        return null;
      }

      if (!this.matchesFilters(cardDetails, filters)) {
        return null;
      }
      return {
        _id: (userCard._id as any).toString(),
        userId: userCard.userId.toString(),
        cardId: (userCard._id as any).toString(),
        createdAt: userCard.createdAt,
        updatedAt: userCard.updatedAt,
        cardDetails: {
          _id: (userCard.cardId as any)._id.toString(),
          name: (userCard.cardId as any).name,
          cleanName: (userCard.cardId as any).cleanName,
          gameType: (userCard.cardId as any).gameType,
          rarity: (userCard.cardId as any).rarity,
          number: (userCard.cardId as any).number,
          imageUrl: (userCard.cardId as any).imageUrl,
          productId: (userCard.cardId as any).productId,
          tcgPlayerPrice: (userCard.cardId as any).tcgPlayerPrice,
          extendedData: (userCard.cardId as any).extendedData,
          cardSet: (userCard.cardId as any).cardSet
            ? {
                _id: (userCard.cardId as any).cardSet._id.toString(),
                name: (userCard.cardId as any).cardSet.name,
                abbreviation: (userCard.cardId as any).cardSet.abbreviation,
                gameType: (userCard.cardId as any).cardSet.gameType,
              }
            : null,
        },
      } as UserCardWithDetails;
    });
    // Filter out null results
    const validCards = cardsWithDetails.filter(
      (card) => card !== null
    ) as UserCardWithDetails[];

    // Apply sorting
    validCards.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.cardDetails.name;
          bValue = b.cardDetails.name;
          break;
        case "addedAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "rarity":
          aValue = a.cardDetails.rarity;
          bValue = b.cardDetails.rarity;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return validCards;
  }

  async searchUserCards(
    userId: string,
    query: string
  ): Promise<UserCardWithDetails[]> {
    return this.getUserCards(userId, { search: query });
  }

  async getCardDetails(cardId: string): Promise<any> {
    // With the unified model, we just need to find the card by ID
    const card = await Card.findById(cardId).populate("cardSet");
    if (!card) {
      throw new Error("Card not found");
    }
    return card.toObject();
  }

  async getUserCollectionSets(
    userId: string,
    gameType: GameType,
    options: GetUserCollectionSetsOptions = {}
  ): Promise<GetUserCollectionSetsResult> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = "name",
      sortOrder = "asc",
      setId,
    } = options as any;

    // Build query for userCard
    const query: any = { userId, gameType };
    if (setId) query.setId = setId;

    // Get all setIds from userCard
    const userCards = await UserCard.find(query).select('setId');
    const setIdList = [...new Set(userCards.map(uc => uc.setId?.toString()).filter(Boolean))];
    if (setIdList.length === 0) {
      return {
        sets: [],
        pagination: {
          totalPages: 0,
          currentPage: page,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false,
        }
      };
    }

    // Build CardSet query
    const setQuery: any = { _id: { $in: setIdList } };
    if (search) {
      setQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { abbreviation: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalItems = await UserCard.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    // Get CardSet details
    const sets = await (await import('../../database/models/cardSet')).CardSet.find(setQuery)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Count cards per set for user
    const cardCountMap: Record<string, number> = {};
    userCards.forEach(uc => {
      const sid = uc.setId?.toString();
      if (sid) cardCountMap[sid] = (cardCountMap[sid] || 0) + 1;
    });

    // Format result
    const formattedSets: UserCollectionSet[] = sets.map(set => ({
      _id: set._id.toString(),
      name: set.name,
      abbreviation: set.abbreviation,
      gameType: set.gameType,
      publishedOn: set.publishedOn,
      cardCount: cardCountMap[set._id.toString()] || 0
    }));

    return {
      sets: formattedSets,
      pagination: {
        totalPages,
        currentPage: page,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }

  private async verifyCardExists(cardId: string): Promise<void> {
    const cardDetails = await this.getCardDetails(cardId);
    if (!cardDetails) {
      throw new Error(`Card not found`);
    }
  }

  private matchesSearch(cardDetails: any, search: string): boolean {
    const searchLower = search.toLowerCase();
    return (
      cardDetails.name?.toLowerCase().includes(searchLower) ||
      cardDetails.cleanName?.toLowerCase().includes(searchLower) ||
      cardDetails.extendedData?.extDescription
        ?.toLowerCase()
        .includes(searchLower) ||
      cardDetails.extendedData?.extCardType
        ?.toLowerCase()
        .includes(searchLower) ||
      cardDetails.extendedData?.extAttribute
        ?.toLowerCase()
        .includes(searchLower) ||
      cardDetails.cardSet?.name?.toLowerCase().includes(searchLower)
    );
  }

  private matchesFilters(cardDetails: any, filters: any): boolean {
    if (filters.rarity && cardDetails.rarity !== filters.rarity) {
      return false;
    }

    if (
      filters.setId &&
      cardDetails.cardSet?._id?.toString() !== filters.setId
    ) {
      return false;
    }

    if (
      filters.minPrice !== undefined &&
      (!cardDetails.tcgPlayerPrice?.marketPrice ||
        cardDetails.tcgPlayerPrice.marketPrice < filters.minPrice)
    ) {
      return false;
    }

    if (
      filters.maxPrice !== undefined &&
      (!cardDetails.tcgPlayerPrice?.marketPrice ||
        cardDetails.tcgPlayerPrice.marketPrice > filters.maxPrice)
    ) {
      return false;
    }

    return true;
  }
}