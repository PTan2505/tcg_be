import { Document, Schema, Types, model } from "mongoose";

export interface Notification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  // sender is stored as a snapshot object to avoid extra lookups
  sender: {
    _id: Types.ObjectId;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  type:
    | "post_like"
    | "post_comment"
    | "comment_like"
    | "comment_reply"
    | "post_tag"
    | "comment_tag"
    | "friend_request"
    | "friend_accept"
    | "market:reserved"
    | "market:shipped"
    | "market:delivered"
    | "market:cancelled";
  post?: Types.ObjectId;
  comment?: Types.ObjectId;
  transaction?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<Notification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // store sender as a lightweight embedded snapshot to keep notifications immutable
    sender: {
      _id: { type: Schema.Types.ObjectId, required: true },
      username: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      avatarUrl: { type: String },
    },
    type: {
      type: String,
      enum: [
        "post_like",
        "post_comment",
        "comment_like",
        "comment_reply",
        "post_tag",
        "comment_tag",
        "friend_request",
        "friend_accept",
        "market:reserved",
        "market:shipped",
        "market:delivered",
        "market:cancelled",
      ],
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: "MarketTransaction",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ sender: 1 });

const NotificationModel = model<Notification>(
  "Notification",
  notificationSchema
);
export default NotificationModel;
