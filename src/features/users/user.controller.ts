import { Context } from "hono";
import { MESSAGES, createErrorResponse, createSuccessResponse } from "../../shared/constants/messages";
import { IUserService } from "./user.service";

export class UserController {
  constructor(private userService: IUserService) {}

  getUsers = async (c: Context) => {
    try {
      const users = await this.userService.getUsers();
      return c.json(createSuccessResponse(users));
    } catch (error: any) {
      return c.json(createErrorResponse(error.message || MESSAGES.USERS.PROFILE_FAILED), 500);
    }
  };

  getUserById = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const user = await this.userService.getUserById(id);
      return c.json(createSuccessResponse(user));
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json(createErrorResponse(MESSAGES.AUTH.USER_NOT_FOUND), 404);
      }
      return c.json(createErrorResponse(error.message || MESSAGES.USERS.PROFILE_FAILED), 500);
    }
  };

  updateUser = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const data = c.get("validatedData");
      const user = await this.userService.updateUser(id, data);
      return c.json(createSuccessResponse(user, MESSAGES.USERS.UPDATE_PROFILE_SUCCESS));
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json(createErrorResponse(MESSAGES.AUTH.USER_NOT_FOUND), 404);
      }
      return c.json(createErrorResponse(error.message || MESSAGES.USERS.UPDATE_PROFILE_FAILED), 400);
    }
  };

  deleteUser = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const user = await this.userService.deleteUser(id);
      return c.json(createSuccessResponse(user, "Người dùng đã được xóa thành công"));
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json(createErrorResponse(MESSAGES.AUTH.USER_NOT_FOUND), 404);
      }
      return c.json(createErrorResponse(error.message || "Không thể xóa người dùng"), 500);
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
      return c.json({
        success: true,
        message: MESSAGES.USERS.CHANGE_PASSWORD_SUCCESS
      });
    } catch (error: any) {
      if (error.message === "Current password is incorrect") {
        return c.json(createErrorResponse(MESSAGES.USERS.CURRENT_PASSWORD_INCORRECT), 400);
      }
      return c.json(
        createErrorResponse(error.message || MESSAGES.USERS.CHANGE_PASSWORD_FAILED),
        400
      );
    }
  };

  getProfile = async (c: Context) => {
    try {
      const user = c.get("user");
      return c.json(createSuccessResponse(user.toJSON(), MESSAGES.USERS.PROFILE_SUCCESS));
    } catch (error: any) {
      return c.json(createErrorResponse(error?.message || MESSAGES.USERS.PROFILE_FAILED), 400);
    }
  };
}
