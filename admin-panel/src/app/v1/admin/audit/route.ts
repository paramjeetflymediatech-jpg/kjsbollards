import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAuthenticatedActor, unauthorizedResponse, forbiddenResponse } from "@/server/auth";

export async function GET(req: NextRequest) {
  const actor = await getAuthenticatedActor(req);
  if (!actor) return unauthorizedResponse();
  if (actor.role !== "admin") return forbiddenResponse();

  await db.init();
  const searchParams = req.nextUrl.searchParams;
  const severity = searchParams.get("severity");
  const search = searchParams.get("search")?.toLowerCase().trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

  let filtered = [...db.auditLogs];

  if (severity && severity !== "all") {
    filtered = filtered.filter((a) => a.severity === severity);
  }

  if (search) {
    filtered = filtered.filter((a) => {
      const user = db.users.find((u) => u.id === a.userId);
      const userMatch = user && (user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search));
      const eventMatch = a.eventType.toLowerCase().includes(search);
      return userMatch || eventMatch;
    });
  }

  const populated = filtered.map((a) => {
    const user = a.userId ? db.users.find((u) => u.id === a.userId) : null;
    return {
      ...a,
      user: user ? { name: user.name, email: user.email } : { name: "System", email: "system@kjsbollards.co.uk" },
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
