import mongoose, { Document, Schema } from 'mongoose';

interface ICardSet {
    set_name: string;
    set_code: string;
    set_rarity: string;
    set_price: string;
    set_edition?: string;
    set_url?: string;
}

interface ICardImage {
    imageExtId: number;
    image_url: string;
    image_url_small: string;
    image_url_cropped: string;
}

interface ICardPrice {
    cardmarket_price: string;
    coolstuffinc_price: string;
    tcgplayer_price: string;
    ebay_price: string;
    amazon_price: string;
}

interface IBanlistInfo {
    ban_tcg?: string;
    ban_ocg?: string;
    ban_goat?: string;
}

export interface IYugiohCard extends Document {
    cardExtId: number;
    name: string;
    type: string;
    frameType?: string;
    desc: string;
    atk?: number;
    def?: number;
    level?: number;
    race?: string;
    attribute?: string;
    archetype?: string;
    scale?: number;
    linkval?: number;
    linkmarkers?: string[];
    card_sets?: ICardSet[];
    card_images?: ICardImage[];
    card_prices?: ICardPrice[];
    banlist_info?: IBanlistInfo;
    ygoprodeck_url?: string;
    beta_name?: string;
    views?: number;
    viewsweek?: number;
    upvotes?: number;
    downvotes?: number;
    formats?: string[];
    treated_as?: string;
    tcg_date?: string;
    ocg_date?: string;
    konami_id?: string;
    md_rarity?: string;
    has_effect?: number;
}

const YugiohCardSchema = new Schema<IYugiohCard>({
    cardExtId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    frameType: String,
    desc: { type: String, required: true },
    atk: Number,
    def: Number,
    level: Number,
    race: String,
    attribute: String,
    archetype: String,
    scale: Number,
    linkval: Number,
    linkmarkers: [String],
    card_sets: [
        {
            set_name: String,
            set_code: String,
            set_rarity: String,
            set_price: String,
            set_edition: String,
            set_url: String
        }
    ],
    card_images: [
        {
            cardExtId: Number,
            image_url: String,
            image_url_small: String,
            image_url_cropped: String
        }
    ],
    card_prices: [
        {
            cardmarket_price: String,
            coolstuffinc_price: String,
            tcgplayer_price: String,
            ebay_price: String,
            amazon_price: String
        }
    ],
    banlist_info: {
        ban_tcg: String,
        ban_ocg: String,
        ban_goat: String
    },
    ygoprodeck_url: String,
    beta_name: String,
    views: Number,
    viewsweek: Number,
    upvotes: Number,
    downvotes: Number,
    formats: [String],
    treated_as: String,
    tcg_date: String,
    ocg_date: String,
    konami_id: String,
    md_rarity: String,
    has_effect: Number
});

export const YugiohCard = mongoose.model<IYugiohCard>('YugiohCard', YugiohCardSchema);
