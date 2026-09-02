import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";
import { gatelink } from "@/server/gatelink";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  if (actor.role === "viewer") {
    return NextResponse.json({ error: "Viewer role does not have control permission" }, { status: 403 });
  }

  const { id } = await params;
  await db.init();
  const bollard = db.bollards.find((b) => b.id === id);
  if (!bollard) {
    return NextResponse.json({ error: "Bollard not found" }, { status: 404 });
  }

  if (!bollard.enabled) {
    return NextResponse.json({ error: "Bollard is disabled" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, requestId } = body;

  if (!action || !["raise", "lower", "stop"].includes(action.toLowerCase())) {
    return NextResponse.json({ error: "Invalid action. Must be raise, lower, or stop." }, { status: 400 });
  }

  const normalizedAction = action.toLowerCase() as "raise" | "lower" | "stop";
  const reqId = requestId || `cmd-${Date.now()}`;

  let cloudRelayDispatched = false;
  let cloudRelayError: string | null = null;
  let gatelinkToken: string | null = null;

  // 1. Direct hardware relay control via GateLink OpenAPI (RC200 controller)
  if (bollard.deviceCode && (process.env.GATELINK_ACCESS_KEY_SECRET || process.env.GATELINK_APP_SECRET)) {
    try {
      gatelinkToken = await gatelink.deviceLogin(bollard.deviceCode);
      const details = await gatelink.getDetails(gatelinkToken);

      if (!details.netWork.online) {
        throw new Error(`GateLink controller ${bollard.deviceCode} reports OFFLINE.`);
      }

      // Safety check: ensure no conflicting relay is already energized before dispatching new movement
      if (normalizedAction !== "stop" && details.stateVo.out.some(Boolean)) {
        throw new Error("A relay is already active. Please wait or issue STOP.");
      }

      const relay =
        normalizedAction === "raise"
          ? bollard.raiseRelay || 1
          : normalizedAction === "lower"
          ? bollard.lowerRelay || 2
          : bollard.stopRelay || 3;

      await gatelink.pulseRelay(gatelinkToken, relay);
      cloudRelayDispatched = true;

      // 2. Automatic STOP worker sequence: for RAISE or LOWER, schedule Relay 3 (STOP) pulse after movement duration
      if (normalizedAction !== "stop") {
        const movementSeconds = Number(bollard.movementSeconds || bollard.openDuration || 4.5);
        const stopRelayNumber = bollard.stopRelay || 3;
        const targetSerial = bollard.deviceCode;
        const bollardId = bollard.id;
        const delayMs = Math.round(movementSeconds * 1000);

        setTimeout(async () => {
          try {
            console.log(`[GateLink Automatic STOP] Initiating automatic STOP pulse for ${targetSerial} after ${movementSeconds}s`);
            const stopToken = await gatelink.deviceLogin(targetSerial);
            await gatelink.pulseRelay(stopToken, stopRelayNumber);
            console.log(`[GateLink Automatic STOP] Relay ${stopRelayNumber} pulsed successfully.`);

            db.auditLogs.unshift({
              id: `aud-${Date.now()}`,
              userId: actor.id,
              eventType: "automatic_stop_completed",
              detail: {
                bollardId,
                serial: targetSerial,
                stopRelay: stopRelayNumber,
                movementSeconds,
              },
              severity: "info",
              remoteIp: "127.0.0.1",
              createdAt: new Date().toISOString(),
            });
            await db.save();
          } catch (autoStopErr: any) {
            console.error(`[GateLink Automatic STOP] Error pulsing STOP relay: ${autoStopErr.message}`);
          }
        }, delayMs);
      }
    } catch (gatelinkErr: any) {
      console.warn(`[GateLink Hardware] Error commanding ${bollard.deviceCode}:`, gatelinkErr.message);
      cloudRelayError = gatelinkErr.message;
      // If hardware rejected with safety/offline error, do not pretend movement succeeded
      return NextResponse.json(
        {
          error: gatelinkErr.message,
          cloudRelayDispatched: false,
          cloudRelayError: gatelinkErr.message,
        },
        { status: 409 }
      );
    }
  }

  // Update local state
  if (normalizedAction === "raise") {
    bollard.status = "RAISED";
    bollard.cycleCount += 1;
  } else if (normalizedAction === "lower") {
    bollard.status = "LOWERED";
    bollard.cycleCount += 1;
  } else if (normalizedAction === "stop") {
    bollard.status = "STOPPED";
  }

  db.commands.push({
    id: reqId,
    bollardId: bollard.id,
    userId: actor.id,
    action: normalizedAction,
    status: cloudRelayDispatched ? "completed" : "dispatched",
    createdAt: new Date().toISOString(),
  });

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: actor.id,
    eventType: `command_${normalizedAction}`,
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
    cloudRelayError,
  });
}
