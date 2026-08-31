// Bluetooth Low Energy (BLE) Proximity & Direct Control Service (Real Hardware Only)
import { Platform, PermissionsAndroid } from "react-native";
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

class BluetoothService {
  private bleManager: BleManager | null = null;
  private state: BleConnectionState = "disconnected";
  private discoveredDevices: Map<string, BleDevice> = new Map();
  private connectedDevice: BleDevice | null = null;
  private activeNativeDevice: Device | null = null;
  private cachedWriteTarget: { serviceUuid: string; charUuid: string; withoutResponse: boolean } | null = null;
  private listeners: Set<BleListener> = new Set();

  constructor() {
    try {
      this.bleManager = new BleManager();
    } catch (err) {
      console.warn("BleManager initialization error:", err);
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
          ]);

          const scanGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
          const connectGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
          return scanGranted && connectGranted;
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "GateLink Bluetooth Permission",
              message: "Location access is required to discover nearby RC200 bollard controllers.",
              buttonPositive: "Grant Permission",
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn("Permission request error:", err);
        return false;
      }
    }
    return true;
  }

  // Start real hardware BLE scanning
  public async startScanning() {
    if (this.state === "scanning") return;

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      this.state = "error";
      this.notify();
      throw new Error("Bluetooth and Location permissions are required for hardware scanning.");
    }

    if (!this.bleManager) {
      this.state = "error";
      this.notify();
      throw new Error("BLE Manager is unavailable on this device.");
    }

    try {
      const adapterState = await this.bleManager.state();
      if (adapterState !== BleState.PoweredOn) {
        this.state = "error";
        this.notify();
        throw new Error("Bluetooth adapter is turned off. Please turn on Bluetooth in phone settings.");
      }

      this.state = "scanning";
      this.discoveredDevices.clear();
      this.notify();

      this.bleManager.startDeviceScan(
        null,
        { allowDuplicates: true },
        (error, scannedDevice) => {
          if (error) {
            console.warn("BLE Scan Error:", error.message);
            this.state = "error";
            this.notify();
            return;
          }

          if (scannedDevice) {
            const rawName = scannedDevice.name || scannedDevice.localName || "";
            // Only add devices that have an identifier
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
      this.state = "error";
      this.notify();
      throw e;
    }
  }

  public stopScanning() {
    if (this.bleManager) {
      try {
        this.bleManager.stopDeviceScan();
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
      // Skip standard Bluetooth SIG system services (Generic Access, Generic Attribute, Device Information)
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
      `No writable BLE GATT service found on device. Discovered services: [${services.map((s) => s.uuid).join(", ")}]`
    );
  }

  // Connect to a real physical BLE peripheral
  public async connectToDevice(deviceId: string): Promise<BleDevice> {
    this.stopScanning();
    this.state = "connecting";
    this.cachedWriteTarget = null;
    this.notify();

    if (!this.bleManager) {
      this.state = "error";
      this.notify();
      throw new Error("BLE Manager is unavailable.");
    }

    try {
      const nativeDev = await this.bleManager.connectToDevice(deviceId, { autoConnect: false });
      await nativeDev.discoverAllServicesAndCharacteristics();
      this.activeNativeDevice = nativeDev;

      // Pre-warm / resolve writable characteristic
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
    if (this.activeNativeDevice && this.bleManager) {
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

  // Send direct offline command over real BLE
  public async sendBleCommand(action: Movement): Promise<{ success: boolean; latencyMs: number }> {
    if (!this.connectedDevice || !this.activeNativeDevice || this.state !== "connected") {
      throw new Error("No physical RC200 controller is connected. Please pair via Bluetooth first.");
    }

    const startTime = Date.now();
    const payloadJson = JSON.stringify({ cmd: action });
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
          // If write with response failed or was rejected by characteristic, fallback to write without response
          console.warn("[BLE] writeWithResponse failed, retrying without response:", respErr);
          await this.activeNativeDevice.writeCharacteristicWithoutResponseForService(
            target.serviceUuid,
            target.charUuid,
            payloadBase64
          );
          target.withoutResponse = true;
        }
      }

      if (action === "raise") this.connectedDevice.status = "RAISED";
      if (action === "lower") this.connectedDevice.status = "LOWERED";
      if (action === "stop") this.connectedDevice.status = "STOPPED";
      this.notify();

      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs };
    } catch (err: any) {
      throw new Error(`Failed to transmit [${action.toUpperCase()}] to RC200: ${err.message}`);
    }
  }

  // Send Wi-Fi credentials to controller directly over BLE
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
