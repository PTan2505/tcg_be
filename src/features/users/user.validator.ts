import { z } from "zod";

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export const friendshipActionSchema = z.object({
  action: z.enum(['accept', 'decline'])
});

export const sendFriendRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required")
});

export const blockUserSchema = z.object({
  userId: z.string().min(1, "User ID is required")
});
