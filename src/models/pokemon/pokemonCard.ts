import { model, Schema } from 'mongoose'


const attackSchema = new Schema({
    name: String,
    cost: [String],
    convertedEnergyCost: Number,
    damage: String,
    text: String,
}, { _id: false })

const weaknessSchema = new Schema({
    type: String,
    value: String,
}, { _id: false })

const resistanceSchema = new Schema({
    type: String,
    value: String,
}, { _id: false })

const legalitySchema = new Schema({
    unlimited: String,
    standard: String,
    expanded: String,
}, { _id: false })

const imageLinksSchema = new Schema({
    small: String,
    large: String,
}, { _id: false })

const abilitySchema = new Schema({
    name: String,
    text: String,
    type: String,
}, { _id: false })

const ancientTraitSchema = new Schema({
    name: String,
    text: String,
}, { _id: false })


const pokemonCardSchema = new Schema({
    cardExtId: { type: String, required: true, unique: true },
    set: { type: Schema.Types.ObjectId, ref: 'PokemonSet', required: true },

    name: String,
    supertype: String,
    subtypes: [String],
    hp: String,
    level: String,
    flavorText: String,
    types: [String],
    rules: [String],

    attacks: [attackSchema],
    weaknesses: [weaknessSchema],
    resistances: [resistanceSchema],
    retreatCost: [String],
    convertedRetreatCost: Number,

    number: String,
    artist: String,
    rarity: String,
    nationalPokedexNumbers: [Number],

    legalities: legalitySchema,
    regulationMark: String,
    images: imageLinksSchema,
    abilities: [abilitySchema],
    evolvesFrom: String,
    evolvesTo: [String],
    ancientTrait: ancientTraitSchema,
})

export const PokemonCard = model('PokemonCard', pokemonCardSchema)
