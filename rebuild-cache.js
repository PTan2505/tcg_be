// Rebuild card number cache
import * as fs from 'fs';
import { connectDB } from './src/database/db/db.ts';

console.log('🔧 Rebuilding Card Number Cache...');

// Connect to database
await connectDB();

// Import the fuzzy search service
const { cardNumberFuzzySearch } = await import('./src/shared/services/cardNumberFuzzySearch.service.ts');

console.log('🔄 Force rebuilding cache...');

try {
  // Force rebuild by calling buildCardNumberDatabase
  await cardNumberFuzzySearch.buildCardNumberDatabase();
  
  console.log('✅ Cache rebuild completed');
  
  // Check new cache
  const cacheFile = 'data/cache/card-numbers-cache.json';
  
  if (fs.existsSync(cacheFile)) {
    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log(`📊 New cache contains ${Object.keys(cacheData).length} entries`);
    
    // Check for Pokemon 004 cards
    const pokemon004Cards = Object.entries(cacheData).filter(([cardNumber, data]) => 
      data.gameType === 'pokemon' && cardNumber.includes('004')
    );
    
    console.log(`\n🔍 Pokemon cards with "004": ${pokemon004Cards.length}`);
    pokemon004Cards.slice(0, 10).forEach(([cardNumber, data], i) => {
      console.log(`   ${i + 1}. ${cardNumber}`);
    });
    
    // Check specifically for 004/197
    const scytherCard = Object.entries(cacheData).find(([cardNumber, data]) => 
      cardNumber === '004/197' && data.gameType === 'pokemon'
    );
    
    if (scytherCard) {
      console.log(`\n✅ Found 004/197 in new cache!`);
    } else {
      console.log(`\n❌ 004/197 still not found`);
    }
    
    // Show sample of cache entries
    console.log(`\n📋 Sample cache entries:`);
    Object.entries(cacheData).slice(0, 20).forEach(([cardNumber, data], i) => {
      console.log(`   ${i + 1}. ${cardNumber} (${data.gameType})`);
    });
    
  } else {
    console.log('❌ Cache file still not found after rebuild');
  }
  
} catch (error) {
  console.error('💥 Error rebuilding cache:', error.message);
}

console.log('\n✅ Cache rebuild test completed');
process.exit(0);