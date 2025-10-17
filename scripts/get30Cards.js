#!/usr/bin/env node
const mongoose = require('mongoose');
const fs = require('fs');

async function main() {
  const mongo =
    process.env.MONGODB_URI ||
    "mongodb://admin:admin@localhost:27017/tcg_db?authSource=admin";
  const out = process.argv[2] || 'cards-ids.json';
  const count = parseInt(process.argv[3] || process.env.CARD_FETCH_LIMIT || '30', 10) || 30;
  const gameTypes = ['pokemon', 'yugioh', 'onepiece'];

  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });

  const coll = mongoose.connection.collection('cards');
  const result = {};

  for (const gt of gameTypes) {
  const docs = await coll.find({ gameType: gt }, { projection: { _id: 1 } }).limit(count).toArray();
    result[gt] = docs.map(d => d._id.toString());
  }

  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log('Wrote', out);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
