import { swaggerUI } from "@hono/swagger-ui";
import "dotenv/config";
import { Hono } from "hono";
import { swaggerDoc } from "./config/swagger";
import { connectDB } from "./db/db";
import "./models/user"; // Import User model to ensure it's registered
import authRoutes from "./routes/auth.routes";

// Create Hono app
const app = new Hono();

// Extract host and port from APP_URL
const appUrl = new URL(process.env.APP_URL || "http://localhost:3000");
const port = Number(appUrl.port) || 3000;
const host = appUrl.hostname;

// Connect to database
await connectDB();

// Swagger documentation
app.get("/swagger.json", (c) => c.json(swaggerDoc));
app.use("/docs", swaggerUI({ url: "/swagger.json" }));

// Base route
app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// Mount auth routes
app.route("/auth", authRoutes);

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
