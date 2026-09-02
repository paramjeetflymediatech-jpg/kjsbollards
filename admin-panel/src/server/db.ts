import fs from "fs";
import path from "path";
import { hashPassword } from "./auth";
import {
  sequelize,
  UserModel,
  SiteModel,
  BollardModel,
  GateLinkDeviceModel,
  MqttTelemetryModel,
  AuditLogModel,
  CommandRequestModel,
  UserDeviceModel,
} from "./sequelize";

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
  raiseRelay?: number;
  lowerRelay?: number;
  stopRelay?: number;
  movementSeconds?: number;
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

export interface DBUserDevice {
  id: string;
  userId: string;
  deviceId: string;
  platform: "ios" | "android" | "web" | string;
  model?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string | null;
  lastSeen: string;
  ipAddress?: string;
  createdAt: string;
}

interface StoredData {
  users: DBUser[];
  sites: DBSite[];
  bollards: DBBollard[];
  gatelinkCloudDevices: DBGateLinkDevice[];
  mqttTelemetry: DBMqttTelemetry[];
  auditLogs: DBAuditLog[];
  commands: DBCommandRequest[];
  userDevices?: DBUserDevice[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE_PATH = path.join(DATA_DIR, "db.json");

class PersistentDatabase {
  users: DBUser[] = [];
  sites: DBSite[] = [];
  bollards: DBBollard[];
  gatelinkCloudDevices: DBGateLinkDevice[] = [];
  mqttTelemetry: DBMqttTelemetry[] = [];
  auditLogs: DBAuditLog[] = [];
  commands: DBCommandRequest[] = [];
  userDevices: DBUserDevice[] = [];
  private initialized = false;
  private isMySqlConnected = false;

  constructor() {
    this.bollards = [];
  }

  async save(): Promise<void> {
    try {
      // 1. Save local backup JSON on disk
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data: StoredData = {
        users: this.users,
        sites: this.sites,
        bollards: this.bollards,
        gatelinkCloudDevices: this.gatelinkCloudDevices,
        mqttTelemetry: this.mqttTelemetry,
        auditLogs: this.auditLogs,
        commands: this.commands,
        userDevices: this.userDevices,
      };
      await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");

      // 2. Persist to MySQL database if connected
      if (this.isMySqlConnected) {
        if (this.users.length > 0) {
          await UserModel.bulkCreate(this.users, {
            updateOnDuplicate: ["name", "email", "passwordHash", "role", "enabled", "updatedAt"],
          }).catch((e) => console.error("[DB-MySQL] User sync error:", e.message));
        }
        if (this.sites.length > 0) {
          await SiteModel.bulkCreate(this.sites, {
            updateOnDuplicate: ["name", "address", "ownerId", "enabled"],
          }).catch((e) => console.error("[DB-MySQL] Site sync error:", e.message));
        }
        if (this.bollards.length > 0) {
          await BollardModel.bulkCreate(this.bollards, {
            updateOnDuplicate: [
              "name",
              "deviceCode",
              "status",
              "enabled",
              "siteId",
              "openDuration",
              "reboundSensitivity",
              "cycleCount",
              "pulseDuration",
              "in1Type",
              "in2Type",
              "speed",
              "autoCloseDelay",
            ],
          }).catch((e) => console.error("[DB-MySQL] Bollard sync error:", e.message));
        }
        if (this.gatelinkCloudDevices.length > 0) {
          await GateLinkDeviceModel.bulkCreate(this.gatelinkCloudDevices, {
            updateOnDuplicate: ["deviceName", "online"],
          }).catch((e) => console.error("[DB-MySQL] GateLink device sync error:", e.message));
        }
        if (this.mqttTelemetry.length > 0) {
          await MqttTelemetryModel.bulkCreate(this.mqttTelemetry, {
            updateOnDuplicate: [
              "online",
              "lastSeen",
              "hardwareVersion",
              "softwareVersion",
              "signalStrength",
              "inputs",
              "outputs",
              "cycleCount",
            ],
          }).catch((e) => console.error("[DB-MySQL] Telemetry sync error:", e.message));
        }
        if (this.auditLogs.length > 0) {
          await AuditLogModel.bulkCreate(this.auditLogs, {
            ignoreDuplicates: true,
          }).catch((e) => console.error("[DB-MySQL] AuditLog sync error:", e.message));
        }
        if (this.commands.length > 0) {
          await CommandRequestModel.bulkCreate(this.commands, {
            updateOnDuplicate: ["bollardId", "userId", "action", "status"],
          }).catch((e) => console.error("[DB-MySQL] Command sync error:", e.message));
        }
        if (this.userDevices.length > 0) {
          await UserDeviceModel.bulkCreate(this.userDevices, {
            updateOnDuplicate: [
              "userId",
              "deviceId",
              "platform",
              "model",
              "osVersion",
              "appVersion",
              "pushToken",
              "lastSeen",
              "ipAddress",
            ],
          }).catch((e) => console.error("[DB-MySQL] UserDevice sync error:", e.message));
        }
      }
    } catch (err) {
      console.error("[DB] Failed to save database:", err);
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    // 1. Try connecting to MySQL via Sequelize
    try {
      await sequelize.authenticate();
      this.isMySqlConnected = true;
      console.log("[DB] MySQL connection established successfully.");

      // Clean up any historical duplicate indexes created by Sequelize alter:true bug
      try {
        const [indexes]: any = await sequelize.query("SHOW INDEX FROM `users`");
        const dupes = [...new Set(indexes.map((i: any) => i.Key_name || i.key_name))].filter((k: any) =>
          typeof k === "string" && /^email_\d+$/.test(k)
        );
        for (const k of dupes) {
          await sequelize.query(`ALTER TABLE \`users\` DROP INDEX \`${k}\``).catch(() => {});
        }
      } catch {}

      // Synchronize MySQL tables safely without alter: true
      await sequelize.sync();

      // Check if MySQL has existing records
      const dbUsersCount = await UserModel.count();
      if (dbUsersCount > 0) {
        const users = await UserModel.findAll();
        const sites = await SiteModel.findAll();
        const bollards = await BollardModel.findAll();
        const devices = await GateLinkDeviceModel.findAll();
        const telemetry = await MqttTelemetryModel.findAll();
        const logs = await AuditLogModel.findAll({ order: [["createdAt", "DESC"]], limit: 100 });
        const commands = await CommandRequestModel.findAll({ limit: 100 });
        const userDevices = await UserDeviceModel.findAll();

        this.users = users.map((u) => u.get({ plain: true }));
        this.sites = sites.map((s) => s.get({ plain: true }));
        this.bollards = bollards.map((b) => b.get({ plain: true }));
        this.gatelinkCloudDevices = devices.map((d) => d.get({ plain: true }));
        this.mqttTelemetry = telemetry.map((t) => t.get({ plain: true }));
        this.auditLogs = logs.map((l) => l.get({ plain: true }));
        this.commands = commands.map((c) => c.get({ plain: true }));
        this.userDevices = userDevices.map((d) => d.get({ plain: true }));

        this.initialized = true;
        return;
      }
    } catch (sqlErr: any) {
      this.isMySqlConnected = false;
      console.warn("[DB] MySQL not available (" + sqlErr.message + "). Falling back to local db.json storage.");
    }

    // 2. Check if local database file exists on disk
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        const raw = await fs.promises.readFile(DB_FILE_PATH, "utf-8");
        const parsed: StoredData = JSON.parse(raw);
        this.users = parsed.users || [];
        this.sites = parsed.sites || [];
        this.bollards = parsed.bollards || [];
        this.gatelinkCloudDevices = parsed.gatelinkCloudDevices || [];
        this.mqttTelemetry = parsed.mqttTelemetry || [];
        this.auditLogs = parsed.auditLogs || [];
        this.commands = parsed.commands || [];
        this.userDevices = parsed.userDevices || [];
        this.initialized = true;

        // If MySQL became available, push existing local data into MySQL
        if (this.isMySqlConnected) {
          await this.save();
        }
        return;
      } catch (err) {
        console.error("[DB] Could not parse existing db.json, creating clean seed:", err);
      }
    }

    // 3. Otherwise, generate initial seed only once
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
        id: "bol-hardware-01",
        name: "GateLink RC200 Hardware Controller",
        deviceCode: "RCBFB58391-386A94B3",
        status: "RAISED",
        enabled: true,
        siteId: mainSite.id,
        cycleCount: 24,
        openDuration: 4.5,
        movementSeconds: 4.5,
        raiseRelay: 1,
        lowerRelay: 2,
        stopRelay: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: "bol-01",
        name: "Main Entrance Bollard #1",
        deviceCode: "RC200-A5B1-01",
        status: "RAISED",
        enabled: true,
        siteId: mainSite.id,
        cycleCount: 1420,
        openDuration: 6,
        movementSeconds: 4.5,
        raiseRelay: 1,
        lowerRelay: 2,
        stopRelay: 3,
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
        movementSeconds: 4.5,
        raiseRelay: 1,
        lowerRelay: 2,
        stopRelay: 3,
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
        movementSeconds: 4.5,
        raiseRelay: 1,
        lowerRelay: 2,
        stopRelay: 3,
        createdAt: new Date().toISOString(),
      },
    ];

    this.gatelinkCloudDevices = [
      {
        deviceCode: "RCBFB58391-386A94B3",
        deviceName: "Mayfair Real Bollard (RCBFB58391-386A94B3)",
        online: true,
      },
      {
        deviceCode: "RC200-A5B1-01",
        deviceName: "Mayfair Gate 1 (RC200)",
        online: true,
      },
      {
        deviceCode: "RC200-A5B1-02",
        deviceName: "Mayfair Gate 2 (RC200)",
        online: true,
      },
      {
        deviceCode: "RC200-B2C3-01",
        deviceName: "Logistics Access Control (RC200)",
        online: true,
      },
    ];

    this.mqttTelemetry = [
      {
        sn: "RC200-A5B1-01",
        online: true,
        lastSeen: new Date().toISOString(),
        hardwareVersion: "1.10",
        softwareVersion: "1.02",
        signalStrength: 78,
        inputs: [true, true, false],
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
    ];

    this.initialized = true;
    await this.save();
  }

  async reset(): Promise<void> {
    this.initialized = false;
    if (this.isMySqlConnected) {
      try {
        await UserModel.destroy({ where: {}, truncate: true });
        await SiteModel.destroy({ where: {}, truncate: true });
        await BollardModel.destroy({ where: {}, truncate: true });
        await GateLinkDeviceModel.destroy({ where: {}, truncate: true });
        await MqttTelemetryModel.destroy({ where: {}, truncate: true });
        await AuditLogModel.destroy({ where: {}, truncate: true });
        await CommandRequestModel.destroy({ where: {}, truncate: true });
        await UserDeviceModel.destroy({ where: {}, truncate: true });
      } catch (err: any) {
        console.error("[DB-MySQL] Reset error:", err.message);
      }
    }
    if (fs.existsSync(DB_FILE_PATH)) {
      try {
        await fs.promises.unlink(DB_FILE_PATH);
      } catch (_) {}
    }
    await this.init();
  }
}

// Global singleton for Next.js hot-reloading
const globalForDb = global as unknown as { dbInstance?: PersistentDatabase };
export const db = globalForDb.dbInstance || new PersistentDatabase();
if (process.env.NODE_ENV !== "production") globalForDb.dbInstance = db;
await db.init();
