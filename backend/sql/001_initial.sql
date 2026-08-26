CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operator', 'viewer') NOT NULL DEFAULT 'operator',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sites (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bollards (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  device_code VARCHAR(255) NOT NULL UNIQUE,
  commissioned BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  raise_relay SMALLINT NOT NULL DEFAULT 1,
  lower_relay SMALLINT NOT NULL DEFAULT 2,
  stop_relay SMALLINT NOT NULL DEFAULT 3,
  movement_seconds DECIMAL(4,1) NOT NULL DEFAULT 4.5,
  safety_input SMALLINT NULL,
  require_safety_input BOOLEAN NOT NULL DEFAULT false,
  cycle_count INT NOT NULL DEFAULT 0,
  hw_version VARCHAR(64) NULL,
  fw_version VARCHAR(64) NULL,
  net_type VARCHAR(32) NULL,
  net_id VARCHAR(128) NULL,
  signal_strength INT NULL,
  last_heartbeat_at DATETIME(3) NULL,
  io_in_mode JSON NULL,
  io_out_mode JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_bollards_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS command_requests (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  request_id VARCHAR(64) NOT NULL UNIQUE,
  bollard_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  action ENUM('raise', 'lower', 'stop') NOT NULL,
  status ENUM('queued', 'movement_started', 'stopping', 'completed', 'failed') NOT NULL,
  stop_due_at DATETIME(3) NULL,
  attempts INT NOT NULL DEFAULT 0,
  error TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_command_bollard FOREIGN KEY (bollard_id) REFERENCES bollards(id),
  CONSTRAINT fk_command_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_command_due ON command_requests(status, stop_due_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NULL,
  bollard_id CHAR(36) NULL,
  event_type VARCHAR(128) NOT NULL,
  detail JSON NOT NULL,
  severity ENUM('info', 'warning', 'high') NOT NULL DEFAULT 'info',
  remote_ip VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_bollard FOREIGN KEY (bollard_id) REFERENCES bollards(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_created ON audit_events(created_at DESC);
