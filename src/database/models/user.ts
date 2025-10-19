import { Schema, model } from "mongoose";

export interface User {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  dateOfBirth: Date;
  isEmailVerified: boolean;
  emailVerificationSecret?: string;
  emailVerificationOTPExpires?: Date;
  passwordResetSecret?: string;
  passwordResetOTPExpires?: Date;
  tokenBalance: number;
  isPremium: boolean;
  isAdmin: boolean;
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
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_]+$/,
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

    emailVerificationSecret: {
      type: String,
    },
    emailVerificationOTPExpires: {
      type: Date,
    },
    passwordResetSecret: {
      type: String,
    },
    passwordResetOTPExpires: {
      type: Date,
    },
    tokenBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPremium:{
      type: Boolean,
      default: false,
    },
    isAdmin: {
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
