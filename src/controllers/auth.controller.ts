import { Context } from "hono";
import { IAuthService } from "../services/auth.service";

export class AuthController {
  constructor(private authService: IAuthService) {}

  register = async (c: Context) => {
    try {
      const data = await c.req.json();
      const user = await this.authService.register(data);
      const userData = user.toObject();
      delete userData.password; // Remove sensitive data
      return c.json(
        {
          message:
            "Registration successful. Please check your email to verify your account.",
          user: userData,
        },
        201
      );
    } catch (error: any) {
      return c.json({ error: error?.message || "Registration failed" }, 400);
    }
  };

  login = async (c: Context) => {
    try {
      const data = await c.req.json();
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
}
