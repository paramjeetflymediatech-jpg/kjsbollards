import { FastifyInstance } from "fastify";
import { HealthController } from "../controllers/health.controller.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", HealthController.check);
}
