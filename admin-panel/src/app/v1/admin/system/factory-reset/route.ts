import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse, forbiddenResponse } from "@/server/auth";

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  const body = await req.json().catch(() => ({}));
  const { confirmation } = body;

  if (String(confirmation).trim().toUpperCase() !== "PURGE ALL") {
    return NextResponse.json({ error: 'Confirmation phrase "PURGE ALL" required.' }, { status: 400 });
  }

  await db.init();
  db.sites = [];
  db.bollards = [];
  db.commands = [];
  db.auditLogs = [];
  db.users = db.users.filter((u) => u.id === actor.id);

  await db.save();

  return NextResponse.json({
    success: true,
    message: "System database factory reset completed. Operational data purged.",
  });
}
