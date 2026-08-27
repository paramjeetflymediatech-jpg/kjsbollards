import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const populated = db.bollards.map((b) => {
    const site = b.siteId ? db.sites.find((s) => s.id === b.siteId) : null;
    return {
      ...b,
      site: site ? { id: site.id, name: site.name } : null,
    };
  });

  return NextResponse.json(populated);
}

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const { name, deviceCode, siteId, openDuration } = body;

  if (!deviceCode) {
    return NextResponse.json({ error: "Device code (serial) is required" }, { status: 400 });
  }

  await db.init();
  const cleanCode = String(deviceCode).trim().toUpperCase();
  if (db.bollards.some((b) => b.deviceCode === cleanCode)) {
    return NextResponse.json({ error: "Device code already commissioned" }, { status: 409 });
  }

  const newBollard = {
    id: `bol-${Date.now()}`,
    name: name ? String(name).trim() : `Bollard ${cleanCode}`,
    deviceCode: cleanCode,
    status: "RAISED" as const,
    enabled: true,
    siteId: siteId || null,
    cycleCount: 0,
    openDuration: Number(openDuration) || 6,
    createdAt: new Date().toISOString(),
  };

  db.bollards.unshift(newBollard);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "bollard_commissioned",
    detail: { bollardId: newBollard.id, serial: newBollard.deviceCode, name: newBollard.name },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json(newBollard, { status: 201 });
}
