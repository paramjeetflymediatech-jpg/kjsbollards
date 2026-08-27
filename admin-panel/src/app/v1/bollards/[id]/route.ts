import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;
  await db.init();
  const index = db.bollards.findIndex((b) => b.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Bollard not found" }, { status: 404 });
  }

  const [removed] = db.bollards.splice(index, 1);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "bollard_decommissioned",
    detail: { bollardId: id, serial: removed?.deviceCode, name: removed?.name },
    severity: "warning",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();
  return NextResponse.json({ success: true, message: `Bollard ${removed?.name} decommissioned` });
}
