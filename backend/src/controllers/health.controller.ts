import { FastifyReply, FastifyRequest } from "fastify";
import { sequelize } from "../database/index.js";
import { config } from "../config.js";

export class HealthController {
  static async check(request: FastifyRequest, reply: FastifyReply) {
    await sequelize.authenticate();
    return { status: "ok", mqtt: config.MQTT_ENABLED };
  }
}
