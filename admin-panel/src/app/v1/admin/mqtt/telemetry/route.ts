import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const telemetry = db.mqttTelemetry || [];
  return NextResponse.json(telemetry);
}

export async function DELETE(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const searchParams = req.nextUrl.searchParams;
  const sn = searchParams.get("sn");
  const all = searchParams.get("all") === "true";

  let removedCount = 0;
  const initial = (db.mqttTelemetry || []).length;

  if (all) {
    removedCount = initial;
    db.mqttTelemetry = [];
  } else if (sn) {
    const cleanSn = String(sn).trim().toUpperCase();
    db.mqttTelemetry = (db.mqttTelemetry || []).filter((t) => t.sn.toUpperCase() !== cleanSn);
    removedCount = initial - db.mqttTelemetry.length;
  }

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "mqtt_telemetry_cleared",
    detail: { targetSn: sn || "all", removedCount },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();

  return NextResponse.json({
    success: true,
    removedCount,
    message: all
      ? "All MQTT telemetry streams cleared"
      : `Telemetry stream for ${sn} removed`,
  });
}
