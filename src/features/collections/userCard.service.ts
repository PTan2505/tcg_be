import UserModel from '../../database/models/user';
import { CardCategory, IUserCard, UserCard } from '../../database/models/userCard';
import { Card } from '../../database/models/card';

export interface IUserCardService {
  addCardToCollection(userId: string, cardId: string, category: CardCategory): Promise<IUserCard>;
  removeCardFromCollection(userId: string, cardId: string, category: CardCategory): Promise<void>;
  getUserCards(userId: string, options?: GetUserCardsOptions): Promise<UserCardWithDetails[]>;
  getUserCardsByCategory(userId: string, category: CardCategory): Promise<UserCardWithDetails[]>;
  searchUserCards(userId: string, query: string): Promise<UserCardWithDetails[]>;
  getCardDetails(cardId: string, category: CardCategory): Promise<any>;
}

export interface GetUserCardsOptions {
  category?: CardCategory;
  sortBy?: 'name' | 'addedAt' | 'rarity' | 'type';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  search?: string;
  filters?: {
    type?: string;
    set?: string;
    rarity?: string;
  };
}

export interface UserCardWithDetails extends IUserCard {
  cardDetails: any;
}

export class UserCardService implements IUserCardService {
  async addCardToCollection(userId: string, cardId: string, category: CardCategory): Promise<IUserCard> {
    // Verify user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify card exists in the respective collection
    await this.verifyCardExists(cardId, category);

    // Check if card is already in user's collection
    const existingCard = await UserCard.findOne({
      userId,
      cardId,
      category
    });

    if (existingCard) {
      throw new Error('Card is already in your collection');
    }

    // Add card to collection
    const userCard = new UserCard({
      userId,
      cardId,
      category
    });

    return await userCard.save();
  }

  async removeCardFromCollection(userId: string, cardId: string, category: CardCategory): Promise<void> {
    const result = await UserCard.findOneAndDelete({
      userId,
      cardId,
      category
    });

    if (!result) {
      throw new Error('Card not found in your collection');
    }
  }

  async getUserCards(userId: string, options: GetUserCardsOptions = {}): Promise<UserCardWithDetails[]> {
    const {
      category,
      sortBy = 'addedAt',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
      search,
      filters = {}
    } = options;

    // Build query
    const query: any = { userId };
    if (category) {
      query.category = category;
    }

    // Get user cards
    let userCardsQuery = UserCard.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(offset)
      .limit(limit);

    const userCards = await userCardsQuery.exec();

    // Get card details with filtering
    const cardsWithDetails = await Promise.all(
      userCards.map(async (userCard) => {
        const cardDetails = await this.getCardDetails(userCard.cardId.toString(), userCard.category);
        
        // Apply search filter
        if (search && !this.matchesSearch(cardDetails, search)) {
          return null;
        }

        // Apply filters
        if (!this.matchesFilters(cardDetails, filters)) {
          return null;
        }

        return {
          ...userCard.toObject(),
          cardDetails
        } as unknown as UserCardWithDetails;
      })
    );

    // Filter out null results and return
    return cardsWithDetails.filter(card => card !== null) as UserCardWithDetails[];
  }

  async getUserCardsByCategory(userId: string, category: CardCategory): Promise<UserCardWithDetails[]> {
    return this.getUserCards(userId, { category });
  }

  async searchUserCards(userId: string, query: string): Promise<UserCardWithDetails[]> {
    return this.getUserCards(userId, { search: query });
  }

  async getCardDetails(cardId: string, category: CardCategory): Promise<any> {
    // With the unified model, we just need to find the card by ID
    // The category parameter is kept for backward compatibility
    const card = await Card.findById(cardId).populate('cardSet');
    if (!card) {
      throw new Error('Card not found');
    }
    return card.toObject();
  }

  private async verifyCardExists(cardId: string, category: CardCategory): Promise<void> {
    const cardDetails = await this.getCardDetails(cardId, category);
    if (!cardDetails) {
      throw new Error(`${category} card not found`);
    }
  }

  private matchesSearch(cardDetails: any, search: string): boolean {
    const searchLower = search.toLowerCase();
    return (
      cardDetails.name?.toLowerCase().includes(searchLower) ||
      cardDetails.desc?.toLowerCase().includes(searchLower) ||
      cardDetails.type?.toLowerCase().includes(searchLower) ||
      cardDetails.race?.toLowerCase().includes(searchLower) ||
      cardDetails.attribute?.toLowerCase().includes(searchLower)
    );
  }

  private matchesFilters(cardDetails: any, filters: any): boolean {
    if (filters.type && cardDetails.type !== filters.type) {
      return false;
    }
    if (filters.rarity && !cardDetails.card_sets?.some((set: any) => set.set_rarity === filters.rarity)) {
      return false;
    }
    if (filters.set && !cardDetails.card_sets?.some((set: any) => set.set_name === filters.set)) {
      return false;
    }
    return true;
  }
}