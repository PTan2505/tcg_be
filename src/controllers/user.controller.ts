import { Context } from "hono";
import { IUserService } from "../services/user.service";

export class UserController {
  constructor(private userService: IUserService) {}

  getUsers = async (c: Context) => {
    try {
      const users = await this.userService.getUsers();
      return c.json(users);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  };

  getUserById = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const user = await this.userService.getUserById(id);
      return c.json(user);
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json({ error: "User not found" }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  };

  updateUser = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const data = c.get("validatedData");
      const user = await this.userService.updateUser(id, data);
      return c.json(user);
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json({ error: "User not found" }, 404);
      }
      return c.json({ error: error.message }, 400);
    }
  };

  deleteUser = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const user = await this.userService.deleteUser(id);
      return c.json({ message: "User deleted successfully", user });
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json({ error: "User not found" }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  };

  changePassword = async (c: Context) => {
    try {
      const user = c.get("user");
      const { currentPassword, newPassword } = c.get("validatedData");

      await this.userService.changePassword(
        user.id,
        currentPassword,
        newPassword
      );
      return c.json({ message: "Password changed successfully" });
    } catch (error: any) {
      if (error.message === "Current password is incorrect") {
        return c.json({ error: "Current password is incorrect" }, 400);
      }
      return c.json(
        { error: error.message || "Failed to change password" },
        400
      );
    }
  };

  getProfile = async (c: Context) => {
    try {
      const user = c.get("user");
      return c.json(user.toJSON());
    } catch (error: any) {
      return c.json({ error: error?.message || "Failed to get profile" }, 400);
    }
  };
}
