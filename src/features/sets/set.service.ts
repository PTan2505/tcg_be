import { PokemonSet } from '../../database/models/pokemon/pokemonSet';
import { YugiohSet } from '../../database/models/yugioh';

export type SetType = 'pokemon' | 'yugioh';

export interface GetSetsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetSetsResult {
  sets: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ISetService {
  getAllSets(options?: GetSetsOptions): Promise<GetSetsResult>;
  getSetsByType(setType: SetType, options?: GetSetsOptions): Promise<GetSetsResult>;
  getSetById(setId: string, setType?: SetType): Promise<any>;
  searchSets(setType: SetType, query: string, options?: GetSetsOptions): Promise<GetSetsResult>;
  searchAllSets(query: string, options?: GetSetsOptions): Promise<GetSetsResult>;
}

export class SetService implements ISetService {
  async getAllSets(options: GetSetsOptions = {}): Promise<GetSetsResult> {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const skip = (page - 1) * limit;

    // Get both Pokemon and Yugioh sets
    const [pokemonResult, yugiohResult] = await Promise.all([
      this.getSetsByType('pokemon', { ...options, page: 1, limit: 1000 }),
      this.getSetsByType('yugioh', { ...options, page: 1, limit: 1000 })
    ]);

    // Combine and add setType field
    let allSets = [
      ...pokemonResult.sets.map(set => ({ ...set, setType: 'pokemon' })),
      ...yugiohResult.sets.map(set => ({ ...set, setType: 'yugioh' }))
    ];

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      allSets = allSets.filter(set => 
        searchRegex.test(set.name || set.setName || '') ||
        searchRegex.test(set.series || set.setCode || '') ||
        searchRegex.test(set.id || '')
      );
    }

    // Sort the combined results
    allSets.sort((a, b) => {
      const aVal = a[sortBy] || a.setName || a.name || '';
      const bVal = b[sortBy] || b.setName || b.name || '';
      
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });

    // Apply pagination
    const total = allSets.length;
    const paginatedSets = allSets.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      sets: paginatedSets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getSetsByType(setType: SetType, options: GetSetsOptions = {}): Promise<GetSetsResult> {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    let sets: any[];
    let total: number;

    if (setType === 'pokemon') {
      let query: any = {};
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { series: { $regex: search, $options: 'i' } },
          { id: { $regex: search, $options: 'i' } }
        ];
      }

      const [pokemonSets, pokemonTotal] = await Promise.all([
        PokemonSet.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        PokemonSet.countDocuments(query)
      ]);
      
      sets = pokemonSets;
      total = pokemonTotal;

    } else if (setType === 'yugioh') {
      let query: any = {};
      
      if (search) {
        query.$or = [
          { setName: { $regex: search, $options: 'i' } },
          { setCode: { $regex: search, $options: 'i' } }
        ];
      }

      // Get unique sets (group by setName and setCode)
      const pipeline: any[] = [
        ...(Object.keys(query).length > 0 ? [{ $match: query }] : []),
        {
          $group: {
            _id: { setName: '$setName', setCode: '$setCode' },
            setName: { $first: '$setName' },
            setCode: { $first: '$setCode' },
            cardCount: { $sum: 1 },
            rarities: { $addToSet: '$setRarity' },
            priceRange: {
              $push: {
                $cond: [
                  { $ne: ['$setPrice', null] },
                  { $toDouble: '$setPrice' },
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            minPrice: { $min: '$priceRange' },
            maxPrice: { $max: '$priceRange' }
          }
        },
        {
          $project: {
            _id: 0,
            setName: 1,
            setCode: 1,
            cardCount: 1,
            rarities: 1,
            minPrice: 1,
            maxPrice: 1
          }
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit }
      ];

      const [yugiohSets, totalResult] = await Promise.all([
        YugiohSet.aggregate(pipeline),
        YugiohSet.aggregate([
          ...(Object.keys(query).length > 0 ? [{ $match: query }] : []),
          {
            $group: {
              _id: { setName: '$setName', setCode: '$setCode' }
            }
          },
          { $count: 'total' }
        ])
      ]);
      
      sets = yugiohSets;
      total = totalResult[0]?.total || 0;

    } else {
      throw new Error('Invalid set type. Must be "pokemon" or "yugioh"');
    }

    const totalPages = Math.ceil(total / limit);

    return {
      sets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getSetById(setId: string, setType?: SetType): Promise<any> {
    let set: any;

    if (setType) {
      // If setType is provided, search in specific type
      if (setType === 'pokemon') {
        set = await PokemonSet.findById(setId).lean();
      } else if (setType === 'yugioh') {
        // For Yu-Gi-Oh!, setId can be setName or setCode
        const setData = await YugiohSet.aggregate([
          {
            $match: {
              $or: [
                { setName: { $regex: setId, $options: 'i' } },
                { setCode: { $regex: setId, $options: 'i' } }
              ]
            }
          },
          {
            $group: {
              _id: { setName: '$setName', setCode: '$setCode' },
              setName: { $first: '$setName' },
              setCode: { $first: '$setCode' },
              cardCount: { $sum: 1 },
              cards: {
                $push: {
                  cardExtId: '$cardExtId',
                  setRarity: '$setRarity',
                  setPrice: '$setPrice'
                }
              },
              rarities: { $addToSet: '$setRarity' }
            }
          },
          {
            $project: {
              _id: 0,
              setName: 1,
              setCode: 1,
              cardCount: 1,
              cards: 1,
              rarities: 1,
              setType: { $literal: 'yugioh' }
            }
          }
        ]);

        set = setData[0] || null;
      }
    } else {
      // Search in both types
      try {
        // First try Pokemon
        set = await PokemonSet.findById(setId).lean();
        if (set) {
          set.setType = 'pokemon';
        }
      } catch (error) {
        // If not found in Pokemon, try Yugioh
        const setData = await YugiohSet.aggregate([
          {
            $match: {
              $or: [
                { setName: { $regex: setId, $options: 'i' } },
                { setCode: { $regex: setId, $options: 'i' } }
              ]
            }
          },
          {
            $group: {
              _id: { setName: '$setName', setCode: '$setCode' },
              setName: { $first: '$setName' },
              setCode: { $first: '$setCode' },
              cardCount: { $sum: 1 },
              cards: {
                $push: {
                  cardExtId: '$cardExtId',
                  setRarity: '$setRarity',
                  setPrice: '$setPrice'
                }
              },
              rarities: { $addToSet: '$setRarity' }
            }
          },
          {
            $project: {
              _id: 0,
              setName: 1,
              setCode: 1,
              cardCount: 1,
              cards: 1,
              rarities: 1,
              setType: { $literal: 'yugioh' }
            }
          }
        ]);

        set = setData[0] || null;
      }
    }

    if (!set) {
      throw new Error(`Set not found`);
    }

    return set;
  }

  async searchSets(setType: SetType, query: string, options: GetSetsOptions = {}): Promise<GetSetsResult> {
    const searchOptions = {
      ...options,
      search: query
    };

    return this.getSetsByType(setType, searchOptions);
  }

  async searchAllSets(query: string, options: GetSetsOptions = {}): Promise<GetSetsResult> {
    const searchOptions = {
      ...options,
      search: query
    };

    return this.getAllSets(searchOptions);
  }
}