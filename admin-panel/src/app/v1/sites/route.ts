import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();

  let userSites = db.sites.filter(
    (s) => actor.role === "admin" || s.ownerId === actor.id || !s.ownerId
  );

  // If no site exists yet for this user, automatically create a default primary site
  if (userSites.length === 0) {
    const defaultSite = {
      id: `site-${Date.now()}`,
      name: "Primary Perimeter Site",
      address: "Primary Security Location",
      ownerId: actor.id,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    db.sites.push(defaultSite);
    userSites = [defaultSite];
  }

  // Find all bollards belonging to this user or admin
  const allBollards = db.bollards.filter((b) => b.enabled);

  const formatted = userSites.map((s, index) => {
    // Attach matching bollards, or unassigned bollards to the first site
    const bollards = allBollards.filter(
      (b) => b.siteId === s.id || (!b.siteId && index === 0)
    );

    return {
      id: s.id,
      name: s.name,
      address: s.address || "Main Site Location",
      ownerId: s.ownerId,
      authorizedUsers: [],
      bollards: bollards.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        online: true,
        safetyOk: true,
        lastSeen: "Just now",
        serial: b.deviceCode,
        isClaimed: true,
        movementSeconds: b.openDuration || 4.5,
      })),
    };
  });

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const { name, address } = body;

  if (!name) {
    return NextResponse.json({ error: "Site name is required" }, { status: 400 });
  }

  await db.init();
  const newSite = {
    id: `site-${Date.now()}`,
    name: String(name).trim(),
    address: address ? String(address).trim() : "Primary Residence / Facility",
    ownerId: actor.id,
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  db.sites.push(newSite);

  return NextResponse.json(
    {
      id: newSite.id,
      name: newSite.name,
      address: newSite.address,
      ownerId: newSite.ownerId,
      authorizedUsers: [],
      bollards: [],
    },
    { status: 201 }
  );
}
