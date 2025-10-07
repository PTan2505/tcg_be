/**
 * Check if the expected cards exist in the database
 */

require('dotenv/config');
const mongoose = require('mongoose');

async function checkCardsInDatabase() {
  console.log('🔍 Checking if expected cards exist in database...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const expectedCards = [
      { name: 'Dark Magician', gameType: 'yugioh' },
      { name: 'Alakazam', gameType: 'pokemon' },
      { name: 'Trafalgar Law', gameType: 'onepiece' }
    ];

    for (const expectedCard of expectedCards) {
      console.log(`\n🔍 Searching for "${expectedCard.name}" in ${expectedCard.gameType}...`);
      
      const db = mongoose.connection.db;
      
      // Search for exact match
      const exactMatch = await db.collection('cards').findOne({
        name: { $regex: new RegExp(`^${expectedCard.name}$`, 'i') },
        gameType: expectedCard.gameType
      });

      if (exactMatch) {
        console.log(`  ✅ Found exact match: ${exactMatch.name}`);
        console.log(`    ID: ${exactMatch._id}`);
        console.log(`    Set: ${exactMatch.setName || 'Unknown'}`);
        console.log(`    Rarity: ${exactMatch.rarity || 'Unknown'}`);
      } else {
        // Search for partial match
        const partialMatches = await db.collection('cards').find({
          name: { $regex: new RegExp(expectedCard.name, 'i') },
          gameType: expectedCard.gameType
        }).limit(5).toArray();

        if (partialMatches.length > 0) {
          console.log(`  🔍 Found ${partialMatches.length} partial matches:`);
          partialMatches.forEach((card, index) => {
            console.log(`    ${index + 1}. ${card.name} (${card.setName || 'Unknown set'})`);
          });
        } else {
          console.log(`  ❌ No matches found for "${expectedCard.name}" in ${expectedCard.gameType}`);
          
          // Show some sample cards from this game type
          const sampleCards = await db.collection('cards').find({
            gameType: expectedCard.gameType
          }).limit(3).toArray();
          
          if (sampleCards.length > 0) {
            console.log(`    Sample ${expectedCard.gameType} cards in database:`);
            sampleCards.forEach((card, index) => {
              console.log(`      ${index + 1}. ${card.name}`);
            });
          }
        }
      }
    }

    // Show total counts
    console.log('\n📊 Database Overview:');
    for (const gameType of ['pokemon', 'yugioh', 'onepiece']) {
      const count = await db.collection('cards').countDocuments({ gameType });
      console.log(`  ${gameType}: ${count} cards`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Database check complete');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkCardsInDatabase();