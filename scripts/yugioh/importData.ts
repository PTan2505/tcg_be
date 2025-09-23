import axios from "axios";
import mongoose from "mongoose";
import { connectDB } from "../../src/db/db";
import { YugiohCard } from "../../src/models/yugioh/yugiohModel";

async function importYugioh() {
    await connectDB();

    try {
        const response = await axios.get("https://db.ygoprodeck.com/api/v7/cardinfo.php");
        const cards = response.data.data;

        // Transform each card to match your schema (especially renaming `id` to `cardExtId`)
        const formattedCards = cards.map((card: any) => ({
            ...card,
            cardExtId: card.id, // Map `id` → `cardExtId` for your model
            card_images: card.card_images?.map((img: any) => ({
                imageExtId: img.id,
                image_url: img.image_url,
                image_url_small: img.image_url_small,
                image_url_cropped: img.image_url_cropped,
            })),
        }));

        await YugiohCard.insertMany(formattedCards, { ordered: false });

        console.log("✅ Yugioh cards imported successfully.");
    } catch (error: any) {
        if (error.writeErrors) {
            console.warn(`⚠️ Skipped ${error.writeErrors.length} duplicate cards.`);
        } else {
            console.error("❌ Import failed:", error.message || error);
        }
    } finally {
        await mongoose.disconnect();
    }
}

importYugioh();
