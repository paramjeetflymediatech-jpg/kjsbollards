import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;
  await db.init();
  const bollard = db.bollards.find((b) => b.id === id);
  if (!bollard) {
    return NextResponse.json({ error: "Bollard not found" }, { status: 404 });
  }

  return NextResponse.json({
    source: "mqtt_live",
    online: true,
    inputs: [bollard.status === "RAISED", false, true, false],
    outputs: [bollard.status === "RAISED", false, false, false],
    signalStrength: 78,
    cycleCount: bollard.cycleCount,
    hardwareVersion: "RC200-V2",
    softwareVersion: "v1.4.2",
    netType: "4G-LTE",
    netId: "EE-UK",
  });
}
