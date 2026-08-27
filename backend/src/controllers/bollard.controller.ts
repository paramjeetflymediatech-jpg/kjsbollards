import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { BollardService } from "../services/bollard.service.js";
import { Actor } from "../types/index.js";

const commissionSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(2),
  deviceCode: z.string().min(5),
  movementSeconds: z.number().min(1).max(60).default(4.5),
  raiseRelay: z.number().int().min(1).max(4).default(1),
  lowerRelay: z.number().int().min(1).max(4).default(2),
  stopRelay: z.number().int().min(1).max(4).default(3),
  safetyInput: z.number().int().min(1).max(4).nullable().default(null),
  requireSafetyInput: z.boolean().default(false)
});

const updateBollardSchema = z.object({
  name: z.string().optional(),
  movementSeconds: z.number().min(1).max(60).optional(),
  requireSafetyInput: z.boolean().optional(),
  safetyInput: z.number().int().min(1).max(4).nullable().optional()
});

const ioConfigSchema = z.object({
  in: z.array(z.number().min(0).max(1)).length(4),
  out: z.array(z.number().min(0).max(1)).length(4)
});

const barrierConfigSchema = z.object({
  barrierType: z.enum(["jws", "zmt", "wj", "zd"]),
  funCode: z.string(),
  funVal: z.union([z.string(), z.number()])
});

const commandSchema = z.object({
  action: z.enum(["raise", "lower", "stop"]),
  requestId: z.string()
});

export class BollardController {
  static async getDiagnostics(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    try {
      const diag = await BollardService.getDiagnostics(id);
      return reply.code(200).send(diag);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.code(status).send({ error: err.message || "Diagnostics fetch failed" });
    }
  }

  static async commission(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    try {
      const body = commissionSchema.parse(request.body);
      const created = await BollardService.commissionBollard(actor, { ...body, ip: request.ip });
      return reply.code(201).send(created);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return reply.code(status).send({ error: err.message || "Commissioning failed" });
    }
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const { id } = request.params as { id: string };
    try {
      const body = updateBollardSchema.parse(request.body);
      const updated = await BollardService.updateBollard(actor, id, body);
      return reply.code(200).send(updated);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return reply.code(status).send({ error: err.message || "Update failed" });
    }
  }

  static async reboot(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const { id } = request.params as { id: string };
    try {
      const result = await BollardService.rebootBollard(actor, id, request.ip);
      return reply.code(200).send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.code(status).send({ error: err.message || "Reboot failed" });
    }
  }

  static async setIoConfig(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const { id } = request.params as { id: string };
    try {
      const body = ioConfigSchema.parse(request.body);
      const result = await BollardService.setIoConfig(actor, id, body.in, body.out, request.ip);
      return reply.code(200).send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.code(status).send({ error: err.message || "IO Config update failed" });
    }
  }

  static async setBarrierConfig(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const { id } = request.params as { id: string };
    try {
      const body = barrierConfigSchema.parse(request.body);
      const result = await BollardService.setBarrierConfig(actor, id, body.barrierType, body.funCode, body.funVal, request.ip);
      return reply.code(200).send(result);
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.code(status).send({ error: err.message || "Barrier parameter write failed" });
    }
  }

  static async dispatchCommand(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const { id } = request.params as { id: string };
    try {
      const body = commandSchema.parse(request.body);
      const result = await BollardService.dispatchCommand(actor, id, body.action, body.requestId, request.ip);
      return reply.code(202).send({ id: result.id, status: result.status });
    } catch (err: any) {
      const status = err.statusCode || 500;
      return reply.code(status).send({ error: err.message || "Command rejected" });
    }
  }
}
