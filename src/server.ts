import http from "http";
import app from "./index.js";
import { socketService } from "./shared/services/socket.service";

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

console.log(`🚀 Starting server on http://${host}:${port}`);

(async () => {
  const isBun = typeof Bun !== "undefined";

  if (isBun) {
    Bun.serve({
      port,
      hostname: host,
      idleTimeout: 0,
      fetch: app.fetch.bind(app),
    });
    const wsPort = Number(process.env.WEBSOCKET_PORT) || 8082;
    try {
      socketService.start(wsPort);
    } catch (e) {
      console.warn("Failed to attach WebSocket service to HTTP server", e);
    }
    console.log(`✅ Running with Bun on http://${host}:${port}`);
    console.log(`✅ WebSocket on ws://${host}:${wsPort}`);
  } else {
    // Use Hono's node-server adapter to obtain a Node-compatible request listener
    const { getRequestListener } = await import("@hono/node-server");
    const handler = getRequestListener(app.fetch as any);

    // Create an HTTP server using the adapter handler so Hono sees proper Request objects
    const server = http.createServer(handler as any);

    // Attach WebSocket service to the same HTTP server
    try {
      socketService.attach(server);
    } catch (e) {
      console.warn("Failed to attach WebSocket service to HTTP server", e);
    }

    server.listen(port, () => {
      console.log(`✅ Running with Node on http://${host}:${port}`);
    });
  }

  console.log(`📱 For React Native Expo, use: http://172.20.10.8:${port}`);
})();
