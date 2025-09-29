import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

export interface IEmailService {
  sendVerificationEmail(to: string, token: string): Promise<void>;
  sendPasswordResetEmail(to: string, token: string): Promise<void>;
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

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationLink = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const templatePath = path.join(__dirname, "config/email.html"); // correct relative path
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    html = html
      .replace(/{{verificationLink}}/g, verificationLink)
      .replace(/{{email}}/g, to)
      .replace(/{{year}}/g, new Date().getFullYear().toString());

    await this.transporter.sendMail({
      from: `"Kādo" <${process.env.SMTP_FROM}>`,
      to,
      subject: "Verify your email address",
      html,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetLink = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const templatePath = path.join(__dirname, "config/email.html"); // correct relative path
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    html = html
      .replace(/{{verificationLink}}/g, resetLink) // reusing the same template
      .replace(/{{email}}/g, to)
      .replace(/{{year}}/g, new Date().getFullYear().toString());

    await this.transporter.sendMail({
      from: `"Kādo" <${process.env.SMTP_FROM}>`,
      to,
      subject: "Reset your password",
      html,
    });
  }
}
