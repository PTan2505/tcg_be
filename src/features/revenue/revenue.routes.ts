import { Hono } from "hono";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";
import revenueController from "./revenue.controller";

const revenueRoutes = new Hono();

// All revenue routes require admin authentication
revenueRoutes.use("/*", authMiddleware);

/**
 * @route   GET /revenue/total
 * @desc    Get total revenue with optional filters
 * @access  Admin only
 * @query   startDate, endDate, revenueType
 */
revenueRoutes.get("/total", revenueController.getTotalRevenue);

/**
 * @route   GET /revenue/by-type
 * @desc    Get revenue breakdown by type
 * @access  Admin only
 * @query   startDate, endDate
 */
revenueRoutes.get("/by-type", revenueController.getRevenueByType);

/**
 * @route   GET /revenue/timeline
 * @desc    Get revenue over time with grouping
 * @access  Admin only
 * @query   startDate (required), endDate (required), groupBy (day|month|year)
 */
revenueRoutes.get("/timeline", revenueController.getRevenueByDateRange);

/**
 * @route   GET /revenue/summary
 * @desc    Get comprehensive revenue summary
 * @access  Admin only
 * @query   startDate, endDate
 */
revenueRoutes.get("/summary", revenueController.getRevenueSummary);

/**
 * @route   GET /revenue/recent
 * @desc    Get recent revenue records
 * @access  Admin only
 * @query   page, limit, revenueType
 */
revenueRoutes.get("/recent", revenueController.getRecentRevenue);

export default revenueRoutes;
