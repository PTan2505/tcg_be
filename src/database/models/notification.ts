import { Document, Schema, Types, model } from "mongoose";

export interface Notification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
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
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
