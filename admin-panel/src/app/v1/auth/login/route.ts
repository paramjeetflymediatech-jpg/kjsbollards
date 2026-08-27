import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { comparePassword, signJwtToken } from "@/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

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

    const userObj = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    };

    return NextResponse.json({
      accessToken: token,
      user: userObj,
      actor: userObj,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Authentication error" }, { status: 500 });
  }
}
