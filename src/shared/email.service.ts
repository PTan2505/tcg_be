import crypto from "crypto";
import fs from "fs";
import nodemailer from "nodemailer";
import { hotp } from "otplib";
import path from "path";
import * as base32 from "thirty-two";
// Using CommonJS __dirname for compatibility with the current build

export interface IEmailService {
  sendVerificationOTP(to: string, otpCode: string): Promise<void>;
  sendPasswordResetOTP(to: string, otpCode: string): Promise<void>;
  generateHOTPSecret(): string;
  generateHOTPWithTimestamp(secret: string, timestamp: number): string;
  verifyHOTPWithTimestamp(
    token: string,
    secret: string,
    timestamp: number,
    windowMinutes?: number
  ): boolean;
}

export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendVerificationOTP(to: string, otpCode: string): Promise<void> {
    // Use CommonJS __dirname (TS compiles to CommonJS) to locate templates
    const templatePath = path.join(
      __dirname,
      "/config/email-verification-otp-vi.html"
    );
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    html = html
      .replace(/{{otpCode}}/g, otpCode)
      .replace(/{{email}}/g, to)
      .replace(/{{year}}/g, new Date().getFullYear().toString());

    await this.transporter.sendMail({
      from: `"Kādo" <${process.env.SMTP_FROM}>`,
      to,
      subject: "✅ Mã OTP xác thực email - Kādo",
      html,
    });
  }

  async sendPasswordResetOTP(to: string, otpCode: string): Promise<void> {
    // Use CommonJS __dirname (TS compiles to CommonJS) to locate templates
    const templatePath = path.join(
      __dirname,
      "/config/password-reset-email-vi.html"
    );
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    html = html
      .replace(/{{otpCode}}/g, otpCode)
      .replace(/{{email}}/g, to)
      .replace(/{{year}}/g, new Date().getFullYear().toString());

    await this.transporter.sendMail({
      from: `"Kādo" <${process.env.SMTP_FROM}>`,
      to,
      subject: "🔐 Mã OTP đặt lại mật khẩu - Kādo",
      html,
    });
  }

  generateHOTPSecret(): string {
    // Generate a random 20-byte secret for HOTP and encode to base32
    const buffer = crypto.randomBytes(20);
    return base32.encode(buffer).toString().replace(/=/g, ""); // Remove padding
  }

  generateHOTPWithTimestamp(secret: string, timestamp: number): string {
    // Use timestamp divided by 30 seconds as counter for HOTP
    // This creates 30-second windows for OTP validity
    const counter = Math.floor(timestamp / 30);

    // Decode base32 secret to buffer for use with otplib
    const secretBuffer = base32.decode(secret);

    // Configure HOTP options
    hotp.options = {
      digits: 6,
    };

    // Convert buffer to hex string for otplib
    const hexSecret = secretBuffer.toString("hex");
    return hotp.generate(hexSecret, counter);
  }

  verifyHOTPWithTimestamp(
    token: string,
    secret: string,
    timestamp: number,
    windowMinutes: number = 15
  ): boolean {
    // Calculate the current time window
    const currentCounter = Math.floor(timestamp / 30);

    // Calculate how many 30-second windows to check (window in minutes * 2)
    const windowSize = windowMinutes * 2; // 15 minutes = 30 windows of 30 seconds each

    // Decode base32 secret to buffer
    const secretBuffer = base32.decode(secret);

    // Configure HOTP options
    hotp.options = {
      digits: 6,
      window: windowSize,
    };

    // Convert buffer to hex string for otplib
    const hexSecret = secretBuffer.toString("hex");

    // Verify the HOTP token within the time window
    return hotp.check(token, hexSecret, currentCounter);
  }
}
