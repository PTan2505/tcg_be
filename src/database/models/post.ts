import { Document, Schema, Types, model } from "mongoose";

export interface Post extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  images: string[]; // URLs to S3 images
  cardReferences: {
    cardId: Types.ObjectId;
    cardType: 'pokemon' | 'yugioh';
  }[];
  deckReferences: Types.ObjectId[];
  privacy: 'public' | 'friends' | 'private';
  tags: Types.ObjectId[]; // Tagged users
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<Post>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    images: [{
      type: String, // S3 URLs
    }],
    cardReferences: [{
      cardId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      cardType: {
        type: String,
        enum: ['pokemon', 'yugioh'],
        required: true,
      }
    }],
    deckReferences: [{
      type: Schema.Types.ObjectId,
      ref: "Deck",
    }],
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    tags: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    likesCount: {
      type: Number,
      default: 0,
    },
    dislikesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ privacy: 1, createdAt: -1 });
postSchema.index({ tags: 1 });

const PostModel = model<Post>("Post", postSchema);
export default PostModel;