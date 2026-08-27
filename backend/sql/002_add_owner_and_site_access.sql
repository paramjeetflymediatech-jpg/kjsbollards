-- ==============================================================================
-- Migration 002: Add Site Ownership & Site Access Delegation Tables
-- Database: MySQL 8.0+ / MariaDB 10.5+
-- ==============================================================================

-- 1. Modify `users` table: Expand role ENUM to support 'owner', 'family', 'staff'
ALTER TABLE users 
  MODIFY COLUMN role ENUM('owner', 'admin', 'operator', 'family', 'staff', 'viewer') NOT NULL DEFAULT 'owner';

-- 2. Modify `sites` table: Add `owner_id` foreign key column linking sites to users
ALTER TABLE sites 
  ADD COLUMN owner_id CHAR(36) NULL AFTER id,
  ADD CONSTRAINT fk_sites_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_sites_owner_id ON sites(owner_id);

-- 3. Create `site_access` table: Manage shared access (family/staff/guests) and per-bollard permissions
CREATE TABLE IF NOT EXISTS site_access (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'family', 'staff', 'viewer') NOT NULL DEFAULT 'viewer',
  bollard_ids JSON NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_site_access_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_site_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_site_access_site ON site_access(site_id);
CREATE INDEX idx_site_access_email ON site_access(email);
