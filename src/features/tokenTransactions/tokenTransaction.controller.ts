import { Context } from "hono";
import { getMessage } from "../../shared/constants/messages";
import tokenTransactionService from "./tokenTransaction.service";

class TokenTransactionController {
  /**
   * Get user's token transaction history
   * GET /token-transactions
   */
  getMyTransactions = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !user._id) {
        return c.json(
          {
            success: false,
            error: getMessage("AUTH.UNAUTHORIZED") || "Unauthorized",
          },
          401
        );
      }

      const query = c.req.query();
      const result = await tokenTransactionService.getUserTransactions(
        user._id.toString(),
        query
      );

      return c.json(
        {
          success: true,
          message:
            getMessage("TOKEN_TRANSACTION.LIST_SUCCESS") ||
            "Lấy lịch sử giao dịch thành công",
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting token transactions:", error.message);
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
   * Get user's token transaction statistics
   * GET /token-transactions/stats
   */
  getMyStats = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !user._id) {
        return c.json(
          {
            success: false,
            error: getMessage("AUTH.UNAUTHORIZED") || "Unauthorized",
          },
          401
        );
      }

      const stats = await tokenTransactionService.getUserStats(
        user._id.toString()
      );

      return c.json(
        {
          success: true,
          message:
            getMessage("TOKEN_TRANSACTION.STATS_SUCCESS") ||
            "Lấy thống kê giao dịch thành công",
          data: stats,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting token transaction stats:", error.message);
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

export default new TokenTransactionController();
