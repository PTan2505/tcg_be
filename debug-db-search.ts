import { connectDB } from './src/database/db/db';
import { Card } from './src/database/models/card';

async function searchDarkMagician() {
  await connectDB();
  
  console.log('🔍 Searching for Dark Magician in database...');
  
  // Search for exact match
  const exactMatch = await Card.findOne({ name: "Dark Magician" });
  console.log('Exact match:', exactMatch ? 'Found' : 'Not found');
  
  // Search case insensitive
  const caseInsensitive = await Card.findOne({ 
    name: { $regex: 'dark.*magician', $options: 'i' } 
  });
  console.log('Case insensitive match:', caseInsensitive ? 'Found' : 'Not found');
  
  // Search in cleanName
  const cleanNameMatch = await Card.findOne({ 
    cleanName: { $regex: 'dark.*magician', $options: 'i' } 
  });
  console.log('Clean name match:', cleanNameMatch ? 'Found' : 'Not found');
  
  // Count total Yu-Gi-Oh cards
  const totalYugioh = await Card.countDocuments({ gameType: 'yugioh' });
  console.log('Total Yu-Gi-Oh cards in database:', totalYugioh);
  
  // Get some sample Yu-Gi-Oh cards
  const samples = await Card.find({ gameType: 'yugioh' }).limit(5);
  console.log('Sample Yu-Gi-Oh cards:');
  samples.forEach(card => {
    console.log(`- ${card.name} (cleanName: "${card.cleanName}")`);
  });
  
  // Search for the specific productId you mentioned
  const specificCard = await Card.findOne({ productId: 22800 });
  console.log('Card with productId 22800:', specificCard ? {
    name: specificCard.name,
    cleanName: specificCard.cleanName,
    gameType: specificCard.gameType
  } : 'Not found');
  
  process.exit(0);
}

searchDarkMagician().catch(console.error);