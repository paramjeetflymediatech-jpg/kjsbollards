import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const devices = actor.role === "admin"
    ? db.userDevices
    : db.userDevices.filter((d) => d.userId === actor.id);

  return NextResponse.json(devices);
}

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const { deviceId, platform, model, osVersion, appVersion, pushToken } = body;

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  await db.init();

  const existingIdx = db.userDevices.findIndex(
    (d) => d.userId === actor.id && d.deviceId === String(deviceId)
  );

  const deviceRecord = {
    id: existingIdx >= 0 ? db.userDevices[existingIdx].id : `ud-${Date.now()}`,
    userId: actor.id,
    deviceId: String(deviceId),
    platform: platform ? String(platform) : "mobile",
    model: model ? String(model) : "Smartphone",
    osVersion: osVersion ? String(osVersion) : "",
    appVersion: appVersion ? String(appVersion) : "1.0.0",
    pushToken: pushToken !== undefined ? pushToken : (existingIdx >= 0 ? db.userDevices[existingIdx].pushToken : null),
    lastSeen: new Date().toISOString(),
    ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: existingIdx >= 0 ? db.userDevices[existingIdx].createdAt : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.userDevices[existingIdx] = deviceRecord;
  } else {
    db.userDevices.push(deviceRecord);
  }

  await db.save();

  return NextResponse.json({
    success: true,
    device: deviceRecord,
    message: "Device registered for multi-device push notifications",
  });
}
