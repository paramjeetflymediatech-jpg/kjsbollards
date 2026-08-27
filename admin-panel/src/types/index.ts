export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "operator" | "family" | "staff" | "viewer";
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteOwner {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface BollardItem {
  id: string;
  name: string;
  deviceCode: string;
  status: "RAISED" | "LOWERED" | "STOPPED" | "OFFLINE" | "ONLINE";
  enabled: boolean;
  cycleCount?: number;
  openDuration?: number;
  reboundSensitivity?: number;
  siteId?: string;
  site?: { id: string; name: string };
  lastTelemetryAt?: string;
}

export interface SiteItem {
  id: string;
  name: string;
  address?: string;
  ownerId?: string;
  owner?: SiteOwner | null;
  enabled: boolean;
  bollards?: BollardItem[];
  authorizedUsers?: any[];
  createdAt?: string;
}

export interface GateLinkDevice {
  deviceCode: string;
  deviceName: string;
  online: boolean;
  registeredInLocalDb: boolean;
  localName?: string | null;
  status?: string;
  deviceModel?: string;
  signalStrength?: number;
}

export interface MqttTelemetry {
  sn: string;
  online: boolean;
  lastSeen: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  signalStrength?: number;
  inputs?: boolean[];
  outputs?: boolean[];
  cycleCount?: number;
  hwVersion?: string;
  fwVersion?: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  detail: any;
  severity: "info" | "warning" | "high";
  createdAt: string;
  remoteIp?: string;
  user?: { name: string; email: string };
}

export interface StatsOverview {
  userCount: number;
  siteCount: number;
  bollardCount: number;
  commandCount: number;
  alertCount: number;
}
