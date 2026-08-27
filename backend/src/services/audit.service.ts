import { AuditEvent } from "../models/index.js";
import { Actor } from "../types/index.js";

export async function audit(
  actor: Actor | null,
  bollardId: string | null,
  eventType: string,
  detail: Record<string, any>,
  severity: "info" | "warning" | "high" = "info",
  ip?: string
): Promise<void> {
  try {
    await AuditEvent.create({
      userId: actor?.id ?? null,
      bollardId: bollardId ?? null,
      eventType,
      detail,
      severity,
      remoteIp: ip ?? null
    });
  } catch (err) {
    console.error("Failed to persist audit event:", err);
  }
}
