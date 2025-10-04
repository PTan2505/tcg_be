import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel, { User } from "../../database/models/user";
import { IEmailService } from "../../shared/email.service";
import { AuthTokens, LoginDTO, RegisterDTO } from "./auth.types";

import { Document } from "mongoose";

export interface IAuthService {
  register(data: RegisterDTO): Promise<Document & User>;
  login(data: LoginDTO): Promise<AuthTokens>;
  verifyEmail(token: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string }>;
  getProfile(token: string): Promise<Document & User>;
  changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
}

export class AuthService implements IAuthService {
  constructor(private emailService: IEmailService) {}

  private generateTokens(userId: string): AuthTokens {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    });

    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: "30d",
    });

    return { accessToken, refreshToken };
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, {
      expiresIn: "24h",
    });
  }

  private generateVerificationToken(userId: string): string {
    return jwt.sign(
      { userId, purpose: "email-verification" },
      process.env.JWT_EMAIL_SECRET!,
      { expiresIn: "24h" }
    );
  }

  async register(data: RegisterDTO): Promise<Document & User> {
    // Check if user exists
    const existingUser = await UserModel.findOne({ 
      $or: [
        { email: data.email },
        { username: data.username }
      ]
    }).exec();

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new Error("Email already exists");
      }
      if (existingUser.username === data.username) {
        throw new Error("Username already exists");
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Prepare user data
    const userData = {
      email: data.email,
      username: data.username,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth),
      isEmailVerified: false,
    };

    // Create and save user
    const user = await UserModel.create(userData);

    // Generate and send verification token
    const verificationToken = this.generateVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken
    );
    return user;
  }

  async login(data: LoginDTO): Promise<AuthTokens> {
    // Find user
    const user = await UserModel.findOne({ email: data.email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      data.password,
      user.get("password")
    );
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    // Check email verification
    if (!user.get("isEmailVerified")) {
      throw new Error("Please verify your email first");
    }

    // Generate tokens
    return this.generateTokens(user.id);
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET!) as {
        userId: string;
      };

      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      user.set("isEmailVerified", true);
      await user.save();
    } catch (error) {
      throw new Error("Invalid or expired verification token");
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      // Return success even if user not found for security
      return;
    }

    const resetToken = jwt.sign(
      { userId: user.id, purpose: "password-reset" },
      process.env.JWT_EMAIL_SECRET!,
      { expiresIn: "1h" }
    );

    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET!) as {
        userId: string;
        purpose: string;
      };

      if (decoded.purpose !== "password-reset") {
        throw new Error("Invalid token type");
      }

      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      user.set("password", hashedPassword);
      await user.save();
    } catch (error) {
      throw new Error("Invalid or expired reset token");
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify the refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as {
        userId: string;
      };

      // Find the user
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if user is still verified
      if (!user.get("isEmailVerified")) {
        throw new Error("Email not verified");
      }

      // Generate only new access token
      const accessToken = this.generateAccessToken(user.id);
      return { accessToken };
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  async getProfile(token: string): Promise<Document & User> {
    try {
      // Verify access token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
      };

      // Find user
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid or expired token");
      }
      throw error;
    }
  }

  async changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Verify access token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
      };

      // Find user
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.get("password")
      );
      if (!isValidPassword) {
        throw new Error("Current password is incorrect");
      }

      // Hash and save new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.set("password", hashedPassword);
      await user.save();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid or expired token");
      }
      throw error;
    }
  }
}
