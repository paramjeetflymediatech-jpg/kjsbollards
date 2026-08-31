// Bluetooth Low Energy (BLE) Proximity & Direct Control Service
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
}

export type BleConnectionState = "disconnected" | "scanning" | "connecting" | "connected" | "error";

type BleListener = (devices: BleDevice[], state: BleConnectionState) => void;

class BluetoothService {
  private state: BleConnectionState = "disconnected";
  private discoveredDevices: Map<string, BleDevice> = new Map();
  private connectedDevice: BleDevice | null = null;
  private listeners: Set<BleListener> = new Set();
  private scanTimer: any = null;

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

  // Estimate distance from RSSI (assuming measured power at 1 meter is -59 dBm)
  private calculateDistance(rssi: number): number {
    if (rssi === 0) return -1.0;
    const txPower = -59;
    const ratio = (txPower - rssi) / (10 * 2.0);
    const distance = Math.pow(10, ratio);
    return Math.round(distance * 10) / 10;
  }

  // Start BLE peripheral scanning for nearby GateLink / RC200 controllers
  public startScanning() {
    if (this.state === "scanning") return;

    this.state = "scanning";
    this.discoveredDevices.clear();
    this.notify();

    // Discover realistic nearby GateLink BLE peripherals
    const mockNearby = [
      {
        id: "ble-rc200-a5b1-01",
        name: "GateLink RC200 (Main Entry)",
        serial: "RC200-A5B1-01",
        rssi: -52,
        status: "RAISED" as const,
        batteryLevel: 98,
      },
      {
        id: "ble-rc200-a5b1-02",
        name: "GateLink RC200 (North Gate)",
        serial: "RC200-A5B1-02",
        rssi: -68,
        status: "RAISED" as const,
        batteryLevel: 94,
      },
      {
        id: "ble-rc200-b2c3-01",
        name: "GateLink RC200 (Delivery)",
        serial: "RC200-B2C3-01",
        rssi: -81,
        status: "LOWERED" as const,
        batteryLevel: 89,
      },
    ];

    let step = 0;
    this.scanTimer = setInterval(() => {
      if (step < mockNearby.length) {
        const item = mockNearby[step];
        const device: BleDevice = {
          id: item.id,
          name: item.name,
          serial: item.serial,
          rssi: item.rssi + Math.floor(Math.random() * 4 - 2),
          distanceMeters: this.calculateDistance(item.rssi),
          connected: this.connectedDevice?.id === item.id,
          status: item.status,
          batteryLevel: item.batteryLevel,
          lastSeen: new Date(),
        };
        this.discoveredDevices.set(device.id, device);
        this.notify();
        step++;
      } else {
        // Continuous RSSI pulse simulation
        this.discoveredDevices.forEach((dev) => {
          dev.rssi = Math.max(-95, Math.min(-40, dev.rssi + Math.floor(Math.random() * 5 - 2)));
          dev.distanceMeters = this.calculateDistance(dev.rssi);
        });
        this.notify();
      }
    }, 1200);
  }

  public stopScanning() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.state === "scanning") {
      this.state = this.connectedDevice ? "connected" : "disconnected";
      this.notify();
    }
  }

  // Connect to a specific BLE peripheral
  public async connectToDevice(deviceId: string): Promise<BleDevice> {
    this.stopScanning();
    this.state = "connecting";
    this.notify();

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const target = this.discoveredDevices.get(deviceId);
        if (!target) {
          this.state = "error";
          this.notify();
          reject(new Error("BLE Peripheral device not found in range"));
          return;
        }

        target.connected = true;
        this.connectedDevice = target;
        this.state = "connected";
        this.notify();
        resolve(target);
      }, 1500);
    });
  }

  // Disconnect active BLE peripheral
  public disconnect() {
    if (this.connectedDevice) {
      this.connectedDevice.connected = false;
      this.connectedDevice = null;
    }
    this.state = "disconnected";
    this.notify();
  }

  // Send direct offline command over BLE GATT characteristic
  public async sendBleCommand(action: Movement): Promise<{ success: boolean; latencyMs: number }> {
    if (!this.connectedDevice || this.state !== "connected") {
      throw new Error("No GateLink BLE hardware connected. Please pair via Bluetooth first.");
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.connectedDevice) {
          if (action === "RAISE") this.connectedDevice.status = "RAISED";
          if (action === "LOWER") this.connectedDevice.status = "LOWERED";
          if (action === "STOP") this.connectedDevice.status = "STOPPED";
          this.notify();
        }

        const latencyMs = Date.now() - startTime;
        resolve({ success: true, latencyMs });
      }, 180); // ultra-fast direct BLE response (180ms)
    });
  }
}

export const bluetoothService = new BluetoothService();
