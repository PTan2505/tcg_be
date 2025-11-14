import bcrypt from "bcryptjs";
import { Document, FilterQuery } from "mongoose";
import UserModel, { User } from "../../database/models/user";

export interface IUserService {
  createUser(data: Partial<User>): Promise<Document & User>;
  getUsers(query?: FilterQuery<User>): Promise<(Document & User)[]>;
  getUserById(id: string): Promise<Document & User>;
  updateUser(id: string, data: Partial<User>): Promise<Document & User>;
  deleteUser(id: string): Promise<Document & User>;
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
  changeAvatar(userId: string, imageUrl: string): Promise<void>;
  getProfile(userId: string): Promise<Document & User>;
  setPremiumStatus(
    id: string,
    flags: { isPremium?: boolean; isAdmin?: boolean }
  ): Promise<Document & User>;
}

export class UserService implements IUserService {
  async createUser(data: Partial<User>): Promise<Document & User> {
    const user = await UserModel.create(data);
    return user;
  }

  async getUsers(query?: FilterQuery<User>): Promise<(Document & User)[]> {
    const users = await UserModel.find({
      ...query,
      isEmailVerified: true,
    }).exec();
    return users;
  }

  async getUserById(id: string): Promise<Document & User> {
    const user = await UserModel.findById(id);
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<Document & User> {
    const user = await UserModel.findById(id);
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }

    // Don't allow updates to sensitive fields
    delete data.password;
    delete data.isEmailVerified;
    delete data.email; // Email changes should be handled separately with verification

    Object.assign(user, data);
    await user.save();
    return user;
  }

  async changeAvatar(userId: string, imageUrl: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }

    user.set("avatarUrl", imageUrl);
    await user.save();
  }

  async deleteUser(id: string): Promise<Document & User> {
    const user = await UserModel.findByIdAndDelete(id);
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }
    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.get("password")
    );
    if (!isValidPassword) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("USERS.CURRENT_PASSWORD_INCORRECT") ||
          "Current password is incorrect",
        400
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.set("password", hashedPassword);
    await user.save();
  }

  async getProfile(userId: string): Promise<Document & User> {
    const user = await UserModel.findById(userId);
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }
    return user;
  }

  async setPremiumStatus(
    id: string,
    flags: { isPremium?: boolean; isAdmin?: boolean }
  ): Promise<Document & User> {
    const user = await UserModel.findById(id);
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }
    if (typeof flags.isPremium !== "undefined")
      user.isPremium = !!flags.isPremium;
    if (typeof flags.isAdmin !== "undefined") user.isAdmin = !!flags.isAdmin;
    await user.save();
    return user;
  }
}
