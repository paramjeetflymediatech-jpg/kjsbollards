import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse, forbiddenResponse } from "@/server/auth";

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  await db.init();
  const body = await req.json().catch(() => ({}));
  const { ids, all } = body;

  let count = 0;
  if (all) {
    count = db.bollards.length;
    db.bollards = [];
  } else if (Array.isArray(ids)) {
    const toDelete = new Set(ids);
    count = toDelete.size;
    db.bollards = db.bollards.filter((b) => !toDelete.has(b.id));
  }

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "admin_bollards_bulk_deleted",
    detail: { deletedCount: count, all: Boolean(all) },
    severity: "warning",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();

  return NextResponse.json({
    success: true,
    count,
    message: `${count} bollard(s) decommissioned`,
  });
}
