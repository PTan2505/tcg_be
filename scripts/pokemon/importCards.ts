import { readFile } from "fs/promises";
import path from "path";
import { PokemonCard } from "../../src/database/models/pokemon/pokemonCard";
import { PokemonSet } from "../../src/database/models/pokemon/pokemonSet";

export async function importCards() {
  try {
    const filePath = path.resolve("pokemon-tcg-data/cards/en/all_cards.json");
    const fileContent = await readFile(filePath, "utf-8");
    const cards = JSON.parse(fileContent);

    for (const card of cards) {
      if (!card?.id) continue;

      const cardExtId = card.id;
      const setExtId = cardExtId.split("-")[0];
      const set = await PokemonSet.findOne({ setExtId });

      if (!set) {
        console.warn(`⚠️ Set not found for card: ${card.name} (${setExtId})`);
        continue;
      }

      const newCard = {
        cardExtId,
        set: set._id,
        name: card.name,
        supertype: card.supertype,
        subtypes: card.subtypes ?? [],
        hp: card.hp,
        level: card.level,
        flavorText: card.flavorText,
        types: card.types ?? [],
        rules: card.rules ?? [],
        attacks: card.attacks ?? [],
        weaknesses: card.weaknesses ?? [],
        resistances: card.resistances ?? [],
        retreatCost: card.retreatCost ?? [],
        convertedRetreatCost: card.convertedRetreatCost,
        number: card.number,
        artist: card.artist,
        rarity: card.rarity,
        nationalPokedexNumbers: card.nationalPokedexNumbers ?? [],
        legalities: card.legalities ?? null,
        regulationMark: card.regulationMark,
        images: card.images ?? null,
        abilities: card.abilities ?? [],
        evolvesFrom: card.evolvesFrom,
        evolvesTo: card.evolvesTo ?? [],
        ancientTrait: card.ancientTrait ?? null,
      };

      await PokemonCard.create(newCard);
      console.log(`✅ Imported card: ${card.name}`);
    }

    console.log(`🎉 Imported ${cards.length} cards`);
  } catch (err) {
    console.error("❌ Error importing cards:", err);
    process.exit(1);
  }
}
