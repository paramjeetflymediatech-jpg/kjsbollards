import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;
  await db.init();
  const bollard = db.bollards.find((b) => b.id === id);
  if (!bollard) {
    return NextResponse.json({ error: "Bollard not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, requestId } = body;

  if (action === "raise") {
    bollard.status = "RAISED";
    bollard.cycleCount += 1;
  } else if (action === "lower") {
    bollard.status = "LOWERED";
    bollard.cycleCount += 1;
  } else if (action === "stop") {
    bollard.status = "STOPPED";
  }

  const reqId = requestId || `cmd-${Date.now()}`;
  db.commands.push({
    id: reqId,
    bollardId: bollard.id,
    userId: actor.id,
    action,
    status: "dispatched",
    createdAt: new Date().toISOString(),
  });

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: `command_${action}`,
    detail: { bollardId: bollard.id, serial: bollard.deviceCode, requestId: reqId, status: bollard.status },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id: reqId, status: "dispatched", bollardStatus: bollard.status });
}
