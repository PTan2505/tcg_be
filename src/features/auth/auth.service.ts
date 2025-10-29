import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel, { User } from "../../database/models/user";
import { AuthTokens, LoginDTO, RegisterDTO } from "./auth.types";

import { Document } from "mongoose";
import { IEmailService } from "../../shared/email.service";

export interface IAuthService {
  register(data: RegisterDTO): Promise<Document & User>;
  login(data: LoginDTO): Promise<AuthTokens>;
  verifyEmailWithOTP(email: string, otp: string): Promise<void>;
  resendEmailVerificationOTP(email: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPasswordWithOTP(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<void>;
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

  async register(data: RegisterDTO): Promise<Document & User> {
    // Check if user exists by email and username separately to allow re-registration
    const userByEmail = await UserModel.findOne({ email: data.email }).exec();
    const userByUsername = await UserModel.findOne({
      username: data.username,
    }).exec();

    const { getMessage } = require("../../shared/constants/messages");
    const AppError = require("../../shared/errors/AppError").default;

    // If username is taken by another account (email differs or email owner is a different user), block
    if (
      userByUsername &&
      (!userByEmail ||
        userByUsername._id.toString() !== userByEmail._id.toString())
    ) {
      throw new AppError(
        getMessage("AUTH_EXTRAS.USERNAME_ALREADY_EXISTS"),
        400
      );
    }

    // If there's an existing verified account with the same email, block registration
    if (userByEmail && userByEmail.get("isEmailVerified")) {
      throw new AppError(getMessage("AUTH_EXTRAS.EMAIL_ALREADY_EXISTS"), 400);
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

    // Generate and send verification OTP using timestamp-based HOTP
    const verificationSecret = this.emailService.generateHOTPSecret();
    const currentTimestamp = Date.now(); // Current timestamp in milliseconds
    const verificationOTP = this.emailService.generateHOTPWithTimestamp(
      verificationSecret,
      currentTimestamp
    );
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // If we have an existing unverified user with this email, update it and resend OTP
    if (userByEmail && !userByEmail.get("isEmailVerified")) {
      userByEmail.set({
        ...userData,
        emailVerificationSecret: verificationSecret,
        emailVerificationOTPExpires: otpExpires,
      });
      await userByEmail.save();

      // Send OTP via email
      await this.emailService.sendVerificationOTP(
        userByEmail.email,
        verificationOTP
      );
      return userByEmail as Document & User;
    }

    // Otherwise create a new user
    const user = await UserModel.create({
      ...userData,
      emailVerificationSecret: verificationSecret,
      emailVerificationOTPExpires: otpExpires,
    });

    // Send OTP via email
    await this.emailService.sendVerificationOTP(user.email, verificationOTP);
    return user;
  }

  async login(data: LoginDTO): Promise<AuthTokens> {
    // Find user
    const user = await UserModel.findOne({ email: data.email });
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH_EXTRAS.INVALID_CREDENTIALS"), 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      data.password,
      user.get("password")
    );
    if (!isValidPassword) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH_EXTRAS.INVALID_CREDENTIALS"), 401);
    }

    // Check email verification
    if (!user.get("isEmailVerified")) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.EMAIL_VERIFICATION_FAILED"), 403);
    }

    // Generate tokens
    return this.generateTokens(user.id);
  }

  async verifyEmailWithOTP(email: string, otp: string): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }

    // Get HOTP secret
    const secret = user.get("emailVerificationSecret") as string;

    if (!secret) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.EMAIL_VERIFICATION_FAILED"), 400);
    }

    // Check if OTP has expired
    const otpExpires = user.get("emailVerificationOTPExpires") as Date;
    if (!otpExpires || new Date() > otpExpires) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("AUTH.OTP_RESEND_FAILED") || "OTP has expired",
        400
      );
    }

    // Verify HOTP using the stored timestamp from otpExpires
    const timestampWhenGenerated = otpExpires.getTime() - 15 * 60 * 1000; // Subtract 15 minutes to get generation time
    const isValidOTP = this.emailService.verifyHOTPWithTimestamp(
      otp,
      secret,
      timestampWhenGenerated,
      15
    );
    if (!isValidOTP) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("AUTH.INVALID_TOKEN") || "Invalid OTP code",
        400
      );
    }

    // Verify email and clear HOTP data
    user.set("isEmailVerified", true);
    user.set("emailVerificationSecret", undefined);
    user.set("emailVerificationOTPExpires", undefined);
    await user.save();
  }

  async resendEmailVerificationOTP(email: string): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }

    if (user.get("isEmailVerified")) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("AUTH.EMAIL_VERIFICATION_SUCCESS") ||
          "Email already verified",
        400
      );
    }

    // Always generate a new secret for each OTP request
    const verificationSecret = this.emailService.generateHOTPSecret();
    const currentTimestamp = Date.now();
    const verificationOTP = this.emailService.generateHOTPWithTimestamp(
      verificationSecret,
      currentTimestamp
    );
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save new HOTP data to user
    user.set("emailVerificationSecret", verificationSecret);
    user.set("emailVerificationOTPExpires", otpExpires);
    await user.save();

    // Send new OTP via email
    await this.emailService.sendVerificationOTP(email, verificationOTP);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      // Return success even if user not found for security
      return;
    }

    // Generate new HOTP secret and code for password reset
    const resetSecret = this.emailService.generateHOTPSecret();
    const currentTimestamp = Date.now();
    const otpCode = this.emailService.generateHOTPWithTimestamp(
      resetSecret,
      currentTimestamp
    );
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save HOTP data to user
    user.set("passwordResetSecret", resetSecret);
    user.set("passwordResetOTPExpires", otpExpires);
    await user.save();

    // Send OTP via email
    await this.emailService.sendPasswordResetOTP(email, otpCode);
  }

  async resetPasswordWithOTP(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
    }

    // Get HOTP secret
    const secret = user.get("passwordResetSecret") as string;

    if (!secret) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("AUTH.FORGOT_PASSWORD_FAILED") ||
          "No password reset request found",
        400
      );
    }

    // Check if OTP has expired
    const otpExpires = user.get("passwordResetOTPExpires") as Date;
    if (!otpExpires || new Date() > otpExpires) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("AUTH.OTP_RESEND_FAILED") || "OTP has expired",
        400
      );
    }

    // Verify HOTP using the stored timestamp from otpExpires
    const timestampWhenGenerated = otpExpires.getTime() - 10 * 60 * 1000; // Subtract 10 minutes to get generation time
    const isValidOTP = this.emailService.verifyHOTPWithTimestamp(
      otp,
      secret,
      timestampWhenGenerated,
      10
    );
    if (!isValidOTP) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("AUTH.INVALID_TOKEN") || "Invalid OTP code",
        400
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear HOTP data
    user.set("password", hashedPassword);
    user.set("passwordResetSecret", undefined);
    user.set("passwordResetOTPExpires", undefined);
    await user.save();
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
        const { getMessage } = require("../../shared/constants/messages");
        const AppError = require("../../shared/errors/AppError").default;
        throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
      }

      // Check if user is still verified
      if (!user.get("isEmailVerified")) {
        const { getMessage } = require("../../shared/constants/messages");
        const AppError = require("../../shared/errors/AppError").default;
        throw new AppError(getMessage("AUTH.EMAIL_VERIFICATION_FAILED"), 403);
      }

      // Generate only new access token
      const accessToken = this.generateAccessToken(user.id);
      return { accessToken };
    } catch (error) {
      const { getMessage } = require("../../shared/constants/messages");
      const AppError = require("../../shared/errors/AppError").default;
      throw new AppError(
        getMessage("AUTH.INVALID_TOKEN") || "Invalid or expired refresh token",
        401
      );
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
        const { getMessage } = require("../../shared/constants/messages");
        const AppError = require("../../shared/errors/AppError").default;
        throw new AppError(getMessage("AUTH.USER_NOT_FOUND"), 404);
      }

      return user;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        const { getMessage } = require("../../shared/constants/messages");
        const AppError = require("../../shared/errors/AppError").default;
        throw new AppError(
          getMessage("AUTH.INVALID_TOKEN") || "Invalid or expired token",
          401
        );
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

      // Hash and save new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.set("password", hashedPassword);
      await user.save();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        const { getMessage } = require("../../shared/constants/messages");
        const AppError = require("../../shared/errors/AppError").default;
        throw new AppError(
          getMessage("AUTH.INVALID_TOKEN") || "Invalid or expired token",
          401
        );
      }
      throw error;
    }
  }
}
