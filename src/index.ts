import { swaggerUI } from "@hono/swagger-ui";
import "dotenv/config";
import { Hono } from "hono";
import { connectDB } from "./database/db/db";
import "./database/models/deck"; // Import Deck model
import "./database/models/pokemon/pokemonCard"; // Import PokemonCard model
import "./database/models/pokemon/pokemonSet"; // Import PokemonSet model
import "./database/models/user"; // Import User model to ensure it's registered
import "./database/models/userCard"; // Import UserCard model
import "./database/models/yugioh"; // Import YugiohCard and YugiohSet models
import authRoutes from "./features/auth/auth.routes";
import cardRoutes from "./features/cards/card.routes";
import userCardRoutes from "./features/collections/userCard.routes";
import deckRoutes from "./features/decks/deck.routes";
import setRoutes from "./features/sets/set.routes";
import userRoutes from "./features/users/user.routes";
import { initializeSuperuser } from "./scripts/initSuperuser";
import { swaggerDoc } from "./shared/config/swagger";
import { getCacheStats } from "./shared/middlewares/cache.middleware";

// Create Hono app
const app = new Hono();

// Extract host and port from APP_URL
const appUrl = new URL(process.env.APP_URL || "http://localhost:3000");
const port = Number(appUrl.port) || 3000;
const host = appUrl.hostname;

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

// Mount routes
app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/user-cards", userCardRoutes);
app.route("/collections", userCardRoutes); // Alias for collections
app.route("/decks", deckRoutes);
app.route("/cards", cardRoutes);
app.route("/sets", setRoutes);

// Start the server if not in production
if (process.env.NODE_ENV !== "production") {
  console.log(`Server is starting on ${process.env.APP_URL}`);

  Bun.serve({
    port: port,
    hostname: host,
    fetch: app.fetch.bind(app),
  });

  console.log(`🚀 Server is running on http://${host}:${port}`);
}

// Export the app for production environments
export default app;
