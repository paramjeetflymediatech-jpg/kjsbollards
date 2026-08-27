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
