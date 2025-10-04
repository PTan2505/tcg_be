import { Document, Schema, Types, model } from "mongoose";

export interface Friendship extends Document {
  _id: Types.ObjectId;
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

const friendshipSchema = new Schema<Friendship>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'blocked'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate friendship requests
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const FriendshipModel = model<Friendship>("Friendship", friendshipSchema);
export default FriendshipModel;