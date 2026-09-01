import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();

  const cloudList = db.gatelinkCloudDevices || [];
  const devices = cloudList.map((d) => {
    const local = db.bollards.find((b) => b.deviceCode === d.deviceCode);
    return {
      deviceCode: d.deviceCode,
      deviceName: d.deviceName,
      online: d.online,
      registeredInLocalDb: Boolean(local),
    };
  });

  return NextResponse.json({
    totalOnCloud: devices.length,
    devices,
  });
}

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const { deviceCode, deviceName, autoCreateLocalBollard, siteId } = body;

  if (!deviceCode) {
    return NextResponse.json({ error: "Device code / serial is required" }, { status: 400 });
  }

  await db.init();
  const cleanCode = String(deviceCode).trim().toUpperCase();
  const name = deviceName ? String(deviceName).trim() : `GateLink Controller ${cleanCode}`;

  const existingIndex = db.gatelinkCloudDevices.findIndex((d) => d.deviceCode === cleanCode);
  if (existingIndex >= 0) {
    db.gatelinkCloudDevices[existingIndex].deviceName = name;
    db.gatelinkCloudDevices[existingIndex].online = true;
  } else {
    db.gatelinkCloudDevices.unshift({
      deviceCode: cleanCode,
      deviceName: name,
      online: true,
    });
  }

  // Also auto-create or link to local bollard if requested or not present
  if (autoCreateLocalBollard !== false) {
    const existingLocal = db.bollards.find((b) => b.deviceCode === cleanCode);
    if (!existingLocal) {
      const targetSiteId = siteId || db.sites[0]?.id || "site-hq-01";
      db.bollards.unshift({
        id: `bol-${Date.now()}`,
        name: name,
        deviceCode: cleanCode,
        status: "RAISED",
        enabled: true,
        siteId: targetSiteId,
        cycleCount: 0,
        openDuration: 6,
        createdAt: new Date().toISOString(),
      });
    }
  }

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "gatelink_device_manually_added",
    detail: { deviceCode: cleanCode, deviceName: name },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();

  return NextResponse.json(
    {
      success: true,
      message: `Device ${cleanCode} added to GateLink Cloud registry`,
      device: { deviceCode: cleanCode, deviceName: name, online: true },
    },
    { status: 201 }
  );
}
