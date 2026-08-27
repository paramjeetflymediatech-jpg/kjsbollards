import { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.routes.js";
import { authRoutes } from "./auth.routes.js";
import { siteRoutes } from "./site.routes.js";
import { bollardRoutes } from "./bollard.routes.js";
import { historyRoutes } from "./history.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(siteRoutes);
  await app.register(bollardRoutes);
  await app.register(historyRoutes);
}
