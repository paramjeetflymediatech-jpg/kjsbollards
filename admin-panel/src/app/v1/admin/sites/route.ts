import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse, forbiddenResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const populated = db.sites.map((s) => {
    const owner = db.users.find((u) => u.id === s.ownerId);
    const bollards = db.bollards.filter((b) => b.siteId === s.id);
    return {
      ...s,
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email, role: owner.role } : null,
      bollards,
      authorizedUsers: [],
    };
  });

  return NextResponse.json(populated);
}

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const { name, address, ownerId } = body;

  if (!name) {
    return NextResponse.json({ error: "Site name is required" }, { status: 400 });
  }

  await db.init();
  const newSite = {
    id: `site-${Date.now()}`,
    name: String(name).trim(),
    address: address ? String(address).trim() : "Location Not Set",
    ownerId: ownerId || actor.id,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  db.sites.push(newSite);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "site_created",
    detail: { siteId: newSite.id, name: newSite.name },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();

  return NextResponse.json(newSite, { status: 201 });
}
