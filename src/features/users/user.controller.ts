import { Context } from "hono";
import { MESSAGES, createErrorResponse, createSuccessResponse } from "../../shared/constants/messages";
import { S3Service } from "../../shared/services/s3.service";
import { IUserService } from "./user.service";

export class UserController {
  constructor(private userService: IUserService) {}

  getUsers = async (c: Context) => {
    try {
      const users = await this.userService.getUsers();
      return c.json(createSuccessResponse(users));
    } catch (error: any) {
      return c.json(
        createErrorResponse(error.message || MESSAGES.USERS.PROFILE_FAILED),
        500
      );
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
      return c.json(
        createErrorResponse(error.message || MESSAGES.USERS.PROFILE_FAILED),
        500
      );
    }
  };

  updateUser = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const data = c.get("validatedData");
      const user = await this.userService.updateUser(id, data);
      return c.json(
        createSuccessResponse(user, MESSAGES.USERS.UPDATE_PROFILE_SUCCESS)
      );
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json(createErrorResponse(MESSAGES.AUTH.USER_NOT_FOUND), 404);
      }
      return c.json(
        createErrorResponse(
          error.message || MESSAGES.USERS.UPDATE_PROFILE_FAILED
        ),
        400
      );
    }
  };

  changeAvatar = async (c: Context) => {
    const s3Service = new S3Service();

    try {
      const user = c.get("user");
      const formData = await c.req.formData();

      let imageUrl: string = '';
      const file = formData.get("image") as File;

      if (file && file.size > 0) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          return c.json(
            {
              success: false,
              error: `Invalid file type: ${file.type}. Only images are allowed.`,
            },
            400
          );
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          return c.json(
            {
              success: false,
              error: `File too large: ${file.name}. Maximum size is 5MB.`,
            },
            400
          );
        }

        try {
          // Convert file to buffer
          const buffer = Buffer.from(await file.arrayBuffer());
          // Upload to S3
          imageUrl = await s3Service.uploadFile("avatars",
            buffer,
            file.name,
            file.type
          );
        } catch (uploadError) {
          console.error(`Error uploading file ${file.name}:`, uploadError);
          return c.json(
            {
              success: false,
              error: `Failed to upload image: ${file.name}`,
            },
            500
          );
        }
      }
      const oldImageUrl = user.avatarUrl;
      await this.userService.changeAvatar(user.id, imageUrl);
      if (oldImageUrl) {
        // Delete old avatar from S3
        await s3Service.deleteFile(oldImageUrl);
      }
      return c.json(
        createSuccessResponse(MESSAGES.USERS.CHANGE_AVATAR_SUCCESS)
      );
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json(createErrorResponse(MESSAGES.AUTH.USER_NOT_FOUND), 404);
      }
      return c.json(
        createErrorResponse(
          error.message || MESSAGES.USERS.CHANGE_AVATAR_FAILED
        ),
        400
      );
    }
  };

  deleteUser = async (c: Context) => {
    try {
      const { id } = c.req.param();
      const user = await this.userService.deleteUser(id);
      return c.json(
        createSuccessResponse(user, "Người dùng đã được xóa thành công")
      );
    } catch (error: any) {
      if (error.message === "User not found") {
        return c.json(createErrorResponse(MESSAGES.AUTH.USER_NOT_FOUND), 404);
      }
      return c.json(
        createErrorResponse(error.message || "Không thể xóa người dùng"),
        500
      );
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
        message: MESSAGES.USERS.CHANGE_PASSWORD_SUCCESS,
      });
    } catch (error: any) {
      if (error.message === "Current password is incorrect") {
        return c.json(
          createErrorResponse(MESSAGES.USERS.CURRENT_PASSWORD_INCORRECT),
          400
        );
      }
      return c.json(
        createErrorResponse(
          error.message || MESSAGES.USERS.CHANGE_PASSWORD_FAILED
        ),
        400
      );
    }
  };

  getProfile = async (c: Context) => {
    try {
      const user = c.get("user");
      return c.json(
        createSuccessResponse(user.toJSON(), MESSAGES.USERS.PROFILE_SUCCESS)
      );
    } catch (error: any) {
      return c.json(
        createErrorResponse(error?.message || MESSAGES.USERS.PROFILE_FAILED),
        400
      );
    }
  };
}
