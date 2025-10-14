import { Hono } from 'hono';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import marketController from './market.controller';

const marketRoutes = new Hono();
marketRoutes.use('*', authMiddleware);

// Listing CRUD
marketRoutes.post('/', marketController.createListing);
marketRoutes.put('/:id', marketController.updateListing);
marketRoutes.delete('/:id', marketController.removeListing);

// Browse
marketRoutes.get('/', marketController.listListings);
marketRoutes.get('/:id', marketController.getListing);

// Purchase flow
marketRoutes.post('/:id/buy', marketController.buyListing);
marketRoutes.post('/tx/:id/ship', marketController.markShipped);
marketRoutes.post('/tx/:id/deliver', marketController.confirmDelivered);

export default marketRoutes;
