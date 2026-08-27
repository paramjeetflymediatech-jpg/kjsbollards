import { FastifyInstance } from "fastify";
import { BollardController } from "../controllers/bollard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

export async function bollardRoutes(app: FastifyInstance) {
  app.get("/v1/bollards/:id/diagnostics", { preHandler: authenticate }, BollardController.getDiagnostics);
  app.post("/v1/bollards", { preHandler: authenticate }, BollardController.commission);
  app.put("/v1/bollards/:id", { preHandler: authenticate }, BollardController.update);
  app.post("/v1/bollards/:id/reboot", { preHandler: authenticate }, BollardController.reboot);
  app.post("/v1/bollards/:id/io-config", { preHandler: authenticate }, BollardController.setIoConfig);
  app.post("/v1/bollards/:id/barrier-config", { preHandler: authenticate }, BollardController.setBarrierConfig);
  app.post(
    "/v1/bollards/:id/commands",
    { preHandler: authenticate, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    BollardController.dispatchCommand
  );
}
