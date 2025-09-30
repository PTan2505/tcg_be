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

      const [yugiohSets, yugiohTotal] = await Promise.all([
        YugiohSet.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        YugiohSet.countDocuments(query)
      ]);
      
      sets = yugiohSets;
      total = yugiohTotal;

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
        // For Yu-Gi-Oh!, find sets and get related card information
        let query: any = {};
        if (setId.match(/^[0-9a-fA-F]{24}$/)) {
          // ObjectId format
          query._id = setId;
        } else {
          // setName or setCode
          query.$or = [
            { setName: { $regex: setId, $options: 'i' } },
            { setCode: { $regex: setId, $options: 'i' } }
          ];
        }

        const sets = await YugiohSet.find(query).lean();
        
        if (sets.length === 0) {
          return null;
        }

        // Get the first matching set and find all related cards
        const targetSet = sets[0];
        const { YugiohCard } = await import('../../database/models/yugioh');
        
        const relatedCards = await YugiohCard.find({
          cardSets: targetSet._id
        }).countDocuments();

        set = {
          _id: targetSet._id,
          setName: targetSet.setName,
          setCode: targetSet.setCode,
          setRarity: targetSet.setRarity,
          setPrice: targetSet.setPrice,
          cardCount: relatedCards,
          setType: 'yugioh'
        };
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
        let query: any = {};
        if (setId.match(/^[0-9a-fA-F]{24}$/)) {
          // ObjectId format
          query._id = setId;
        } else {
          // setName or setCode
          query.$or = [
            { setName: { $regex: setId, $options: 'i' } },
            { setCode: { $regex: setId, $options: 'i' } }
          ];
        }

        const sets = await YugiohSet.find(query).lean();
        
        if (sets.length > 0) {
          const targetSet = sets[0];
          const { YugiohCard } = await import('../../database/models/yugioh');
          
          const relatedCards = await YugiohCard.find({
            cardSets: targetSet._id
          }).countDocuments();

          set = {
            _id: targetSet._id,
            setName: targetSet.setName,
            setCode: targetSet.setCode,
            setRarity: targetSet.setRarity,
            setPrice: targetSet.setPrice,
            cardCount: relatedCards,
            setType: 'yugioh'
          };
        }
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