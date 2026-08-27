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
    count = db.auditLogs.length;
    db.auditLogs = [];
  } else if (Array.isArray(ids)) {
    const toDelete = new Set(ids);
    count = toDelete.size;
    db.auditLogs = db.auditLogs.filter((a) => !toDelete.has(a.id));
  }

  await db.save();

  return NextResponse.json({
    success: true,
    count,
    message: `${count} audit event(s) purged`,
  });
}
