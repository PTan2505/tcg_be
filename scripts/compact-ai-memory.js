#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function human(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in' || a === '-i') opts.in = args[++i];
    else if (a === '--out' || a === '-o') opts.out = args[++i];
    else if (a === '--overwrite' || a === '-w') opts.overwrite = true;
    else if (a === '--keep-images') opts.keepImages = true;
    else if (a === '--keep-stats') opts.keepStats = true;
    else if (a === '--limit-names' || a === '-n') opts.limitNames = parseInt(args[++i], 10) || 0;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

function summarizeCard(card, includeImage, includeStats) {
  if (!card || typeof card !== 'object') return {};
  const out = {
    _id: card._id?.toString ? card._id.toString() : card._id || card.id || null,
    name: card.name || null,
    setCode: card.setCode || card.cardSet?.abbreviation || card.extendedData?.setCode || null,
    setName: card.setName || card.cardSet?.name || null,
    extNumber: card.extendedData?.extNumber || card.number || card.extNumber || null,
    rarity: card.rarity || null
  };

  if (includeImage) {
    out.imageUrl = card.imageUrl || card.images?.large || card.images?.small || '';
  }

  if (includeStats) {
    out.hp = card.hp ?? null;
    out.attack = card.attack ?? null;
    out.defense = card.defense ?? null;
    out.power = card.power ?? null;
    out.cost = card.cost ?? null;
    out.life = card.life ?? null;
  }

  return out;
}

function compactGame(srcGame, opts) {
  const limitNames = opts.limitNames || 0;
  const includeImage = !!opts.keepImages;
  const includeStats = !!opts.keepStats;

  const names = Array.isArray(srcGame?.names) ? (limitNames > 0 ? srcGame.names.slice(0, limitNames) : srcGame.names) : [];

  const cardsObj = {};
  if (srcGame && typeof srcGame.cards === 'object') {
    if (Array.isArray(srcGame.cards)) {
      // flat array of cards
      for (const c of srcGame.cards) {
        const n = c.name || 'unknown';
        cardsObj[n] = cardsObj[n] || [];
        cardsObj[n].push(summarizeCard(c, includeImage, includeStats));
      }
    } else {
      for (const [name, arr] of Object.entries(srcGame.cards || {})) {
        cardsObj[name] = (arr || []).map(c => summarizeCard(c, includeImage, includeStats));
      }
    }
  }

  const setCardsObj = {};
  if (srcGame && typeof srcGame.setCards === 'object') {
    if (Array.isArray(srcGame.setCards)) {
      for (const c of srcGame.setCards) {
        const sc = c.setCode || c.setCode || 'UNKNOWN';
        setCardsObj[sc] = setCardsObj[sc] || [];
        setCardsObj[sc].push(summarizeCard(c, includeImage, includeStats));
      }
    } else {
      for (const [setCode, arr] of Object.entries(srcGame.setCards || {})) {
        setCardsObj[setCode] = (arr || []).map(c => summarizeCard(c, includeImage, includeStats));
      }
    }
  }

  return { names, cards: cardsObj, setCards: setCardsObj };
}

async function main() {
  const opts = parseArgs();
  if (opts.help) {
    console.log('Usage: compact-ai-memory.js [--in path] [--out path] [--overwrite] [--keep-images] [--keep-stats] [--limit-names N]');
    process.exit(0);
  }

  const repoRoot = path.resolve(__dirname, '..');
  const defaultIn = path.join(repoRoot, 'data', 'cache', 'ai-memory.json');
  const defaultOut = path.join(repoRoot, 'data', 'cache', 'ai-memory.compact.json');

  const inputPath = opts.in ? path.resolve(opts.in) : defaultIn;
  const outputPath = opts.out ? path.resolve(opts.out) : defaultOut;

  if (!fs.existsSync(inputPath)) {
    console.error('Input file does not exist:', inputPath);
    process.exit(2);
  }

  if (fs.existsSync(outputPath) && !opts.overwrite) {
    console.error('Output file already exists. Use --overwrite to replace:', outputPath);
    process.exit(3);
  }

  const inStat = fs.statSync(inputPath);
  console.log('Input:', inputPath, human(inStat.size));

  console.log('Reading input... (this may take a moment)');
  const raw = fs.readFileSync(inputPath, 'utf8');
  let ai;
  try {
    ai = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse JSON:', err.message || err);
    process.exit(4);
  }

  const games = ['onepiece', 'pokemon', 'yugioh'];
  const out = {};
  for (const g of games) {
    out[g] = compactGame(ai[g] || {}, opts);
  }

  // write minimized JSON
  const json = JSON.stringify(out);
  fs.writeFileSync(outputPath, json, 'utf8');
  const outStat = fs.statSync(outputPath);
  console.log('Wrote compact artifact:', outputPath, human(outStat.size));
  console.log('Reduction:', human(inStat.size - outStat.size), `(${((1 - outStat.size / inStat.size) * 100).toFixed(2)}%)`);
  console.log('Done. You can replace the original with the compact version if satisfied.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
