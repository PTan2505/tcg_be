import { parse } from 'csv-parse/sync';
import "dotenv/config";
import fs from 'fs';
import path from 'path';
import { connectDB } from '../src/database/db/db';
import { Card } from '../src/database/models/card';

// Test script to verify extended data import
async function testExtendedDataImport() {
  try {
    await connectDB();
    console.log('🔍 Testing extended data import...\n');

    // Test One Piece card with extended data
    const onepieceFilePath = path.join(process.cwd(), 'data', 'cards', 'onepiece', 'Romance-Dawn-cat68-grp3188.csv');
    if (fs.existsSync(onepieceFilePath)) {
      console.log('📋 One Piece CSV Sample:');
      const csvData = fs.readFileSync(onepieceFilePath, 'utf-8');
      const records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true });
      
      // Find a character card
      const characterCard = records.find((r: any) => r.extCardType === 'Character') as any;
      if (characterCard) {
        console.log(`Sample One Piece Character: ${characterCard.name}`);
        console.log(`- extCardType: ${characterCard.extCardType}`);
        console.log(`- extColor: ${characterCard.extColor}`);
        console.log(`- extPower: ${characterCard.extPower}`);
        console.log(`- extCost: ${characterCard.extCost}`);
        console.log(`- extSubtypes: ${characterCard.extSubtypes}`);
        console.log(`- extAttribute: ${characterCard.extAttribute}\n`);
      }
    }

    // Test Pokemon card with extended data
    const pokemonFilePath = path.join(process.cwd(), 'data', 'cards', 'pokemon', 'Base-Set-cat3-grp604.csv');
    if (fs.existsSync(pokemonFilePath)) {
      console.log('📋 Pokemon CSV Sample:');
      const csvData = fs.readFileSync(pokemonFilePath, 'utf-8');
      const records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true });
      
      const pokemonCard = records.find((r: any) => r.extHP && r.extCardType === 'Psychic') as any;
      if (pokemonCard) {
        console.log(`Sample Pokemon: ${pokemonCard.name}`);
        console.log(`- extCardType: ${pokemonCard.extCardType}`);
        console.log(`- extHP: ${pokemonCard.extHP}`);
        console.log(`- extStage: ${pokemonCard.extStage}`);
        console.log(`- extAttack1: ${pokemonCard.extAttack1}`);
        console.log(`- extWeakness: ${pokemonCard.extWeakness}\n`);
      }
    }

    // Test Yu-Gi-Oh card with extended data
    const yugiohFilePath = path.join(process.cwd(), 'data', 'cards', 'yugioh', 'The-Legend-of-Blue-Eyes-White-Dragon-cat2-grp330.csv');
    if (fs.existsSync(yugiohFilePath)) {
      console.log('📋 Yu-Gi-Oh CSV Sample:');
      const csvData = fs.readFileSync(yugiohFilePath, 'utf-8');
      const records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true });
      
      const monsterCard = records.find((r: any) => r.extCardType === 'Normal Monster') as any;
      if (monsterCard) {
        console.log(`Sample Yu-Gi-Oh Monster: ${monsterCard.name}`);
        console.log(`- extCardType: ${monsterCard.extCardType}`);
        console.log(`- extMonsterType: ${monsterCard.extMonsterType}`);
        console.log(`- extAttribute: ${monsterCard.extAttribute}`);
        console.log(`- extAttack: ${monsterCard.extAttack}`);
        console.log(`- extDefense: ${monsterCard.extDefense}\n`);
      }
    }

    // Check existing database cards
    console.log('🗄️  Database Check:');
    const cardWithExtData = await Card.findOne({ 
      extendedData: { $exists: true, $ne: {} }
    });
    
    if (cardWithExtData) {
      console.log(`Sample card with extended data: ${cardWithExtData.name}`);
      console.log(`Game: ${cardWithExtData.gameType}`);
      console.log(`Extended data fields:`, Object.keys(cardWithExtData.extendedData || {}));
      console.log(`Extended data:`, cardWithExtData.extendedData);
    } else {
      console.log('No cards with extended data found in database');
    }

    // Count cards with and without extended data
    const [withExtData, withoutExtData, total] = await Promise.all([
      Card.countDocuments({ extendedData: { $exists: true, $ne: {} } }),
      Card.countDocuments({ $or: [{ extendedData: { $exists: false } }, { extendedData: {} }] }),
      Card.countDocuments({})
    ]);

    console.log(`\n📊 Extended Data Coverage:`);
    console.log(`Total cards: ${total}`);
    console.log(`With extended data: ${withExtData} (${((withExtData/total)*100).toFixed(1)}%)`);
    console.log(`Without extended data: ${withoutExtData} (${((withoutExtData/total)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testExtendedDataImport();