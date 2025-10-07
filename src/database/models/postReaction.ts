import { Document, Schema, Types, model } from "mongoose";

export interface PostReaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  post: Types.ObjectId;
  type: 'like';
  createdAt: Date;
  updatedAt: Date;
}

const postReactionSchema = new Schema<PostReaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    type: {
      type: String,
      enum: ['like'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one reaction per user per post
postReactionSchema.index({ user: 1, post: 1 }, { unique: true });

const PostReactionModel = model<PostReaction>("PostReaction", postReactionSchema);
export default PostReactionModel;