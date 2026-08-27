import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";

export const jwtKey = new TextEncoder().encode(config.JWT_SECRET);

export async function signJwtToken(
  payload: Record<string, any>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("kjs-bollards")
    .setSubject(payload.id || "kjs-user")
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(jwtKey);
}

export async function verifyJwtToken<T = any>(token: string): Promise<T> {
  const verified = await jwtVerify(token, jwtKey, { issuer: "kjs-bollards" });
  return verified.payload as unknown as T;
}
