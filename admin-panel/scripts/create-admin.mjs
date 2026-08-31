import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE_PATH = path.join(DATA_DIR, "db.json");

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
    console.log(`\x1b[32m✔ Updated existing user to Super Admin:\x1b[0m`);
  } else {
    dbData.users.unshift(adminUser);
    console.log(`\x1b[32m✔ Created new Super Admin account:\x1b[0m`);
  }

  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), "utf-8");

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
