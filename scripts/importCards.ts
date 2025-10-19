import { parse } from 'csv-parse/sync';
import "dotenv/config";
import fs, { existsSync } from 'fs';
import path from 'path';
import { connectDB } from '../src/database/db/db';
import { Card } from '../src/database/models/card';
import { CardSet } from '../src/database/models/cardSet';

interface TCGPlayerCSVRecord {
  productId: string;
  name: string;
  cleanName: string;
  imageUrl: string;
  categoryId: string;
  groupId: string;
  url: string;
  modifiedOn: string;
  imageCount: string;
  lowPrice: string;
  midPrice: string;
  highPrice: string;
  marketPrice: string;
  directLowPrice: string;
  subTypeName: string;
  
  // Extended fields - varies by game type
  extNumber?: string;
  extRarity?: string;
  extCardType?: string;
  extDescription?: string;
  extAttribute?: string; // Used by multiple games
  
  // One Piece specific
  extColor?: string;
  extLife?: string;
  extPower?: string;
  extSubtypes?: string;
  extCost?: string;
  extCounterplus?: string;
  
  // Pokemon specific
  extHP?: string;
  extStage?: string;
  extCardText?: string;
  extAttack1?: string;
  extAttack2?: string;
  extWeakness?: string;
  extResistance?: string;
  extRetreatCost?: string;
  
  // Yu-Gi-Oh specific
  extMonsterType?: string;
  extAttack?: string;
  extDefense?: string;
  extLevel?: string;
}

// Function to read CSV data from local files
async function readCSVFromLocalFile(cardSet: any): Promise<string | null> {
  const { categoryId, groupId, name: setName, gameType } = cardSet;
  
  // Generate the expected filename based on the set data
  const sanitizedName = setName ? setName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '-') : '';
  const filename = sanitizedName 
    ? `${sanitizedName}-cat${categoryId}-grp${groupId}.csv`
    : `category-${categoryId}_group-${groupId}.csv`;
  
  // Check in the organized folder structure
  const gameTypeFolder = gameType ? gameType.toLowerCase() : 'unknown';
  const filePath = path.join(process.cwd(), 'data', 'cards', gameTypeFolder, filename);
  
  console.log(`📁 Looking for CSV file: ${gameTypeFolder}/${filename}`);
  
  if (!existsSync(filePath)) {
    console.warn(`⚠️  CSV file not found: ${filePath}`);
    console.log(`💡 Run the download script first: bun run scripts/downloadBulkCSV.ts --game-type ${gameType}`);
    return null;
  }
  
  try {
    const csvData = fs.readFileSync(filePath, 'utf-8');
    
    if (!csvData || csvData.trim().length === 0) {
      throw new Error('Empty CSV file');
    }
    
    console.log(`✅ Successfully read CSV file: ${filename}`);
    return csvData;
  } catch (error) {
    console.error(`❌ Error reading CSV file ${filename}:`, error);
    return null;
  }
}

// Function to fetch CSV data from TCGPlayer API (fallback)
async function fetchCSVFromTCGPlayer(categoryId: number, groupId: number): Promise<string> {
  const url = `https://tcgcsv.com/tcgplayer/${categoryId}/${groupId}/ProductsAndPrices.csv`;
  
  console.log(`📥 Fetching CSV from: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Empty CSV response');
    }
    
    return csvText;
  } catch (error) {
    console.error(`❌ Error fetching CSV for categoryId: ${categoryId}, groupId: ${groupId}:`, error);
    throw error;
  }
}

// Function to determine game type from category ID
function getGameTypeFromCategory(categoryId: number): 'pokemon' | 'yugioh' | 'onepiece' | null {
  // These are common TCGPlayer category IDs (may need adjustment based on actual data)
  if (categoryId === 3) return 'pokemon';     // Pokemon TCG
  if (categoryId === 2) return 'yugioh';      // Yu-Gi-Oh!
  if (categoryId === 68) return 'onepiece';   // One Piece (if available)
  
  // Add more category mappings as discovered
  return null;
}

// Function to clean and parse price values
function parsePrice(priceStr: string): number | undefined {
  if (!priceStr || priceStr.trim() === '' || priceStr === 'null') {
    return undefined;
  }
  
  const cleaned = priceStr.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? undefined : parsed;
}

// Function to parse numeric extended data
function parseExtNumber(numStr: string): number | undefined {
  if (!numStr || numStr.trim() === '' || numStr === 'null') {
    return undefined;
  }
  
  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? undefined : parsed;
}

// Function to clean extended text data
function parseExtText(textStr: string): string | undefined {
  if (!textStr || textStr.trim() === '' || textStr === 'null') {
    return undefined;
  }
  
  return textStr.trim();
}

// Function to build extended data object from CSV record
function buildExtendedData(record: TCGPlayerCSVRecord, gameType: string): Record<string, any> {
  const extData: Record<string, any> = {};
  
  // Common fields for all games
  if (record.extNumber) extData.extNumber = parseExtText(record.extNumber);
  if (record.extRarity) extData.extRarity = parseExtText(record.extRarity);
  if (record.extCardType) extData.extCardType = parseExtText(record.extCardType);
  if (record.extDescription) extData.extDescription = parseExtText(record.extDescription);
  if (record.extAttribute) extData.extAttribute = parseExtText(record.extAttribute);
  
  // Game-specific fields
  switch (gameType) {
    case 'onepiece':
      if (record.extColor) extData.extColor = parseExtText(record.extColor);
      if (record.extLife) extData.extLife = parseExtNumber(record.extLife);
      if (record.extPower) extData.extPower = parseExtNumber(record.extPower);
      if (record.extSubtypes) extData.extSubtypes = parseExtText(record.extSubtypes);
      if (record.extCost) extData.extCost = parseExtNumber(record.extCost);
      if (record.extCounterplus) extData.extCounterplus = parseExtNumber(record.extCounterplus);
      break;
      
    case 'pokemon':
      if (record.extHP) extData.extHP = parseExtNumber(record.extHP);
      if (record.extStage) extData.extStage = parseExtText(record.extStage);
      if (record.extCardText) extData.extCardText = parseExtText(record.extCardText);
      if (record.extAttack1) extData.extAttack1 = parseExtText(record.extAttack1);
      if (record.extAttack2) extData.extAttack2 = parseExtText(record.extAttack2);
      if (record.extWeakness) extData.extWeakness = parseExtText(record.extWeakness);
      if (record.extResistance) extData.extResistance = parseExtText(record.extResistance);
      if (record.extRetreatCost) extData.extRetreatCost = parseExtNumber(record.extRetreatCost);
      break;
      
    case 'yugioh':
      if (record.extMonsterType) extData.extMonsterType = parseExtText(record.extMonsterType);
      if (record.extAttack) extData.extAttack = parseExtNumber(record.extAttack);
      if (record.extDefense) extData.extDefense = parseExtNumber(record.extDefense);
      if (record.extLevel) extData.extLevel = parseExtNumber(record.extLevel);
      break;
  }
  
  return extData;
}

// Function to extract set code and number from card name
function extractSetInfo(name: string, setAbbreviation: string): { setCode?: string, number?: string } {
  // Common patterns: "Card Name (SET 123)", "Card Name - SET-123", etc.
  const patterns = [
    new RegExp(`\\(${setAbbreviation}\\s+(\\d+[a-zA-Z]?)\\)`, 'i'),
    new RegExp(`${setAbbreviation}[-\\s]+(\\d+[a-zA-Z]?)`, 'i'),
    /\((\w+)\s+(\d+[a-zA-Z]?)\)/,
    /(\w+)[-\s]+(\d+[a-zA-Z]?)$/
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const number = match[1] || match[2];
      const setCode = `${setAbbreviation} ${number}`;
      return { setCode, number };
    }
  }
  
  return {};
}

async function importCardsForSet(cardSet: any, forceReimport = false, useLocalFiles = true) {
  const { categoryId, groupId, name: setName, abbreviation, gameType } = cardSet;
  
  console.log(`\n🎮 Processing ${gameType.toUpperCase()} set: ${setName} (${abbreviation})`);
  console.log(`📊 CategoryId: ${categoryId}, GroupId: ${groupId}`);
  
  try {
    // Check if we already have cards for this set
    if (!forceReimport) {
      const existingCardsCount = await Card.countDocuments({ cardSet: cardSet._id });
      if (existingCardsCount > 0) {
        console.log(`⏭️  Skipping set ${setName} - already has ${existingCardsCount} cards`);
        return { imported: 0, updated: 0, skipped: existingCardsCount };
      }
    }
    
    // Get CSV data (try local files first, then API as fallback)
    let csvData: string | null = null;
    
    if (useLocalFiles) {
      csvData = await readCSVFromLocalFile(cardSet);
    }
    
    if (!csvData) {
      console.log(`📡 Falling back to API fetch for ${setName}`);
      try {
        csvData = await fetchCSVFromTCGPlayer(categoryId, groupId);
      } catch (error) {
        console.warn(`⚠️  Could not fetch CSV for ${setName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return { imported: 0, updated: 0, skipped: 0, error: 'CSV fetch failed' };
      }
    }
    
    // Parse CSV
    const records: TCGPlayerCSVRecord[] = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`📋 Found ${records.length} cards to process`);
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const record of records) {
      try {
        const productId = parseInt(record.productId);
        
        if (isNaN(productId)) {
          console.warn(`⚠️  Invalid ProductId: ${record.productId}`);
          skipped++;
          continue;
        }
        
        // Extract set info from card name
        const { setCode, number } = extractSetInfo(record.name, abbreviation);
        
        // Build extended data from CSV fields
        const extendedData = buildExtendedData(record, gameType);
        
        // Set rarity from extended data if available, fallback to subTypeName
        const rarity = record.extRarity || record.subTypeName || undefined;
        
        // Prepare card data
        const cardData = {
          productId,
          tcgplayerSku: undefined, // Not available in current CSV format
          cardSet: cardSet._id,
          name: record.name.trim(),
          cleanName: record.cleanName?.trim() || record.name.trim(),
          imageUrl: record.imageUrl || undefined,
          categoryId,
          groupId,
          gameType,
          setCode,
          number: number || record.extNumber,
          rarity,
          tcgPlayerPrice: {
            productId,
            lowPrice: parsePrice(record.lowPrice),
            midPrice: parsePrice(record.midPrice),
            highPrice: parsePrice(record.highPrice),
            marketPrice: parsePrice(record.marketPrice),
            directLowPrice: parsePrice(record.directLowPrice),
            subTypeName: record.subTypeName || undefined
          },
          images: {
            normal: record.imageUrl || undefined
          },
          url: record.url || undefined,
          extendedData,
          lastPriceUpdate: new Date(),
          isActive: true
        };
        
        // Check if card already exists
        const existingCard = await Card.findOne({ productId });
        
        if (existingCard) {
          if (forceReimport || new Date(record.modifiedOn) > existingCard.updatedAt!) {
            await Card.updateOne(
              { productId },
              { $set: cardData }
            );
            
            const extDataCount = Object.keys(extendedData).length;
            console.log(`🔄 Updated card: ${cardData.name} (${extDataCount} extended fields)`);
            updated++;
          } else {
            console.log(`⏭️  Skipped card: ${cardData.name} (no changes)`);
            skipped++;
          }
        } else {
          await Card.create(cardData);
          
          const extDataCount = Object.keys(extendedData).length;
          console.log(`✅ Imported card: ${cardData.name} (${extDataCount} extended fields)`);
          imported++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing card ${record.name}:`, error);
        skipped++;
      }
    }
    
    console.log(`📊 ${setName} Results: ${imported} imported, ${updated} updated, ${skipped} skipped`);
    return { imported, updated, skipped };
    
  } catch (error) {
    console.error(`❌ Error processing set ${setName}:`, error);
    return { imported: 0, updated: 0, skipped: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function importCardsFromTCGPlayer(forceReimport = false, limitSets?: number, useLocalFiles = true) {
  try {
    // Connect to database
    await connectDB();
    console.log('📦 Starting card import...');
    
    if (useLocalFiles) {
      console.log('📁 Using local CSV files from data/cards/ folder');
    } else {
      console.log('📡 Using TCGPlayer API (fallback mode)');
    }
    
    if (forceReimport) {
      console.log('🔄 Force reimport mode - will update all cards regardless of modification date');
    }
    
    // Get all card sets
    const cardSets = await CardSet.find({}).sort({ gameType: 1, publishedOn: -1 });
    
    const setsToProcess = limitSets ? cardSets.slice(0, limitSets) : cardSets;
    
    console.log(`🎯 Processing ${setsToProcess.length} card sets`);
    
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    
    for (const cardSet of setsToProcess) {
      const result = await importCardsForSet(cardSet, forceReimport, useLocalFiles);
      
      totalImported += result.imported;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      
      if (result.error) {
        totalErrors++;
      }
      
      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Final statistics
    console.log(`\n🎉 Import completed!`);
    console.log(`📊 Total Results:`);
    console.log(`   ✅ Imported: ${totalImported} cards`);
    console.log(`   🔄 Updated: ${totalUpdated} cards`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} cards`);
    console.log(`   ❌ Errors: ${totalErrors} sets`);
    console.log(`   📦 Total processed: ${totalImported + totalUpdated + totalSkipped} cards`);
    
    // Show some statistics by game
    const cardsByGame = await Card.aggregate([
      {
        $group: {
          _id: '$gameType',
          count: { $sum: 1 },
          avgPrice: { $avg: '$tcgPlayerPrice.marketPrice' },
          totalSets: { $addToSet: '$cardSet' }
        }
      },
      {
        $addFields: {
          totalSets: { $size: '$totalSets' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log(`\n📈 Database Statistics:`);
    for (const stat of cardsByGame) {
      const gameName = stat._id === 'pokemon' ? 'Pokemon' : 
                       stat._id === 'yugioh' ? 'Yu-Gi-Oh!' : 'One Piece';
      const avgPrice = stat.avgPrice ? `$${stat.avgPrice.toFixed(2)}` : 'N/A';
      console.log(`   ${gameName}: ${stat.count} cards across ${stat.totalSets} sets (avg price: ${avgPrice})`);
    }
    
    // Show extended data statistics
    console.log(`\n🔧 Extended Data Statistics:`);
    const extDataStats = await Card.aggregate([
      { $match: { extendedData: { $exists: true, $ne: {} } } },
      {
        $group: {
          _id: '$gameType',
          totalWithExtData: { $sum: 1 },
          avgExtFieldCount: { 
            $avg: { 
              $size: { 
                $filter: {
                  input: { $objectToArray: '$extendedData' },
                  cond: { $ne: ['$$this.v', null] }
                }
              }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    for (const stat of extDataStats) {
      const gameName = stat._id === 'pokemon' ? 'Pokemon' : 
                       stat._id === 'yugioh' ? 'Yu-Gi-Oh!' : 'One Piece';
      console.log(`   ${gameName}: ${stat.totalWithExtData} cards with extended data (avg ${stat.avgExtFieldCount.toFixed(1)} fields per card)`);
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
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limitSets = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
const useAPI = process.argv.includes('--api') || process.argv.includes('--use-api');
const useLocalFiles = !useAPI; // Default to local files unless --api is specified

if (forceReimport) {
  console.log('🚨 Force reimport mode enabled - all cards will be updated');
}

if (limitSets) {
  console.log(`🎯 Limiting to first ${limitSets} sets`);
}

if (useAPI) {
  console.log('📡 API mode enabled - will fetch from TCGPlayer API');
} else {
  console.log('📁 Local files mode enabled - will read from data/cards/ folder');
}

// Run the import
importCardsFromTCGPlayer(forceReimport, limitSets, useLocalFiles);