import { connectDB } from "../../src/database/db/db";
import { importCards } from "./importCards";
import { importDecks } from "./importDecks";
import { importSets } from "./importSets";

async function importPokemon() {
  try {
    await connectDB();
    await importSets();
    await importCards();
    await importDecks();
    console.log("✅ All data imported successfully.");
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}

importPokemon();
