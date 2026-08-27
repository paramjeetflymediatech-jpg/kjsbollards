import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "kjs-bollards-unified-nextjs",
    timestamp: new Date().toISOString(),
  });
}
