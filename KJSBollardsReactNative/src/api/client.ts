import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Session,
  Site,
  EventItem,
  Movement,
  BollardDiagnostics,
  CommissionPayload,
  IoConfigPayload,
  BarrierConfigPayload,
  AuthorizedUser,
  DeviceMetadata,
} from "../types";

const STORAGE_KEY_DEVICE_ID = "@kjs_device_unique_id";
const DEFAULT_PROD_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

class ApiClient {
  private baseUrl: string = DEFAULT_PROD_URL;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private onTokenRefreshedCallback?: (newSession: Session) => void;

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, "");
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  public setRefreshToken(refreshToken: string | null) {
    this.refreshToken = refreshToken;
  }

  public onTokenRefreshed(callback: (newSession: Session) => void) {
    this.onTokenRefreshedCallback = callback;
  }

  public async getDeviceMetadata(): Promise<DeviceMetadata> {
    let deviceId = "";
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID);
      if (stored) {
        deviceId = stored;
      } else {
        deviceId = `dev-${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, deviceId);
      }
    } catch {
      deviceId = `dev-${Platform.OS}-${Date.now()}`;
    }

    return {
      deviceId,
      platform: Platform.OS,
      model: `${Platform.OS.toUpperCase()} Device (${Platform.Version})`,
      osVersion: String(Platform.Version),
      appVersion: "1.2.0",
      pushToken: null, // Ready for FCM / APNs registration
    };
  }

  public async refreshSession(): Promise<Session | null> {
    if (!this.refreshToken || this.isRefreshing) return null;
    this.isRefreshing = true;

    try {
      const url = `${this.baseUrl}/v1/auth/refresh`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.token = null;
        this.refreshToken = null;
        return null;
      }

      const newSession: Session = await response.json();
      this.token = newSession.accessToken;
      if (newSession.refreshToken) {
        this.refreshToken = newSession.refreshToken;
      }

      if (this.onTokenRefreshedCallback) {
        this.onTokenRefreshedCallback(newSession);
      }

      return newSession;
    } catch {
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && !isRetry && this.refreshToken) {
      // Access token expired, attempt silent token refresh and retry
      const refreshed = await this.refreshSession();
      if (refreshed) {
        return this.request<T>(path, options, true);
      }
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(err.error || `Server responded with ${response.status}`);
    }

    return response.json();
  }

  public async register(
    name: string,
    email: string,
    pass: string,
    siteName?: string
  ): Promise<Session & { site?: Site }> {
    const deviceInfo = await this.getDeviceMetadata();
    return this.request<Session & { site?: Site }>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password: pass,
        siteName: siteName || "Primary Security Site",
        deviceInfo,
      }),
    });
  }

  public async login(email: string, pass: string): Promise<Session> {
    const deviceInfo = await this.getDeviceMetadata();
    return this.request<Session>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: pass,
        deviceInfo,
      }),
    });
  }

  public async registerDevice(metadata?: DeviceMetadata): Promise<any> {
    const device = metadata || (await this.getDeviceMetadata());
    return this.request<any>("/v1/auth/devices", {
      method: "POST",
      body: JSON.stringify(device),
    });
  }

  public async createSite(name: string, address?: string): Promise<Site> {
    return this.request<Site>("/v1/sites", {
      method: "POST",
      body: JSON.stringify({
        name,
        address: address || "Primary Residence / Facility",
      }),
    });
  }

  public async grantAccess(
    siteId: string,
    payload: { name: string; email: string; role: string; bollardIds: string[] }
  ): Promise<AuthorizedUser> {
    return this.request<AuthorizedUser>(`/v1/sites/${siteId}/access`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async revokeAccess(siteId: string, accessId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/v1/sites/${siteId}/access/${accessId}`, {
      method: "DELETE",
    });
  }

  public async getSites(): Promise<Site[]> {
    return this.request<Site[]>("/v1/sites");
  }

  public async getHistory(): Promise<EventItem[]> {
    return this.request<EventItem[]>("/v1/history?limit=100");
  }

  public async getAlerts(): Promise<EventItem[]> {
    return this.request<EventItem[]>("/v1/alerts?state=open");
  }

  public async sendCommand(bollardId: string, action: Movement): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>(`/v1/bollards/${bollardId}/commands`, {
      method: "POST",
      body: JSON.stringify({
        action,
        requestId: "req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9),
      }),
    });
  }

  public async getDiagnostics(bollardId: string): Promise<BollardDiagnostics> {
    return this.request<BollardDiagnostics>(`/v1/bollards/${bollardId}/diagnostics`);
  }

  public async commissionBollard(payload: CommissionPayload): Promise<any> {
    return this.request<any>("/v1/bollards", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async rebootBollard(bollardId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/v1/bollards/${bollardId}/reboot`, {
      method: "POST",
    });
  }

  public async setIoConfig(bollardId: string, payload: IoConfigPayload): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/v1/bollards/${bollardId}/io-config`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async setBarrierConfig(bollardId: string, payload: BarrierConfigPayload): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/v1/bollards/${bollardId}/barrier-config`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
