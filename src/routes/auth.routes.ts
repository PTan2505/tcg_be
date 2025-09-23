import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { AuthController } from "../controllers/auth.controller";
import { AuthService } from "../services/auth.service";
import { EmailService } from "../services/email.service";
import { loginSchema, registerSchema } from "../validators/auth.validator";

const authRoutes = new Hono();

// Initialize dependencies
const emailService = new EmailService();
const authService = new AuthService(emailService);
const authController = new AuthController(authService);

// Routes
authRoutes.post(
  "/register",
  zValidator("json", registerSchema),
  authController.register
);
authRoutes.post(
  "/login",
  zValidator("json", loginSchema),
  authController.login
);
authRoutes.get("/verify-email", authController.verifyEmail);

export default authRoutes;
