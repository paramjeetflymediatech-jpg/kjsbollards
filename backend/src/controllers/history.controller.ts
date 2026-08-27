import { FastifyReply, FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { AuditEvent } from "../database/index.js";

export class HistoryController {
  static async getHistory(request: FastifyRequest, reply: FastifyReply) {
    const events = await AuditEvent.findAll({ order: [["createdAt", "DESC"]], limit: 100 });
    return reply.code(200).send(
      events.map((r) => ({
        id: r.id,
        title: r.eventType.replaceAll("_", " "),
        detail: JSON.stringify(r.detail),
        timestamp: r.createdAt,
        severity: r.severity
      }))
    );
  }

  static async getAlerts(request: FastifyRequest, reply: FastifyReply) {
    const alerts = await AuditEvent.findAll({
      where: { severity: { [Op.in]: ["warning", "high"] } },
      order: [["createdAt", "DESC"]],
      limit: 100
    });

    return reply.code(200).send(
      alerts.map((r) => ({
        id: r.id,
        title: r.eventType.replaceAll("_", " "),
        detail: JSON.stringify(r.detail),
        timestamp: r.createdAt,
        severity: r.severity
      }))
    );
  }
}
