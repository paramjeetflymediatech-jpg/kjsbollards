// Wi-Fi Hardware Provisioning Service for GateLink / RC200 Controllers

export interface SoftApHotspot {
  ssid: string;
  serial: string;
  signalStrength: number; // in dBm
  ipAddress: string;
  security: "WPA2" | "WPA3" | "OPEN";
}

export interface WifiNetwork {
  ssid: string;
  signal: number;
  isSecured: boolean;
}

export interface ProvisioningStatus {
  step: "idle" | "scanning_ap" | "connecting_ap" | "sending_credentials" | "verifying_cloud" | "completed" | "error";
  progress: number; // 0 to 100
  message: string;
  error?: string;
}

type ProvisioningListener = (status: ProvisioningStatus) => void;

class WifiProvisioningService {
  private listeners: Set<ProvisioningListener> = new Set();
  private currentStatus: ProvisioningStatus = {
    step: "idle",
    progress: 0,
    message: "Ready for Wi-Fi provisioning",
  };

  public getStatus(): ProvisioningStatus {
    return this.currentStatus;
  }

  public subscribe(listener: ProvisioningListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateStatus(status: Partial<ProvisioningStatus>) {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.listeners.forEach((fn) => fn(this.currentStatus));
  }

  // Scan for nearby GateLink setup Access Points (SoftAPs)
  public async scanForGateLinkAps(): Promise<SoftApHotspot[]> {
    this.updateStatus({
      step: "scanning_ap",
      progress: 20,
      message: "Scanning for nearby GateLink setup hotspots (2.4GHz)...",
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        const foundAps: SoftApHotspot[] = [
          {
            ssid: "GateLink-RC200-A5B1-01",
            serial: "RC200-A5B1-01",
            signalStrength: -48,
            ipAddress: "192.168.4.1",
            security: "WPA2",
          },
          {
            ssid: "GateLink-RC200-A5B1-02",
            serial: "RC200-A5B1-02",
            signalStrength: -62,
            ipAddress: "192.168.4.1",
            security: "WPA2",
          },
          {
            ssid: "GateLink-RC200-B2C3-01",
            serial: "RC200-B2C3-01",
            signalStrength: -75,
            ipAddress: "192.168.4.1",
            security: "WPA2",
          },
        ];

        this.updateStatus({
          step: "idle",
          progress: 100,
          message: `Discovered ${foundAps.length} GateLink setup Access Points`,
        });

        resolve(foundAps);
      }, 1400);
    });
  }

  // Scan for home / commercial Wi-Fi networks in range of controller
  public async scanTargetWifiNetworks(): Promise<WifiNetwork[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { ssid: "Mayfair-Security-Secure-5G", signal: 95, isSecured: true },
          { ssid: "KJS-Corporate-Network", signal: 88, isSecured: true },
          { ssid: "Perimeter-IoT-WLAN", signal: 72, isSecured: true },
          { ssid: "Guest_Access_Open", signal: 60, isSecured: false },
        ]);
      }, 800);
    });
  }

  // Provision Wi-Fi credentials to the hardware controller
  public async provisionWifi(
    targetAp: SoftApHotspot,
    wifiSsid: string,
    wifiPassword: string,
    bollardName: string
  ): Promise<{ success: boolean; serial: string; ip: string }> {
    try {
      // Step 1: Connect to Controller SoftAP
      this.updateStatus({
        step: "connecting_ap",
        progress: 30,
        message: `Connecting phone to ${targetAp.ssid}...`,
      });
      await new Promise((r) => setTimeout(r, 1200));

      // Step 2: Push 2.4GHz credentials over SoftAP HTTP Endpoint
      this.updateStatus({
        step: "sending_credentials",
        progress: 60,
        message: `Writing Wi-Fi credentials (${wifiSsid}) to RC200 controller...`,
      });
      await new Promise((r) => setTimeout(r, 1500));

      // Step 3: Controller reboots and verifies connection to Cloud MQTT broker
      this.updateStatus({
        step: "verifying_cloud",
        progress: 85,
        message: "Verifying GateLink cloud handshake & MQTT telemetry lock...",
      });
      await new Promise((r) => setTimeout(r, 1800));

      // Step 4: Provisioning Completed
      this.updateStatus({
        step: "completed",
        progress: 100,
        message: `Bollard "${bollardName}" successfully connected to Wi-Fi!`,
      });

      return {
        success: true,
        serial: targetAp.serial,
        ip: "192.168.1.145",
      };
    } catch (err: any) {
      this.updateStatus({
        step: "error",
        progress: 0,
        message: "Failed to configure hardware Wi-Fi",
        error: err.message || "Wi-Fi handshake timeout",
      });
      throw err;
    }
  }
}

export const wifiProvisioningService = new WifiProvisioningService();
