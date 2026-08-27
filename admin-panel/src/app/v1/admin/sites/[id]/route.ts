import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;
  await db.init();
  const site = db.sites.find((s) => s.id === id);
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, address, ownerId } = body;

  if (name) site.name = String(name).trim();
  if (address !== undefined) site.address = String(address).trim();
  if (ownerId !== undefined) site.ownerId = ownerId || null;

  return NextResponse.json(site);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;
  await db.init();
  const index = db.sites.findIndex((s) => s.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const [removed] = db.sites.splice(index, 1);
  // Unbind attached bollards
  db.bollards.forEach((b) => {
    if (b.siteId === id) b.siteId = null;
  });

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "site_deleted",
    detail: { siteId: id, name: removed?.name },
    severity: "warning",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, message: `Site ${removed?.name} removed` });
}
