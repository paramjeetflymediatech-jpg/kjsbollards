import { Sequelize, DataTypes, Model, Optional } from "sequelize";
import mysql2 from "mysql2";
import type {
  DBUser,
  DBSite,
  DBBollard,
  DBGateLinkDevice,
  DBMqttTelemetry,
  DBAuditLog,
  DBCommandRequest,
  DBUserDevice,
} from "./db";

const DB_NAME = process.env.DB_NAME || "gatelink_db";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = parseInt(process.env.DB_PORT || "3306", 10);
const DATABASE_URL = process.env.DATABASE_URL;

// Initialize Sequelize
export const sequelize = DATABASE_URL
  ? new Sequelize(DATABASE_URL, {
      dialect: "mysql",
      dialectModule: mysql2,
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: "mysql",
      dialectModule: mysql2,
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

// 1. UserModel
export class UserModel extends Model<DBUser, Optional<DBUser, "updatedAt">> implements DBUser {
  declare id: string;
  declare name: string;
  declare email: string;
  declare passwordHash: string;
  declare role: "admin" | "owner" | "operator" | "family" | "staff" | "viewer";
  declare enabled: boolean;
  declare createdAt: string;
  declare updatedAt?: string;
}

UserModel.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "viewer" },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.STRING(64), allowNull: false },
    updatedAt: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: false,
  }
);

// 2. SiteModel
export class SiteModel extends Model<DBSite, Optional<DBSite, "address" | "ownerId">> implements DBSite {
  declare id: string;
  declare name: string;
  declare address?: string;
  declare ownerId?: string | null;
  declare enabled: boolean;
  declare createdAt: string;
}

SiteModel.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    address: { type: DataTypes.STRING(500), allowNull: true },
    ownerId: { type: DataTypes.STRING(64), allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: DataTypes.STRING(64), allowNull: false },
  },
  {
    sequelize,
    tableName: "sites",
    timestamps: false,
  }
);

// 3. BollardModel
export class BollardModel
  extends Model<
    DBBollard,
    Optional<
      DBBollard,
      | "siteId"
      | "openDuration"
      | "reboundSensitivity"
      | "pulseDuration"
      | "in1Type"
      | "in2Type"
      | "speed"
      | "autoCloseDelay"
    >
  >
  implements DBBollard
{
  declare id: string;
  declare name: string;
  declare deviceCode: string;
  declare status: "RAISED" | "LOWERED" | "STOPPED";
  declare enabled: boolean;
  declare siteId?: string | null;
  declare openDuration?: number;
  declare reboundSensitivity?: number;
  declare cycleCount: number;
  declare pulseDuration?: number;
  declare in1Type?: string;
  declare in2Type?: string;
  declare speed?: number;
  declare autoCloseDelay?: number;
  declare createdAt: string;
}

BollardModel.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    deviceCode: { type: DataTypes.STRING(128), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "RAISED" },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    siteId: { type: DataTypes.STRING(64), allowNull: true },
    openDuration: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 6 },
    reboundSensitivity: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 50 },
    cycleCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    pulseDuration: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 500 },
    in1Type: { type: DataTypes.STRING(64), allowNull: true },
    in2Type: { type: DataTypes.STRING(64), allowNull: true },
    speed: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 80 },
    autoCloseDelay: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    createdAt: { type: DataTypes.STRING(64), allowNull: false },
  },
  {
    sequelize,
    tableName: "bollards",
    timestamps: false,
  }
);

// 4. GateLinkDeviceModel
export class GateLinkDeviceModel extends Model<DBGateLinkDevice> implements DBGateLinkDevice {
  declare deviceCode: string;
  declare deviceName: string;
  declare online: boolean;
}

GateLinkDeviceModel.init(
  {
    deviceCode: { type: DataTypes.STRING(128), primaryKey: true },
    deviceName: { type: DataTypes.STRING(255), allowNull: false },
    online: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    tableName: "gatelink_cloud_devices",
    timestamps: false,
  }
);

// 5. MqttTelemetryModel
export class MqttTelemetryModel extends Model<DBMqttTelemetry> implements DBMqttTelemetry {
  declare sn: string;
  declare online: boolean;
  declare lastSeen: string;
  declare hardwareVersion: string;
  declare softwareVersion: string;
  declare signalStrength: number;
  declare inputs: boolean[];
  declare outputs: boolean[];
  declare cycleCount: number;
}

MqttTelemetryModel.init(
  {
    sn: { type: DataTypes.STRING(128), primaryKey: true },
    online: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastSeen: { type: DataTypes.STRING(64), allowNull: false },
    hardwareVersion: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "1.00" },
    softwareVersion: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "1.00" },
    signalStrength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    inputs: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    outputs: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    cycleCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: "mqtt_telemetry",
    timestamps: false,
  }
);

// 6. AuditLogModel
export class AuditLogModel extends Model<DBAuditLog, Optional<DBAuditLog, "userId" | "remoteIp">> implements DBAuditLog {
  declare id: string;
  declare userId?: string | null;
  declare eventType: string;
  declare detail: any;
  declare severity: "info" | "warning" | "high";
  declare remoteIp?: string;
  declare createdAt: string;
}

AuditLogModel.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    userId: { type: DataTypes.STRING(64), allowNull: true },
    eventType: { type: DataTypes.STRING(128), allowNull: false },
    detail: { type: DataTypes.JSON, allowNull: true },
    severity: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "info" },
    remoteIp: { type: DataTypes.STRING(64), allowNull: true },
    createdAt: { type: DataTypes.STRING(64), allowNull: false },
  },
  {
    sequelize,
    tableName: "audit_logs",
    timestamps: false,
  }
);

// 7. CommandRequestModel
export class CommandRequestModel
  extends Model<DBCommandRequest, Optional<DBCommandRequest, "userId">>
  implements DBCommandRequest
{
  declare id: string;
  declare bollardId: string;
  declare userId?: string | null;
  declare action: "raise" | "lower" | "stop";
  declare status: "pending" | "dispatched" | "completed" | "failed";
  declare createdAt: string;
}

CommandRequestModel.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    bollardId: { type: DataTypes.STRING(64), allowNull: false },
    userId: { type: DataTypes.STRING(64), allowNull: true },
    action: { type: DataTypes.STRING(32), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "pending" },
    createdAt: { type: DataTypes.STRING(64), allowNull: false },
  },
  {
    sequelize,
    tableName: "commands",
    timestamps: false,
  }
);

// 8. UserDeviceModel
export class UserDeviceModel
  extends Model<DBUserDevice, Optional<DBUserDevice, "model" | "osVersion" | "appVersion" | "pushToken" | "ipAddress">>
  implements DBUserDevice
{
  declare id: string;
  declare userId: string;
  declare deviceId: string;
  declare platform: string;
  declare model?: string;
  declare osVersion?: string;
  declare appVersion?: string;
  declare pushToken?: string | null;
  declare lastSeen: string;
  declare ipAddress?: string;
  declare createdAt: string;
}

UserDeviceModel.init(
  {
    id: { type: DataTypes.STRING(64), primaryKey: true },
    userId: { type: DataTypes.STRING(64), allowNull: false },
    deviceId: { type: DataTypes.STRING(128), allowNull: false },
    platform: { type: DataTypes.STRING(64), allowNull: false },
    model: { type: DataTypes.STRING(128), allowNull: true },
    osVersion: { type: DataTypes.STRING(64), allowNull: true },
    appVersion: { type: DataTypes.STRING(64), allowNull: true },
    pushToken: { type: DataTypes.STRING(500), allowNull: true },
    lastSeen: { type: DataTypes.STRING(64), allowNull: false },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    createdAt: { type: DataTypes.STRING(64), allowNull: false },
  },
  {
    sequelize,
    tableName: "user_devices",
    timestamps: false,
  }
);
