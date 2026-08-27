import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { SiteService } from "../services/site.service.js";
import { Actor } from "../types/index.js";

const createSiteSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2).default("Primary Residence / Facility")
});

const grantAccessSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "family", "staff", "viewer"]).default("viewer"),
  bollardIds: z.array(z.string()).optional().default([])
});

export class SiteController {
  static async getSites(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const sites = await SiteService.getSitesForActor(actor);
    return reply.code(200).send(sites);
  }

  static async createSite(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    try {
      const body = createSiteSchema.parse(request.body);
      const site = await SiteService.createSite(actor, { ...body, ip: request.ip });
      return reply.code(201).send(site);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return reply.code(status).send({ error: err.message || "Failed to create site" });
    }
  }

  static async grantAccess(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const { siteId } = request.params as { siteId: string };
    try {
      const body = grantAccessSchema.parse(request.body);
      const access = await SiteService.grantAccess(actor, siteId, { ...body, ip: request.ip });
      return reply.code(201).send(access);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return reply.code(status).send({ error: err.message || "Failed to grant access" });
    }
  }

  static async revokeAccess(request: FastifyRequest, reply: FastifyReply) {
    const actor = (request as any).actor as Actor;
    const { siteId, accessId } = request.params as { siteId: string; accessId: string };
    try {
      const result = await SiteService.revokeAccess(actor, siteId, accessId, request.ip);
      return reply.code(200).send(result);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return reply.code(status).send({ error: err.message || "Failed to revoke access" });
    }
  }
}
