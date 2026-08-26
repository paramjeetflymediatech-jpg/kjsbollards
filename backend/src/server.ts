import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { Op, Transaction } from "sequelize";
import { z } from "zod";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { AuditEvent, Bollard, CommandRequest, Site, User } from "./models/index.js";
import {
  deviceLogin,
  getDetails,
  pulseRelay,
  addDevice,
  updateDevice,
  deleteDevice,
  setIoParameters,
  restartDevice,
  getRestartProgress,
  getFirmwareList,
  upgradeFirmware,
  getUpgradeProgress,
  getNetworkStatus,
  getRs485Config,
  setRs485Config,
  getJwsConfig,
  setJwsConfig,
  getZmtConfig,
  setZmtConfig,
  getWjConfig,
  setWjConfig,
  getZdConfig,
  setZdConfig
} from "./gatelink.js";
import {
  initMqttService,
  getDeviceTelemetry,
  mqttPulseRelay,
  mqttResetDevice
} from "./mqtt.js";

const app = Fastify({ logger: true, trustProxy: config.TRUST_PROXY, bodyLimit: 32_768 });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

type Actor = { id: string; email: string; role: "admin" | "operator" | "viewer" };
const jwtKey = new TextEncoder().encode(config.JWT_SECRET);

async function authenticate(request: any, reply: any) {
  const value = String(request.headers.authorization ?? "");
  if (!value.startsWith("Bearer ")) return reply.code(401).send({ error: "Unauthorized" });
  try {
    const verified = await jwtVerify(value.slice(7), jwtKey, { issuer: "kjs-bollards" });
    request.actor = verified.payload as unknown as Actor;
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

async function audit(
  actor: Actor | null,
  bollardId: string | null,
  eventType: string,
  detail: Record<string, any>,
  severity: "info" | "warning" | "high" = "info",
  ip?: string
) {
  await AuditEvent.create({
    userId: actor?.id ?? null,
    bollardId: bollardId ?? null,
    eventType,
    detail,
    severity,
    remoteIp: ip ?? null
  }).catch((err) => app.log.error(err, "Failed to persist audit event"));
}

app.get("/health", async () => {
  await sequelize.authenticate();
  return { status: "ok", mqtt: config.MQTT_ENABLED };
});

// Authentication
app.post("/v1/auth/login", { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } }, async (request, reply) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(8).max(200) }).parse(request.body);
  const user = await User.findOne({
    where: {
      email: body.email.toLowerCase(),
      enabled: true
    }
  });

  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    await audit(null, null, "login_failed", { email: body.email }, "warning", request.ip);
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const accessToken = await new SignJWT({ id: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("kjs-bollards")
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(jwtKey);

  await audit({ id: user.id, email: user.email, role: user.role }, null, "login_success", {}, "info", request.ip);
  return {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  };
});

// Sites & Bollards Query
app.get("/v1/sites", { preHandler: authenticate }, async () => {
  const sites = await Site.findAll({
    where: { enabled: true },
    include: [{ model: Bollard, as: "bollards", where: { enabled: true }, required: false }],
    order: [
      ["name", "ASC"],
      [{ model: Bollard, as: "bollards" }, "name", "ASC"]
    ]
  });

  const response = [];
  for (const site of sites) {
    const bollardsList = [];
    if (site.bollards) {
      for (const b of site.bollards) {
        let online = false;
        let signal = (b as any).signalStrength ?? 0;
        let cycleCount = (b as any).cycleCount ?? 0;

        // Check live MQTT cache first
        const mqttData = getDeviceTelemetry(b.deviceCode);
        if (mqttData) {
          online = mqttData.online;
          if (mqttData.signalStrength !== undefined) signal = mqttData.signalStrength;
          if (mqttData.cycleCount) cycleCount = mqttData.cycleCount;
        } else {
          try {
            const token = await deviceLogin(b.deviceCode);
            const details = await getDetails(token);
            online = details.netWork.online;
            if (details.netWork.signal !== undefined) signal = details.netWork.signal;
          } catch {}
        }

        bollardsList.push({
          id: b.id,
          name: b.name,
          status: online ? "ONLINE" : "OFFLINE",
          online,
          signalStrength: signal,
          cycleCount,
          safetyOk: online && b.commissioned && b.enabled,
          lastSeen: online ? "Live" : (b as any).lastHeartbeatAt ? new Date((b as any).lastHeartbeatAt).toLocaleTimeString() : null,
          serial: b.deviceCode,
          movementSeconds: b.movementSeconds
        });
      }
    }
    response.push({
      id: site.id,
      name: site.name,
      address: site.address,
      bollards: bollardsList
    });
  }
  return response;
});

// Live Hardware Diagnostics
app.get("/v1/bollards/:id/diagnostics", { preHandler: authenticate }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const bollard = await Bollard.findByPk(id);
  if (!bollard) return reply.code(404).send({ error: "Bollard not found" });

  const mqttData = getDeviceTelemetry(bollard.deviceCode);
  if (mqttData) {
    return {
      source: "mqtt",
      online: mqttData.online,
      inputs: mqttData.inputs,
      outputs: mqttData.outputs,
      signalStrength: mqttData.signalStrength ?? 0,
      cycleCount: mqttData.cycleCount ?? 0,
      hardwareVersion: mqttData.hardwareVersion,
      softwareVersion: mqttData.softwareVersion,
      netType: mqttData.netType,
      netId: mqttData.netId,
      lastSeen: mqttData.lastSeen
    };
  }

  try {
    const token = await deviceLogin(bollard.deviceCode);
    const details = await getDetails(token);
    return {
      source: "gatelink_openapi",
      online: details.netWork.online,
      inputs: details.stateVo.in,
      outputs: details.stateVo.out,
      signalStrength: details.netWork.signal ?? 0,
      cycleCount: (bollard as any).cycleCount ?? 0,
      hardwareVersion: details.deviceType?.modelCode,
      softwareVersion: details.version?.firmwareVersion,
      netType: details.netWork.netType,
      netId: details.netWork.wifiName || details.netWork.iccid,
      lastSeen: details.netWork.lastTime || new Date().toISOString()
    };
  } catch (err: any) {
    return reply.code(500).send({ error: `Diagnostics fetch failed: ${err.message}` });
  }
});

// Commission / Add New Bollard
app.post("/v1/bollards", { preHandler: authenticate }, async (request: any, reply) => {
  const actor = request.actor as Actor;
  if (actor.role !== "admin") return reply.code(403).send({ error: "Admin role required to commission bollards" });

  const body = z.object({
    siteId: z.string().uuid(),
    name: z.string().min(2),
    deviceCode: z.string().min(5),
    movementSeconds: z.number().min(1).max(60).default(4.5),
    raiseRelay: z.number().int().min(1).max(4).default(1),
    lowerRelay: z.number().int().min(1).max(4).default(2),
    stopRelay: z.number().int().min(1).max(4).default(3),
    safetyInput: z.number().int().min(1).max(4).nullable().default(null),
    requireSafetyInput: z.boolean().default(false)
  }).parse(request.body);

  // Sync with GateLink Open API
  try {
    await addDevice(body.deviceCode, null, body.name, "Commissioned from KJS Mobile App");
  } catch (err: any) {
    app.log.warn(`GateLink open API addDevice warning: ${err.message}`);
  }

  const created = await Bollard.create({
    siteId: body.siteId,
    name: body.name,
    deviceCode: body.deviceCode,
    commissioned: true,
    enabled: true,
    movementSeconds: body.movementSeconds,
    raiseRelay: body.raiseRelay,
    lowerRelay: body.lowerRelay,
    stopRelay: body.stopRelay,
    safetyInput: body.safetyInput,
    requireSafetyInput: body.requireSafetyInput
  });

  await audit(actor, created.id, "bollard_commissioned", { serial: body.deviceCode, name: body.name }, "info", request.ip);
  return reply.code(201).send(created);
});

// Update Bollard Configuration
app.put("/v1/bollards/:id", { preHandler: authenticate }, async (request: any, reply) => {
  const actor = request.actor as Actor;
  if (actor.role !== "admin") return reply.code(403).send({ error: "Admin role required" });

  const { id } = request.params as { id: string };
  const bollard = await Bollard.findByPk(id);
  if (!bollard) return reply.code(404).send({ error: "Bollard not found" });

  const body = z.object({
    name: z.string().optional(),
    movementSeconds: z.number().min(1).max(60).optional(),
    requireSafetyInput: z.boolean().optional(),
    safetyInput: z.number().int().min(1).max(4).nullable().optional()
  }).parse(request.body);

  if (body.name) bollard.name = body.name;
  if (body.movementSeconds !== undefined) (bollard as any).movementSeconds = body.movementSeconds;
  if (body.requireSafetyInput !== undefined) bollard.requireSafetyInput = body.requireSafetyInput;
  if (body.safetyInput !== undefined) (bollard as any).safetyInput = body.safetyInput;

  await bollard.save();
  try {
    await updateDevice(bollard.deviceCode, null, bollard.name);
  } catch {}

  return bollard;
});

// Remote Reboot Endpoint
app.post("/v1/bollards/:id/reboot", { preHandler: authenticate }, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const bollard = await Bollard.findByPk(id);
  if (!bollard) return reply.code(404).send({ error: "Bollard not found" });

  try {
    if (config.MQTT_ENABLED) {
      await mqttResetDevice(bollard.deviceCode, 1);
    } else {
      const token = await deviceLogin(bollard.deviceCode);
      await restartDevice(token);
    }
    await audit(request.actor, id, "device_reboot_commanded", {}, "warning", request.ip);
    return { success: true, message: "Reboot instruction dispatched successfully" };
  } catch (err: any) {
    return reply.code(500).send({ error: `Reboot failed: ${err.message}` });
  }
});

// Terminal IO NO/NC Configuration
app.post("/v1/bollards/:id/io-config", { preHandler: authenticate }, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const bollard = await Bollard.findByPk(id);
  if (!bollard) return reply.code(404).send({ error: "Bollard not found" });

  const body = z.object({
    in: z.array(z.number().min(0).max(1)).length(4),
    out: z.array(z.number().min(0).max(1)).length(4)
  }).parse(request.body);

  try {
    const token = await deviceLogin(bollard.deviceCode);
    await setIoParameters(token, body.in, body.out);
    (bollard as any).ioInMode = body.in;
    (bollard as any).ioOutMode = body.out;
    await bollard.save();

    await audit(request.actor, id, "io_config_updated", body, "info", request.ip);
    return { success: true, message: "IO Configuration updated successfully" };
  } catch (err: any) {
    return reply.code(500).send({ error: `IO Config update failed: ${err.message}` });
  }
});

// Barrier Register Parameter Tuning (JWS / ZMT / WJ / ZD)
app.post("/v1/bollards/:id/barrier-config", { preHandler: authenticate }, async (request: any, reply) => {
  const { id } = request.params as { id: string };
  const bollard = await Bollard.findByPk(id);
  if (!bollard) return reply.code(404).send({ error: "Bollard not found" });

  const body = z.object({
    barrierType: z.enum(["jws", "zmt", "wj", "zd"]),
    funCode: z.string(),
    funVal: z.union([z.string(), z.number()])
  }).parse(request.body);

  try {
    const token = await deviceLogin(bollard.deviceCode);
    if (body.barrierType === "jws") await setJwsConfig(token, body.funCode, body.funVal);
    else if (body.barrierType === "zmt") await setZmtConfig(token, body.funCode, body.funVal);
    else if (body.barrierType === "wj") await setWjConfig(token, body.funCode, body.funVal);
    else if (body.barrierType === "zd") await setZdConfig(token, body.funCode, body.funVal);

    await audit(request.actor, id, "barrier_parameter_tuned", body, "info", request.ip);
    return { success: true, message: "Barrier parameter updated successfully" };
  } catch (err: any) {
    return reply.code(500).send({ error: `Barrier parameter write failed: ${err.message}` });
  }
});

// Audit Events & Alerts
app.get("/v1/history", { preHandler: authenticate }, async () => {
  const events = await AuditEvent.findAll({ order: [["createdAt", "DESC"]], limit: 100 });
  return events.map((r) => ({
    id: r.id,
    title: r.eventType.replaceAll("_", " "),
    detail: JSON.stringify(r.detail),
    timestamp: r.createdAt,
    severity: r.severity
  }));
});

app.get("/v1/alerts", { preHandler: authenticate }, async () => {
  const alerts = await AuditEvent.findAll({
    where: { severity: { [Op.in]: ["warning", "high"] } },
    order: [["createdAt", "DESC"]],
    limit: 100
  });

  return alerts.map((r) => ({
    id: r.id,
    title: r.eventType.replaceAll("_", " "),
    detail: JSON.stringify(r.detail),
    timestamp: r.createdAt,
    severity: r.severity
  }));
});

// Bollard Movement Commands
app.post(
  "/v1/bollards/:id/commands",
  { preHandler: authenticate, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
  async (request: any, reply) => {
    const actor = request.actor as Actor;
    if (actor.role === "viewer") return reply.code(403).send({ error: "Control permission required" });
    const body = z.object({ action: z.enum(["raise", "lower", "stop"]), requestId: z.string().uuid() }).parse(request.body);

    try {
      const result = await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
        async (t) => {
          const existing = await CommandRequest.findOne({
            where: { requestId: body.requestId },
            transaction: t
          });
          if (existing) {
            return { id: existing.id, status: existing.status };
          }

          const bollard = await Bollard.findByPk(request.params.id, {
            transaction: t,
            lock: t.LOCK.UPDATE
          });

          if (!bollard) throw new Error("Bollard not found");
          if (!bollard.enabled || !bollard.commissioned) throw new Error("Bollard is not commissioned");

          const active = await CommandRequest.findOne({
            where: {
              bollardId: bollard.id,
              status: { [Op.in]: ["queued", "movement_started", "stopping"] }
            },
            transaction: t
          });

          if (body.action !== "stop" && active) {
            throw new Error("Another command is in flight");
          }

          const relay =
            body.action === "raise"
              ? bollard.raiseRelay
              : body.action === "lower"
              ? bollard.lowerRelay
              : bollard.stopRelay;

          // Check if MQTT is active, or use GateLink Open API
          if (config.MQTT_ENABLED) {
            await mqttPulseRelay(bollard.deviceCode, relay, 1, 1000);
          } else {
            const apiToken = await deviceLogin(bollard.deviceCode);
            const details = await getDetails(apiToken);
            if (!details.netWork.online) throw new Error("Device offline");
            if (body.action !== "stop" && details.stateVo.out.some(Boolean)) {
              throw new Error("A relay is already active");
            }
            if (body.action !== "stop" && bollard.requireSafetyInput) {
              const index = Number(bollard.safetyInput) - 1;
              if (index < 0 || details.stateVo.in[index] !== true) {
                throw new Error("Configured safety input is not active");
              }
            }
            await pulseRelay(apiToken, relay);
          }

          const due =
            body.action === "stop"
              ? null
              : new Date(Date.now() + Number(bollard.movementSeconds) * 1000);
          const status = body.action === "stop" ? "completed" : "movement_started";

          const created = await CommandRequest.create(
            {
              requestId: body.requestId,
              bollardId: bollard.id,
              userId: actor.id,
              action: body.action,
              status,
              stopDueAt: due
            },
            { transaction: t }
          );

          return { id: created.id, status: created.status, due };
        }
      );

      await audit(actor, request.params.id, "command_accepted", { action: body.action, requestId: body.requestId, stopDueAt: (result as any).due }, "info", request.ip);
      return reply.code(202).send({ id: result.id, status: result.status });
    } catch (error: any) {
      await audit(actor, request.params.id, "command_rejected", { action: body.action, reason: error.message }, "high", request.ip);
      const isNotFound = error.message === "Bollard not found";
      return reply.code(isNotFound ? 404 : 409).send({ error: error.message });
    }
  }
);

let workerBusy = false;
async function stopWorker() {
  if (workerBusy) return;
  workerBusy = true;
  try {
    const dueCount = await CommandRequest.count({
      where: {
        status: { [Op.in]: ["movement_started", "stopping"] },
        stopDueAt: { [Op.lte]: new Date() }
      }
    });
    if (dueCount === 0) return;

    const commandToStop = await sequelize.transaction(async (t) => {
      const dueCommand = await CommandRequest.findOne({
        where: {
          status: { [Op.in]: ["movement_started", "stopping"] },
          stopDueAt: { [Op.lte]: new Date() }
        },
        include: [{ model: Bollard, as: "bollard", required: true }],
        order: [["stopDueAt", "ASC"]],
        transaction: t,
        lock: t.LOCK.UPDATE,
        skipLocked: true
      });

      if (!dueCommand || !dueCommand.bollard) return null;

      dueCommand.status = "stopping";
      dueCommand.attempts += 1;
      await dueCommand.save({ transaction: t });

      return {
        id: dueCommand.id,
        bollardId: dueCommand.bollardId,
        deviceCode: dueCommand.bollard.deviceCode,
        stopRelay: dueCommand.bollard.stopRelay
      };
    });

    if (!commandToStop) return;

    if (config.MQTT_ENABLED) {
      await mqttPulseRelay(commandToStop.deviceCode, commandToStop.stopRelay, 1, 1000);
    } else {
      const token = await deviceLogin(commandToStop.deviceCode);
      await pulseRelay(token, commandToStop.stopRelay);
    }

    await CommandRequest.update(
      { status: "completed" },
      { where: { id: commandToStop.id } }
    );
    await audit(null, commandToStop.bollardId, "automatic_stop_completed", { commandId: commandToStop.id });
  } catch (error: any) {
    app.log.error(error, "automatic stop worker failed");
  } finally {
    workerBusy = false;
  }
}

// Start MQTT & Background timers
initMqttService();
const timer = setInterval(() => void stopWorker(), 500);
timer.unref();
await app.listen({ host: "0.0.0.0", port: config.PORT });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    clearInterval(timer);
    await app.close();
    await sequelize.close();
    process.exit(0);
  });
}
