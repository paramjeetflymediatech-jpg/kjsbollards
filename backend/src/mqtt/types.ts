export type MqttPacket<T = any> = {
  cmd: number;
  sn?: string;
  msgId: string;
  body: T;
};

// In-memory real-time device telemetry
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

export interface RelayControlBody {
  relay: number;
  act: 0 | 1;
  keep: number;
}

export interface MultiRelayControlBody {
  act: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2];
  keep: [number, number, number, number];
}

export interface SerialDataBody {
  com: number;
  data: string;
}

export interface OtaDownloadBody {
  name: string;
  url: string;
  port: number;
  size: number;
  chk: number;
}

export interface DeviceResetBody {
  delay: number;
}
