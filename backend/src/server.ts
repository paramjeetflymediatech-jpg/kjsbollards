import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { sequelize } from "./database/index.js";
import { initMqttService } from "./mqtt/index.js";
import { registerRoutes } from "./routes/index.js";
import { startBackgroundWorker, stopBackgroundWorker } from "./services/worker.service.js";

// Initialize Fastify Server
export const app = Fastify({
  logger: true,
  trustProxy: config.TRUST_PROXY,
  bodyLimit: 32_768
});

// Security & Rate Limiting Plugins
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

// Register All Application Routes
await registerRoutes(app);

// Database Schema Auto-Sync
try {
  await sequelize.sync({ alter: true });
  app.log.info("Database schema synchronized successfully");
} catch (err: any) {
  app.log.warn(`Sequelize schema sync notice: ${err.message}`);
}

// Start MQTT & Background Movement Timers
initMqttService();
startBackgroundWorker(500);

// Start HTTP Listener
await app.listen({ host: "0.0.0.0", port: config.PORT });
app.log.info(`KJS Bollards Server running on http://0.0.0.0:${config.PORT}`);

// Graceful Shutdown
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, gracefully shutting down...`);
    stopBackgroundWorker();
    await app.close();
    await sequelize.close();
    process.exit(0);
  });
}
