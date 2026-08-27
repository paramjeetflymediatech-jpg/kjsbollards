import { Platform } from "react-native";
import {
  Session,
  Site,
  EventItem,
  Movement,
  BollardDiagnostics,
  CommissionPayload,
  IoConfigPayload,
  BarrierConfigPayload,
  AuthorizedUser
} from "../types";

const DEFAULT_DEV_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

class ApiClient {
  private baseUrl: string = "https://api.kjsbollards.co.uk";
  private token: string | null = null;

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, "");
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    return this.request<Session & { site?: Site }>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password: pass,
        siteName: siteName || "Primary Security Site",
      }),
    });
  }

  public async login(email: string, pass: string): Promise<Session> {
    return this.request<Session>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
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
