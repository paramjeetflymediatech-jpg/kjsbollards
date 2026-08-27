import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { hashPassword, signJwtToken } from "@/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, siteName } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required registration fields" }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await db.init();
    const cleanEmail = String(email).toLowerCase().trim();
    const existing = db.users.find((u) => u.email === cleanEmail);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(String(password).trim());
    const newUser = {
      id: `usr-${Date.now()}`,
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash,
      role: "owner" as const,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);

    const newSite = {
      id: `site-${Date.now()}`,
      name: siteName ? String(siteName).trim() : "Primary Security Site",
      address: "Primary Residence / Facility",
      ownerId: newUser.id,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    db.sites.push(newSite);
    await db.save();

    const token = await signJwtToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return NextResponse.json({
      accessToken: token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      site: newSite,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
