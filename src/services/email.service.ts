import nodemailer from "nodemailer";

export interface IEmailService {
  sendVerificationEmail(to: string, token: string): Promise<void>;
}

export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationLink = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: "Verify your email address",
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationLink}">${verificationLink}</a>
      `,
    });
  }
}
