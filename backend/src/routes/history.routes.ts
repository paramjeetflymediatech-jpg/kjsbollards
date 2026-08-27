import { FastifyInstance } from "fastify";
import { HistoryController } from "../controllers/history.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

export async function historyRoutes(app: FastifyInstance) {
  app.get("/v1/history", { preHandler: authenticate }, HistoryController.getHistory);
  app.get("/v1/alerts", { preHandler: authenticate }, HistoryController.getAlerts);
}
