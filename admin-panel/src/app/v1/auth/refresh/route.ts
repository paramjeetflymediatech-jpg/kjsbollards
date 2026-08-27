import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyRefreshToken, signJwtToken, signRefreshToken } from "@/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
    }

    const payload = await verifyRefreshToken(String(refreshToken).trim());
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    await db.init();
    const user = db.users.find((u) => u.id === payload.id && u.enabled);
    if (!user) {
      return NextResponse.json({ error: "User account no longer active" }, { status: 401 });
    }

    const newAccessToken = await signJwtToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = await signRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to refresh token" }, { status: 500 });
  }
}
