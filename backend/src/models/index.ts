import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute
} from "sequelize";
import { sequelize } from "../db.js";

// ================= USER MODEL =================
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare name: string;
  declare passwordHash: string;
  declare role: "admin" | "operator" | "viewer";
  declare enabled: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash"
    },
    role: {
      type: DataTypes.ENUM("admin", "operator", "viewer"),
      allowNull: false,
      defaultValue: "operator"
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "users"
  }
);

// ================= SITE MODEL =================
export class Site extends Model<InferAttributes<Site>, InferCreationAttributes<Site>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare address: string;
  declare enabled: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare bollards?: NonAttribute<Bollard[]>;
}

Site.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "sites"
  }
);

// ================= BOLLARD MODEL =================
export class Bollard extends Model<InferAttributes<Bollard>, InferCreationAttributes<Bollard>> {
  declare id: CreationOptional<string>;
  declare siteId: ForeignKey<string>;
  declare name: string;
  declare deviceCode: string;
  declare commissioned: CreationOptional<boolean>;
  declare enabled: CreationOptional<boolean>;
  declare raiseRelay: CreationOptional<number>;
  declare lowerRelay: CreationOptional<number>;
  declare stopRelay: CreationOptional<number>;
  declare movementSeconds: CreationOptional<number>;
  declare safetyInput: CreationOptional<number | null>;
  declare requireSafetyInput: CreationOptional<boolean>;
  
  // Hardware & Protocol Telemetry Extensions
  declare cycleCount: CreationOptional<number>;
  declare hwVersion: CreationOptional<string | null>;
  declare fwVersion: CreationOptional<string | null>;
  declare netType: CreationOptional<string | null>;
  declare netId: CreationOptional<string | null>;
  declare signalStrength: CreationOptional<number | null>;
  declare lastHeartbeatAt: CreationOptional<Date | null>;
  declare ioInMode: CreationOptional<number[] | null>;
  declare ioOutMode: CreationOptional<number[] | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare site?: NonAttribute<Site>;
}

Bollard.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    siteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "site_id",
      references: {
        model: "sites",
        key: "id"
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    deviceCode: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "device_code"
    },
    commissioned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    raiseRelay: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 1,
      field: "raise_relay"
    },
    lowerRelay: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 2,
      field: "lower_relay"
    },
    stopRelay: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 3,
      field: "stop_relay"
    },
    movementSeconds: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 4.5,
      field: "movement_seconds",
      get() {
        const val = this.getDataValue("movementSeconds");
        return val !== null ? Number(val) : 4.5;
      }
    },
    safetyInput: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      field: "safety_input"
    },
    requireSafetyInput: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "require_safety_input"
    },
    cycleCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "cycle_count"
    },
    hwVersion: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "hw_version"
    },
    fwVersion: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "fw_version"
    },
    netType: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: "net_type"
    },
    netId: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: "net_id"
    },
    signalStrength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "signal_strength"
    },
    lastHeartbeatAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_heartbeat_at"
    },
    ioInMode: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "io_in_mode"
    },
    ioOutMode: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "io_out_mode"
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "bollards"
  }
);

// ================= COMMAND REQUEST MODEL =================
export class CommandRequest extends Model<
  InferAttributes<CommandRequest>,
  InferCreationAttributes<CommandRequest>
> {
  declare id: CreationOptional<string>;
  declare requestId: string;
  declare bollardId: ForeignKey<string>;
  declare userId: ForeignKey<string>;
  declare action: "raise" | "lower" | "stop";
  declare status: "queued" | "movement_started" | "stopping" | "completed" | "failed";
  declare stopDueAt: CreationOptional<Date | null>;
  declare attempts: CreationOptional<number>;
  declare error: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare bollard?: NonAttribute<Bollard>;
  declare user?: NonAttribute<User>;
}

CommandRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requestId: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: "request_id"
    },
    bollardId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "bollard_id",
      references: {
        model: "bollards",
        key: "id"
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id"
      }
    },
    action: {
      type: DataTypes.ENUM("raise", "lower", "stop"),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("queued", "movement_started", "stopping", "completed", "failed"),
      allowNull: false
    },
    stopDueAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "stop_due_at"
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "command_requests"
  }
);

// ================= AUDIT EVENT MODEL =================
export class AuditEvent extends Model<
  InferAttributes<AuditEvent>,
  InferCreationAttributes<AuditEvent>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<string> | null;
  declare bollardId: ForeignKey<string> | null;
  declare eventType: string;
  declare detail: CreationOptional<Record<string, any>>;
  declare severity: CreationOptional<"info" | "warning" | "high">;
  declare remoteIp: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare bollard?: NonAttribute<Bollard>;
}

AuditEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "user_id",
      references: {
        model: "users",
        key: "id"
      }
    },
    bollardId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "bollard_id",
      references: {
        model: "bollards",
        key: "id"
      }
    },
    eventType: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "event_type"
    },
    detail: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    severity: {
      type: DataTypes.ENUM("info", "warning", "high"),
      allowNull: false,
      defaultValue: "info"
    },
    remoteIp: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "remote_ip"
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "audit_events"
  }
);

// ================= ASSOCIATIONS =================
Site.hasMany(Bollard, { foreignKey: "siteId", as: "bollards", onDelete: "CASCADE" });
Bollard.belongsTo(Site, { foreignKey: "siteId", as: "site" });

Bollard.hasMany(CommandRequest, { foreignKey: "bollardId", as: "commandRequests" });
CommandRequest.belongsTo(Bollard, { foreignKey: "bollardId", as: "bollard" });

User.hasMany(CommandRequest, { foreignKey: "userId", as: "commandRequests" });
CommandRequest.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(AuditEvent, { foreignKey: "userId", as: "auditEvents" });
AuditEvent.belongsTo(User, { foreignKey: "userId", as: "user" });

Bollard.hasMany(AuditEvent, { foreignKey: "bollardId", as: "auditEvents" });
AuditEvent.belongsTo(Bollard, { foreignKey: "bollardId", as: "bollard" });
