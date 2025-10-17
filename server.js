// Server startup file - matches your other PC setup
import app from "./src/index.ts";

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

console.log(`🚀 Starting server on http://${host}:${port}`);

Bun.serve({
  port: port,
  hostname: host,
  // Disable the default 10s idle timeout so long-lived connections
  // (for example Server-Sent Events streaming) are not cut off.
  // Set to 0 to disable the idle timeout entirely, or set a value in
  // milliseconds to limit the maximum idle time.
  idleTimeout: 0,
  fetch: app.fetch.bind(app),
});

console.log(`✅ Server is running on http://localhost:${port}`);
console.log(`📱 For React Native Expo, use: http://172.20.10.8:${port}`);
