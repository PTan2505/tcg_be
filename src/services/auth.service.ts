import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel, { User } from "../models/user";
import { AuthTokens, LoginDTO, RegisterDTO } from "../types/auth.types";
import { IEmailService } from "./email.service";

import { Document } from "mongoose";

export interface IAuthService {
  register(data: RegisterDTO): Promise<Document & User>;
  login(data: LoginDTO): Promise<AuthTokens>;
  verifyEmail(token: string): Promise<void>;
}

export class AuthService implements IAuthService {
  constructor(private emailService: IEmailService) {}

  private generateTokens(userId: string): AuthTokens {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
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
      $or: [{ email: data.email }, { username: data.username }],
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(data.password, salt);

    // Create user
    const user = await UserModel.create({
      ...data,
      password,
      isEmailVerified: false,
    });

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
}
