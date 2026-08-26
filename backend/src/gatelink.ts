import { createHash } from "node:crypto";
import { config } from "./config.js";

export type GateLinkEnvelope<T> = {
  code: number;
  success: boolean;
  message?: string;
  data: T;
  time?: string;
  timeMillis?: number;
  apiVersion?: string;
};

export type DeviceDetails = {
  deviceType?: {
    modelCode?: string;
    netType?: string;
    funModule?: number[];
    deviceTypeId?: number;
    heartbeat?: number;
    customFeature?: number;
  };
  netWork: {
    online: boolean;
    netType?: string;
    wifiName?: string;
    iccid?: string;
    signal?: number;
    simExpire?: string | null;
    lastTime?: string;
  };
  stateVo: {
    in: boolean[];
    out: boolean[];
  };
  version?: {
    firmwareVersion?: string;
    hardwareVersion?: string;
  };
};

export type DeviceRecord = {
  deviceCode: string;
  deviceGroupName?: string;
  deviceGroupId?: number;
  addTime?: number;
  online: boolean;
  modelName?: string;
};

export type DeviceListResponse = {
  total: number;
  current: number;
  size: number;
  pages: number;
  records: DeviceRecord[];
};

export type DeviceGroup = {
  deviceGroupId: number;
  deviceGroupName: string;
};

export type FirmwareItem = {
  id?: number;
  fileName: string;
  standard: boolean;
  version: string;
  code: string;
  size: string;
  releaseTime: string;
  deviceTypeId: number;
};

const baseUrl = () => config.GATELINK_BASE_URL.replace(/\/$/, "");

/**
 * GateLink Open API Signature Generator
 * Spec: SHA1("uri=" + uri + "&accessKeySecret=" + accessKeySecret + "&expires=" + expires)
 */
export function generateSignature(uri: string, expires: number): string {
  const payload = `uri=${uri}&accessKeySecret=${config.GATELINK_ACCESS_KEY_SECRET}&expires=${expires}`;
  return createHash("sha1").update(payload, "utf8").digest("hex");
}

/**
 * Common JSON requester with GateLink error code handling
 */
async function gatelinkRequest<T>(uri: string, init: RequestInit): Promise<T> {
  const url = `${baseUrl()}${uri}`;
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(`GateLink HTTP communication error: status ${response.status}`);
  }

  const result = (await response.json()) as GateLinkEnvelope<T>;

  if (result.code !== 200 || !result.success) {
    const errorMap: Record<number, string> = {
      5000: "GateLink Server Internal Error",
      5002: "GateLink Parameter Error",
      5003: "GateLink Insufficient Permissions",
      5112: "GateLink Authentication / Token Expired",
      5313: "GateLink Signature Verification Failed"
    };
    const errorDesc = errorMap[result.code] ?? `GateLink Error (${result.code})`;
    throw new Error(`${errorDesc}: ${result.message ?? "Request failed"}`);
  }

  return result.data;
}

/**
 * 3.1 Device List
 * POST /wireless/openapi/device/list
 */
export async function getDeviceList(
  pageNum = 1,
  pageSize = 50,
  deviceGroupId?: number,
  deviceCode?: string
): Promise<DeviceListResponse> {
  const uri = "/wireless/openapi/device/list";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  return gatelinkRequest<DeviceListResponse>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      pageNum,
      pageSize,
      deviceGroupId: deviceGroupId ?? null,
      deviceCode: deviceCode ?? ""
    })
  });
}

/**
 * 3.2 Add Device
 * POST /wireless/openapi/device/add
 */
export async function addDevice(
  deviceCode: string,
  deviceGroupId?: number | null,
  deviceName?: string,
  remark?: string
): Promise<void> {
  const uri = "/wireless/openapi/device/add";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  await gatelinkRequest<unknown>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      deviceCode,
      deviceGroupId: deviceGroupId ?? null,
      deviceName: deviceName ?? "",
      remark: remark ?? ""
    })
  });
}

/**
 * 3.3 Update Device
 * POST /wireless/openapi/device/update
 */
export async function updateDevice(
  deviceCode: string,
  deviceGroupId?: number | null,
  deviceName?: string,
  remark?: string
): Promise<void> {
  const uri = "/wireless/openapi/device/update";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  await gatelinkRequest<unknown>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      deviceCode,
      deviceGroupId: deviceGroupId ?? null,
      deviceName: deviceName ?? "",
      remark: remark ?? ""
    })
  });
}

/**
 * 3.4 Delete Device
 * POST /wireless/openapi/device/delete
 */
export async function deleteDevice(deviceCode: string): Promise<void> {
  const uri = "/wireless/openapi/device/delete";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  await gatelinkRequest<unknown>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      deviceCode
    })
  });
}

/**
 * 3.5 View Device Info
 * POST /wireless/openapi/device/info
 */
export async function getDeviceInfo(deviceCode: string): Promise<DeviceRecord> {
  const uri = "/wireless/openapi/device/info";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  return gatelinkRequest<DeviceRecord>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      deviceCode
    })
  });
}

/**
 * 3.5 (Group) Device Group List
 * POST /wireless/openapi/device/group/list
 */
export async function getDeviceGroupList(): Promise<DeviceGroup[]> {
  const uri = "/wireless/openapi/device/group/list";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  return gatelinkRequest<DeviceGroup[]>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires
    })
  });
}

/**
 * 3.6 Add Device Group
 * POST /wireless/openapi/device/group/add
 */
export async function addDeviceGroup(deviceGroupName: string): Promise<void> {
  const uri = "/wireless/openapi/device/group/add";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  await gatelinkRequest<unknown>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      deviceGroupName
    })
  });
}

/**
 * 3.8 Delete Device Group
 * POST /wireless/openapi/device/group/delete
 */
export async function deleteDeviceGroup(deviceGroupId: number): Promise<void> {
  const uri = "/wireless/openapi/device/group/delete";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  await gatelinkRequest<unknown>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      deviceGroupId
    })
  });
}

/**
 * 3.9 Device Login
 * POST /wireless/openapi/device/login
 */
export async function deviceLogin(deviceCode: string): Promise<string> {
  const uri = "/wireless/openapi/device/login";
  const expires = Math.floor(Date.now() / 1000) + 600;
  const signature = generateSignature(uri, expires);

  const data = await gatelinkRequest<{ token: string; expireTime?: number }>(uri, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accessKeyId: config.GATELINK_ACCESS_KEY_ID,
      signature,
      expires,
      deviceCode
    })
  });

  if (!data || !data.token) {
    throw new Error("GateLink device login succeeded but no session token was returned");
  }

  return data.token;
}

/**
 * 3.10 Device Details (IO status, Network, etc.)
 * GET /wireless/openapi/manage/device/details
 */
export async function getDetails(token: string): Promise<DeviceDetails> {
  return gatelinkRequest<DeviceDetails>("/wireless/openapi/manage/device/details", {
    method: "GET",
    headers: { token, apiToken: token }
  });
}

/**
 * 3.11 Set IO Parameters (0-NO, 1-NC)
 * POST /wireless/openapi/manage/device/io_set
 */
export async function setIoParameters(token: string, inConfig: number[], outConfig: number[]): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/io_set", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ in: inConfig, out: outConfig })
  });
}

/**
 * 3.12 Device Restart
 * GET /wireless/openapi/manage/device/restart
 */
export async function restartDevice(token: string): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/restart", {
    method: "GET",
    headers: { token, apiToken: token }
  });
}

/**
 * 3.13 View Restart Progress
 * GET /wireless/openapi/manage/device/restart_progress
 * status: 0-Command sending, 1-Restarting, 2-Restart complete
 */
export async function getRestartProgress(token: string): Promise<{ deviceCode: string; status: number }> {
  return gatelinkRequest<{ deviceCode: string; status: number }>("/wireless/openapi/manage/device/restart_progress", {
    method: "GET",
    headers: { token, apiToken: token }
  });
}

/**
 * 3.14 View Firmware List
 * GET /wireless/openapi/manage/device/firmware/list
 */
export async function getFirmwareList(token: string): Promise<FirmwareItem[]> {
  return gatelinkRequest<FirmwareItem[]>("/wireless/openapi/manage/device/firmware/list", {
    method: "GET",
    headers: { token, apiToken: token }
  });
}

/**
 * 3.15 Device Firmware Upgrade
 * POST /wireless/openapi/manage/device/upgrade
 */
export async function upgradeFirmware(token: string, code: string): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/upgrade", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ code })
  });
}

/**
 * 3.16 Device Firmware Upgrade Progress
 * GET /wireless/openapi/manage/device/upgrade_progress
 * status: 0-Sent, 1-Downloading, 2-Downloaded, 3-Success, 4-Failed
 */
export async function getUpgradeProgress(token: string): Promise<{ deviceCode: string; status: number; oldVersion?: string; newVersion?: string }> {
  return gatelinkRequest<any>("/wireless/openapi/manage/device/upgrade_progress", {
    method: "GET",
    headers: { token, apiToken: token }
  });
}

/**
 * 3.17 Relay Control
 * POST /wireless/openapi/manage/device/control/relay
 * act: 0 - Open, 1 - Brief Close (Pulse), 2 - Long Close
 */
export async function pulseRelay(token: string, relay: number, act = 1): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/control/relay", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ relay, act })
  });
}

/**
 * 3.18 Network Status
 * POST /wireless/openapi/manage/device/net_status
 */
export async function getNetworkStatus(token: string, days = 1, showType: 0 | 1 = 0): Promise<unknown> {
  return gatelinkRequest<unknown>("/wireless/openapi/manage/device/net_status", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ days, showType })
  });
}

/**
 * 3.19 & 3.20 View & Set RS485 Configuration
 */
export async function getRs485Config(token: string): Promise<{ rs485Scene: number; baud: number; rs485Device: number }> {
  return gatelinkRequest<any>("/wireless/openapi/manage/device/rs485/query", {
    method: "GET",
    headers: { token, apiToken: token }
  });
}

export async function setRs485Config(token: string, rs485Scene: number, baud: number, rs485Device: number): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/rs485/setup", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ rs485Scene, baud, rs485Device })
  });
}

/**
 * 3.21 & 3.22 JWS Barrier Configuration
 */
export async function getJwsConfig(token: string, funCode: string): Promise<{ funCode: string; funVal: number }> {
  return gatelinkRequest<any>("/wireless/openapi/manage/device/barrier/jws_config", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode })
  });
}

export async function setJwsConfig(token: string, funCode: string, funVal: number | string): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/barrier/jws_set", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode, funVal })
  });
}

/**
 * 3.23 & 3.24 ZMT Barrier Configuration
 */
export async function getZmtConfig(token: string, funCode: string): Promise<{ funCode: string; funVal: number }> {
  return gatelinkRequest<any>("/wireless/openapi/manage/device/barrier/zmt_config", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode })
  });
}

export async function setZmtConfig(token: string, funCode: string, funVal: number | string): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/barrier/zmt_set", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode, funVal })
  });
}

/**
 * 3.25 & 3.26 WJ Barrier Configuration
 */
export async function getWjConfig(token: string, funCode: string): Promise<{ funCode: string; funVal: number }> {
  return gatelinkRequest<any>("/wireless/openapi/manage/device/barrier/wj_config", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode })
  });
}

export async function setWjConfig(token: string, funCode: string, funVal: number | string): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/barrier/wj_set", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode, funVal })
  });
}

/**
 * 3.27 & 3.28 ZD Barrier Configuration
 */
export async function getZdConfig(token: string, funCode: string): Promise<{ funCode: string; funVal: number }> {
  return gatelinkRequest<any>("/wireless/openapi/manage/device/barrier/zd_config", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode })
  });
}

export async function setZdConfig(token: string, funCode: string, funVal: number | string): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/barrier/zd_set", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ funCode, funVal })
  });
}

/**
 * 3.29 Parking Barrier Control
 * POST /wireless/openapi/manage/device/barrier/control
 * controlType: 1 - Open, 2 - Close, 3 - Always Open, 4 - Pause
 */
export async function barrierControl(token: string, controlType: 1 | 2 | 3 | 4): Promise<void> {
  await gatelinkRequest<unknown>("/wireless/openapi/manage/device/barrier/control", {
    method: "POST",
    headers: { token, apiToken: token, "content-type": "application/json" },
    body: JSON.stringify({ controlType })
  });
}
