import { Context } from "hono";
import { S3Service } from "../../shared/services/s3.service";
import marketService from "./market.service";

class MarketController {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  createListing = async (c: Context) => {
    try {
      const user = c.get("user");
      const formData = await c.req.formData();

      const gameType = formData.get("gameType")?.toString() || "";
      const cardName = formData.get("cardName")?.toString() || "";
      const setCode = formData.get("setCode")?.toString() || "";
      const priceTokens = parseFloat(
        formData.get("priceTokens")?.toString() || "0"
      );

      const imageUrls: string[] = [];
      const files = formData.getAll("images") as File[];

      for (const file of files) {
        if (file && file.size > 0) {
          // Validate file type
          if (!file.type.startsWith("image/")) {
            return c.json(
              {
                success: false,
                error: `Invalid file type: ${file.type}. Only images are allowed.`,
              },
              400
            );
          }

          // Validate file size (5MB limit)
          const maxSize = 5 * 1024 * 1024; // 5MB
          if (file.size > maxSize) {
            return c.json(
              {
                success: false,
                error: `File too large: ${file.name}. Maximum size is 5MB.`,
              },
              400
            );
          }

          try {
            // Convert file to buffer
            const buffer = Buffer.from(await file.arrayBuffer());

            // Upload to S3
            const imageUrl = await this.s3Service.uploadFile(
              "markets",
              buffer,
              file.name,
              file.type
            );
            imageUrls.push(imageUrl);
          } catch (uploadError) {
            console.error(`Error uploading file ${file.name}:`, uploadError);
            return c.json(
              {
                success: false,
                error: `Failed to upload image: ${file.name}`,
              },
              500
            );
          }
        }
      }

      const body = {
        gameType,
        cardName,
        setCode,
        priceTokens,
        images: imageUrls,
      };
      const listing = await marketService.createListing(user._id, body);
      return c.json({ success: true, data: listing }, 201);
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  updateListing = async (c: Context) => {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const body = await c.req.json();
      const listing = await marketService.updateListing(id, user._id, body);
      return c.json({ success: true, data: listing });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  removeListing = async (c: Context) => {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const listing = await marketService.removeListing(id, user._id);
      return c.json({ success: true, data: listing });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  buyListing = async (c: Context) => {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const tx = await marketService.buyListing(id, user._id);
      return c.json({ success: true, data: tx }, 201);
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  markShipped = async (c: Context) => {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const tx = await marketService.markShipped(id, user._id);
      return c.json({ success: true, data: tx });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  confirmDelivered = async (c: Context) => {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const tx = await marketService.confirmDelivered(id, user._id);
      return c.json({ success: true, data: tx });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  // Buyer cancels a transaction within 24 hours of purchase
  cancelTransaction = async (c: Context) => {
    try {
      const user = c.get("user");
      const id = c.req.param("id");
      const tx = await marketService.cancelTransactionByBuyer(id, user._id);
      return c.json({ success: true, data: tx });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  // Bulk buy multiple listings from cart
  bulkBuy = async (c: Context) => {
    try {
      const user = c.get("user");
      const body = await c.req.json();
      const listingIds = Array.isArray(body.listingIds) ? body.listingIds : [];
      const txs = await marketService.bulkBuy(user._id, listingIds);
      return c.json({ success: true, data: txs }, 201);
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

  // Listings created by the current user (sell)
  getMarketListUserSell = async (c: Context) => {
    try {
      const user = c.get("user");
      const listings = await marketService.getTransactionsBySeller(
        user._id,
        c.req.query()
      );
      return c.json({ success: true, data: listings });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  // Transactions where the current user is the buyer (buy)
  getMarketListUserBuy = async (c: Context) => {
    try {
      const user = c.get("user");
      const txs = await marketService.getTransactionsByBuyer(
        user._id,
        c.req.query()
      );
      return c.json({ success: true, data: txs });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };

  getListing = async (c: Context) => {
    try {
      const id = c.req.param("id");
      const listing = await marketService.getListingById(id);
      return c.json({ success: true, data: listing });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  };
}

export default new MarketController();
