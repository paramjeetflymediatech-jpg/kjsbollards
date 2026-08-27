import { FastifyRequest } from "fastify";

export type Role = "owner" | "admin" | "operator" | "family" | "staff" | "viewer";

export interface Actor {
  id: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends FastifyRequest {
  actor: Actor;
}
