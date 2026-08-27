import { DeviceTelemetry } from "./types.js";

export const telemetryCache = new Map<string, DeviceTelemetry>();
export const pendingAcks = new Map<string, { resolve: (val: any) => void; timer: NodeJS.Timeout }>();

export function generateMsgId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getDeviceTelemetry(sn: string): DeviceTelemetry | undefined {
  return telemetryCache.get(sn);
}

export function getAllTelemetry(): DeviceTelemetry[] {
  return Array.from(telemetryCache.values());
}
