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

type Params = { params: Promise<{ id: string }> };

// GET /api/items/:id — fetch a single item.
export async function GET(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function photoList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

function toFrac(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

// PATCH /api/items/:id — partial update. Any subset of fields may be sent.
// Set locationId to the UNASSIGNED sentinel (or null) to unassign.
export async function PATCH(request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    description,
    status,
    quantity,
    category,
    priority,
    vendorName,
    vendorUrl,
    notes,
    photoUrl,
    photoUrls,
    planX,
    planY,
    locationId,
  } = (body ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (description !== undefined) data.description = str(description);
  if (status !== undefined) {
    if (!isItemStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = status;
  }
  if (quantity !== undefined) {
    const n = typeof quantity === "number" ? quantity : Number(quantity);
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json(
        { error: "Quantity must be a whole number of at least 1" },
        { status: 400 },
      );
    }
    data.quantity = n;
  }
  if (category !== undefined) {
    if (category !== null && !isItemCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    data.category = isItemCategory(category) ? category : null;
  }
  if (priority !== undefined) {
    if (!isItemPriority(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    data.priority = priority;
  }
  if (vendorName !== undefined) data.vendorName = str(vendorName);
  if (vendorUrl !== undefined) data.vendorUrl = str(vendorUrl);
  if (notes !== undefined) data.notes = str(notes);
  // Photos: when the gallery is provided it wins and the cover is kept in sync
  // with its first entry; otherwise a bare photoUrl can still be set.
  if (photoUrls !== undefined) {
    const gallery = photoList(photoUrls);
    data.photoUrls = gallery;
    data.photoUrl = gallery[0] ?? null;
  } else if (photoUrl !== undefined) {
    data.photoUrl =
      typeof photoUrl === "string" && photoUrl.length > 0 ? photoUrl : null;
  }
  if (planX !== undefined) data.planX = toFrac(planX);
  if (planY !== undefined) data.planY = toFrac(planY);
  if (locationId !== undefined) {
    if (locationId === null || locationId === UNASSIGNED || locationId === "") {
      data.locationId = null;
    } else if (typeof locationId === "string") {
      const loc = await prisma.location.findUnique({
        where: { id: locationId },
      });
      if (!loc) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 400 },
        );
      }
      data.locationId = locationId;
    }
  }

  try {
    const item = await prisma.item.update({ where: { id }, data });
    await logAudit({
      action: "update",
      entity: "item",
      entityId: item.id,
      summary: `Updated item "${item.name}"`,
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}

// DELETE /api/items/:id
export async function DELETE(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    const existing = await prisma.item.findUnique({ where: { id } });
    await prisma.item.delete({ where: { id } });
    await logAudit({
      action: "delete",
      entity: "item",
      entityId: id,
      summary: existing ? `Deleted item "${existing.name}"` : `Deleted item ${id}`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}
