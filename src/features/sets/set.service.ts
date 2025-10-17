import { CardSet, ICardSet } from '../../database/models/cardSet';

export type SetType = 'pokemon' | 'yugioh' | 'onepiece';

export interface GetSetsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isSupplemental?: boolean;
  categoryId?: number;
}

export interface PaginationInfo {
  totalPages: number;
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GetSetsResult {
  sets: ICardSet[];
  pagination: PaginationInfo;
}

export interface ISetService {
  getAllSets(options?: GetSetsOptions): Promise<GetSetsResult>;
  getSetsByType(type: SetType, options?: GetSetsOptions): Promise<GetSetsResult>;
  getSetById(setId: string): Promise<ICardSet>;
  getSetByGroupId(groupId: number): Promise<ICardSet>;
  searchSets(type: SetType, query: string, options?: GetSetsOptions): Promise<GetSetsResult>;
  searchAllSets(query: string, options?: GetSetsOptions): Promise<GetSetsResult>;
  getSetStats(type?: SetType): Promise<any>;
}

export class SetService implements ISetService {
  async getAllSets(options: GetSetsOptions = {}): Promise<GetSetsResult> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'publishedOn',
      sortOrder = 'desc',
      isSupplemental,
      categoryId
    } = options;

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { abbreviation: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (typeof isSupplemental === 'boolean') {
      query.isSupplemental = isSupplemental;
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [sets, totalItems] = await Promise.all([
      CardSet.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CardSet.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limit);
    const pagination: PaginationInfo = {
      totalPages,
      currentPage: page,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    return { sets, pagination };
  }

  async getSetsByType(type: SetType, options: GetSetsOptions = {}): Promise<GetSetsResult> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'publishedOn',
      sortOrder = 'desc',
      isSupplemental,
      categoryId
    } = options;

    // Build query
    const query: any = { gameType: type };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { abbreviation: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (typeof isSupplemental === 'boolean') {
      query.isSupplemental = isSupplemental;
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [sets, totalItems] = await Promise.all([
      CardSet.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CardSet.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limit);
    const pagination: PaginationInfo = {
      totalPages,
      currentPage: page,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    return { sets, pagination };
  }

  async getSetById(setId: string): Promise<ICardSet> {
    const set = await CardSet.findById(setId).lean();
    if (!set) {
      const { getMessage } = require('../../shared/constants/messages');
      const AppError = require('../../shared/errors/AppError').default;
      throw new AppError(getMessage('SETS.SET_NOT_FOUND') + `: ${setId}`, 404);
    }
    return set;
  }

  async getSetByGroupId(groupId: number): Promise<ICardSet> {
    const set = await CardSet.findOne({ groupId }).lean();
    if (!set) {
      const { getMessage } = require('../../shared/constants/messages');
      const AppError = require('../../shared/errors/AppError').default;
      throw new AppError(getMessage('SETS.SET_NOT_FOUND') + `: group ${groupId}`, 404);
    }
    return set;
  }

  async searchSets(type: SetType, query: string, options: GetSetsOptions = {}): Promise<GetSetsResult> {
    return this.getSetsByType(type, { ...options, search: query });
  }

  async searchAllSets(query: string, options: GetSetsOptions = {}): Promise<GetSetsResult> {
    return this.getAllSets({ ...options, search: query });
  }

  async getSetStats(type?: SetType): Promise<any> {
    const pipeline: any[] = [];

    // Filter by game type if specified
    if (type) {
      pipeline.push({ $match: { gameType: type } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$gameType',
          totalSets: { $sum: 1 },
          supplementalSets: {
            $sum: { $cond: ['$isSupplemental', 1, 0] }
          },
          mainSets: {
            $sum: { $cond: ['$isSupplemental', 0, 1] }
          },
          latestRelease: { $max: '$publishedOn' },
          oldestRelease: { $min: '$publishedOn' },
          categories: { $addToSet: '$categoryId' }
        }
      },
      {
        $addFields: {
          gameType: '$_id',
          categoriesCount: { $size: '$categories' }
        }
      },
      {
        $project: {
          _id: 0,
          gameType: 1,
          totalSets: 1,
          supplementalSets: 1,
          mainSets: 1,
          latestRelease: 1,
          oldestRelease: 1,
          categoriesCount: 1
        }
      }
    );

    const stats = await CardSet.aggregate(pipeline);
    return type ? stats[0] : stats;
  }
}