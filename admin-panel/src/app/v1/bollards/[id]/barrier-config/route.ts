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
  const { speed, reboundSensitivity, autoCloseDelay } = body;

  if (speed) bollard.speed = Number(speed);
  if (reboundSensitivity) bollard.reboundSensitivity = Number(reboundSensitivity);
  if (autoCloseDelay !== undefined) bollard.autoCloseDelay = Number(autoCloseDelay);

  return NextResponse.json({ success: true, message: "Barrier calibration registers updated" });
}
