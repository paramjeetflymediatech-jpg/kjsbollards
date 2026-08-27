import { hashPassword } from "./auth";

export interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "owner" | "operator" | "family" | "staff" | "viewer";
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DBSite {
  id: string;
  name: string;
  address?: string;
  ownerId?: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface DBBollard {
  id: string;
  name: string;
  deviceCode: string;
  status: "RAISED" | "LOWERED" | "STOPPED";
  enabled: boolean;
  siteId?: string | null;
  openDuration?: number;
  reboundSensitivity?: number;
  cycleCount: number;
  pulseDuration?: number;
  in1Type?: string;
  in2Type?: string;
  speed?: number;
  autoCloseDelay?: number;
  createdAt: string;
}

export interface DBGateLinkDevice {
  deviceCode: string;
  deviceName: string;
  online: boolean;
}

export interface DBMqttTelemetry {
  sn: string;
  online: boolean;
  lastSeen: string;
  hardwareVersion: string;
  softwareVersion: string;
  signalStrength: number;
  inputs: boolean[];
  outputs: boolean[];
  cycleCount: number;
}

export interface DBAuditLog {
  id: string;
  userId?: string | null;
  eventType: string;
  detail: any;
  severity: "info" | "warning" | "high";
  remoteIp?: string;
  createdAt: string;
}

export interface DBCommandRequest {
  id: string;
  bollardId: string;
  userId?: string | null;
  action: "raise" | "lower" | "stop";
  status: "pending" | "dispatched" | "completed" | "failed";
  createdAt: string;
}

class InMemoryDatabase {
  users: DBUser[] = [];
  sites: DBSite[] = [];
  bollards: DBBollard[] = [];
  gatelinkCloudDevices: DBGateLinkDevice[] = [];
  mqttTelemetry: DBMqttTelemetry[] = [];
  auditLogs: DBAuditLog[] = [];
  commands: DBCommandRequest[] = [];
  private initialized = false;

  async init() {
    if (this.initialized) return;

    const adminHash = await hashPassword("KjsSecure2026!");
    const operatorHash = await hashPassword("KjsSecure2026!");

    const adminUser: DBUser = {
      id: "usr-admin-01",
      name: "Master Administrator",
      email: "admin@kjsbollards.co.uk",
      passwordHash: adminHash,
      role: "admin",
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const operatorUser: DBUser = {
      id: "usr-op-02",
      name: "Site Security Lead",
      email: "operator@kjsbollards.co.uk",
      passwordHash: operatorHash,
      role: "operator",
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    this.users = [adminUser, operatorUser];

    const mainSite: DBSite = {
      id: "site-hq-01",
      name: "Mayfair Corporate Headquarters",
      address: "14 Berkeley Square, Mayfair, London W1J 6BQ",
      ownerId: operatorUser.id,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const logisticsSite: DBSite = {
      id: "site-log-02",
      name: "North Perimeter Logistics Gate",
      address: "Unit 4, Gateway Industrial Estate, Manchester",
      ownerId: operatorUser.id,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    this.sites = [mainSite, logisticsSite];

    this.bollards = [
      {
        id: "bol-01",
        name: "Main Entrance Bollard #1",
        deviceCode: "RC200-A5B1-01",
        status: "RAISED",
        enabled: true,
        siteId: mainSite.id,
        cycleCount: 1420,
        openDuration: 6,
        createdAt: new Date().toISOString(),
      },
      {
        id: "bol-02",
        name: "Main Entrance Bollard #2",
        deviceCode: "RC200-A5B1-02",
        status: "RAISED",
        enabled: true,
        siteId: mainSite.id,
        cycleCount: 1390,
        openDuration: 6,
        createdAt: new Date().toISOString(),
      },
      {
        id: "bol-03",
        name: "Service Delivery Gate",
        deviceCode: "RC200-B2C3-01",
        status: "LOWERED",
        enabled: true,
        siteId: logisticsSite.id,
        cycleCount: 840,
        openDuration: 8,
        createdAt: new Date().toISOString(),
      },
    ];

    if (!this.gatelinkCloudDevices || !Array.isArray(this.gatelinkCloudDevices)) {
      this.gatelinkCloudDevices = [
        {
          deviceCode: "RC200-A5B1-01",
          deviceName: "Main Entrance Controller",
          online: true,
        },
        {
          deviceCode: "RC200-A5B1-02",
          deviceName: "Secondary Gate Controller",
          online: true,
        },
        {
          deviceCode: "RC200-B2C3-01",
          deviceName: "North Perimeter 4G",
          online: true,
        },
        {
          deviceCode: "RC200-NEW-99",
          deviceName: "Warehouse Gate Controller",
          online: false,
        },
      ];
    }

    if (!this.mqttTelemetry || !Array.isArray(this.mqttTelemetry)) {
      this.mqttTelemetry = [
        {
          sn: "RC200-A5B1-01",
          online: true,
          lastSeen: new Date().toISOString(),
          hardwareVersion: "1.11",
          softwareVersion: "1.01",
          signalStrength: 72,
          inputs: [true, false, false],
          outputs: [true, false, false, false],
          cycleCount: 1420,
        },
        {
          sn: "RC200-A5B1-02",
          online: true,
          lastSeen: new Date().toISOString(),
          hardwareVersion: "1.11",
          softwareVersion: "1.01",
          signalStrength: 65,
          inputs: [false, true, false],
          outputs: [false, false, false, false],
          cycleCount: 1390,
        },
        {
          sn: "RC200-B2C3-01",
          online: true,
          lastSeen: new Date().toISOString(),
          hardwareVersion: "1.20",
          softwareVersion: "1.04",
          signalStrength: 84,
          inputs: [true, false, false],
          outputs: [false, false, false, false],
          cycleCount: 840,
        },
      ];
    }

    this.auditLogs = [
      {
        id: `aud-${Date.now()}-1`,
        userId: adminUser.id,
        eventType: "system_startup",
        detail: { mode: "unified_nextjs_enterprise", version: "2.0.0" },
        severity: "info",
        remoteIp: "127.0.0.1",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: `aud-${Date.now()}-2`,
        userId: operatorUser.id,
        eventType: "command_raise",
        detail: { bollard: "RC200-A5B1-01", status: "RAISED" },
        severity: "info",
        remoteIp: "127.0.0.1",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];

    this.initialized = true;
  }
}

// Global persistent singleton in development
const globalForDb = global as unknown as { dbInstance?: InMemoryDatabase };
export const db = globalForDb.dbInstance || new InMemoryDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.dbInstance = db;
await db.init();
