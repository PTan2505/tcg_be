import { Context } from "hono";
import { IAuthService } from "./auth.service";

export class AuthController {
  constructor(private authService: IAuthService) {}

  register = async (c: Context) => {
    try {
      const data = c.get("validatedData");
      const user = await this.authService.register(data);
      console.log("Registered user:", user);

      return c.json(
        {
          message:
            "Registration successful. Please check your email to verify your account.",
          user: user.toJSON(),
        },
        201
      );
    } catch (error: any) {
      return c.json({ error: error?.message || "Registration failed" }, 400);
    }
  };

  login = async (c: Context) => {
    try {
      const data = c.get("validatedData");
      const tokens = await this.authService.login(data);
      return c.json(tokens);
    } catch (error: any) {
      return c.json({ error: error?.message || "Login failed" }, 400);
    }
  };

  verifyEmail = async (c: Context) => {
    try {
      const { token } = c.req.query();
      await this.authService.verifyEmail(token);
      return c.json({ message: "Email verified successfully" });
    } catch (error: any) {
      return c.json(
        { error: error?.message || "Email verification failed" },
        400
      );
    }
  };

  forgotPassword = async (c: Context) => {
    try {
      const { email } = c.get("validatedData");
      await this.authService.forgotPassword(email);
      return c.json({
        message:
          "If the email exists, password reset instructions have been sent",
      });
    } catch (error: any) {
      return c.json({ error: "Failed to process request" }, 400);
    }
  };

  resetPassword = async (c: Context) => {
    try {
      const { token, newPassword } = c.get("validatedData");
      await this.authService.resetPassword(token, newPassword);
      return c.json({ message: "Password reset successful" });
    } catch (error: any) {
      return c.json(
        {
          error: error?.message || "Password reset failed",
        },
        400
      );
    }
  };

  refreshToken = async (c: Context) => {
    try {
      const { refreshToken } = c.get("validatedData");
      const tokens = await this.authService.refreshToken(refreshToken);
      return c.json(tokens);
    } catch (error: any) {
      return c.json(
        {
          error: error?.message || "Token refresh failed",
        },
        401
      );
    }
  };
}
