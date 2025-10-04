import { Document, Schema, Types, model } from "mongoose";

export interface CommentReaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  comment: Types.ObjectId;
  type: 'like' | 'dislike';
  createdAt: Date;
  updatedAt: Date;
}

const commentReactionSchema = new Schema<CommentReaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one reaction per user per comment
commentReactionSchema.index({ user: 1, comment: 1 }, { unique: true });

const CommentReactionModel = model<CommentReaction>("CommentReaction", commentReactionSchema);
export default CommentReactionModel;