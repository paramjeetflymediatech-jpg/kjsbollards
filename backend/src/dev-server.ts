import Fastify from "fastify";
import { SignJWT, jwtVerify } from "jose";

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "kjs-super-secure-dev-jwt-secret-key-32bytes!!");

interface DevUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "owner" | "admin" | "operator" | "family" | "staff" | "viewer";
}

// Seeded local database
const users: DevUser[] = [
  {
    id: "usr-1",
    email: "operator@kjsbollards.co.uk",
    password: "KjsSecure2026!",
    name: "Perimeter Security Officer",
    role: "operator",
  },
  {
    id: "usr-2",
    email: "admin@kjsbollards.co.uk",
    password: "KjsSecure2026!",
    name: "Chief Security Officer",
    role: "admin",
  },
];

let sites = [
  {
    id: "site-1",
    name: "KJS Central Headquarters",
    address: "Feltham Gateway, London TW13",
    bollards: [
      {
        id: "b1",
        name: "Main Entry Bollard #1",
        deviceCode: "RC200-A5B1-01",
        status: "RAISED",
        online: true,
        safetyOk: true,
        signalStrength: 62,
        cycleCount: 1420,
        hwVersion: "1.11",
        fwVersion: "1.01",
        netType: "WIFI",
        netId: "KJS-Secure-Net",
        ioIn: [false, true, false],
        ioOut: [false, false, false, false],
        ioInMode: [0, 0, 0, 0],
        ioOutMode: [0, 0, 0, 0],
        lastSeen: "Live"
      },
      {
        id: "b2",
        name: "Heavy Goods Exit #2",
        deviceCode: "RC200-A5B1-02",
        status: "LOWERED",
        online: true,
        safetyOk: true,
        signalStrength: 28,
        cycleCount: 890,
        hwVersion: "1.11",
        fwVersion: "1.01",
        netType: "4G",
        netId: "898608331923D0335414",
        ioIn: [false, false, false],
        ioOut: [false, false, false, false],
        ioInMode: [0, 0, 0, 0],
        ioOutMode: [0, 0, 0, 0],
        lastSeen: "Live"
      },
      {
        id: "b3",
        name: "VIP North Perimeter",
        deviceCode: "RC200-A5B1-03",
        status: "RAISED",
        online: true,
        safetyOk: true,
        signalStrength: 58,
        cycleCount: 310,
        hwVersion: "1.11",
        fwVersion: "1.01",
        netType: "WIFI",
        netId: "KJS-Secure-Net",
        ioIn: [false, false, false],
        ioOut: [false, false, false, false],
        ioInMode: [0, 0, 0, 0],
        ioOutMode: [0, 0, 0, 0],
        lastSeen: "Live"
      },
    ],
  },
  {
    id: "site-2",
    name: "Riverside Commerce Park",
    address: "Thames Logistics Zone, Unit 4B",
    bollards: [
      {
        id: "b4",
        name: "Visitor Gate Access",
        deviceCode: "RC200-C788-01",
        status: "LOWERED",
        online: true,
        safetyOk: true,
        signalStrength: 45,
        cycleCount: 6520,
        hwVersion: "1.11",
        fwVersion: "1.01",
        netType: "WIFI",
        netId: "Logistics-Guest",
        ioIn: [false, false, false],
        ioOut: [false, false, false, false],
        ioInMode: [0, 0, 0, 0],
        ioOutMode: [0, 0, 0, 0],
        lastSeen: "Live"
      },
      {
        id: "b5",
        name: "Emergency Service Barrier",
        deviceCode: "RC200-C788-02",
        status: "OFFLINE",
        online: false,
        safetyOk: false,
        signalStrength: 0,
        cycleCount: 110,
        hwVersion: "1.11",
        fwVersion: "1.01",
        netType: "4G",
        netId: "898608331923D0335414",
        ioIn: [false, false, false],
        ioOut: [false, false, false, false],
        ioInMode: [0, 0, 0, 0],
        ioOutMode: [0, 0, 0, 0],
        lastSeen: "15m ago"
      },
    ],
  },
];

let auditEvents: Array<{ id: string; event_type: string; detail: Record<string, any>; severity: string; created_at: string }> = [
  { id: "e1", event_type: "command_raise", detail: { device: "RC200-A5B1-01", result: "success" }, severity: "info", created_at: new Date().toISOString() },
  { id: "e2", event_type: "safety_loop_active", detail: { loop: 1, state: "vehicle_detected" }, severity: "warning", created_at: new Date().toISOString() },
  { id: "e3", event_type: "gatelink_sync", detail: { latencyMs: 42, endpoint: "boleyun.cn" }, severity: "info", created_at: new Date().toISOString() },
  { id: "e4", event_type: "emergency_stop_triggered", detail: { initiator: "console", relay: 3 }, severity: "high", created_at: new Date().toISOString() },
];

// JWT Authentication Helper
async function authenticate(request: any, reply: any) {
  const auth = String(request.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Unauthorized: Missing Bearer Token" });
  }
  try {
    const verified = await jwtVerify(auth.slice(7), JWT_SECRET, { issuer: "kjs-bollards" });
    request.actor = verified.payload;
  } catch (err) {
    return reply.code(401).send({ error: "Unauthorized: Invalid or Expired Token" });
  }
}

// Routes
app.get("/health", async () => ({ status: "ok", mode: "local-dev-server", timestamp: new Date().toISOString() }));

app.post("/v1/auth/login", async (request, reply) => {
  const { email, password } = (request.body || {}) as any;
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
  if (!user) {
    return reply.code(401).send({ error: "Invalid credentials. Use operator@kjsbollards.co.uk / KjsSecure2026!" });
  }
  const token = await new SignJWT({ id: user.id, email: user.email, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("kjs-bollards")
    .setSubject(user.id)
    .setExpirationTime("2h")
    .sign(JWT_SECRET);

  return {
    accessToken: token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
});

app.post("/v1/auth/register", async (request, reply) => {
  const { name, email, password, siteName } = (request.body || {}) as any;
  if (!email || !password) {
    return reply.code(400).send({ error: "Email and password are required." });
  }
  const newUser = {
    id: "user-" + Date.now(),
    email: String(email).toLowerCase(),
    password: String(password),
    name: name || "Primary Owner",
    role: "owner" as const,
  };
  users.push(newUser);

  const newSite = {
    id: "site-" + Date.now(),
    name: siteName || "Primary Security Site",
    address: "Primary Residence / Facility",
    ownerId: newUser.id,
    bollards: [],
    authorizedUsers: [],
  };
  sites.push(newSite as any);

  const token = await new SignJWT({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("kjs-bollards")
    .setSubject(newUser.id)
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return {
    accessToken: token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    site: { id: newSite.id, name: newSite.name, address: newSite.address },
  };
});

app.get("/v1/sites", { preHandler: authenticate }, async (request: any) => {
  const actor = request.actor;
  return sites
    .filter((s: any) => !s.ownerId || s.ownerId === actor.id || actor.role === "admin" || (s.authorizedUsers || []).some((u: any) => u.email?.toLowerCase() === actor.email?.toLowerCase()))
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      ownerId: s.ownerId,
      bollards: (s.bollards || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        online: b.online,
        safetyOk: b.safetyOk,
        signalStrength: b.signalStrength,
        cycleCount: b.cycleCount,
        lastSeen: b.lastSeen,
        serial: b.deviceCode,
      })),
      authorizedUsers: (s.authorizedUsers || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        addedAt: u.addedAt || new Date().toISOString(),
        bollardIds: u.bollardIds || [],
      })),
    }));
});

app.post("/v1/sites", { preHandler: authenticate }, async (request: any, reply) => {
  const actor = request.actor;
  const { name, address } = (request.body || {}) as any;
  const newSite = {
    id: "site-" + Date.now(),
    name: name || "New Security Site",
    address: address || "Primary Residence / Facility",
    ownerId: actor.id,
    bollards: [],
    authorizedUsers: [],
  };
  sites.push(newSite as any);
  return reply.code(201).send(newSite);
});

app.post("/v1/sites/:siteId/access", { preHandler: authenticate }, async (request: any, reply) => {
  const { siteId } = request.params as { siteId: string };
  const { name, email, role, bollardIds } = (request.body || {}) as any;
  const site: any = sites.find((s) => s.id === siteId);
  if (!site) return reply.code(404).send({ error: "Site not found" });

  const newAccess = {
    id: "acc-" + Date.now(),
    name: name || "Authorized User",
    email: String(email).toLowerCase(),
    role: role || "viewer",
    addedAt: new Date().toISOString(),
    bollardIds: bollardIds || [],
  };
  site.authorizedUsers = site.authorizedUsers || [];
  site.authorizedUsers.push(newAccess);

  return reply.code(201).send(newAccess);
});

app.delete("/v1/sites/:siteId/access/:accessId", { preHandler: authenticate }, async (request: any, reply) => {
  const { siteId, accessId } = request.params as { siteId: string; accessId: string };
  const site: any = sites.find((s) => s.id === siteId);
  if (!site) return reply.code(404).send({ error: "Site not found" });

  site.authorizedUsers = (site.authorizedUsers || []).filter((u: any) => u.id !== accessId);
  return { success: true };
});

// Live Diagnostics
app.get("/v1/bollards/:id/diagnostics", { preHandler: authenticate }, async (request, reply) => {
  const { id } = request.params as { id: string };
  let found: any = null;
  for (const s of sites) {
    const b = s.bollards.find((x) => x.id === id);
    if (b) { found = b; break; }
  }
  if (!found) return reply.code(404).send({ error: "Bollard not found" });

  return {
    source: "dev_mock_mqtt",
    online: found.online,
    inputs: found.ioIn,
    outputs: found.ioOut,
    signalStrength: found.signalStrength,
    cycleCount: found.cycleCount,
    hardwareVersion: found.hwVersion,
    softwareVersion: found.fwVersion,
    netType: found.netType,
    netId: found.netId,
    lastSeen: new Date().toISOString()
  };
});

// Commission New Bollard
app.post("/v1/bollards", { preHandler: authenticate }, async (request, reply) => {
  const body = (request.body || {}) as any;
  const site = sites.find((s) => s.id === body.siteId) || sites[0];
  if (!site) return reply.code(404).send({ error: "Site not found" });
  const newBollard = {
    id: "b-" + Date.now(),
    name: body.name || "New Bollard",
    deviceCode: body.deviceCode || "RC200-NEW-01",
    status: "LOWERED",
    online: true,
    safetyOk: true,
    signalStrength: 60,
    cycleCount: 0,
    hwVersion: "1.11",
    fwVersion: "1.01",
    netType: "WIFI",
    netId: "KJS-Auto-Commission",
    ioIn: [false, false, false],
    ioOut: [false, false, false, false],
    ioInMode: [0, 0, 0, 0],
    ioOutMode: [0, 0, 0, 0],
    lastSeen: "Live"
  };
  site.bollards.push(newBollard);

  auditEvents.unshift({
    id: "e-" + Date.now(),
    event_type: "bollard_commissioned",
    detail: { name: newBollard.name, serial: newBollard.deviceCode },
    severity: "info",
    created_at: new Date().toISOString()
  });

  return reply.code(201).send(newBollard);
});

// Remote Reboot
app.post("/v1/bollards/:id/reboot", { preHandler: authenticate }, async (request, reply) => {
  const { id } = request.params as { id: string };
  auditEvents.unshift({
    id: "e-" + Date.now(),
    event_type: "device_reboot_commanded",
    detail: { bollardId: id },
    severity: "warning",
    created_at: new Date().toISOString()
  });
  return { success: true, message: "Reboot instruction dispatched to controller" };
});

// Terminal IO Configuration
app.post("/v1/bollards/:id/io-config", { preHandler: authenticate }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = (request.body || {}) as any;
  for (const s of sites) {
    const b = s.bollards.find((x) => x.id === id);
    if (b) {
      b.ioInMode = body.in;
      b.ioOutMode = body.out;
      break;
    }
  }
  return { success: true, message: "Terminal NO/NC settings saved" };
});

// Barrier Register Parameter Tuning
app.post("/v1/bollards/:id/barrier-config", { preHandler: authenticate }, async (request, reply) => {
  return { success: true, message: "Barrier speed and sensitivity parameters updated" };
});

app.get("/v1/history", { preHandler: authenticate }, async () => {
  return auditEvents.map((e) => ({
    id: e.id,
    title: e.event_type.replaceAll("_", " ").toUpperCase(),
    detail: JSON.stringify(e.detail),
    timestamp: e.created_at.slice(11, 19),
    severity: e.severity,
  }));
});

app.get("/v1/alerts", { preHandler: authenticate }, async () => {
  return auditEvents
    .filter((e) => e.severity === "warning" || e.severity === "high")
    .map((e) => ({
      id: e.id,
      title: e.event_type.replaceAll("_", " ").toUpperCase(),
      detail: JSON.stringify(e.detail),
      timestamp: e.created_at.slice(11, 19),
      severity: e.severity,
    }));
});

app.post("/v1/bollards/:id/commands", { preHandler: authenticate }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const { action, requestId } = (request.body || {}) as { action: "raise" | "lower" | "stop"; requestId: string };

  let foundBollard: any = null;
  for (const s of sites) {
    const b = s.bollards.find((x) => x.id === id);
    if (b) {
      foundBollard = b;
      break;
    }
  }

  if (!foundBollard) {
    return reply.code(404).send({ error: "Bollard not found" });
  }

  if (action !== "stop" && (!foundBollard.online || !foundBollard.safetyOk)) {
    return reply.code(409).send({ error: "Interlock active: Safety loop not verified or device offline." });
  }

  foundBollard.status = action === "raise" ? "RAISED" : action === "lower" ? "LOWERED" : "STOPPED";
  if (action === "raise" || action === "lower") {
    foundBollard.cycleCount = (foundBollard.cycleCount || 0) + 1;
  }

  auditEvents.unshift({
    id: "e-" + Date.now(),
    event_type: `command_${action}`,
    detail: { bollardId: id, serial: foundBollard.deviceCode, requestId },
    severity: "info",
    created_at: new Date().toISOString(),
  });

  return { id: requestId || "req-" + Date.now(), status: "dispatched" };
});

await app.listen({ port: PORT, host: "0.0.0.0" });
console.log(`\n🚀 KJS Bollards Local Dev Server running at http://localhost:${PORT}\n`);
