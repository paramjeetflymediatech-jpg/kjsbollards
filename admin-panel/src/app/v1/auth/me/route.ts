import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, hashPassword, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const user = db.users.find((u) => u.id === actor.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    enabled: user.enabled,
    createdAt: user.createdAt,
  });
}

export async function PUT(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const user = db.users.find((u) => u.id === actor.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, email, password } = body;

  if (name && String(name).trim()) user.name = String(name).trim();

  if (email && String(email).trim()) {
    const newEmail = String(email).trim().toLowerCase();
    if (newEmail !== user.email) {
      const exists = db.users.find((u) => u.email === newEmail && u.id !== user.id);
      if (exists) {
        return NextResponse.json({ error: "Email already in use by another account" }, { status: 409 });
      }
      user.email = newEmail;
    }
  }

  if (password && String(password).trim().length >= 6) {
    user.passwordHash = await hashPassword(String(password).trim());
  }

  user.updatedAt = new Date().toISOString();

  return NextResponse.json({
    success: true,
    message: "Profile updated successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    },
  });
}
