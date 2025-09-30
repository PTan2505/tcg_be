import mongoose from "mongoose";
import { connectDB } from "../../src/database/db/db";

async function resetYugiohCollections() {
    await connectDB();

    try {
        console.log("🗑️ Deleting existing Yu-Gi-Oh! collections...");
        
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection not established");
        }
        
        const collections = await db.listCollections().toArray();
        const yugiohCollections = collections
            .map(c => c.name)
            .filter(name => name.includes('yugioh'));
        
        console.log("📋 Found Yu-Gi-Oh! collections:", yugiohCollections);
        
        // Delete all Yu-Gi-Oh! related collections
        for (const collectionName of yugiohCollections) {
            try {
                await db.collection(collectionName).drop();
                console.log(`✅ Deleted collection: ${collectionName}`);
            } catch (error: any) {
                if (error.code === 26) {
                    console.log(`⚠️ Collection ${collectionName} doesn't exist, skipping`);
                } else {
                    console.log(`❌ Error deleting ${collectionName}:`, error.message);
                }
            }
        }
        
        console.log("🧹 All Yu-Gi-Oh! collections cleaned up!");
        
    } catch (error: any) {
        console.error("❌ Reset failed:", error.message || error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Database connection closed.");
    }
}

resetYugiohCollections();