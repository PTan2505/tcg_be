import dotenv from 'dotenv';
dotenv.config();

import { promises as fs } from 'fs';
import path from 'path';
import { cardDataService } from '../shared/services/cardData.service';
import { S3Service } from '../shared/services/s3.service';

async function buildAIMemory() {
  // Ensure CSVs are loaded into cardDataService
  await cardDataService.loadCardData();

  const gameTypes: Array<'onepiece' | 'pokemon' | 'yugioh'> = ['onepiece', 'pokemon', 'yugioh'];

  const aiMemory: any = {};

  for (const gameType of gameTypes) {
    const cards = (cardDataService as any)['cardCache'][gameType] as any[];

    const names: string[] = [];
    const cardsByName: { [name: string]: any[] } = {};
    const setCards: { [setCode: string]: any[] } = {};

    for (const card of cards) {
      if (!names.includes(card.name)) names.push(card.name);

      if (!cardsByName[card.name]) cardsByName[card.name] = [];
      cardsByName[card.name].push(card);

      if (card.setCode) {
        if (!setCards[card.setCode]) setCards[card.setCode] = [];
        setCards[card.setCode].push(card);
      }
    }

    aiMemory[gameType] = {
      names: names.sort(),
      cardsByName,
      setCards
    };
  }

  return aiMemory;
}

async function buildFuseCards() {
  // Build lightweight card arrays (used to initialize Fuse.js quickly)
  const gameTypes: Array<'onepiece' | 'pokemon' | 'yugioh'> = ['onepiece', 'pokemon', 'yugioh'];
  const fuseCards: any = {};

  for (const gameType of gameTypes) {
    const cards = (cardDataService as any)['cardCache'][gameType] as any[];
    // Keep minimal fields used by Fuse searches
    fuseCards[gameType] = cards.map(c => ({
      _id: c._id,
      name: c.name,
      setName: c.setName || c.set_code || c.setCode || '',
      setCode: c.setCode || c.set_code,
      gameType: c.gameType,
      imageUrl: c.imageUrl || c.imageurl || null
    }));
  }

  return fuseCards;
}

async function writeLocal(filePath: string, data: any) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  try {
    console.log('🔧 Rebuild all caches: AI memory + Fuse-ready card lists');

    const aiMemory = await buildAIMemory();
    const fuseCards = await buildFuseCards();

    const cacheDir = path.resolve('data', 'cache');
    await writeLocal(path.join(cacheDir, 'ai-memory.json'), aiMemory);
    console.log('✅ Wrote ai-memory.json');

    for (const gameType of Object.keys(fuseCards)) {
      const file = path.join(cacheDir, `fuse-cards-${gameType}.json`);
      await writeLocal(file, fuseCards[gameType]);
      console.log(`✅ Wrote ${file}`);
    }

    // Upload to S3 if configured
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (bucket) {
      const s3 = new S3Service();
      // Upload ai-memory
      const aiBuffer = Buffer.from(JSON.stringify(aiMemory, null, 2), 'utf-8');
      const aiUrl = await s3.uploadFile('cache', aiBuffer, 'ai-memory.json', 'application/json');
      console.log('☁️ Uploaded ai-memory.json ->', aiUrl);

      for (const gameType of Object.keys(fuseCards)) {
        const payload = Buffer.from(JSON.stringify(fuseCards[gameType], null, 2), 'utf-8');
        const url = await s3.uploadFile('cache', payload, `fuse-cards-${gameType}.json`, 'application/json');
        console.log(`☁️ Uploaded fuse-cards-${gameType}.json ->`, url);
      }
    } else {
      console.log('ℹ️ AWS_S3_BUCKET_NAME not set — skipped uploading to S3 (artifacts written locally)');
    }

    console.log('✅ RebuildAllCaches completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ RebuildAllCaches failed:', err);
    process.exit(1);
  }
}

main();
