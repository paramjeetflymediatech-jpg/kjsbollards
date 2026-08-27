import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, hashPassword, unauthorizedResponse, forbiddenResponse } from "@/server/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  const { id } = await params;
  await db.init();
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, role, enabled, password } = body;

  if (name) user.name = String(name).trim();
  if (role) user.role = role;
  if (enabled !== undefined) user.enabled = Boolean(enabled);
  if (password && String(password).trim().length >= 6) {
    user.passwordHash = await hashPassword(String(password).trim());
  }
  user.updatedAt = new Date().toISOString();

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "admin_user_updated",
    detail: { targetUserId: user.id, email: user.email, role: user.role, enabled: user.enabled },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    enabled: user.enabled,
    updatedAt: user.updatedAt,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  const { id } = await params;
  if (id === actor.id) {
    return NextResponse.json({ error: "Self-deletion of active SuperAdmin account prohibited" }, { status: 400 });
  }

  await db.init();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [removed] = db.users.splice(index, 1);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: "admin_user_deleted",
    detail: { targetUserId: id, email: removed?.email },
    severity: "warning",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, message: `User ${removed?.email} deleted` });
}
