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
  const { name, deviceCode, siteId, openDuration, movementSeconds } = body;

  if (!deviceCode) {
    return NextResponse.json({ error: "Device code (serial) is required" }, { status: 400 });
  }

  await db.init();
  const cleanCode = String(deviceCode).trim().toUpperCase();

  // If already existing, allow re-linking or updating rather than blocking
  const existingIndex = db.bollards.findIndex((b) => b.deviceCode === cleanCode);

  // Find or create target site for this user
  let targetSiteId = siteId;
  if (!targetSiteId || !db.sites.some((s) => s.id === targetSiteId)) {
    let userSite = db.sites.find((s) => s.ownerId === actor.id || !s.ownerId);
    if (!userSite) {
      userSite = {
        id: `site-${Date.now()}`,
        name: "Primary Perimeter Site",
        address: "Primary Security Location",
        ownerId: actor.id,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      db.sites.push(userSite);
    }
    targetSiteId = userSite.id;
  }

  if (existingIndex >= 0) {
    db.bollards[existingIndex].name = name ? String(name).trim() : db.bollards[existingIndex].name;
    db.bollards[existingIndex].siteId = targetSiteId;
    db.bollards[existingIndex].enabled = true;
    await db.save();
    return NextResponse.json(db.bollards[existingIndex], { status: 200 });
  }

  const newBollard = {
    id: `bol-${Date.now()}`,
    name: name ? String(name).trim() : `Bollard ${cleanCode}`,
    deviceCode: cleanCode,
    status: "RAISED" as const,
    enabled: true,
    siteId: targetSiteId,
    cycleCount: 0,
    openDuration: Number(openDuration || movementSeconds) || 2.5,
    createdAt: new Date().toISOString(),
  };

  db.bollards.unshift(newBollard);

  // Automatically sync to GateLink Cloud Devices list
  const existingCloud = db.gatelinkCloudDevices.find((d) => d.deviceCode === cleanCode);
  if (!existingCloud) {
    db.gatelinkCloudDevices.push({
      deviceCode: cleanCode,
      deviceName: newBollard.name,
      online: true,
    });
  } else {
    existingCloud.deviceName = newBollard.name;
    existingCloud.online = true;
  }

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "bollard_commissioned",
    detail: { bollardId: newBollard.id, serial: newBollard.deviceCode, name: newBollard.name },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();
  return NextResponse.json(newBollard, { status: 201 });
}
