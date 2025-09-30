import { Hono } from "hono";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import { validateRequest } from "../../shared/middlewares/validation.middleware";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import {
  changePasswordSchema,
  updateUserSchema,
} from "./user.validator";

const userRoutes = new Hono();

// Initialize dependencies
const userService = new UserService();
const userController = new UserController(userService);

// All routes require authentication
userRoutes.use('/*', authMiddleware);

// User profile routes
userRoutes.get("/profile", userController.getProfile);
userRoutes.post(
  "/change-password",
  validateRequest(changePasswordSchema),
  userController.changePassword
);

// User management routes
userRoutes.get("/", userController.getUsers);
userRoutes.get("/:id", userController.getUserById);
userRoutes.patch(
  "/:id",
  validateRequest(updateUserSchema),
  userController.updateUser
);
userRoutes.delete("/:id", userController.deleteUser);

export default userRoutes;
