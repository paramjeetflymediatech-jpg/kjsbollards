import { createHash } from "node:crypto";
import { config } from "../config.js";

/**
 * GateLink Open API Signature Generator
 * Spec: SHA1("uri=" + uri + "&accessKeySecret=" + accessKeySecret + "&expires=" + expires)
 */
export function generateSignature(uri: string, expires: number): string {
  const payload = `uri=${uri}&accessKeySecret=${config.GATELINK_ACCESS_KEY_SECRET}&expires=${expires}`;
  return createHash("sha1").update(payload, "utf8").digest("hex");
}
