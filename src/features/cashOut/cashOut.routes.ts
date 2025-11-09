import { Hono } from "hono";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import cashOutController from "./cashOut.controller";

const cashOutRoutes = new Hono();

// All routes require authentication
cashOutRoutes.use("*", authMiddleware);

// User routes - create and view own cash-out requests
cashOutRoutes.post("/", cashOutController.createCashOutRequest);
cashOutRoutes.get("/my", cashOutController.getMyCashOuts);

// Admin routes - view all requests and mark as paid
cashOutRoutes.get("/", cashOutController.getCashOutList);
cashOutRoutes.post("/:id/paid", cashOutController.markCashOutPaid);

export default cashOutRoutes;
