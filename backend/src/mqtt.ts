import mqtt, { type MqttClient } from "mqtt";
import { config } from "./config.js";
import { Bollard, AuditEvent } from "./models/index.js";

export type MqttPacket<T = any> = {
  cmd: number;
  sn?: string;
  msgId: string;
  body: T;
};

// In-memory real-time device telemetry cache
export interface DeviceTelemetry {
  sn: string;
  online: boolean;
  lastSeen: Date;
  hardwareVersion?: string;
  softwareVersion?: string;
  firmwareChecksum?: number;
  netType?: string;
  netId?: string;
  signalStrength?: number;
  inputs: boolean[];
  outputs: boolean[];
  cycleCount: number;
  lastEvent?: string;
}

const telemetryCache = new Map<string, DeviceTelemetry>();
const pendingAcks = new Map<string, { resolve: (val: any) => void; timer: NodeJS.Timeout }>();

let client: MqttClient | null = null;

function generateMsgId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getDeviceTelemetry(sn: string): DeviceTelemetry | undefined {
  return telemetryCache.get(sn);
}

export function getAllTelemetry(): DeviceTelemetry[] {
  return Array.from(telemetryCache.values());
}

/**
 * Initialize MQTT Client and subscribe to the device publishing topic /npt/rc200/sersub
 */
export function initMqttService(): MqttClient | null {
  if (!config.MQTT_ENABLED) {
    console.log("[MQTT] MQTT Service disabled via configuration.");
    return null;
  }

  console.log(`[MQTT] Connecting to broker: ${config.MQTT_BROKER_URL}`);
  client = mqtt.connect(config.MQTT_BROKER_URL, {
    clientId: `${config.MQTT_CLIENT_ID}_${Math.random().toString(16).substring(2, 8)}`,
    username: config.MQTT_USERNAME,
    password: config.MQTT_PASSWORD,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000
  });

  client.on("connect", () => {
    console.log("[MQTT] Connected successfully to MQTT broker.");
    // Subscribe to device uplink topic
    client?.subscribe("/npt/rc200/sersub", { qos: 0 }, (err) => {
      if (err) {
        console.error("[MQTT] Subscription error to /npt/rc200/sersub:", err);
      } else {
        console.log("[MQTT] Subscribed to device topic: /npt/rc200/sersub");
      }
    });
  });

  client.on("message", async (_topic, message) => {
    try {
      const payload = JSON.parse(message.toString()) as MqttPacket;
      await handleUplinkMessage(payload);
    } catch (err) {
      console.error("[MQTT] Error processing received MQTT packet:", err);
    }
  });

  client.on("error", (err) => {
    console.error("[MQTT] Client error:", err.message);
  });

  client.on("close", () => {
    console.log("[MQTT] Connection closed.");
  });

  return client;
}

/**
 * Handle Uplink messages from RC200 devices (cmd 1, 2, 8, 10, 11, 18, and ACK replies)
 */
async function handleUplinkMessage(packet: MqttPacket) {
  const { cmd, sn, msgId, body } = packet;

  // Resolve pending command ACK if matched
  if (msgId && pendingAcks.has(msgId)) {
    const pending = pendingAcks.get(msgId)!;
    clearTimeout(pending.timer);
    pending.resolve(body);
    pendingAcks.delete(msgId);
  }

  if (!sn) return;

  let telemetry = telemetryCache.get(sn);
  if (!telemetry) {
    telemetry = {
      sn,
      online: true,
      lastSeen: new Date(),
      inputs: [false, false, false],
      outputs: [false, false, false, false],
      cycleCount: 0
    };
    telemetryCache.set(sn, telemetry);
  }

  telemetry.online = true;
  telemetry.lastSeen = new Date();

  switch (cmd) {
    // 1. Device Startup (RC200 -> Server)
    case 1: {
      telemetry.hardwareVersion = body.hardVer;
      telemetry.softwareVersion = body.softVer;
      telemetry.firmwareChecksum = body.firmwareChk;
      telemetry.netType = body.net;
      telemetry.netId = body.netId;
      console.log(`[MQTT] Device ${sn} Startup: HW=${body.hardVer} SW=${body.softVer} Net=${body.net}`);

      try {
        await Bollard.update(
          {
            hwVersion: body.hardVer,
            fwVersion: body.softVer,
            netType: body.net,
            netId: body.netId,
            lastHeartbeatAt: new Date()
          } as any,
          { where: { deviceCode: sn } }
        );
      } catch {}
      break;
    }

    // 2. IO Input Status & Heartbeat Reporting (RC200 -> Server)
    case 2: {
      // in: [0, 1, 1] (IN1..IN3)
      // out: [0, 1, 0, 0] (R1..R4)
      if (Array.isArray(body.in)) {
        telemetry.inputs = body.in.map((v: number) => v === 1);
      }
      if (Array.isArray(body.out)) {
        telemetry.outputs = body.out.map((v: number) => v === 1);
      }
      if (typeof body.signal === "number") {
        telemetry.signalStrength = body.signal;
      }
      telemetry.lastEvent = body.evt === 1 ? "IO_CHANGE" : "HEARTBEAT";

      // Acknowledge with cmd 3 (Server -> RC200)
      const ackPacket: MqttPacket = {
        cmd: 3,
        msgId,
        body: {
          timeStamp: Math.floor(Date.now() / 1000)
        }
      };
      await publishToDevice(sn, ackPacket);

      // Persist state update to DB if bollard exists
      try {
        await Bollard.update(
          {
            signalStrength: body.signal,
            lastHeartbeatAt: new Date()
          } as any,
          { where: { deviceCode: sn } }
        );
      } catch {}
      break;
    }

    // 8. Serial Data Transparent Transmission (RC200 -> Server)
    case 8: {
      console.log(`[MQTT] Device ${sn} Serial Data (COM${body.com}): ${body.data}`);
      break;
    }

    // 10 & 11. OTA Download Status (RC200 -> Server)
    case 10: {
      console.log(`[MQTT] Device ${sn} OTA Download started for: ${body.name}, result: ${body.result}`);
      break;
    }
    case 11: {
      console.log(`[MQTT] Device ${sn} OTA Download completed for: ${body.name}, result: ${body.result}`);
      break;
    }

    // 18. Door Opening Times Reported (RC200 -> Server)
    case 18: {
      const reportedTimes = Number(body.times || 0);
      let targetTimes = reportedTimes;

      try {
        const bollard = await Bollard.findOne({ where: { deviceCode: sn } });
        if (bollard) {
          const currentDbCount = (bollard as any).cycleCount || 0;
          if (reportedTimes < currentDbCount) {
            // Data lost on device, update device with DB count
            targetTimes = currentDbCount + reportedTimes;
          } else {
            // New cycles recorded on device
            targetTimes = reportedTimes;
          }
          await bollard.update({ cycleCount: targetTimes, lastHeartbeatAt: new Date() } as any);
        }
      } catch {}

      telemetry.cycleCount = targetTimes;

      // Reply with cmd 19
      const replyPacket: MqttPacket = {
        cmd: 19,
        msgId,
        body: {
          result: 0,
          times: targetTimes,
          timeStamp: Math.floor(Date.now() / 1000)
        }
      };
      await publishToDevice(sn, replyPacket);
      break;
    }
  }
}

/**
 * Publish a message to the device subscription topic /npt/rc200/devsub/{sn}
 */
export async function publishToDevice(sn: string, packet: MqttPacket): Promise<void> {
  if (!client || !client.connected) {
    throw new Error("MQTT Client is not connected to broker");
  }
  const topic = `/npt/rc200/devsub/${sn}`;
  const payload = JSON.stringify(packet);
  return new Promise((resolve, reject) => {
    client!.publish(topic, payload, { qos: 0 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Send command with timeout-based ACK waiting
 */
async function sendCommandWithAck<T>(sn: string, cmd: number, body: any, timeoutMs = 5000): Promise<T> {
  const msgId = generateMsgId();
  const packet: MqttPacket = { cmd, msgId, body };

  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      pendingAcks.delete(msgId);
      reject(new Error(`MQTT command (${cmd}) timed out waiting for response from ${sn}`));
    }, timeoutMs);

    pendingAcks.set(msgId, { resolve, timer });

    try {
      await publishToDevice(sn, packet);
    } catch (err) {
      clearTimeout(timer);
      pendingAcks.delete(msgId);
      reject(err);
    }
  });
}

// 3. Relay Output Control (Server -> RC200) [cmd: 4, ACK: cmd 5]
export async function mqttPulseRelay(sn: string, relay: number, act: 0 | 1 = 1, keepMs: number = 1000): Promise<{ result: number }> {
  return sendCommandWithAck<{ result: number }>(sn, 4, { relay, act, keep: keepMs });
}

// 9. Multi-Relay Output Control (Server -> RC200) [cmd: 16, ACK: cmd 17]
export async function mqttMultiRelayControl(
  sn: string,
  act: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2],
  keep: [number, number, number, number]
): Promise<{ result: number; out: number[] }> {
  return sendCommandWithAck<{ result: number; out: number[] }>(sn, 16, { act, keep });
}

// 4. Serial Data Transparent Transmission (Server -> RC200) [cmd: 6, ACK: cmd 7]
export async function mqttSendSerial(sn: string, com = 1, base64Data: string): Promise<{ result: number }> {
  return sendCommandWithAck<{ result: number }>(sn, 6, { com, data: base64Data });
}

// 6. Control Download Files / OTA (Server -> RC200) [cmd: 9, ACK: cmd 10]
export async function mqttTriggerOtaDownload(
  sn: string,
  name: string,
  url: string,
  port = 80,
  size: number,
  chk: number
): Promise<{ name: string; result: number }> {
  return sendCommandWithAck<{ name: string; result: number }>(sn, 9, { name, url, port, size, chk });
}

// 7. Configuration Synchronization (Server -> RC200) [cmd: 12, ACK: cmd 13]
export async function mqttSyncConfig(
  sn: string,
  config: {
    act: 0 | 1;
    hbIntv?: number;
    com1Bd?: number;
    pollIntv?: number;
    pollCmd?: string;
    pollAckStart?: number;
    pollAckLen?: number;
  }
): Promise<any> {
  return sendCommandWithAck<any>(sn, 12, config);
}

// 8. Reset Device (Server -> RC200) [cmd: 14, ACK: cmd 15]
export async function mqttResetDevice(sn: string, delaySeconds = 1): Promise<{ result: number }> {
  return sendCommandWithAck<{ result: number }>(sn, 14, { delay: delaySeconds });
}
