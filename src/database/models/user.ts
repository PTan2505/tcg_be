import { Schema, model } from "mongoose";

export interface User {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  dateOfBirth: Date;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      trim: true,
      required: true,
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
    },
    avatarUrl: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // This will automatically manage createdAt and updatedAt
  }
);

// Add any pre-save hooks if needed
userSchema.pre("save", function (next) {
  // Add custom logic here if needed
  next();
});

// Add methods if needed
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const UserModel = model<User>("User", userSchema);
export default UserModel;
