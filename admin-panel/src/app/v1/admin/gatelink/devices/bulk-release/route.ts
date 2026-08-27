import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const { deviceCodes } = body;

  await db.init();
  const codes = new Set(Array.isArray(deviceCodes) ? deviceCodes.map((c: string) => String(c).trim().toUpperCase()) : []);

  const initialCount = db.gatelinkCloudDevices.length;
  db.gatelinkCloudDevices = db.gatelinkCloudDevices.filter((d) => !codes.has(d.deviceCode));
  const releasedCount = initialCount - db.gatelinkCloudDevices.length;

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "gatelink_devices_bulk_released",
    detail: { requestedCodes: Array.from(codes), releasedCount },
    severity: "warning",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();

  return NextResponse.json({
    success: true,
    count: releasedCount,
    message: `${releasedCount} device(s) released from GateLink Cloud`,
  });
}
