import { FastifyInstance } from "fastify";
import { SiteController } from "../controllers/site.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

export async function siteRoutes(app: FastifyInstance) {
  app.get("/v1/sites", { preHandler: authenticate }, SiteController.getSites);
  app.post("/v1/sites", { preHandler: authenticate }, SiteController.createSite);
  app.post("/v1/sites/:siteId/access", { preHandler: authenticate }, SiteController.grantAccess);
  app.delete("/v1/sites/:siteId/access/:accessId", { preHandler: authenticate }, SiteController.revokeAccess);
}
