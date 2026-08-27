import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "kjs-bollards-ultra-secure-jwt-key-32chars!!";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface ActorPayload {
  id: string;
  email: string;
  role: "admin" | "owner" | "operator" | "family" | "staff" | "viewer";
}

export async function signJwtToken(payload: ActorPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("kjs-bollards")
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyJwtToken(token: string): Promise<ActorPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "kjs-bollards",
    });
    return payload as unknown as ActorPayload;
  } catch (_) {
    return null;
  }
}

export async function getAuthenticatedActor(req: NextRequest): Promise<ActorPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  return verifyJwtToken(token);
}

export function unauthorizedResponse(message = "Unauthorized: Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden: Insufficient privileges") {
  return NextResponse.json({ error: message }, { status: 403 });
}
