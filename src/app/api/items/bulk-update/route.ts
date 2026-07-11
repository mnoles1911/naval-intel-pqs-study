import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  isItemStatus,
  isItemCategory,
  isItemPriority,
  UNASSIGNED,
} from "@/lib/constants";

// POST /api/items/bulk-update — apply one patch to many items.
// Body: { ids: string[], patch: { status?, locationId?, category?, priority? } }
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ids, patch } = (body ?? {}) as {
    ids?: unknown;
    patch?: Record<string, unknown>;
  };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one item" },
      { status: 400 },
    );
  }
  const itemIds = ids.filter((v): v is string => typeof v === "string");
  const p = patch ?? {};
  const data: Record<string, unknown> = {};

  if (p.status !== undefined) {
    if (!isItemStatus(p.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = p.status;
  }
  if (p.category !== undefined) {
    if (p.category !== null && !isItemCategory(p.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = isItemCategory(p.category) ? p.category : null;
  }
  if (p.priority !== undefined) {
    if (!isItemPriority(p.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    data.priority = p.priority;
  }
  if (p.locationId !== undefined) {
    if (
      p.locationId === null ||
      p.locationId === "" ||
      p.locationId === UNASSIGNED
    ) {
      data.locationId = null;
    } else if (typeof p.locationId === "string") {
      const loc = await prisma.location.findUnique({
        where: { id: p.locationId },
      });
      if (!loc) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 400 },
        );
      }
      data.locationId = p.locationId;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 },
    );
  }

  const result = await prisma.item.updateMany({
    where: { id: { in: itemIds } },
    data,
  });
  await logAudit({
    action: "update",
    entity: "item",
    entityId: null,
    summary: `Updated ${result.count} items`,
  });
  return NextResponse.json({ count: result.count });
}
