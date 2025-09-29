import { Hono } from "hono";
import { UserController } from "./user.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { validateRequest } from "../../shared/middlewares/validation.middleware";
import { UserService } from "./user.service";
import {
  changePasswordSchema,
  updateUserSchema,
} from "./user.validator";

const userRoutes = new Hono();

// Initialize dependencies
const userService = new UserService();
const userController = new UserController(userService);

// Protected routes
userRoutes.get("/profile", authMiddleware, userController.getProfile);
userRoutes.post(
  "/change-password",
  authMiddleware,
  validateRequest(changePasswordSchema),
  userController.changePassword
);

// Regular routes
userRoutes.get("/", userController.getUsers);
userRoutes.get("/:id", userController.getUserById);
userRoutes.patch(
  "/:id",
  validateRequest(updateUserSchema),
  userController.updateUser
);
userRoutes.delete("/:id", userController.deleteUser);

export default userRoutes;
