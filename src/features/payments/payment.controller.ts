import axios from 'axios';
import crypto from 'crypto';
import { Context } from 'hono';
import UserModel from '../../database/models/user';
import { createErrorResponse, createSuccessResponse, MESSAGES } from '../../shared/constants/messages';
import OrderModel from './order.model';

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
        metadata.description = 'Premium subscription';
      } else {
        const count = Number(tokenCount || 0);
        if (!count || count <= 0) return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);
        const pricePer = Number(process.env.TOKEN_PRICE_VND || '1000');
        amount = count * pricePer;
        metadata.tokenCount = count;
        metadata.description = `Buy ${count} tokens`;
      }

      // Save order
      const order = await OrderModel.create({
        userId: user.id,
        orderType,
        amount,
        currency: 'VND',
        status: 'pending',
        provider: 'momo',
        metadata,
      });

      // Build MoMo request
      const partnerCode = process.env.MOMO_PARTNER_CODE || '';
      const accessKey = process.env.MOMO_ACCESS_KEY || '';
      const secretkey = process.env.MOMO_SECRET_KEY || '';
      const requestUrl = process.env.MOMO_REQUEST_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';
      const ipnUrl = process.env.MOMO_IPN_URL || '';
      const redirectUrl = process.env.MOMO_RETURN_URL || '';

      if (!partnerCode || !accessKey || !secretkey || !ipnUrl || !redirectUrl) {
        return c.json(createErrorResponse(MESSAGES.ERRORS.INTERNAL_SERVER_ERROR), 500);
      }

      const requestId = `${partnerCode}${Date.now()}`;
      const orderId = order.id.toString();
      const orderInfo = metadata.description;
      const amountStr = amount.toString();
      const requestType = 'captureWallet';
      const extraData = '';

      const rawSignature = `accessKey=${accessKey}&amount=${amountStr}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
      const signature = crypto.createHmac('sha256', secretkey).update(rawSignature).digest('hex');

      const payload = {
        partnerCode,
        accessKey,
        requestId,
        amount: amountStr,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl: ipnUrl,
        extraData,
        requestType,
        signature,
        lang: "vi",
      };

      const resp = await axios.post(requestUrl, payload, { timeout: 10000 });

      // Persist providerOrderId if present
      if (resp.data && resp.data.orderId) {
        order.providerOrderId = resp.data.orderId;
        await order.save();
      }

  return c.json(createSuccessResponse({ order, momo: resp.data }, MESSAGES.PAYMENTS.PAYMENT_SUCCESS));
    } catch (err: any) {
      console.error('createOrder error', err);
  return c.json(createErrorResponse(err?.message || MESSAGES.PAYMENTS.PAYMENT_FAILED), 500);
    }
  };

  // MoMo IPN notify endpoint
  notify = async (c: Context) => {
    try {
      const text = await c.req.text();
      const parsed = JSON.parse(text || '{}');

      // Build raw signature from parsed fields sorted or by known fields (we use common pattern)
      const signature = parsed.signature || '';
      const secretkey = process.env.MOMO_SECRET_KEY || '';

      // Recreate raw string according to create signature format used earlier
      const raw = `accessKey=${parsed.accessKey || ''}&amount=${parsed.amount || ''}&extraData=${parsed.extraData || ''}&ipnUrl=${process.env.MOMO_CALLBACK_URL || ''}&orderId=${parsed.orderId || ''}&orderInfo=${parsed.orderInfo || ''}&partnerCode=${parsed.partnerCode || ''}&redirectUrl=${process.env.MOMO_RETURN_URL || ''}&requestId=${parsed.requestId || ''}&requestType=${parsed.requestType || ''}`;

      const expected = crypto.createHmac('sha256', secretkey).update(raw).digest('hex');
      if (expected !== signature) {
        console.warn('Invalid MoMo signature');
        return c.json(createErrorResponse(MESSAGES.ERRORS.BAD_REQUEST), 400);
      }

      const order = await OrderModel.findById(parsed.orderId);
      if (!order) return c.text('OK');

      // resultCode === 0 indicates success
      if (parsed.resultCode === 0) {
        order.status = 'completed';
        await order.save();

        // If premium, set user isPremium; if tokens, increment token balance
        const user = await UserModel.findById(order.userId);
        if (user) {
          if (order.orderType === 'premium') {
            user.isPremium = true;
          } else if (order.orderType === 'tokens' && order.metadata && order.metadata.tokenCount) {
            user.tokenBalance = (user.tokenBalance || 0) + Number(order.metadata.tokenCount || 0);
          }
          await user.save();
        }
      } else {
        order.status = 'failed';
        await order.save();
      }

      return c.text('OK');
    } catch (err) {
      console.error('notify error', err);
      return c.text('ERROR');
    }
  };
}