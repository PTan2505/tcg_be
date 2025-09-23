import { Schema, model } from 'mongoose'

const pokemonDeckCardSchema = new Schema({
    card: { type: Schema.Types.ObjectId, ref: 'PokemonCard', required: true },
    count: { type: Number, required: true },
}, { _id: false })

const pokemonDeckSchema = new Schema({
    deckExtId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    types: [String],
    cards: [pokemonDeckCardSchema],
})

export const PokemonDeck = model('PokemonDeck', pokemonDeckSchema)
