import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;
  await db.init();
  const bollard = db.bollards.find((b) => b.id === id);
  if (!bollard) {
    return NextResponse.json({ error: "Bollard not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, requestId } = body;

  if (action === "raise") {
    bollard.status = "RAISED";
    bollard.cycleCount += 1;
  } else if (action === "lower") {
    bollard.status = "LOWERED";
    bollard.cycleCount += 1;
  } else if (action === "stop") {
    bollard.status = "STOPPED";
  }

  const reqId = requestId || `cmd-${Date.now()}`;
  let cloudRelayDispatched = false;
  let cloudRelayError: string | null = null;

  // Forward command to GateLink Open API (Boleyun / GateLink Cloud cluster) if configured
  const gatelinkApiUrl = process.env.GATELINK_API_URL || process.env.BOLEYUN_API_URL;
  const gatelinkAppKey = process.env.GATELINK_APP_KEY;
  const gatelinkAppSecret = process.env.GATELINK_APP_SECRET;

  if (gatelinkApiUrl && bollard.deviceCode) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${gatelinkApiUrl.replace(/\/$/, "")}/api/open/device/control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(gatelinkAppKey ? { "X-App-Key": gatelinkAppKey } : {}),
          ...(gatelinkAppSecret ? { "X-App-Secret": gatelinkAppSecret } : {}),
        },
        body: JSON.stringify({
          deviceCode: bollard.deviceCode,
          action,
          requestId: reqId,
          channel: action === "raise" ? 1 : action === "lower" ? 2 : 3,
        }),
        signal: controller.signal,
      }).catch(async () => {
        // Alternate Boleyun endpoint format
        return fetch(`${gatelinkApiUrl.replace(/\/$/, "")}/open/v1/relay/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sn: bollard.deviceCode, cmd: action, reqId }),
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);
      if (response && response.ok) {
        cloudRelayDispatched = true;
      }
    } catch (relayErr: any) {
      console.warn("[GateLink Cloud Relay] Error forwarding to Open API:", relayErr.message);
      cloudRelayError = relayErr.message;
    }
  }

  // Forward command to EMQX Cloud / MQTT Broker if configured
  const mqttBrokerUrl = process.env.MQTT_BROKER_URL;
  const mqttUser = process.env.MQTT_USER;
  const mqttPass = process.env.MQTT_PASSWORD;

  if (mqttBrokerUrl && bollard.deviceCode) {
    try {
      const isHttpApi = mqttBrokerUrl.startsWith("http://") || mqttBrokerUrl.startsWith("https://");
      if (isHttpApi) {
        const basicAuth = Buffer.from(`${mqttUser || ""}:${mqttPass || ""}`).toString("base64");
        const emqxController = new AbortController();
        const emqxTimeout = setTimeout(() => emqxController.abort(), 3000);

        const publishUrl = `${mqttBrokerUrl.replace(/\/$/, "")}/publish`;
        const emqxRes = await fetch(publishUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            topic: `gatelink/${bollard.deviceCode}/set`,
            payload: JSON.stringify({
              action,
              cmd: action,
              sn: bollard.deviceCode,
              requestId: reqId,
              timestamp: Date.now(),
            }),
            qos: 1,
            retain: false,
          }),
          signal: emqxController.signal,
        }).catch(() => null);

        clearTimeout(emqxTimeout);
        if (emqxRes && emqxRes.ok) {
          cloudRelayDispatched = true;
        }
      }
    } catch (emqxErr: any) {
      console.warn("[EMQX Cloud MQTT] Error publishing command:", emqxErr.message);
    }
  }

  db.commands.push({
    id: reqId,
    bollardId: bollard.id,
    userId: actor.id,
    action,
    status: "dispatched",
    createdAt: new Date().toISOString(),
  });

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: `command_${action}`,
    detail: {
      bollardId: bollard.id,
      serial: bollard.deviceCode,
      requestId: reqId,
      status: bollard.status,
      cloudRelayDispatched,
      cloudRelayError,
    },
    severity: "info",
    remoteIp: req.headers.get("x-forwarded-for") || "127.0.0.1",
    createdAt: new Date().toISOString(),
  });

  await db.save();

  return NextResponse.json({
    id: reqId,
    status: "dispatched",
    bollardStatus: bollard.status,
    cloudRelayDispatched,
  });
}
