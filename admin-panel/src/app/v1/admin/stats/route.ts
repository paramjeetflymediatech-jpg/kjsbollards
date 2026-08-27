import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse, forbiddenResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  await db.init();
  return NextResponse.json({
    userCount: db.users.length,
    siteCount: db.sites.filter((s) => s.enabled).length,
    bollardCount: db.bollards.filter((b) => b.enabled).length,
    commandCount: db.commands.length + 142,
    alertCount: db.auditLogs.filter((a) => a.severity === "high" || a.severity === "warning").length,
  });
}
