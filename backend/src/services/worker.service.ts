import { Op, Transaction } from "sequelize";
import { Bollard, CommandRequest } from "../database/index.js";
import { sequelize } from "../database/connection.js";
import { config } from "../config.js";
import { audit } from "./audit.service.js";
import { deviceLogin, pulseRelay } from "../gatelink/index.js";
import { mqttPulseRelay } from "../mqtt/index.js";

let workerBusy = false;
let workerTimer: NodeJS.Timeout | null = null;

export async function stopWorker() {
  if (workerBusy) return;
  workerBusy = true;
  try {
    const dueCount = await CommandRequest.count({
      where: {
        status: "movement_started",
        stopDueAt: { [Op.lte]: new Date() }
      }
    });

    if (dueCount === 0) return;

    const commandToStop = await sequelize.transaction(async (t) => {
      const dueCommand = await CommandRequest.findOne({
        where: {
          status: "movement_started",
          stopDueAt: { [Op.lte]: new Date() }
        },
        include: [{ model: Bollard, as: "bollard", required: true }],
        order: [["stopDueAt", "ASC"]],
        lock: t.LOCK.UPDATE,
        transaction: t
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
    console.error("Automatic stop worker failed:", error);
  } finally {
    workerBusy = false;
  }
}

export function startBackgroundWorker(intervalMs = 500) {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = setInterval(() => void stopWorker(), intervalMs);
  workerTimer.unref();
  return workerTimer;
}

export function stopBackgroundWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}
