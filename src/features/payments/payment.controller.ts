import { PayOS } from '@payos/node';
import { Context } from 'hono';
import OrderModel from '../../database/models/order.model';
import UserModel from '../../database/models/user';
import { createErrorResponse, createSuccessResponse, MESSAGES } from '../../shared/constants/messages';
import { scheduleExpiration } from '../../shared/jobs/agenda.paymentJobs';

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY
});

const paymentExpired = Number(process.env.PAYOS_EXPIRED_SECONDS || "600");
export class PaymentController {
  // Create an order (premium or tokens), save Order, and request MoMo pay URL
  createOrder = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) return c.json(createErrorResponse(MESSAGES.AUTH.NO_TOKEN_PROVIDED), 401);

      const body = await c.req.json();
      const { orderType, tokenCount } = body as { orderType?: string; tokenCount?: number };

      if (!orderType || (orderType !== 'premium' && orderType !== 'tokens')) {
        return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);
      }

      let amount = 0;

      if (orderType === 'premium') {
        amount = Number(process.env.PREMIUM_PRICE_VND || '99000');
      } else {
        const count = Number(tokenCount || 0);
        if (!count || count <= 0) return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);
        const pricePer = Number(process.env.TOKEN_PRICE_VND || '1000');
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
          console.warn('Failed to schedule expiration job for order', order._id, e);
        }
      }

      return c.json(createSuccessResponse( paymentLinkRes, MESSAGES.ORDERS.PAYMENT_SUCCESS));
    } catch (err: any) {
      console.error('createOrder error', err);
  return c.json(createErrorResponse(err?.message || MESSAGES.ORDERS.PAYMENT_FAILED), 500);
    }
  };

  // Webhook endpoint for PayOS (public)
  webhook = async (c: Context) => {
    try {
      const body = await c.req.json();

      const webhookData = await payOS.webhooks.verify(body);
      console.log('Verified webhook data:', webhookData);
      

      // Extract provider id/orderCode and status
      const orderCode = webhookData.orderCode;
      const isSuccess = body.success

      if (!orderCode) {
        console.warn('Webhook missing order code', body);
        return c.text('OK');
      }

      // Find local order by providerOrderId or orderCode in metadata
      const order = await OrderModel.findOne({
        "paymentInfo.orderCode": orderCode,
      });
      if (!order) {
        console.warn('Webhook received for unknown order code', orderCode);
        return c.text('OK');
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

      return c.text('OK');
    } catch (err) {
      console.error('webhook error', err);
      return c.text('ERROR', 500);
    }
  };

  // Cancel a payment link (authenticated)
  cancelPaymentLink = async (c: Context) => {
    try {
      const body = await c.req.json();
      const { orderCode, reason } = body as { orderCode?: number; reason?: string };

      if (!orderCode) return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);

      // Call PayOS SDK to cancel by orderCode
      const cancelResp = await payOS.paymentRequests.cancel(orderCode, reason || undefined);

      // Try to find local order and mark cancelled
      const order = await OrderModel.findOne({ 'paymentInfo.orderCode': orderCode });
      if (order) {
        order.paymentInfo = cancelResp;
        await order.save();
      }

      return c.json(createSuccessResponse(cancelResp, MESSAGES.ORDERS.PAYMENT_CANCELLED));
    } catch (err: any) {
      console.error('cancelPaymentLink error', err);
      return c.json(createErrorResponse(err?.message || MESSAGES.ORDERS.PAYMENT_FAILED), 500);
    }
  };

  getPaidOrders = async (c: Context) => {
    try {
      const user = c.get('user');
      if (!user) return c.json(createErrorResponse(MESSAGES.AUTH.NO_TOKEN_PROVIDED), 401);

      // Return all orders for the user (both paid and unpaid)
      const orders = await OrderModel.find({ userId: user.id, "paymentInfo.status": "PAID" }).sort({ createdAt: -1 });

      return c.json(createSuccessResponse(orders, MESSAGES.ORDERS.GET_ORDERS_SUCCESS));
    } catch (err: any) {
      console.error('getAllOrders error', err);
      return c.json(createErrorResponse(err?.message || MESSAGES.ORDERS.GET_ORDERS_FAILED), 500);
    }
  };

}