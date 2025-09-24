import { Hono } from "hono";
import { AuthController } from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import { AuthService } from "../services/auth.service";
import { EmailService } from "../services/email.service";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";

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
authRoutes.get("/verify-email", authController.verifyEmail);
authRoutes.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);
authRoutes.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

authRoutes.post(
  "/refresh-token",
  validateRequest(refreshTokenSchema),
  authController.refreshToken
);

export default authRoutes;
