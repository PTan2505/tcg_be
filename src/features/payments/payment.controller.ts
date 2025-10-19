import { PayOS } from '@payos/node';
import { createHmac } from 'crypto';
import { Context } from 'hono';
import { createErrorResponse, createSuccessResponse, MESSAGES } from '../../shared/constants/messages';
import OrderModel from './order.model';

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY
});
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
      const metadata: any = { orderType };

      if (orderType === 'premium') {
        amount = Number(process.env.PREMIUM_PRICE_VND || '99000');
        metadata.description = 'Thanh toán gói Premium';
      } else {
        const count = Number(tokenCount || 0);
        if (!count || count <= 0) return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);
        const pricePer = Number(process.env.TOKEN_PRICE_VND || '1000');
        amount = count * pricePer;
        metadata.tokenCount = count;
        metadata.description = `Thanh toán ${count} tokens`;
      }

      // Save order
      const order = await OrderModel.create({
        userId: user.id,
        orderType,
        amount,
        currency: 'VND',
        status: 'pending',
        provider: 'payOS',
        metadata,
      });

      // Ensure we provide a numeric orderCode (PayOS requires a number)
      const orderCode = Date.now();
      const payload = {
        orderCode,
        amount: amount,
        description: metadata.description,
        cancelUrl: "http://localhost:3000/cancel.html",
        returnUrl: "http://localhost:3000/success.html",
        expiredAt: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minutes from now
      };

      // Use PayOS SDK to create a payment link and capture response into paymentLinkRes
      let paymentLinkRes: any = null;
      try {
        paymentLinkRes = await payOS.paymentRequests.create(payload);
      } catch (err: any) {
        // PayOS duplicate order: "Đơn thanh toán đã tồn tại" (code 231)
        const code = err?.error?.code || err?.code || err?.desc;
        if (code === '231' || String(code) === '231') {
          // attempt to read existing order by orderCode and use it
          try {
            paymentLinkRes = await payOS.paymentRequests.get(orderCode);
          } catch (getErr) {
            console.warn('Duplicate order detected but failed to fetch existing order', getErr);
            throw err;
          }
        } else {
          throw err;
        }
      }

      // Persist providerOrderId/paymentLinkId if present
      if (paymentLinkRes && (paymentLinkRes.paymentLinkId || paymentLinkRes.orderCode)) {
        order.providerOrderId = (paymentLinkRes.paymentLinkId || paymentLinkRes.orderCode).toString();
        await order.save();
      }

      return c.json(createSuccessResponse({ order, payos: paymentLinkRes }, MESSAGES.PAYMENTS.PAYMENT_SUCCESS));
    } catch (err: any) {
      console.error('createOrder error', err);
  return c.json(createErrorResponse(err?.message || MESSAGES.PAYMENTS.PAYMENT_FAILED), 500);
    }
  };

  sortObjDataByKey(object: Record<string, any>) {
    const orderedObject = Object.keys(object)
      .sort()
      .reduce((obj: Record<string, any>, key: string) => {
        obj[key] = object[key];
        return obj;
      }, {});
    return orderedObject;
  }

  convertObjToQueryStr(object: Record<string, any>) {
    return Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .map((key) => {
        let value = object[key];
        // Sort nested object
        if (value && Array.isArray(value)) {
          value = JSON.stringify(value.map((val: any) => this.sortObjDataByKey(val)));
        }
        // Set empty string if null
        if ([null, undefined, 'undefined', 'null'].includes(value)) {
          value = '';
        }

        return `${key}=${value}`;
      })
      .join('&');
  }

  isValidData(data: Record<string, any>, currentSignature: string, checksumKey: string) {
    const sortedDataByKey = this.sortObjDataByKey(data as Record<string, any>);
    const dataQueryStr = this.convertObjToQueryStr(sortedDataByKey);
    const dataToSignature = createHmac('sha256', checksumKey).update(dataQueryStr).digest('hex');
    return dataToSignature == currentSignature;
  }

  // Webhook endpoint for PayOS (public)
  webhook = async (c: Context) => {
    try {
      const body = await c.req.json();
      const webhookData = body; // example shape from your message
      const sig = webhookData.signature;
      const checksumKey = process.env.PAYOS_CHECKSUM_KEY || "";

      if (!sig || !checksumKey) {
        console.warn("Missing signature or checksumKey");
        return c.text("INVALID_SIGNATURE", 400);
      }      

      const valid = this.isValidData(webhookData.data || {}, sig, checksumKey);
      if (!valid) {
        console.warn("Invalid webhook signature (payload.data)");
        return c.text("INVALID_SIGNATURE", 400);
      }

      // Extract provider id/orderCode and status
      const providerId = body.paymentLinkId || body.orderCode || body.paymentLink?.paymentLinkId;
      const statusRaw = (body.status || body.result || '').toString().toUpperCase();

      if (!providerId) {
        console.warn('Webhook missing provider id', body);
        return c.text('OK');
      }

      // Find local order by providerOrderId or orderCode in metadata
      const order = await OrderModel.findOne({ $or: [{ providerOrderId: String(providerId) }, { 'metadata.providerOrderId': String(providerId) }, { 'metadata.orderCode': Number(providerId) }] });
      if (!order) {
        console.warn('Webhook received for unknown provider id', providerId);
        return c.text('OK');
      }

      if (statusRaw === 'PAID' || statusRaw === 'SUCCESS') {
        // idempotent: only apply if order wasn't already completed
        if (order.status !== 'completed') {
          order.status = 'completed';

          // apply business effects based on orderType
          const user = await (await import('../../database/models/user')).default.findById(order.userId);
          if (user) {
            if (order.orderType === 'premium') {
              if (!user.isPremium) {
                user.isPremium = true;
                await user.save();
              }
            } else if (order.orderType === 'tokens') {
              const tokens = order.tokenCount || (order.metadata && order.metadata.tokenCount) || 0;
              if (tokens > 0) {
                user.tokenBalance = (user.tokenBalance || 0) + Number(tokens);
                await user.save();
              }
            }
          }
        }
      } else if (statusRaw === 'EXPIRED' || statusRaw === 'CANCELLED' || statusRaw === 'FAILED') {
        order.status = 'cancelled';
      }

      // persist provider payload for audit
      order.metadata = order.metadata || {};
      order.metadata.providerLastWebhook = body;
      await order.save();

      return c.text('OK');
    } catch (err) {
      console.error('webhook error', err);
      return c.text('ERROR', 500);
    }
  };

  paymentReturn = async (c: Context) => {
    // User is redirected here after payment
    console.log("aaaa");

    const data =  c.req.query();
    console.log(data);
    

    return c.text('Cảm ơn bạn đã thanh toán! Bạn có thể đóng trang này và quay lại ứng dụng.');
  }
}