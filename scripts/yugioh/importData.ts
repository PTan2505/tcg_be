import axios from "axios";
import mongoose from "mongoose";
import { connectDB } from "../../src/database/db/db";
import { YugiohCard, YugiohSet } from "../../src/database/models/yugioh";

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

async function importYugioh() {
    await connectDB();

    try {
        console.log("🔄 Fetching cards from YGOPRODeck API...");
        const response = await axios.get("https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes");
        const cards = response.data.data;

        console.log(`📊 Processing ${cards.length} cards...`);

        // Step 1: Extract and create all sets with their rarity/price information
        const allSets = [];
        const setKeyToData = new Map<string, any>(); // Track unique sets by setCode
        
        for (const card of cards) {
            const cardSets = card.card_sets || [];
            
            for (const set of cardSets) {
                const setKey = set.set_code; // Use setCode as unique identifier
                
                if (!setKeyToData.has(setKey)) {
                    const setDocument = {
                        setName: set.set_name,
                        setCode: set.set_code,
                        setRarity: set.set_rarity,
                        setRarityCode: set.set_rarity_code,
                        setPrice: set.set_price,
                        setEdition: set.set_edition,
                        setUrl: set.set_url,
                        // Additional fields can be added later
                        series: null,
                        description: null,
                        releaseDate: null
                    };
                    
                    setKeyToData.set(setKey, setDocument);
                    allSets.push(setDocument);
                }
            }
        }

        // Step 2: Insert all sets first to get their ObjectIds
        console.log("📥 Inserting sets into database...");
        let setsInserted = 0;
        let setsSkipped = 0;

        try {
            await YugiohSet.insertMany(allSets, { ordered: false });
            setsInserted = allSets.length;
        } catch (error: any) {
            if (error.writeErrors) {
                setsInserted = allSets.length - error.writeErrors.length;
                setsSkipped = error.writeErrors.length;
                console.warn(`⚠️ Skipped ${setsSkipped} duplicate sets.`);
            } else {
                throw error;
            }
        }

        // Step 3: Get all sets from database to create a lookup map
        console.log("🔍 Creating set lookup map...");
        const allSetsFromDB = await YugiohSet.find({}).lean();
        const setCodeToId = new Map<string, string>(); // setCode -> ObjectId
        
        for (const set of allSetsFromDB) {
            setCodeToId.set(set.setCode, set._id.toString());
        }

        // Step 4: Process cards - one document per unique card with array of set references
        console.log("📊 Processing cards with set references...");
        const cardDocuments = [];
        const processedCards = new Set<number>(); // Track processed cardExtIds

        for (const card of cards) {
            // Skip if we've already processed this card
            if (processedCards.has(card.id)) {
                continue;
            }
            processedCards.add(card.id);

            const cardSets = card.card_sets || [];
            const setObjectIds = [];
            
            // Collect all set ObjectIds for this card
            for (const cardSet of cardSets) {
                const setObjectId = setCodeToId.get(cardSet.set_code);
                if (setObjectId) {
                    setObjectIds.push(new mongoose.Types.ObjectId(setObjectId));
                } else {
                    console.warn(`⚠️ Set not found: ${cardSet.set_code} for card ${card.name}`);
                }
            }

            // Convert the card data to camelCase (excluding card_sets)
            const { card_sets, id, ...cardWithoutSets } = card;
            const camelCaseCard = convertKeysToCamelCase(cardWithoutSets);

            // Create the card document with array of set references
            const cardDocument = {
                ...camelCaseCard,
                cardExtId: id, // Map API 'id' to our 'cardExtId'
                cardSets: setObjectIds, // Array of set ObjectIds
                
                // Convert specific nested objects
                cardImages: card.card_images?.map((img: any) => ({
                    id: img.id,
                    imageUrl: img.image_url,
                    imageUrlSmall: img.image_url_small,
                    imageUrlCropped: img.image_url_cropped
                })),
                cardPrices: card.card_prices?.map((price: any) => ({
                    cardmarketPrice: price.cardmarket_price,
                    tcgplayerPrice: price.tcgplayer_price,
                    ebayPrice: price.ebay_price,
                    amazonPrice: price.amazon_price,
                    coolstuffincPrice: price.coolstuffinc_price
                })),
                banlistInfo: card.banlist_info ? {
                    banTcg: card.banlist_info.ban_tcg,
                    banOcg: card.banlist_info.ban_ocg,
                    banGoat: card.banlist_info.ban_goat
                } : undefined
            };

            cardDocuments.push(cardDocument);
        }

        // Step 5: Insert cards
        console.log("📥 Inserting cards into database...");
        let cardsInserted = 0;
        let cardsSkipped = 0;

        try {
            await YugiohCard.insertMany(cardDocuments, { ordered: false });
            cardsInserted = cardDocuments.length;
        } catch (error: any) {
            if (error.writeErrors) {
                cardsInserted = cardDocuments.length - error.writeErrors.length;
                cardsSkipped = error.writeErrors.length;
                console.warn(`⚠️ Skipped ${cardsSkipped} duplicate cards.`);
            } else {
                throw error;
            }
        }

        console.log("✅ Import completed successfully!");
        console.log(`📊 Sets: ${setsInserted} inserted, ${setsSkipped} skipped`);
        console.log(`📊 Cards: ${cardsInserted} inserted, ${cardsSkipped} skipped`);
        console.log(`📊 Total unique sets: ${allSets.length}`);
        console.log(`📊 Total unique cards: ${cardDocuments.length}`);

    } catch (error: any) {
        console.error("❌ Import failed:", error.message || error);
        if (error.response) {
            console.error("API Response:", error.response.status, error.response.statusText);
        }
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Database connection closed.");
    }
}

importYugioh();
