import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import UserModel from "../../database/models/user";

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return c.json({ error: "No token provided" }, 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    // Find user
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Add user to request object for later use
    c.set("user", user);
    await next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
    return c.json({ error: "Authentication failed" }, 401);
  }
};
