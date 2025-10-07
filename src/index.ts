import { swaggerUI } from "@hono/swagger-ui";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectDB } from "./database/db/db";
import "./database/models/card"; // Import unified Card model
import "./database/models/cardSet"; // Import CardSet model
import "./database/models/comment"; // Import Comment model
import "./database/models/commentReaction"; // Import CommentReaction model
import "./database/models/deck"; // Import Deck model
import "./database/models/friendship"; // Import Friendship model
import "./database/models/notification"; // Import Notification model
import "./database/models/post"; // Import Post model
import "./database/models/postReaction"; // Import PostReaction model
import "./database/models/scanHistory"; // Import ScanHistory model
import "./database/models/user"; // Import User model to ensure it's registered
import "./database/models/userCard"; // Import UserCard model
import authRoutes from "./features/auth/auth.routes";
import cardRoutes from "./features/cards/card.routes";
import enhancedScanRoutes from "./features/cards/enhancedCardScan.routes";
import testRoutes from "./features/cards/test.routes";
import userCardRoutes from "./features/collections/userCard.routes";
import deckRoutes from "./features/decks/deck.routes";
import postRoutes from "./features/posts/post.routes";
import setRoutes from "./features/sets/set.routes";
import userRoutes from "./features/users/user.routes";
import { initializeSuperuser } from "./scripts/initSuperuser";
import { swaggerDoc } from "./shared/config/swagger";
import { getCacheStats } from "./shared/middlewares/cache.middleware";

// Create Hono app
const app = new Hono();

// Configure CORS for React Native Expo - Allow all origins
app.use("/*", cors({
  origin: "*", // Allow all origins
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: false // Must be false when origin is "*"
}));

// Extract host and port from APP_URL
const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

// Connect to database
await connectDB();

// Initialize superuser for testing and administration
await initializeSuperuser();

// Swagger documentation
app.get("/swagger.json", (c) => c.json(swaggerDoc));
app.use("/docs", swaggerUI({ url: "/swagger.json" }));

// Base route
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: getCacheStats()
  });
});

// Mount routes - API versions
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/user-cards", userCardRoutes);
app.route("/api/collections", userCardRoutes);
app.route("/api/cards", cardRoutes);
app.route("/api/cards/scan", enhancedScanRoutes);
app.route("/api/sets", setRoutes);
app.route("/api/decks", deckRoutes);
app.route("/api/posts", postRoutes);

// Mount test routes (no authentication required)
app.route("/test", testRoutes);

// Mount legacy routes (for backward compatibility and tests)
app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/user-cards", userCardRoutes);
app.route("/collections", userCardRoutes); // Legacy collections route
app.route("/cards", cardRoutes);
app.route("/cards/scan", enhancedScanRoutes);
app.route("/sets", setRoutes);
app.route("/decks", deckRoutes);
app.route("/posts", postRoutes);

// Export the app for production environments
export default app;
