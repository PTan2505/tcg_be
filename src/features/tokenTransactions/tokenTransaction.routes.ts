import { Hono } from "hono";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import tokenTransactionController from "./tokenTransaction.controller";

const tokenTransactionRoutes = new Hono();

// All routes require authentication
tokenTransactionRoutes.use("*", authMiddleware);

// Get user's transaction history with filters
tokenTransactionRoutes.get("/", tokenTransactionController.getMyTransactions);

// Get user's transaction statistics
tokenTransactionRoutes.get("/stats", tokenTransactionController.getMyStats);

export default tokenTransactionRoutes;
