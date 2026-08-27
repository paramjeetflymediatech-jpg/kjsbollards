export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "operator" | "family" | "viewer";
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface DeviceMetadata {
  deviceId: string;
  platform: string;
  model?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string | null;
}

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "family" | "staff" | "viewer";
  addedAt: string;
  bollardIds: string[]; // empty means all bollards in site
}

export interface Bollard {
  id: string;
  name: string;
  status: "RAISED" | "LOWERED" | "STOPPED" | "OFFLINE" | string;
  online: boolean;
  safetyOk: boolean;
  signalStrength?: number;
  cycleCount?: number;
  lastSeen?: string;
  serial?: string;
  ownerId?: string;
  ownerEmail?: string;
  isClaimed?: boolean;
  movementSeconds?: number;
  hwVersion?: string;
  fwVersion?: string;
  netType?: string;
  netId?: string;
}

export interface BollardDiagnostics {
  source: string;
  online: boolean;
  inputs: boolean[];
  outputs: boolean[];
  signalStrength: number;
  cycleCount: number;
  hardwareVersion?: string;
  softwareVersion?: string;
  netType?: string;
  netId?: string;
  lastSeen: string;
}

export interface CommissionPayload {
  siteId: string;
  name: string;
  deviceCode: string;
  movementSeconds?: number;
  openDuration?: number;
  raiseRelay?: number;
  lowerRelay?: number;
  stopRelay?: number;
  safetyInput?: number | null;
  requireSafetyInput?: boolean;
}

export interface IoConfigPayload {
  in: [number, number, number, number];
  out: [number, number, number, number];
}

export interface BarrierConfigPayload {
  barrierType: "jws" | "zmt" | "wj" | "zd";
  funCode: string;
  funVal: string | number;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  ownerId?: string;
  bollards: Bollard[];
  authorizedUsers?: AuthorizedUser[];
}

export interface EventItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  severity: "info" | "warning" | "high" | "danger" | string;
}

export type ScreenType =
  | "dashboard"
  | "sites"
  | "control"
  | "events"
  | "history"
  | "alerts"
  | "settings"
  | "access_sharing";

export type Movement = "raise" | "lower" | "stop";
