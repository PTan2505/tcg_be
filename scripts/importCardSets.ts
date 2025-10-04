import { parse } from 'csv-parse/sync';
import "dotenv/config";
import { readFileSync } from 'fs';
import path from 'path';
import { connectDB } from '../src/database/db/db';
import { CardSet } from '../src/database/models/cardSet';

interface CSVSetData {
  groupId: string;
  name: string;
  abbreviation: string;
  isSupplemental: string;
  publishedOn: string;
  modifiedOn: string;
  categoryId: string;
}

async function importSetsFromCSV(forceReimport = false) {
  try {
    // Connect to database
    await connectDB();
    console.log('📦 Starting card sets import...');
    
    if (forceReimport) {
      console.log('🔄 Force reimport mode - will update all sets regardless of modification date');
    }

    // Define the CSV files and their corresponding game types
    const setFiles = [
      { 
        file: 'data/sets/PokemonGroups.csv', 
        gameType: 'pokemon' as const,
        gameName: 'Pokemon'
      },
      { 
        file: 'data/sets/YuGiOhGroups.csv', 
        gameType: 'yugioh' as const,
        gameName: 'Yu-Gi-Oh!'
      },
      { 
        file: 'data/sets/OnePieceCardGameGroups.csv', 
        gameType: 'onepiece' as const,
        gameName: 'One Piece'
      }
    ];

    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const { file, gameType, gameName } of setFiles) {
      console.log(`\n🎮 Processing ${gameName} sets from ${file}...`);
      
      try {
        // Read and parse CSV file
        const filePath = path.join(process.cwd(), file);
        const csvContent = readFileSync(filePath, 'utf-8');
        const records: CSVSetData[] = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        console.log(`📋 Found ${records.length} ${gameName} sets to process`);

        let gameImported = 0;
        let gameUpdated = 0;
        let gameSkipped = 0;

        for (const record of records) {
          try {
            // Validate required fields
            if (!record.groupId || !record.name) {
              console.warn(`⚠️  Missing required fields for record, skipping...`, record);
              gameSkipped++;
              continue;
            }

            // Parse and validate groupId
            const groupId = parseInt(record.groupId);
            if (isNaN(groupId)) {
              console.warn(`⚠️  Invalid groupId for set ${record.name}, skipping...`);
              gameSkipped++;
              continue;
            }

            // Parse dates with fallback
            let publishedOn = new Date(record.publishedOn);
            let modifiedOn = new Date(record.modifiedOn);
            
            // If dates are invalid, use current date or a default
            if (isNaN(publishedOn.getTime())) {
              console.warn(`⚠️  Invalid publishedOn date for set ${record.name}, using current date`);
              publishedOn = new Date();
            }
            
            if (isNaN(modifiedOn.getTime())) {
              console.warn(`⚠️  Invalid modifiedOn date for set ${record.name}, using publishedOn date`);
              modifiedOn = publishedOn;
            }

            // Handle missing abbreviation by generating one from the name
            let abbreviation = record.abbreviation?.trim() || '';
            if (!abbreviation) {
              // Generate abbreviation from name (first letters of each word, max 8 chars)
              abbreviation = record.name
                .trim()
                .split(/\s+/)
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .substring(0, 8);
              console.log(`💡 Generated abbreviation "${abbreviation}" for set: ${record.name}`);
            }

            // Parse categoryId with fallback
            const categoryId = parseInt(record.categoryId) || 1;
            if (!record.categoryId || isNaN(parseInt(record.categoryId))) {
              console.warn(`⚠️  Invalid categoryId for set ${record.name}, using default (1)`);
            }

            // Prepare set data
            const setData = {
              groupId,
              name: record.name.trim(),
              abbreviation,
              gameType,
              categoryId,
              isSupplemental: record.isSupplemental?.toLowerCase() === 'true' || false,
              publishedOn,
              modifiedOn,
            };

            // Check if set already exists
            const existingSet = await CardSet.findOne({ groupId: setData.groupId });
            
            if (existingSet) {
              // Update existing set if modified date is newer or force reimport
              if (forceReimport || modifiedOn > existingSet.modifiedOn) {
                await CardSet.updateOne(
                  { groupId: setData.groupId },
                  { $set: setData }
                );
                console.log(`🔄 Updated set: ${setData.name} (${setData.abbreviation})`);
                gameUpdated++;
              } else {
                console.log(`⏭️  Skipped set: ${setData.name} (no changes)`);
                gameSkipped++;
              }
            } else {
              // Create new set
              await CardSet.create(setData);
              console.log(`✅ Imported set: ${setData.name} (${setData.abbreviation})`);
              gameImported++;
            }

          } catch (error) {
            console.error(`❌ Error processing set ${record.name}:`, error);
            gameSkipped++;
          }
        }

        console.log(`📊 ${gameName} Results: ${gameImported} imported, ${gameUpdated} updated, ${gameSkipped} skipped`);
        
        totalImported += gameImported;
        totalUpdated += gameUpdated;
        totalSkipped += gameSkipped;

      } catch (error) {
        console.error(`❌ Error processing ${gameName} file:`, error);
      }
    }

    // Final statistics
    console.log(`\n🎉 Import completed!`);
    console.log(`📊 Total Results:`);
    console.log(`   ✅ Imported: ${totalImported} sets`);
    console.log(`   🔄 Updated: ${totalUpdated} sets`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} sets`);
    console.log(`   📦 Total processed: ${totalImported + totalUpdated + totalSkipped} sets`);

    // Show some statistics by game
    const setsByGame = await CardSet.aggregate([
      {
        $group: {
          _id: '$gameType',
          count: { $sum: 1 },
          latestDate: { $max: '$publishedOn' },
          oldestDate: { $min: '$publishedOn' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(`\n📈 Database Statistics:`);
    for (const stat of setsByGame) {
      const gameName = stat._id === 'pokemon' ? 'Pokemon' : 
                       stat._id === 'yugioh' ? 'Yu-Gi-Oh!' : 'One Piece';
      console.log(`   ${gameName}: ${stat.count} sets (${stat.oldestDate.getFullYear()} - ${stat.latestDate.getFullYear()})`);
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Check for command line arguments
const forceReimport = process.argv.includes('--force') || process.argv.includes('-f');

if (forceReimport) {
  console.log('🚨 Force reimport mode enabled - all sets will be updated');
}

// Run the import
importSetsFromCSV(forceReimport);