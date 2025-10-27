import { PayOS } from "@payos/node";
import { Context } from "hono";
import OrderModel from "../../database/models/order.model";
import UserModel from "../../database/models/user";
import {
  createErrorResponse,
  createSuccessResponse,
  MESSAGES,
} from "../../shared/constants/messages";
import { scheduleExpiration } from "../../shared/jobs/agenda.paymentJobs";
import { socketService } from "../../shared/services/socket.service";

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

const paymentExpired = Number(process.env.PAYOS_EXPIRED_SECONDS || "600");
export class PaymentController {
  // Create an order (premium or tokens), save Order, and request MoMo pay URL
  createOrder = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user)
        return c.json(
          createErrorResponse(MESSAGES.AUTH.NO_TOKEN_PROVIDED),
          401
        );

      const body = await c.req.json();
      const { orderType, tokenCount } = body as {
        orderType?: string;
        tokenCount?: number;
      };

      if (!orderType || (orderType !== "premium" && orderType !== "tokens")) {
        return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);
      }

      let amount = 0;

      if (orderType === "premium") {
        amount = Number(process.env.PREMIUM_PRICE_VND || "99000");
      } else {
        const count = Number(tokenCount || 0);
        if (!count || count <= 0)
          return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);
        const pricePer = Number(process.env.TOKEN_PRICE_VND || "1000");
        amount = count * pricePer;
      }

      // Save order
      const order = await OrderModel.create({
        userId: user.id,
        orderType,
        amount,
        currency: "VND",
        status: "pending",
        provider: "payOS",
        tokenCount,
      });

      // Ensure we provide a numeric orderCode (PayOS requires a number)
      const orderCode = Date.now();
      const payload = {
        orderCode,
        amount: amount,
        description:
          orderType === "premium"
            ? "Thanh toán gói Premium"
            : `Thanh toán ${tokenCount} tokens`,
        cancelUrl: "kado://payment/callback",
        returnUrl: "kado://payment/callback",
        expiredAt: Math.floor(Date.now() / 1000) + paymentExpired, // 10 minutes from now
      };

      // Use PayOS SDK to create a payment link and capture response into paymentLinkRes
      let paymentLinkRes = await payOS.paymentRequests.create(payload);

      // Persist providerOrderId if present
      if (paymentLinkRes) {
        order.paymentInfo = paymentLinkRes;
        await order.save();

        // Schedule expiration job (10 minutes by default)
        try {
          await scheduleExpiration(order._id?.toString());
        } catch (e) {
          console.warn(
            "Failed to schedule expiration job for order",
            order._id,
            e
          );
        }
      }

      return c.json(
        createSuccessResponse(paymentLinkRes, MESSAGES.ORDERS.PAYMENT_SUCCESS)
      );
    } catch (err: any) {
      console.error("createOrder error", err);
      return c.json(
        createErrorResponse(err?.message || MESSAGES.ORDERS.PAYMENT_FAILED),
        500
      );
    }
  };

  // Webhook endpoint for PayOS (public)
  webhook = async (c: Context) => {
    try {
      const body = await c.req.json();

      const webhookData = await payOS.webhooks.verify(body);
      console.log("Verified webhook data:", webhookData);

      // Extract provider id/orderCode and status
      const orderCode = webhookData.orderCode;
      const isSuccess = body.success;

      if (!orderCode) {
        console.warn("Webhook missing order code", body);
        return c.text("OK");
      }

      // Find local order by providerOrderId or orderCode in metadata
      const order = await OrderModel.findOne({
        "paymentInfo.orderCode": orderCode,
      });
      if (!order) {
        console.warn("Webhook received for unknown order code", orderCode);
        return c.text("OK");
      }

      order.isPaid = isSuccess;
      order.paymentInfo = webhookData;
      await order.save();

      const user = await UserModel.findById(order.userId);
      if (user) {
        if (order.orderType === "premium") {
          if (!user.isPremium) {
            user.isPremium = true;
            await user.save();
          }
        } else if (order.orderType === "tokens") {
          const tokens = order.tokenCount ?? 0;
          if (tokens > 0) {
            user.tokenBalance = (user.tokenBalance || 0) + Number(tokens);
            await user.save();
          }
        }
      }

      // Emit payment update to all sockets for this user
      socketService.emitToUser(user?.id.toString(), "paymentUpdated", {
        ...webhookData,
        success: isSuccess,
      });

      return c.text("OK");
    } catch (err) {
      console.error("webhook error", err);
      return c.text("ERROR", 500);
    }
  };

  // Cancel a payment link (authenticated)
  cancelPaymentLink = async (c: Context) => {
    try {
      const body = await c.req.json();
      const { orderCode, reason } = body as {
        orderCode?: number;
        reason?: string;
      };

      if (!orderCode)
        return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);

      // Call PayOS SDK to cancel by orderCode
      const cancelResp = await payOS.paymentRequests.cancel(
        orderCode,
        reason || undefined
      );

      // Try to find local order and mark cancelled
      const order = await OrderModel.findOne({
        "paymentInfo.orderCode": orderCode,
      });
      if (order) {
        order.paymentInfo = cancelResp;
        await order.save();
      }

      return c.json(
        createSuccessResponse(cancelResp, MESSAGES.ORDERS.PAYMENT_CANCELLED)
      );
    } catch (err: any) {
      console.error("cancelPaymentLink error", err);
      return c.json(
        createErrorResponse(err?.message || MESSAGES.ORDERS.PAYMENT_FAILED),
        500
      );
    }
  };

  getPaidOrders = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user)
        return c.json(
          createErrorResponse(MESSAGES.AUTH.NO_TOKEN_PROVIDED),
          401
        );

      // Return all orders for the user (both paid and unpaid)
      const orders = await OrderModel.find({
        userId: user.id,
        "paymentInfo.status": "PAID",
      }).sort({ createdAt: -1 });

      return c.json(
        createSuccessResponse(orders, MESSAGES.ORDERS.GET_ORDERS_SUCCESS)
      );
    } catch (err: any) {
      console.error("getAllOrders error", err);
      return c.json(
        createErrorResponse(err?.message || MESSAGES.ORDERS.GET_ORDERS_FAILED),
        500
      );
    }
  };

  // Admin: list all orders with filters (startDate/endDate, minAmount/maxAmount, orderType) and pagination
  listAllOrders = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !(user as any).isAdmin)
        return c.json(createErrorResponse(MESSAGES.AUTH.ACCESS_DENIED), 403);

      const {
        startDate,
        endDate,
        minAmount,
        maxAmount,
        orderType,
        page = "1",
        limit = "50",
      } = c.req.query();
      const q: any = {};
      if (orderType) q.orderType = orderType;
      if (minAmount)
        q.amount = { ...(q.amount || {}), $gte: Number(minAmount) };
      if (maxAmount)
        q.amount = { ...(q.amount || {}), $lte: Number(maxAmount) };
      if (startDate || endDate) q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate as string);
      if (endDate) q.createdAt.$lte = new Date(endDate as string);

      const pageNum = Math.max(1, Number(page));
      const lim = Math.min(1000, Math.max(1, Number(limit)));

      const total = await OrderModel.countDocuments(q);
      const data = await OrderModel.find(q)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim);

      return c.json(
        createSuccessResponse(
          { listOrders: data, total, page: pageNum, limit: lim },
          MESSAGES.ORDERS.GET_ORDERS_SUCCESS
        )
      );
    } catch (err: any) {
      console.error("listAllOrders error", err);
      return c.json(
        createErrorResponse(err?.message || MESSAGES.ORDERS.GET_ORDERS_FAILED),
        500
      );
    }
  };

  // Admin: list paid orders (filtered) and return totalAmount across results
  listPaidOrdersSummary = async (c: Context) => {
    try {
      const user = c.get("user");
      if (!user || !(user as any).isAdmin)
        return c.json(createErrorResponse(MESSAGES.AUTH.ACCESS_DENIED), 403);

      const {
        startDate,
        endDate,
        minAmount,
        maxAmount,
        orderType,
        page = "1",
        limit = "50",
      } = c.req.query();
      const q: any = { isPaid: true };
      if (orderType) q.orderType = orderType;
      if (minAmount)
        q.amount = { ...(q.amount || {}), $gte: Number(minAmount) };
      if (maxAmount)
        q.amount = { ...(q.amount || {}), $lte: Number(maxAmount) };
      if (startDate || endDate) q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate as string);
      if (endDate) q.createdAt.$lte = new Date(endDate as string);

      const pageNum = Math.max(1, Number(page));
      const lim = Math.min(1000, Math.max(1, Number(limit)));

      const total = await OrderModel.countDocuments(q);
      const data = await OrderModel.find(q)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim);

      // totalAmount across matching paid orders (aggregation)
      const aggRes = await OrderModel.aggregate([
        { $match: q },
        { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
      ]);
      const totalAmount = aggRes[0]?.totalAmount || 0;

      return c.json(
        createSuccessResponse(
          { listOrders: data, total, totalAmount, page: pageNum, limit: lim },
          MESSAGES.ORDERS.GET_ORDERS_SUCCESS
        )
      );
    } catch (err: any) {
      console.error("listPaidOrdersSummary error", err);
      return c.json(
        createErrorResponse(err?.message || MESSAGES.ORDERS.GET_ORDERS_FAILED),
        500
      );
    }
  };
}
