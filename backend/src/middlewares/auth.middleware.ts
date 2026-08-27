import { FastifyReply, FastifyRequest } from "fastify";
import { jwtVerify } from "jose";
import { config } from "../config.js";
import { Actor } from "../types/index.js";

export const jwtKey = new TextEncoder().encode(config.JWT_SECRET);

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const value = String(request.headers.authorization ?? "");
  if (!value.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Unauthorized: Missing or invalid token" });
  }

  try {
    const verified = await jwtVerify(value.slice(7), jwtKey, { issuer: "kjs-bollards" });
    (request as any).actor = verified.payload as unknown as Actor;
  } catch {
    return reply.code(401).send({ error: "Unauthorized: Token expired or invalid" });
  }
}

export function requireRoles(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const actor = (request as any).actor as Actor | undefined;
    if (!actor || !allowedRoles.includes(actor.role)) {
      return reply.code(403).send({ error: `Forbidden: Requires one of [${allowedRoles.join(", ")}]` });
    }
  };
}
