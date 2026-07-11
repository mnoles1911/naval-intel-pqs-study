import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// POST /api/items/bulk-delete — delete many items. Body: { ids: string[] }
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ids } = (body ?? {}) as { ids?: unknown };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one item" },
      { status: 400 },
    );
  }
  const itemIds = ids.filter((v): v is string => typeof v === "string");

  const result = await prisma.item.deleteMany({
    where: { id: { in: itemIds } },
  });
  await logAudit({
    action: "delete",
    entity: "item",
    entityId: null,
    summary: `Deleted ${result.count} items`,
  });
  return NextResponse.json({ count: result.count });
}
