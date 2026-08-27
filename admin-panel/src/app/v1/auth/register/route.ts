import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { hashPassword, signJwtToken, signRefreshToken } from "@/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, siteName, deviceInfo } = body;

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

    // Register device info if provided
    if (deviceInfo && typeof deviceInfo === "object") {
      const deviceId = deviceInfo.deviceId || `dev-${Date.now()}`;
      db.userDevices.push({
        id: `ud-${Date.now()}`,
        userId: newUser.id,
        deviceId,
        platform: deviceInfo.platform || "mobile",
        model: deviceInfo.model || "Unknown Device",
        osVersion: deviceInfo.osVersion || "",
        appVersion: deviceInfo.appVersion || "1.0.0",
        pushToken: deviceInfo.pushToken || null,
        lastSeen: new Date().toISOString(),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        createdAt: new Date().toISOString(),
      });
    }

    await db.save();

    const token = await signJwtToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    const refreshToken = await signRefreshToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return NextResponse.json({
      accessToken: token,
      refreshToken,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      site: newSite,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
