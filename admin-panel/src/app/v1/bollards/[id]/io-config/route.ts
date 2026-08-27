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
  const { pulseDuration, in1Type, in2Type } = body;

  if (pulseDuration) bollard.pulseDuration = Number(pulseDuration);
  if (in1Type) bollard.in1Type = in1Type;
  if (in2Type) bollard.in2Type = in2Type;

  return NextResponse.json({ success: true, message: "IO Configuration updated" });
}
