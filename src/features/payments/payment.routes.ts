import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { PaymentController } from './payment.controller';


export const paymentRoutes = new Hono();

const paymentController = new PaymentController();
// All authenticated routes require authentication and rate limiting
// paymentRoutes.use('/*', authMiddleware);
// paymentRoutes.use('/*', rateLimitMiddleware(300, 60000)); // 300 requests per minute

// Create order (authenticated)
paymentRoutes.post('/create-order', authMiddleware, paymentController.createOrder);

// PayOS webhook (public)
paymentRoutes.post('/webhook', paymentController.webhook);

// Cancel payment link (authenticated)
paymentRoutes.post('/cancel', authMiddleware, paymentController.cancelPaymentLink);

paymentRoutes.get("/", authMiddleware, paymentController.getPaidOrders);



export default paymentRoutes;