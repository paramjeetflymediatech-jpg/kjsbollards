import { Platform, PermissionsAndroid, NativeModules } from "react-native";
import { BleManager, Device, State as BleState } from "react-native-ble-plx";
import { Movement } from "../types";

export interface BleDevice {
  id: string;
  name: string;
  serial: string;
  rssi: number; // in dBm, e.g. -45 (strong) to -90 (weak)
  distanceMeters: number; // approximate proximity distance in meters
  connected: boolean;
  status: "RAISED" | "LOWERED" | "STOPPED" | "IDLE";
  batteryLevel?: number;
  lastSeen: Date;
  isNative: boolean;
}

export type BleConnectionState = "disconnected" | "scanning" | "connecting" | "connected" | "error";

type BleListener = (devices: BleDevice[], state: BleConnectionState) => void;

// Known GATT Service / Characteristic UUIDs for Bollard & Gate Controllers
const KNOWN_WRITE_TARGETS = [
  // Nordic UART Service (NUS)
  { service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e", char: "6e400002-b5a3-f393-e0a9-e50e24dcca9e" },
  // HM-10 / CC2541 Serial Module
  { service: "0000ffe0-0000-1000-8000-00805f9b34fb", char: "0000ffe1-0000-1000-8000-00805f9b34fb" },
  { service: "ffe0", char: "ffe1" },
  // GateLink / RC200 Custom Service
  { service: "0000fff0-0000-1000-8000-00805f9b34fb", char: "0000fff1-0000-1000-8000-00805f9b34fb" },
  { service: "fff0", char: "fff1" },
  // Telit / Microchip / ESP32 custom UART services
  { service: "0000fe59-0000-1000-8000-00805f9b34fb", char: "00008ecb-0000-1000-8000-00805f9b34fb" },
];

// Base64 helper without external dependencies
function stringToBase64(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  while (i < input.length) {
    const c1 = input.charCodeAt(i++);
    const c2 = input.charCodeAt(i++);
    const c3 = input.charCodeAt(i++);

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (c3 >> 6);
    let e4 = c3 & 63;

    if (isNaN(c2)) {
      e3 = e4 = 64;
    } else if (isNaN(c3)) {
      e4 = 64;
    }

    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return output;
}

function byteArrayToBase64(bytes: number[]): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;
  while (i < bytes.length) {
    const c1 = bytes[i++];
    const c2 = bytes[i++];
    const c3 = bytes[i++];

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (c3 >> 6);
    let e4 = c3 & 63;

    if (isNaN(c2)) {
      e3 = e4 = 64;
    } else if (isNaN(c3)) {
      e4 = 64;
    }

    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return output;
}

class BluetoothService {
  private bleManager: BleManager | null = null;
  private isNativeModuleChecked: boolean = false;
  private state: BleConnectionState = "disconnected";
  private discoveredDevices: Map<string, BleDevice> = new Map();
  private connectedDevice: BleDevice | null = null;
  private activeNativeDevice: Device | null = null;
  private cachedWriteTarget: { serviceUuid: string; charUuid: string; withoutResponse: boolean } | null = null;
  private listeners: Set<BleListener> = new Set();

  constructor() {
    // Lazy initialization handled on demand via getBleManager()
  }

  private getBleManager(): BleManager | null {
    if (this.bleManager) return this.bleManager;
    if (this.isNativeModuleChecked) return null;

    try {
      if (!NativeModules.BleClientManager && !NativeModules.BleClient) {
        // Native Bluetooth module not linked or running in Simulator
        this.isNativeModuleChecked = true;
        return null;
      }
      this.bleManager = new BleManager();
      return this.bleManager;
    } catch (err) {
      console.warn("BleManager not available on this environment (Simulator mode active)");
      this.isNativeModuleChecked = true;
      return null;
    }
  }

  public getState(): BleConnectionState {
    return this.state;
  }

  public getDiscoveredDevices(): BleDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  public getConnectedDevice(): BleDevice | null {
    return this.connectedDevice;
  }

  public subscribe(listener: BleListener): () => void {
    this.listeners.add(listener);
    listener(this.getDiscoveredDevices(), this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getDiscoveredDevices();
    this.listeners.forEach((fn) => fn(list, this.state));
  }

  // Estimate distance in meters from RSSI
  private calculateDistance(rssi: number): number {
    if (!rssi || rssi === 0) return -1.0;
    const txPower = -59;
    const ratio = (txPower - rssi) / (10 * 2.0);
    const distance = Math.pow(10, ratio);
    return Math.round(distance * 10) / 10;
  }

  private scanTimer: any = null;

  // Request Android Bluetooth & Location Permissions
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "android") {
      try {
        const apiLevel = Platform.Version;
        if (typeof apiLevel === "number" && apiLevel >= 31) {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);

          const scanGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
          const connectGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
          return scanGranted && connectGranted;
        } else {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          return (
            result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
            result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
          );
        }
      } catch (err) {
        console.warn("Permission request error:", err);
        return false;
      }
    }
    return true;
  }

  // Start real hardware BLE scanning with auto-timeout and robust detection
  public async startScanning() {
    if (this.state === "scanning") return;

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      console.warn("[BLE] Permissions not granted");
      this.state = "error";
      this.notify();
      return;
    }

    const manager = this.getBleManager();
    if (!manager) {
      this.state = "error";
      this.notify();
      return;
    }

    try {
      let adapterState = await manager.state();
      if (adapterState !== BleState.PoweredOn) {
        // Wait briefly for Bluetooth adapter to power up if needed
        await new Promise<void>((resolve) => {
          const sub = manager.onStateChange((state) => {
            if (state === BleState.PoweredOn) {
              sub.remove();
              resolve();
            }
          }, true);
          setTimeout(() => {
            try { sub.remove(); } catch {}
            resolve();
          }, 1500);
        });
        adapterState = await manager.state();
      }

      if (adapterState !== BleState.PoweredOn) {
        console.warn(`[BLE] Bluetooth adapter not powered on: ${adapterState}`);
        this.state = "error";
        this.notify();
        return;
      }

      this.state = "scanning";
      this.notify();

      if (this.scanTimer) {
        clearTimeout(this.scanTimer);
        this.scanTimer = null;
      }

      // Auto-stop scan after 15 seconds to avoid battery drain and indefinite loop
      this.scanTimer = setTimeout(() => {
        if (this.state === "scanning") {
          this.stopScanning();
        }
      }, 15000);

      manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, scannedDevice) => {
          if (error) {
            console.warn("BLE Scan Error:", error.message);
            this.state = "error";
            this.notify();
            return;
          }

          if (scannedDevice) {
            const rawName = scannedDevice.name || scannedDevice.localName || "";
            // Accept all discoverable peripherals with either an ID or a name
            if (!scannedDevice.id && !rawName) return;

            const devName = rawName || `BLE Device (${scannedDevice.id.slice(-5)})`;
            const serial = rawName.startsWith("RC200") || rawName.startsWith("GateLink")
              ? rawName.replace("GateLink-", "")
              : `RC200-${scannedDevice.id.replace(/:/g, "").slice(-6).toUpperCase()}`;

            const rssi = scannedDevice.rssi || -70;
            const dev: BleDevice = {
              id: scannedDevice.id,
              name: devName,
              serial: serial,
              rssi: rssi,
              distanceMeters: this.calculateDistance(rssi),
              connected: this.connectedDevice?.id === scannedDevice.id,
              status: "IDLE",
              lastSeen: new Date(),
              isNative: true,
            };

            this.discoveredDevices.set(dev.id, dev);
            this.notify();
          }
        }
      );
    } catch (e: any) {
      console.warn("[BLE] Exception starting scan:", e);
      this.state = "error";
      this.notify();
    }
  }

  public stopScanning() {
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    const manager = this.getBleManager();
    if (manager) {
      try {
        manager.stopDeviceScan();
      } catch (err) {}
    }
    if (this.state === "scanning") {
      this.state = this.connectedDevice ? "connected" : "disconnected";
      this.notify();
    }
  }

  // Find or auto-detect the writable GATT service & characteristic on physical controller
  private async resolveWriteTarget(device: Device): Promise<{ serviceUuid: string; charUuid: string; withoutResponse: boolean }> {
    if (this.cachedWriteTarget) {
      return this.cachedWriteTarget;
    }

    const services = await device.services();
    console.log(`[BLE] Discovered ${services.length} services on ${device.id}`);

    // Pass 1: Check known standard UART service & characteristic profiles
    for (const s of services) {
      const sUuid = s.uuid.toLowerCase();
      try {
        const chars = await device.characteristicsForService(s.uuid);
        for (const c of chars) {
          const cUuid = c.uuid.toLowerCase();
          for (const known of KNOWN_WRITE_TARGETS) {
            if (sUuid.includes(known.service.toLowerCase()) && cUuid.includes(known.char.toLowerCase())) {
              const withoutResponse = !c.isWritableWithResponse && c.isWritableWithoutResponse;
              this.cachedWriteTarget = { serviceUuid: s.uuid, charUuid: c.uuid, withoutResponse };
              console.log(`[BLE] Matched known target: Service ${s.uuid}, Char ${c.uuid} (withoutResponse=${withoutResponse})`);
              return this.cachedWriteTarget;
            }
          }
        }
      } catch (err) {
        console.warn(`[BLE] Error reading chars for service ${s.uuid}:`, err);
      }
    }

    // Pass 2: Auto-detect any writable characteristic on any custom/vendor service
    for (const s of services) {
      const sUuid = s.uuid.toLowerCase();
      if (sUuid.includes("1800") || sUuid.includes("1801") || sUuid.includes("180a")) {
        continue;
      }
      try {
        const chars = await device.characteristicsForService(s.uuid);
        for (const c of chars) {
          if (c.isWritableWithResponse || c.isWritableWithoutResponse) {
            const withoutResponse = !c.isWritableWithResponse;
            this.cachedWriteTarget = { serviceUuid: s.uuid, charUuid: c.uuid, withoutResponse };
            console.log(`[BLE] Auto-discovered writable characteristic: Service ${s.uuid}, Char ${c.uuid} (withoutResponse=${withoutResponse})`);
            return this.cachedWriteTarget;
          }
        }
      } catch (err) {
        console.warn(`[BLE] Error inspecting characteristics for service ${s.uuid}:`, err);
      }
    }

    throw new Error(
      `No writable BLE GATT service found on real device. Discovered services: [${services.map((s) => s.uuid).join(", ")}]`
    );
  }

  // Connect to a real physical BLE peripheral
  public async connectToDevice(deviceId: string): Promise<BleDevice> {
    this.stopScanning();
    this.state = "connecting";
    this.cachedWriteTarget = null;
    this.notify();

    const manager = this.getBleManager();
    if (!manager) {
      this.state = "error";
      this.notify();
      throw new Error("Bluetooth native manager is unavailable on this device.");
    }

    try {
      const nativeDev = await manager.connectToDevice(deviceId, { autoConnect: false });
      await nativeDev.discoverAllServicesAndCharacteristics();
      this.activeNativeDevice = nativeDev;

      try {
        await this.resolveWriteTarget(nativeDev);
      } catch (targetErr: any) {
        console.warn("[BLE] Writable target resolution note:", targetErr.message);
      }

      let target = this.discoveredDevices.get(deviceId);
      if (!target) {
        target = {
          id: nativeDev.id,
          name: nativeDev.name || `RC200 (${nativeDev.id.slice(-5)})`,
          serial: `RC200-${nativeDev.id.replace(/:/g, "").slice(-6).toUpperCase()}`,
          rssi: (await nativeDev.readRSSI()).rssi || -60,
          distanceMeters: 1.0,
          connected: true,
          status: "IDLE",
          lastSeen: new Date(),
          isNative: true,
        };
        this.discoveredDevices.set(target.id, target);
      } else {
        target.connected = true;
      }

      this.connectedDevice = target;
      this.state = "connected";
      this.notify();
      return target;
    } catch (err: any) {
      this.state = "error";
      this.notify();
      throw new Error(`Failed to connect to RC200 controller (${deviceId}): ${err.message}`);
    }
  }

  // Disconnect active physical BLE peripheral
  public async disconnect() {
    this.cachedWriteTarget = null;
    const manager = this.getBleManager();
    if (this.activeNativeDevice && manager) {
      try {
        await this.activeNativeDevice.cancelConnection();
      } catch (e) {}
      this.activeNativeDevice = null;
    }
    if (this.connectedDevice) {
      this.connectedDevice.connected = false;
      this.connectedDevice = null;
    }
    this.state = "disconnected";
    this.notify();
  }

  public isDeviceConnected(targetSerialOrId?: string): boolean {
    if (!this.connectedDevice || !this.activeNativeDevice || this.state !== "connected") return false;
    if (!targetSerialOrId) return true;
    const clean = targetSerialOrId.trim().toUpperCase();
    const connSerial = (this.connectedDevice.serial || "").toUpperCase();
    const connId = (this.connectedDevice.id || "").toUpperCase();
    return (
      connSerial === clean ||
      connId === clean ||
      connSerial.includes(clean) ||
      clean.includes(connSerial)
    );
  }

  // Send direct offline command over real BLE hardware
  public async sendBleCommand(action: Movement): Promise<{ success: boolean; latencyMs: number; mode: string }> {
    if (!this.connectedDevice || !this.activeNativeDevice || this.state !== "connected") {
      throw new Error("No physical RC200 controller is connected. Please pair via Bluetooth first.");
    }

    const startTime = Date.now();
    const target = await this.resolveWriteTarget(this.activeNativeDevice);

    // Prepare primary JSON payload
    const payloadJson = JSON.stringify({ cmd: action, action, timestamp: Date.now() });
    const payloadBase64 = stringToBase64(payloadJson);

    // Prepare alternate ASCII command (e.g. "RAISE\r\n" or "OPEN\r\n")
    const asciiCmd = action === "raise" ? "OPEN\r\n" : action === "lower" ? "CLOSE\r\n" : "STOP\r\n";
    const asciiBase64 = stringToBase64(asciiCmd);

    // Prepare binary relay packet: [Header 0xA1, Channel (1=Raise, 2=Lower, 3=Stop), Pulse 0x01, Checksum]
    const ch = action === "raise" ? 1 : action === "lower" ? 2 : 3;
    const binPacket = [0xa1, ch, 0x01, (0xa1 + ch + 0x01) & 0xff];
    const binBase64 = byteArrayToBase64(binPacket);

    try {
      const writeFn = async (b64: string) => {
        if (target.withoutResponse) {
          await this.activeNativeDevice!.writeCharacteristicWithoutResponseForService(
            target.serviceUuid,
            target.charUuid,
            b64
          );
        } else {
          try {
            await this.activeNativeDevice!.writeCharacteristicWithResponseForService(
              target.serviceUuid,
              target.charUuid,
              b64
            );
          } catch {
            await this.activeNativeDevice!.writeCharacteristicWithoutResponseForService(
              target.serviceUuid,
              target.charUuid,
              b64
            );
            target.withoutResponse = true;
          }
        }
      };

      // Transmit primary JSON and ASCII/Binary packets
      await writeFn(payloadBase64);
      try {
        await writeFn(asciiBase64);
        await writeFn(binBase64);
      } catch {
        // secondary packets sent on best effort
      }

      if (action === "raise") this.connectedDevice.status = "RAISED";
      if (action === "lower") this.connectedDevice.status = "LOWERED";
      if (action === "stop") this.connectedDevice.status = "STOPPED";
      this.notify();

      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, mode: "ble_direct" };
    } catch (err: any) {
      throw new Error(`Failed to transmit [${action.toUpperCase()}] to RC200: ${err.message}`);
    }
  }

  // Send Wi-Fi credentials to real controller directly over BLE
  public async sendBleWifiConfig(ssid: string, pass: string): Promise<{ success: boolean; message: string }> {
    if (!this.connectedDevice || !this.activeNativeDevice || this.state !== "connected") {
      throw new Error("No physical RC200 controller is connected via Bluetooth. Please pair first.");
    }

    const payloadJson = JSON.stringify({ cmd: "set_wifi", ssid, pass });
    const payloadBase64 = stringToBase64(payloadJson);

    try {
      const target = await this.resolveWriteTarget(this.activeNativeDevice);

      if (target.withoutResponse) {
        await this.activeNativeDevice.writeCharacteristicWithoutResponseForService(
          target.serviceUuid,
          target.charUuid,
          payloadBase64
        );
      } else {
        try {
          await this.activeNativeDevice.writeCharacteristicWithResponseForService(
            target.serviceUuid,
            target.charUuid,
            payloadBase64
          );
        } catch (respErr) {
          await this.activeNativeDevice.writeCharacteristicWithoutResponseForService(
            target.serviceUuid,
            target.charUuid,
            payloadBase64
          );
          target.withoutResponse = true;
        }
      }

      return {
        success: true,
        message: `Wi-Fi credentials for "${ssid}" transmitted to ${this.connectedDevice.name} over Bluetooth.`,
      };
    } catch (err: any) {
      throw new Error(`Failed to transmit Wi-Fi config over Bluetooth: ${err.message}`);
    }
  }
}

export const bluetoothService = new BluetoothService();
