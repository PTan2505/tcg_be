import mongoose from "mongoose";
import { connectDB } from "../../src/database/db/db";

// Import ONLY the old model first
import { YugiohCard as OldYugiohCard } from "../../src/database/models/yugioh/yugiohModel";

// Define the new models inline to avoid conflicts
const NewYugiohCardSchema = new mongoose.Schema({
  cardExtId: { type: Number, required: true, unique: true, index: true },
  konamiId: { type: String, sparse: true, index: true },
  name: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true },
  frameType: { type: String, index: true },
  desc: { type: String, required: true },
  atk: { type: Number, index: true },
  def: { type: Number, index: true },
  level: { type: Number, index: true },
  race: { type: String, index: true },
  attribute: { type: String, index: true },
  archetype: { type: String, index: true },
  scale: { type: Number, index: true },
  linkval: { type: Number, index: true },
  linkmarkers: [{ type: String }],
  cardImages: [{
    id: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    imageUrlSmall: { type: String, required: true },
    imageUrlCropped: { type: String, required: true }
  }],
  cardPrices: [{
    cardmarketPrice: String,
    tcgplayerPrice: String,
    ebayPrice: String,
    amazonPrice: String,
    coolstuffincPrice: String
  }],
  banlistInfo: {
    banTcg: String,
    banOcg: String,
    banGoat: String
  },
  ygoprodeckUrl: String,
  betaName: String,
  views: { type: Number, default: 0 },
  viewsweek: { type: Number, default: 0 },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  formats: [{ type: String }],
  treatedAs: String,
  tcgDate: String,
  ocgDate: String,
  mdRarity: String,
  hasEffect: { type: Number, enum: [0, 1] },
  genesysPoints: { type: Number, default: 0 },
  staple: { type: Boolean, default: false, index: true }
}, {
  timestamps: true,
  collection: 'yugiohcards_new'
});

const NewYugiohSetSchema = new mongoose.Schema({
  setName: { type: String, required: true, index: true },
  setCode: { type: String, required: true, index: true },
  cardExtId: { type: Number, required: true, index: true },
  setRarity: { type: String, required: true, index: true },
  setRarityCode: String,
  setPrice: String,
  setEdition: String,
  setUrl: String
}, {
  timestamps: true,
  collection: 'yugiohsets_new'
});

NewYugiohSetSchema.index({ cardExtId: 1, setCode: 1 }, { unique: true });

const NewYugiohCard = mongoose.model('YugiohCardNew', NewYugiohCardSchema);
const NewYugiohSet = mongoose.model('YugiohSetNew', NewYugiohSetSchema);

// Helper function to convert snake_case to camelCase
function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Helper function to convert object keys from snake_case to camelCase
function convertKeysToCamelCase(obj: any): any {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(convertKeysToCamelCase);
    }

    const converted: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const camelKey = toCamelCase(key);
            converted[camelKey] = convertKeysToCamelCase(obj[key]);
        }
    }
    return converted;
}

async function migrateYugiohData() {
    await connectDB();

    try {
        console.log("🔄 Starting migration from old to new structure...");

        // Get all existing cards from the old structure
        const oldCards = await OldYugiohCard.find({}).lean();
        console.log(`📊 Found ${oldCards.length} cards to migrate`);

        if (oldCards.length === 0) {
            console.log("ℹ️ No cards found to migrate.");
            return;
        }

        const newCardDocuments = [];
        const setDocuments = [];

        for (const oldCard of oldCards) {
            // Extract card_sets before converting
            const cardSets = oldCard.card_sets || [];

            // Create new card document without card_sets
            const { card_sets, _id, __v, ...cardWithoutSets } = oldCard;

            // Convert nested objects to camelCase
            const newCard = {
                ...cardWithoutSets,
                // Convert card_images
                cardImages: oldCard.card_images?.map((img: any) => ({
                    id: img.imageExtId || img.id,
                    imageUrl: img.image_url,
                    imageUrlSmall: img.image_url_small,
                    imageUrlCropped: img.image_url_cropped
                })),
                // Convert card_prices
                cardPrices: oldCard.card_prices?.map((price: any) => ({
                    cardmarketPrice: price.cardmarket_price,
                    tcgplayerPrice: price.tcgplayer_price,
                    ebayPrice: price.ebay_price,
                    amazonPrice: price.amazon_price,
                    coolstuffincPrice: price.coolstuffinc_price
                })),
                // Convert banlist_info
                banlistInfo: oldCard.banlist_info ? {
                    banTcg: oldCard.banlist_info.ban_tcg,
                    banOcg: oldCard.banlist_info.ban_ocg,
                    banGoat: oldCard.banlist_info.ban_goat
                } : undefined
            };

            newCardDocuments.push(newCard);

            // Create set documents for each set this card appears in
            for (const set of cardSets) {
                const setDocument = {
                    cardExtId: oldCard.cardExtId,
                    setName: set.set_name,
                    setCode: set.set_code,
                    setRarity: set.set_rarity,
                    setPrice: set.set_price,
                    setEdition: set.set_edition,
                    setUrl: set.set_url
                };
                setDocuments.push(setDocument);
            }
        }

        // Clear existing new structure data
        console.log("🗑️ Clearing existing data in new structure...");
        await NewYugiohCard.deleteMany({});
        await NewYugiohSet.deleteMany({});

        // Insert new card documents
        console.log("📥 Inserting cards into new structure...");
        await NewYugiohCard.insertMany(newCardDocuments, { ordered: false });

        // Insert set documents
        console.log("📥 Inserting sets into new structure...");
        if (setDocuments.length > 0) {
            await NewYugiohSet.insertMany(setDocuments, { ordered: false });
        }

        console.log("✅ Migration completed successfully!");
        console.log(`📊 Migrated ${newCardDocuments.length} cards`);
        console.log(`📊 Created ${setDocuments.length} set entries`);

        // Optional: Remove old collection (uncomment if you want to clean up)
        // console.log("🗑️ Removing old collection...");
        // await OldYugiohCard.collection.drop();

    } catch (error: any) {
        console.error("❌ Migration failed:", error.message || error);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Database connection closed.");
    }
}

migrateYugiohData();