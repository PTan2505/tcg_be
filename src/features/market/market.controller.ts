import { Context } from 'hono';
import marketService from './market.service';

class MarketController {
  createListing = async (c: Context) => {
    try {
      const user = c.get('user');
      const body = await c.req.json();
      const listing = await marketService.createListing(user._id, body);
      return c.json({ success: true, data: listing }, 201);
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  updateListing = async (c: Context) => {
    try {
      const user = c.get('user');
      const id = c.req.param('id');
      const body = await c.req.json();
      const listing = await marketService.updateListing(id, user._id, body);
      return c.json({ success: true, data: listing });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  removeListing = async (c: Context) => {
    try {
      const user = c.get('user');
      const id = c.req.param('id');
      const listing = await marketService.removeListing(id, user._id);
      return c.json({ success: true, data: listing });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  buyListing = async (c: Context) => {
    try {
      const user = c.get('user');
      const id = c.req.param('id');
      const tx = await marketService.buyListing(id, user._id);
      return c.json({ success: true, data: tx }, 201);
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  markShipped = async (c: Context) => {
    try {
      const user = c.get('user');
      const id = c.req.param('id');
      const tx = await marketService.markShipped(id, user._id);
      return c.json({ success: true, data: tx });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  confirmDelivered = async (c: Context) => {
    try {
      const user = c.get('user');
      const id = c.req.param('id');
      const tx = await marketService.confirmDelivered(id, user._id);
      return c.json({ success: true, data: tx });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  listListings = async (c: Context) => {
    try {
      const listings = await marketService.getListings(c.req.query());
      return c.json({ success: true, data: listings });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  getListing = async (c: Context) => {
    try {
      const id = c.req.param('id');
      const listing = await marketService.getListingById(id);
      return c.json({ success: true, data: listing });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };
}

export default new MarketController();
