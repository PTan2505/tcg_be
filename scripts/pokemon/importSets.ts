// scripts/importSets.ts
import { readFile } from "fs/promises";
import path from "path";
import { PokemonSet } from "../../src/models/pokemon/pokemonSet";

export async function importSets() {
  try {
    const filePath = path.resolve("pokemon-tcg-data/sets/en.json");
    const fileContent = await readFile(filePath, "utf-8");
    const sets = JSON.parse(fileContent);

    for (const set of sets) {
      if (!set) continue;

      const releaseDate = set.releaseDate
        ? new Date(set.releaseDate)
        : undefined;
      const updatedAt = set.updatedAt ? new Date(set.updatedAt) : undefined;

      const transformed = {
        setExtId: set.id,
        name: set.name,
        series: set.series,
        printedTotal: set.printedTotal,
        total: set.total,
        legalities: set.legalities,
        ptcgoCode: set.ptcgoCode,
        releaseDate,
        updatedAt,
        images: set.images,
      };

      const existing = await PokemonSet.findOne({
        setExtId: transformed.setExtId,
      });
      if (!existing) {
        await PokemonSet.create(transformed);
        console.log(`✅ Imported set: ${transformed.name}`);
      } else {
        console.log(`⚠️ Set already exists: ${transformed.name}`);
      }
    }

    console.log(`🎉 Finished importing ${sets.length} sets.`);
  } catch (err) {
    console.error("❌ Error importing sets:", err);
    process.exit(1);
  }
}
