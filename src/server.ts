import app from "./index.js";

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
    console.log(`✅ Running with Bun on http://${host}:${port}`);
  } else {
    const { serve } = await import("@hono/node-server");
    serve({ fetch: app.fetch, port, hostname: host });
    console.log(`✅ Running with Node on http://${host}:${port}`);
  }

  console.log(`📱 For React Native Expo, use: http://172.20.10.8:${port}`);
})();
