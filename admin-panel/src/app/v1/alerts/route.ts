import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();

  const alerts = db.auditLogs
    .filter((l) => l.severity === "warning" || l.severity === "high")
    .map((log) => ({
      id: log.id,
      title: log.eventType.replace(/_/g, " ").toUpperCase(),
      detail: typeof log.detail === "object" ? JSON.stringify(log.detail) : String(log.detail || "Security alert triggered"),
      timestamp: new Date(log.createdAt).toLocaleTimeString(),
      severity: log.severity,
    }));

  return NextResponse.json(alerts);
}
