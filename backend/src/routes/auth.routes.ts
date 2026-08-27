import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  app.post(
    "/v1/auth/register",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    AuthController.register
  );

  app.post(
    "/v1/auth/login",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    AuthController.login
  );
}
