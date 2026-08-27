import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();

  const cloudList = db.gatelinkCloudDevices || [];
  const devices = cloudList.map((d) => {
    const local = db.bollards.find((b) => b.deviceCode === d.deviceCode);
    return {
      deviceCode: d.deviceCode,
      deviceName: d.deviceName,
      online: d.online,
      registeredInLocalDb: Boolean(local),
      localName: local?.name || null,
    };
  });

  return NextResponse.json({
    totalOnCloud: devices.length,
    devices,
  });
}
