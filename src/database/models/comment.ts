import { Document, Schema, Types, model } from "mongoose";

export interface Comment extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  post: Types.ObjectId;
  parentComment?: Types.ObjectId; // For nested replies
  content: string;
  tags: Types.ObjectId[]; // Tagged users
  likesCount: number;
  dislikesCount: number;
  repliesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<Comment>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
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
    repliesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: -1 });
commentSchema.index({ author: 1 });

const CommentModel = model<Comment>("Comment", commentSchema);
export default CommentModel;