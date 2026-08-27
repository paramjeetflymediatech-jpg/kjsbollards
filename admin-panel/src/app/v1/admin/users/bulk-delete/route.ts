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
    count = db.users.filter((u) => u.id !== actor.id).length;
    db.users = db.users.filter((u) => u.id === actor.id);
  } else if (Array.isArray(ids)) {
    const toDelete = new Set(ids.filter((id: string) => id !== actor.id));
    count = toDelete.size;
    db.users = db.users.filter((u) => !toDelete.has(u.id));
  }

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "admin_users_bulk_deleted",
    detail: { deletedCount: count, all: Boolean(all) },
    severity: "warning",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    count,
    message: `${count} user(s) successfully deleted`,
  });
}
