import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthService } from "../services/auth.service.js";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  siteName: z.string().min(2).max(100).optional().default("Primary Security Site")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export class AuthController {
  static async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = registerSchema.parse(request.body);
      const result = await AuthService.registerOwner({
        ...body,
        ip: request.ip
      });
      return reply.code(200).send(result);
    } catch (err: any) {
      const status = err.statusCode || 400;
      return reply.code(status).send({ error: err.message || "Registration failed" });
    }
  }

  static async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = loginSchema.parse(request.body);
      const result = await AuthService.login({
        ...body,
        ip: request.ip
      });
      return reply.code(200).send(result);
    } catch (err: any) {
      const status = err.statusCode || 401;
      return reply.code(status).send({ error: err.message || "Authentication failed" });
    }
  }
}
