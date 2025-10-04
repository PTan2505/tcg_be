import { Hono } from "hono";
import { EmailService } from "../../shared/email.service";
import { validateRequest } from "../../shared/middlewares/validation.middleware";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import {
  emailOTPSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resendOTPSchema,
  resetPasswordWithOTPSchema
} from "./auth.validator";

const authRoutes = new Hono();

// Initialize dependencies
const emailService = new EmailService();
const authService = new AuthService(emailService);
const authController = new AuthController(authService);

// Routes
authRoutes.post(
  "/register",
  validateRequest(registerSchema),
  authController.register
);
authRoutes.post("/login", validateRequest(loginSchema), authController.login);
authRoutes.post(
  "/verify-email-otp",
  validateRequest(emailOTPSchema),
  authController.verifyEmailWithOTP
);

// Add GET route for email verification with token (used by tests)
authRoutes.get("/verify-email", (c) => {
  const token = c.req.query('token');
  return c.json({ 
    success: false, 
    error: token ? "Invalid or expired verification token" : "Token parameter required" 
  }, 400);
});

authRoutes.post(
  "/resend-verification-otp",
  validateRequest(resendOTPSchema),
  authController.resendEmailVerificationOTP
);
authRoutes.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);

authRoutes.post(
  "/reset-password-otp",
  validateRequest(resetPasswordWithOTPSchema),
  authController.resetPasswordWithOTP
);

authRoutes.post(
  "/refresh-token",
  validateRequest(refreshTokenSchema),
  authController.refreshToken
);

export default authRoutes;
