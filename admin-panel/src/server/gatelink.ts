import { createHash } from "crypto";

export interface GateLinkEnvelope<T> {
  code: number;
  success: boolean;
  message?: string;
  data: T;
}

export interface GateLinkDeviceDetails {
  netWork: {
    online: boolean;
    network?: string;
    wifiName?: string;
    signal?: number;
  };
  stateVo: {
    in: boolean[];
    out: boolean[];
  };
}

export class GateLinkClient {
  public get baseUrl(): string {
    const raw = process.env.GATELINK_BASE_URL || process.env.GATELINK_API_URL || "https://gatelink.jutaicloud.com";
    return raw.replace(/\/$/, "");
  }

  public get accessKeyId(): string {
    return (
      process.env.GATELINK_ACCESS_KEY_ID ||
      process.env.GATELINK_APP_KEY ||
      "xK16PMGDXNYltU86FiWRkgawrPaOmF5k"
    ).trim();
  }

  public get accessKeySecret(): string {
    return (
      process.env.GATELINK_ACCESS_KEY_SECRET ||
      process.env.GATELINK_APP_SECRET ||
      ""
    ).trim();
  }

  // Token cache to avoid repeated logins within the 10-minute token validity window
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  public generateSignature(resource: string, expires: number, secret?: string): string {
    const sec = secret || this.accessKeySecret;
    const source = `resource=${resource}&accessKeySecret=${sec}&expires=${expires}`;
    return createHash("sha1").update(source, "utf8").digest("hex");
  }

  private async jsonRequest<T>(resource: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${resource}`;
    const timeoutMs = 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`GateLink HTTP ${response.status} (${response.statusText})`);
      }

      const result = (await response.json()) as GateLinkEnvelope<T>;
      if (result.code !== 200 || !result.success) {
        throw new Error(`GateLink ${result.code}: ${result.message || "Request failed"}`);
      }

      return result.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public async deviceLogin(deviceCode: string): Promise<string> {
    const cleanCode = deviceCode.trim();
    const cached = this.tokenCache.get(cleanCode);
    const now = Math.floor(Date.now() / 1000);

    // If cached token has > 60 seconds left, reuse it
    if (cached && cached.expiresAt > now + 60) {
      return cached.token;
    }

    if (!this.accessKeySecret) {
      throw new Error("GATELINK_ACCESS_KEY_SECRET is not configured in environment.");
    }

    const resource = "/wireless/openapi/device/login";
    const expires = now + 600; // 10 minutes validity
    const signature = this.generateSignature(resource, expires);

    const body = {
      accessKeyId: this.accessKeyId,
      signature,
      expires,
      deviceCode: cleanCode,
    };

    const data = await this.jsonRequest<{ token: string }>(resource, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!data || !data.token) {
      throw new Error("GateLink login did not return an apiToken.");
    }

    this.tokenCache.set(cleanCode, {
      token: data.token,
      expiresAt: expires,
    });

    return data.token;
  }

  public async getDetails(apiToken: string): Promise<GateLinkDeviceDetails> {
    return this.jsonRequest<GateLinkDeviceDetails>("/wireless/openapi/manage/device/details", {
      method: "GET",
      headers: { apiToken },
    });
  }

  public async pulseRelay(apiToken: string, relay: number): Promise<unknown> {
    if (![1, 2, 3, 4].includes(relay)) {
      throw new Error(`Invalid relay index ${relay}. Must be 1, 2, 3, or 4.`);
    }

    return this.jsonRequest<unknown>("/wireless/openapi/manage/device/control/relay", {
      method: "POST",
      headers: {
        apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ relay, act: 1 }),
    });
  }
}

export const gatelink = new GateLinkClient();
