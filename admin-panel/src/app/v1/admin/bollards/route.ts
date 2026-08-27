import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();

  await db.init();
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase().trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

  let filtered = [...db.bollards];

  if (search) {
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.deviceCode.toLowerCase().includes(search)
    );
  }

  const populated = filtered.map((b) => {
    const site = b.siteId ? db.sites.find((s) => s.id === b.siteId) : null;
    return {
      ...b,
      site: site ? { id: site.id, name: site.name } : null,
    };
  });

  const total = populated.length;
  const offset = (page - 1) * limit;
  const paginated = populated.slice(offset, offset + limit);

  return NextResponse.json({
    data: paginated,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
