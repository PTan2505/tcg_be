import { Context } from "hono";
import { getMessage } from "../../shared/constants/messages";
import cashOutService from "./cashOut.service";

class CashOutController {
  createCashOutRequest = async (c: Context) => {
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

      const body = await c.req.json();
      const { amount, bankInfo } = body;

      const cashOut = await cashOutService.createCashOutRequest(
        user._id.toString(),
        {
          amount,
          bankInfo,
        }
      );

      return c.json(
        {
          success: true,
          message:
            getMessage("CASHOUT.REQUEST_CREATED") ||
            "Yêu cầu rút tiền đã được tạo",
          data: cashOut,
        },
        201
      );
    } catch (error: any) {
      console.error("Error creating cashOut:", error.message);
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

  getMyCashOuts = async (c: Context) => {
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
      const result = await cashOutService.getMyCashOuts(
        user._id.toString(),
        query
      );

      return c.json(
        {
          success: true,
          message:
            getMessage("CASHOUT.LIST_SUCCESS") ||
            "Lấy danh sách yêu cầu rút tiền thành công",
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting my cashouts:", error.message);
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

  getCashOutList = async (c: Context) => {
    try {
      const query = c.req.query();
      const result = await cashOutService.getCashOutList(query);

      return c.json(
        {
          success: true,
          message:
            getMessage("CASHOUT.LIST_SUCCESS") ||
            "Lấy danh sách yêu cầu rút tiền thành công",
          data: result,
        },
        200
      );
    } catch (error: any) {
      console.error("Error getting cashout list:", error.message);
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

  markCashOutPaid = async (c: Context) => {
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

      const { id } = c.req.param();
      const adminId = user._id.toString();

      const cashOut = await cashOutService.markCashOutPaid(id, adminId);

      return c.json(
        {
          success: true,
          message:
            getMessage("CASHOUT.MARKED_PAID") ||
            "Đã đánh dấu yêu cầu rút tiền là đã thanh toán",
          data: cashOut,
        },
        200
      );
    } catch (error: any) {
      console.error("Error marking cashout paid:", error.message);
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

export default new CashOutController();
