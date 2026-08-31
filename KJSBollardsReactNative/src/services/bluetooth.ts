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

// Standard Nordic UART Service (NUS) & GateLink Custom UUIDs
const NORDIC_UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Characteristic for write
const NORDIC_UART_RX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Characteristic for notifications

const GATELINK_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const GATELINK_WRITE_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";

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

  // Connect to a real physical BLE peripheral
  public async connectToDevice(deviceId: string): Promise<BleDevice> {
    this.stopScanning();
    this.state = "connecting";
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

  // Send direct offline command over real BLE (Option B: JSON Payload {"cmd": "raise"})
  public async sendBleCommand(action: Movement): Promise<{ success: boolean; latencyMs: number }> {
    if (!this.connectedDevice || !this.activeNativeDevice || this.state !== "connected") {
      throw new Error("No physical RC200 controller is connected. Please pair via Bluetooth first.");
    }

    const startTime = Date.now();
    const payloadJson = JSON.stringify({ cmd: action });
    const payloadBase64 = stringToBase64(payloadJson);

    try {
      const services = await this.activeNativeDevice.services();
      let writeServiceUuid = GATELINK_SERVICE_UUID;
      let writeCharUuid = GATELINK_WRITE_UUID;

      // Detect available GATT service on physical RC200
      for (const s of services) {
        const uuid = s.uuid.toLowerCase();
        if (uuid.includes("6e400001")) {
          writeServiceUuid = NORDIC_UART_SERVICE_UUID;
          writeCharUuid = NORDIC_UART_TX_UUID;
          break;
        }
      }

      await this.activeNativeDevice.writeCharacteristicWithResponseForService(
        writeServiceUuid,
        writeCharUuid,
        payloadBase64
      );

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
}

export const bluetoothService = new BluetoothService();
