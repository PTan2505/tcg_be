import { swaggerUI } from "@hono/swagger-ui";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectDB } from "./database/db/db";
import "./database/models/card"; // Import unified Card model
import "./database/models/cardSet"; // Import CardSet model
import "./database/models/cashOut";
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
import aiEnhancedScanRoutes from "./features/cards/aiEnhancedCardScan.routes";
import cardRoutes from "./features/cards/card.routes";
import enhancedScanRoutes from "./features/cards/enhancedCardScan.routes";
import testRoutes from "./features/cards/test.routes";
import cashOutRoutes from "./features/cashOut/cashOut.routes";
import chatbotRoutes from "./features/chatbot/chatbot.routes";
import userCardRoutes from "./features/collections/userCard.routes";
import deckRoutes from "./features/decks/deck.routes";
import marketRoutes from "./features/market/market.routes";
import notificationsRoutes from "./features/notifications/notifications.routes";
import paymentRoutes from "./features/payments/payment.routes";
import postRoutes from "./features/posts/post.routes";
import setRoutes from "./features/sets/set.routes";
import tokenTransactionRoutes from "./features/tokenTransactions/tokenTransaction.routes";
import userRoutes from "./features/users/user.routes";
import { initializeSuperuser } from "./scripts/initSuperuser";
import { swaggerDoc } from "./shared/config/swagger";
import { createAgenda } from "./shared/jobs/agenda.paymentJobs";
import { getCacheStats } from "./shared/middlewares/cache.middleware";
import { errorHandler } from "./shared/middlewares/error.middleware";
import { aiCardMemoryService } from "./shared/services/aiCardMemory.service";
import { cardNumberFuzzySearch } from "./shared/services/cardNumberFuzzySearch.service";

// Create Hono app
const app = new Hono();

// Global error handler
app.use("*", errorHandler);

// Configure CORS for React Native Expo - Allow all origins
app.use(
  "/*",
  cors({
    origin: "*", // Allow all origins
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: false, // Must be false when origin is "*"
  })
);

// Extract host and port from APP_URL
const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

// Connect to the database and start the server
connectDB()
  .then(async () => {
    console.log("✅ Database connected successfully");

    // Optionally preload heavy caches at startup. Disabled by default to reduce
    // startup memory/IO. Set PRELOAD_CACHES=1 to enable (useful for warm servers).
    const shouldPreload =
      process.env.PRELOAD_CACHES === "1" ||
      (process.env.PRELOAD_CACHES || "").toLowerCase() === "true";
    if (shouldPreload) {
      // Initialize AI Memory with card data at startup
      console.log(
        "🚀 Preloading heavy caches (AI memory + card-number cache)..."
      );
      try {
        console.log("🚀 Initializing AI memory with card data...");
        await aiCardMemoryService.initializeAIMemory();
        console.log("✅ AI memory initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize AI memory:", error);
      }

      // Preload card number fuzzy search cache to avoid per-request file reads
      try {
        console.log("🚀 Preloading card number fuzzy search cache...");
        await cardNumberFuzzySearch.initialize();
        console.log("✅ Card number fuzzy search cache preloaded");
      } catch (err) {
        console.warn(
          "⚠️ Failed to preload card number cache (continuing):",
          err
        );
      }
    } else {
      console.log(
        "ℹ️ PRELOAD_CACHES not set — skipping heavy cache preloads. Services will initialize lazily on first use."
      );
    }

    // Initialize superuser
    await initializeSuperuser();

    // Initialize Agenda job scheduler for payment reconciliation (optional)
    try {
      const mongoUri = process.env.MONGODB_URI as string;
      if (mongoUri) {
        await createAgenda(mongoUri);
        console.log("✅ Agenda job scheduler started (payment reconciliation)");
      } else {
        console.warn("⚠️ MONGODB_URI not set - skipping Agenda initialization");
      }
    } catch (e) {
      console.warn("⚠️ Failed to start Agenda jobs", e);
    }

    const port = Number(process.env.PORT) || 3000;
    console.log(`🚀 Server running on port ${port}`);
    console.log(
      `📖 API documentation available at http://localhost:${port}/docs`
    );
    console.log(
      `📊 Cache stats available at http://localhost:${port}/cache-stats`
    );

    return { fetch: app.fetch, port };
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });

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
    cache: getCacheStats(),
  });
});

// Mount routes - API versions
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/user-cards", userCardRoutes);
app.route("/api/collections", userCardRoutes);
app.route("/api/cards", cardRoutes);
app.route("/api/cards/scan", enhancedScanRoutes);
app.route("/api/cards/ai-scan", aiEnhancedScanRoutes);
app.route("/api/sets", setRoutes);
app.route("/api/decks", deckRoutes);
app.route("/api/posts", postRoutes);
app.route("/api/market", marketRoutes);
app.route("/api/notification", notificationsRoutes);
app.route("/api/notifications", notificationsRoutes);
app.route("/api/chatbot", chatbotRoutes);
// WebSocket used for realtime notifications (see src/shared/services/socket.service.ts)

// Chatbot routes
app.route("/chatbot", chatbotRoutes);

// Mount test routes (no authentication required)
app.route("/test", testRoutes);

// Mount legacy routes (for backward compatibility and tests)
app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/user-cards", userCardRoutes);
app.route("/collections", userCardRoutes); // Legacy collections route
app.route("/cards", cardRoutes);
app.route("/cards/scan", enhancedScanRoutes);
app.route("/cards/ai-scan", aiEnhancedScanRoutes);
app.route("/sets", setRoutes);
app.route("/decks", deckRoutes);
app.route("/posts", postRoutes);
app.route("/market", marketRoutes);
app.route("/notifications", notificationsRoutes);
app.route("/orders", paymentRoutes);
app.route("/cashouts", cashOutRoutes);
app.route("/token-transactions", tokenTransactionRoutes);

// Export the app for production environments
export default app;
