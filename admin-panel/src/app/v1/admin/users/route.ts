import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, hashPassword, unauthorizedResponse, forbiddenResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  await db.init();
  const searchParams = req.nextUrl.searchParams;
  const role = searchParams.get("role");
  const search = searchParams.get("search")?.toLowerCase().trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

  let filtered = [...db.users];

  if (role && role !== "all") {
    filtered = filtered.filter((u) => u.role === role);
  }

  if (search) {
    filtered = filtered.filter(
      (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    enabled: u.enabled,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  return NextResponse.json({
    data: paginated,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, role, enabled } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields (name, email, password)" }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await db.init();
    const cleanEmail = String(email).toLowerCase().trim();
    if (db.users.some((u) => u.email === cleanEmail)) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(String(password).trim());
    const newUser = {
      id: `usr-${Date.now()}`,
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash,
      role: role || "operator",
      enabled: enabled ?? true,
      createdAt: new Date().toISOString(),
    };
    db.users.unshift(newUser);

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userId: actor.id,
      eventType: "admin_user_created",
      detail: { targetUserId: newUser.id, email: newUser.email, role: newUser.role },
      severity: "info",
      remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
      createdAt: new Date().toISOString(),
    });

    await db.save();

    return NextResponse.json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      enabled: newUser.enabled,
      createdAt: newUser.createdAt,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}
