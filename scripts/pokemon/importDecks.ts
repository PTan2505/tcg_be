import { readFile } from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import { PokemonCard } from "../../src/models/pokemon/pokemonCard";
import { PokemonDeck } from "../../src/models/pokemon/pokemonDeck";

export async function importDecks() {
  try {
    const filePath = path.resolve("pokemon-tcg-data/decks/en/all_decks.json");
    const fileContent = await readFile(filePath, "utf-8");
    const decks = JSON.parse(fileContent);

    for (const deck of decks) {
      const deckExtId = deck.id;
      const name = deck.name;
      const types = deck.types ?? [];
      const cards = deck.cards ?? [];

      const foundCards: { card: mongoose.Types.ObjectId; count: number }[] = [];
      const missingCards: string[] = [];

      for (const { id, count } of cards) {
        const found = await PokemonCard.findOne({ cardExtId: id });
        if (found) {
          foundCards.push({ card: found._id, count });
        } else {
          missingCards.push(id);
        }
      }

      if (missingCards.length > 0) {
        console.warn(
          `⚠️ Missing ${missingCards.length} cards: ${missingCards.join(", ")}`
        );
      }

      if (foundCards.length > 0) {
        const newDeck = new PokemonDeck({
          deckExtId,
          name,
          types,
          cards: foundCards,
        });
        await newDeck.save();
        console.log(
          `✅ Imported deck "${name}" with ${foundCards.length} cards.`
        );
      } else {
        console.error(`❌ Skipped deck "${name}" — no valid cards found.`);
      }
    }

    console.log(`🎉 Finished importing ${decks.length} decks`);
  } catch (err) {
    console.error("❌ Error importing decks:", err);
    process.exit(1);
  }
}
