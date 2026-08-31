import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_FILE_PATH = path.join(DATA_DIR, "db.json");

// Parse .env.local or .env for database variables
function loadEnv() {
  const envFiles = [path.join(ROOT_DIR, ".env.local"), path.join(ROOT_DIR, ".env")];
  for (const envPath of envFiles) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...vals] = trimmed.split("=");
          const val = vals.join("=").trim().replace(/^['"]|['"]$/g, "");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const email = (process.argv[2] || "superadmin@kjsbollards.co.uk").toLowerCase().trim();
const password = process.argv[3] || "SuperAdmin2026!";
const name = process.argv[4] || "Super Administrator";

async function createSuperAdmin() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let dbData = { users: [], sites: [], bollards: [], gatelinkCloudDevices: [], mqttTelemetry: [], auditLogs: [], commands: [], userDevices: [] };

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
      dbData = { ...dbData, ...JSON.parse(raw) };
    } catch (e) {
      console.warn("Could not read db.json, creating a new structure.");
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existingIndex = dbData.users.findIndex((u) => u.email === email);

  const adminUser = {
    id: existingIndex >= 0 ? dbData.users[existingIndex].id : `usr-admin-${Date.now()}`,
    name,
    email,
    passwordHash,
    role: "admin",
    enabled: true,
    createdAt: existingIndex >= 0 ? dbData.users[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    dbData.users[existingIndex] = adminUser;
    console.log(`\x1b[32m✔ Updated existing user to Super Admin (db.json)\x1b[0m`);
  } else {
    dbData.users.unshift(adminUser);
    console.log(`\x1b[32m✔ Created new Super Admin account (db.json)\x1b[0m`);
  }

  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), "utf-8");

  // Attempt to write directly to MySQL if configured
  const dbHost = process.env.DB_HOST || "127.0.0.1";
  const dbPort = parseInt(process.env.DB_PORT || "3306", 10);
  const dbName = process.env.DB_NAME || "gatelink_db";
  const dbUser = process.env.DB_USER || "root";
  const dbPassword = process.env.DB_PASSWORD || "";

  try {
    const conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });

    const query = `
      INSERT INTO users (id, name, email, passwordHash, role, enabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        passwordHash = VALUES(passwordHash),
        role = VALUES(role),
        enabled = VALUES(enabled),
        updatedAt = VALUES(updatedAt)
    `;

    await conn.execute(query, [
      adminUser.id,
      adminUser.name,
      adminUser.email,
      adminUser.passwordHash,
      adminUser.role,
      adminUser.enabled ? 1 : 0,
      adminUser.createdAt,
      adminUser.updatedAt,
    ]);

    await conn.end();
    console.log(`\x1b[32m✔ Synchronized Super Admin to MySQL table: users\x1b[0m`);
  } catch (sqlErr) {
    console.warn(`[MySQL Info] Could not connect to MySQL (${sqlErr.message}). Saved to db.json fallback.`);
  }

  console.log(`----------------------------------------`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     admin`);
  console.log(`Name:     ${name}`);
  console.log(`----------------------------------------`);
}

createSuperAdmin().catch((err) => {
  console.error("Failed to create super admin:", err);
  process.exit(1);
});
