import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const { code } = await params;
  await db.init();

  const cleanCode = String(code).trim().toUpperCase();
  const initialCount = db.gatelinkCloudDevices.length;
  db.gatelinkCloudDevices = db.gatelinkCloudDevices.filter((d) => d.deviceCode !== cleanCode);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "gatelink_device_released",
    detail: { deviceCode: cleanCode, removed: db.gatelinkCloudDevices.length < initialCount },
    severity: "warning",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: `Device ${cleanCode} released from GateLink Cloud account`,
  });
}
