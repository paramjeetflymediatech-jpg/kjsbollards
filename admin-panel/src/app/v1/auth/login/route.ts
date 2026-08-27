import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { comparePassword, signJwtToken, signRefreshToken } from "@/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, deviceInfo } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await db.init();
    const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());

    if (!user || !(await comparePassword(String(password), user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.enabled) {
      return NextResponse.json({ error: "Account is disabled. Contact system administrator." }, { status: 403 });
    }

    const token = await signJwtToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await signRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Register/update device info if passed
    if (deviceInfo && typeof deviceInfo === "object") {
      const deviceId = deviceInfo.deviceId || `dev-${Date.now()}`;
      const existingDevIdx = db.userDevices.findIndex(
        (d) => d.userId === user.id && d.deviceId === deviceId
      );

      const deviceRecord = {
        id: existingDevIdx >= 0 ? db.userDevices[existingDevIdx].id : `ud-${Date.now()}`,
        userId: user.id,
        deviceId,
        platform: deviceInfo.platform || "mobile",
        model: deviceInfo.model || "Unknown Device",
        osVersion: deviceInfo.osVersion || "",
        appVersion: deviceInfo.appVersion || "1.0.0",
        pushToken: deviceInfo.pushToken || null,
        lastSeen: new Date().toISOString(),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        createdAt: existingDevIdx >= 0 ? db.userDevices[existingDevIdx].createdAt : new Date().toISOString(),
      };

      if (existingDevIdx >= 0) {
        db.userDevices[existingDevIdx] = deviceRecord;
      } else {
        db.userDevices.push(deviceRecord);
      }
      await db.save();
    }

    const userObj = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    };

    return NextResponse.json({
      accessToken: token,
      refreshToken,
      user: userObj,
      actor: userObj,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Authentication error" }, { status: 500 });
  }
}
