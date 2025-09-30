import { Schema, model } from 'mongoose'


const legalitySchema = new Schema({
    unlimited: String,
    expanded: String,
    standard: String,
}, { _id: false })

const imageURLsSchema = new Schema({
    symbol: String,
    logo: String,
}, { _id: false })


const pokemonSetSchema = new Schema({
    setExtId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    series: String,
    printedTotal: Number,
    total: Number,
    legalities: legalitySchema,
    ptcgoCode: String,
    releaseDate: Date,
    updatedAt: Date,
    images: imageURLsSchema,
})

export const PokemonSet = model('PokemonSet', pokemonSetSchema)
