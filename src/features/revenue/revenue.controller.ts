import { Context } from "hono";
import { getMessage } from "../../shared/constants/messages";
import revenueService from "./revenue.service";

class RevenueController {
  /**
   * Get total revenue (Admin only)
   * Query params: startDate, endDate, revenueType
   */
  getTotalRevenue = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !user.isAdmin) {
        return c.json(
          {
            success: false,
            error: getMessage("AUTH.ACCESS_DENIED") || "Access denied",
          },
          403
        );
      }

      const query = c.req.query();
      const result = await revenueService.getTotalRevenue(query);

      return c.json(
        {
          success: true,
          message: getMessage("REVENUE.TOTAL_SUCCESS"),
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting total revenue:", error.message);
      const statusCode =
        error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
      return c.json(
        {
          success: false,
          error:
            statusCode < 500
              ? error.message
              : getMessage("COMMON.SERVER_ERROR") ||
                "Có lỗi xảy ra, vui lòng thử lại sau",
        },
        statusCode
      );
    }
  };

  /**
   * Get revenue breakdown by type (Admin only)
   * Query params: startDate, endDate
   */
  getRevenueByType = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !user.isAdmin) {
        return c.json(
          {
            success: false,
            error: getMessage("AUTH.ACCESS_DENIED") || "Access denied",
          },
          403
        );
      }

      const query = c.req.query();
      const result = await revenueService.getRevenueByType(query);

      return c.json(
        {
          success: true,
          message: getMessage("REVENUE.BREAKDOWN_SUCCESS"),
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting revenue by type:", error.message);
      const statusCode =
        error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
      return c.json(
        {
          success: false,
          error:
            statusCode < 500
              ? error.message
              : getMessage("COMMON.SERVER_ERROR") ||
                "Có lỗi xảy ra, vui lòng thử lại sau",
        },
        statusCode
      );
    }
  };

  /**
   * Get revenue over time (Admin only)
   * Query params: startDate (required), endDate (required), groupBy (day|month|year)
   */
  getRevenueByDateRange = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !user.isAdmin) {
        return c.json(
          {
            success: false,
            error: getMessage("AUTH.ACCESS_DENIED") || "Access denied",
          },
          403
        );
      }

      const query = c.req.query();
      const result = await revenueService.getRevenueByDateRange(query);

      return c.json(
        {
          success: true,
          message: getMessage("REVENUE.TIMELINE_SUCCESS"),
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting revenue by date range:", error.message);
      const statusCode =
        error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
      return c.json(
        {
          success: false,
          error:
            statusCode < 500
              ? error.message
              : getMessage("COMMON.SERVER_ERROR") ||
                "Có lỗi xảy ra, vui lòng thử lại sau",
        },
        statusCode
      );
    }
  };

  /**
   * Get revenue summary (Admin only)
   * Query params: startDate, endDate
   */
  getRevenueSummary = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !user.isAdmin) {
        return c.json(
          {
            success: false,
            error: getMessage("AUTH.ACCESS_DENIED") || "Access denied",
          },
          403
        );
      }

      const query = c.req.query();
      const result = await revenueService.getRevenueSummary(query);

      return c.json(
        {
          success: true,
          message: getMessage("REVENUE.SUMMARY_SUCCESS"),
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting revenue summary:", error.message);
      const statusCode =
        error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
      return c.json(
        {
          success: false,
          error:
            statusCode < 500
              ? error.message
              : getMessage("COMMON.SERVER_ERROR") ||
                "Có lỗi xảy ra, vui lòng thử lại sau",
        },
        statusCode
      );
    }
  };

  /**
   * Get recent revenue records (Admin only)
   * Query params: page, limit, revenueType, startDate, endDate
   */
  getRecentRevenue = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !user.isAdmin) {
        return c.json(
          {
            success: false,
            error: getMessage("AUTH.ACCESS_DENIED") || "Access denied",
          },
          403
        );
      }

      const {
        page = "1",
        limit = "20",
        revenueType,
        startDate,
        endDate,
      } = c.req.query();
      const result = await revenueService.getRecentRevenue(
        Number(page),
        Number(limit),
        revenueType as string,
        startDate as string,
        endDate as string
      );

      return c.json(
        {
          success: true,
          message: getMessage("REVENUE.RECENT_SUCCESS"),
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting recent revenue:", error.message);
      const statusCode =
        error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
      return c.json(
        {
          success: false,
          error:
            statusCode < 500
              ? error.message
              : getMessage("COMMON.SERVER_ERROR") ||
                "Có lỗi xảy ra, vui lòng thử lại sau",
        },
        statusCode
      );
    }
  };
}

export default new RevenueController();
