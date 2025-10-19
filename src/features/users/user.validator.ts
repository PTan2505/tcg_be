import { z } from "zod";

export const updateUserSchema = z.object({
  firstName: z.string().min(1, "Họ không được để trống").optional(),
  lastName: z.string().min(1, "Tên không được để trống").optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải có định dạng YYYY-MM-DD")
    .optional(),
  avatarUrl: z.string().url("URL avatar không hợp lệ").optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Mật khẩu hiện tại phải có ít nhất 8 ký tự"),
  newPassword: z
    .string()
    .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Mật khẩu mới phải chứa ít nhất một chữ hoa, một chữ thường và một số"
    ),
});

export const friendshipActionSchema = z.object({
  action: z.enum(['accept', 'decline'], { message: "Hành động không hợp lệ" })
});

export const sendFriendRequestSchema = z.object({
  userId: z.string().min(1, "ID người dùng là bắt buộc")
});

export const blockUserSchema = z.object({
  userId: z.string().min(1, "ID người dùng là bắt buộc")
});
