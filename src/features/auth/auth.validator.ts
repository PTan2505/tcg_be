import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  username: z
    .string()
    .min(3, "Tên người dùng phải có ít nhất 3 ký tự")
    .max(30, "Tên người dùng không được quá 30 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới"),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một số"
    ),
  firstName: z.string().min(1, "Họ không được để trống"),
  lastName: z.string().min(1, "Tên không được để trống"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải có định dạng YYYY-MM-DD"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export const emailOTPSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z
    .string()
    .length(6, "Mã OTP phải có đúng 6 chữ số")
    .regex(/^\d{6}$/, "Mã OTP chỉ được chứa số"),
});

export const resendOTPSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ message: "Refresh token là bắt buộc" }),
});

export const resetPasswordWithOTPSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z
    .string()
    .length(6, "Mã OTP phải có đúng 6 chữ số")
    .regex(/^\d{6}$/, "Mã OTP chỉ được chứa số"),
  newPassword: z
    .string()
    .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Mật khẩu mới phải chứa ít nhất một chữ hoa, một chữ thường và một số"
    ),
});
