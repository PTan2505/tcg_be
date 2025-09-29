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

        const cardDocuments = [];
        const setDocuments = [];

        for (const card of cards) {
            // Extract card_sets before converting to camelCase
            const cardSets = card.card_sets || [];

            // Convert the card data to camelCase (excluding card_sets)
            const { card_sets, id, ...cardWithoutSets } = card;
            const camelCaseCard = convertKeysToCamelCase(cardWithoutSets);

            // Create the card document
            const cardDocument = {
                ...camelCaseCard,
                cardExtId: id, // Map API 'id' to our 'cardExtId'
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

            // Create set documents for each set this card appears in
            for (const set of cardSets) {
                const setDocument = {
                    cardExtId: id,
                    setName: set.set_name,
                    setCode: set.set_code,
                    setRarity: set.set_rarity,
                    setRarityCode: set.set_rarity_code,
                    setPrice: set.set_price,
                    setEdition: set.set_edition,
                    setUrl: set.set_url
                };
                setDocuments.push(setDocument);
            }
        }

        // Insert cards
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

        // Insert sets
        console.log("📥 Inserting sets into database...");
        let setsInserted = 0;
        let setsSkipped = 0;

        try {
            await YugiohSet.insertMany(setDocuments, { ordered: false });
            setsInserted = setDocuments.length;
        } catch (error: any) {
            if (error.writeErrors) {
                setsInserted = setDocuments.length - error.writeErrors.length;
                setsSkipped = error.writeErrors.length;
                console.warn(`⚠️ Skipped ${setsSkipped} duplicate sets.`);
            } else {
                throw error;
            }
        }

        console.log("✅ Import completed successfully!");
        console.log(`📊 Cards: ${cardsInserted} inserted, ${cardsSkipped} skipped`);
        console.log(`📊 Sets: ${setsInserted} inserted, ${setsSkipped} skipped`);

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

importYugioh();
