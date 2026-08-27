import { Op, Transaction } from "sequelize";
import { Bollard, CommandRequest } from "../database/index.js";
import { sequelize } from "../database/connection.js";
import { config } from "../config.js";
import { Actor } from "../types/index.js";
import { audit } from "./audit.service.js";
import {
  deviceLogin,
  getDetails,
  pulseRelay,
  addDevice,
  updateDevice,
  restartDevice,
  setIoParameters,
  setJwsConfig,
  setZmtConfig,
  setWjConfig,
  setZdConfig
} from "../gatelink/index.js";
import {
  getDeviceTelemetry,
  mqttPulseRelay,
  mqttResetDevice
} from "../mqtt/index.js";

export class BollardService {
  static async getDiagnostics(id: string) {
    const bollard = await Bollard.findByPk(id);
    if (!bollard) {
      const err: any = new Error("Bollard not found");
      err.statusCode = 404;
      throw err;
    }

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
  }

  static async commissionBollard(
    actor: Actor,
    data: {
      siteId: string;
      name: string;
      deviceCode: string;
      movementSeconds?: number;
      raiseRelay?: number;
      lowerRelay?: number;
      stopRelay?: number;
      safetyInput?: number | null;
      requireSafetyInput?: boolean;
      ip?: string;
    }
  ) {
    if (actor.role !== "admin" && actor.role !== "owner") {
      const err: any = new Error("Admin or Owner role required to commission bollards");
      err.statusCode = 403;
      throw err;
    }

    try {
      await addDevice(data.deviceCode, null, data.name, "Commissioned from KJS Mobile App");
    } catch (err: any) {
      console.warn(`GateLink open API addDevice warning: ${err.message}`);
    }

    const created = await Bollard.create({
      siteId: data.siteId,
      name: data.name,
      deviceCode: data.deviceCode,
      commissioned: true,
      enabled: true,
      movementSeconds: data.movementSeconds ?? 4.5,
      raiseRelay: data.raiseRelay ?? 1,
      lowerRelay: data.lowerRelay ?? 2,
      stopRelay: data.stopRelay ?? 3,
      safetyInput: data.safetyInput ?? null,
      requireSafetyInput: data.requireSafetyInput ?? false
    });

    await audit(actor, created.id, "bollard_commissioned", { serial: data.deviceCode, name: data.name }, "info", data.ip);
    return created;
  }

  static async updateBollard(
    actor: Actor,
    id: string,
    data: {
      name?: string;
      movementSeconds?: number;
      requireSafetyInput?: boolean;
      safetyInput?: number | null;
    }
  ) {
    if (actor.role !== "admin") {
      const err: any = new Error("Admin role required");
      err.statusCode = 403;
      throw err;
    }

    const bollard = await Bollard.findByPk(id);
    if (!bollard) {
      const err: any = new Error("Bollard not found");
      err.statusCode = 404;
      throw err;
    }

    if (data.name) bollard.name = data.name;
    if (data.movementSeconds !== undefined) (bollard as any).movementSeconds = data.movementSeconds;
    if (data.requireSafetyInput !== undefined) bollard.requireSafetyInput = data.requireSafetyInput;
    if (data.safetyInput !== undefined) (bollard as any).safetyInput = data.safetyInput;

    await bollard.save();
    try {
      await updateDevice(bollard.deviceCode, null, bollard.name);
    } catch {}

    return bollard;
  }

  static async rebootBollard(actor: Actor, id: string, ip?: string) {
    const bollard = await Bollard.findByPk(id);
    if (!bollard) {
      const err: any = new Error("Bollard not found");
      err.statusCode = 404;
      throw err;
    }

    if (config.MQTT_ENABLED) {
      await mqttResetDevice(bollard.deviceCode, 1);
    } else {
      const token = await deviceLogin(bollard.deviceCode);
      await restartDevice(token);
    }

    await audit(actor, id, "device_reboot_commanded", {}, "warning", ip);
    return { success: true, message: "Reboot instruction dispatched successfully" };
  }

  static async setIoConfig(actor: Actor, id: string, inConfig: number[], outConfig: number[], ip?: string) {
    const bollard = await Bollard.findByPk(id);
    if (!bollard) {
      const err: any = new Error("Bollard not found");
      err.statusCode = 404;
      throw err;
    }

    const token = await deviceLogin(bollard.deviceCode);
    await setIoParameters(token, inConfig, outConfig);
    (bollard as any).ioInMode = inConfig;
    (bollard as any).ioOutMode = outConfig;
    await bollard.save();

    await audit(actor, id, "io_config_updated", { in: inConfig, out: outConfig }, "info", ip);
    return { success: true, message: "IO Configuration updated successfully" };
  }

  static async setBarrierConfig(
    actor: Actor,
    id: string,
    barrierType: "jws" | "zmt" | "wj" | "zd",
    funCode: string,
    funVal: string | number,
    ip?: string
  ) {
    const bollard = await Bollard.findByPk(id);
    if (!bollard) {
      const err: any = new Error("Bollard not found");
      err.statusCode = 404;
      throw err;
    }

    const token = await deviceLogin(bollard.deviceCode);
    if (barrierType === "jws") await setJwsConfig(token, funCode, funVal);
    else if (barrierType === "zmt") await setZmtConfig(token, funCode, funVal);
    else if (barrierType === "wj") await setWjConfig(token, funCode, funVal);
    else if (barrierType === "zd") await setZdConfig(token, funCode, funVal);

    await audit(actor, id, "barrier_parameter_tuned", { barrierType, funCode, funVal }, "info", ip);
    return { success: true, message: "Barrier parameter updated successfully" };
  }

  static async dispatchCommand(
    actor: Actor,
    bollardId: string,
    action: "raise" | "lower" | "stop",
    requestId: string,
    ip?: string
  ) {
    if (actor.role === "viewer") {
      const err: any = new Error("Control permission required");
      err.statusCode = 403;
      throw err;
    }

    try {
      const result = await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
        async (t) => {
          const existing = await CommandRequest.findOne({
            where: { requestId },
            transaction: t
          });
          if (existing) {
            return { id: existing.id, status: existing.status };
          }

          const bollard = await Bollard.findByPk(bollardId, {
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

          if (action !== "stop" && active) {
            throw new Error("Another command is in flight");
          }

          const relay =
            action === "raise"
              ? bollard.raiseRelay
              : action === "lower"
              ? bollard.lowerRelay
              : bollard.stopRelay;

          if (config.MQTT_ENABLED) {
            await mqttPulseRelay(bollard.deviceCode, relay, 1, 1000);
          } else {
            const apiToken = await deviceLogin(bollard.deviceCode);
            const details = await getDetails(apiToken);
            if (!details.netWork.online) throw new Error("Device offline");
            if (action !== "stop" && details.stateVo.out.some(Boolean)) {
              throw new Error("A relay is already active");
            }
            if (action !== "stop" && bollard.requireSafetyInput) {
              const index = Number(bollard.safetyInput) - 1;
              if (index < 0 || details.stateVo.in[index] !== true) {
                throw new Error("Configured safety input is not active");
              }
            }
            await pulseRelay(apiToken, relay);
          }

          const due =
            action === "stop"
              ? null
              : new Date(Date.now() + Number(bollard.movementSeconds) * 1000);
          const status = action === "stop" ? "completed" : "movement_started";

          const created = await CommandRequest.create(
            {
              requestId,
              bollardId: bollard.id,
              userId: actor.id,
              action,
              status,
              stopDueAt: due
            },
            { transaction: t }
          );

          return { id: created.id, status: created.status, due };
        }
      );

      await audit(
        actor,
        bollardId,
        "command_accepted",
        { action, requestId, stopDueAt: (result as any).due },
        "info",
        ip
      );
      return result;
    } catch (error: any) {
      await audit(actor, bollardId, "command_rejected", { action, reason: error.message }, "high", ip);
      const isNotFound = error.message === "Bollard not found";
      error.statusCode = isNotFound ? 404 : 409;
      throw error;
    }
  }
}
