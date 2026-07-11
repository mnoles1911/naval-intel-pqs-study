import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  isItemStatus,
  isItemCategory,
  isItemPriority,
} from "@/lib/constants";

// GET /api/items — list items, newest first. Optional filters:
//   ?status=NEEDED|PURCHASED   ?locationId=<id>|unassigned   ?q=<search>
export async function GET(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const locationId = searchParams.get("locationId");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (status && isItemStatus(status)) where.status = status;
  if (locationId === "unassigned") where.locationId = null;
  else if (locationId) where.locationId = locationId;
  if (q && q.trim()) where.name = { contains: q.trim(), mode: "insensitive" };

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

// Trim a string field to a non-empty value or null.
function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// Normalize a photo gallery: an array of non-empty string URLs.
function photoList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

// Clamp a 0..1 map coordinate to a number, or null when absent/invalid.
function toFrac(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

// POST /api/items — create an item.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

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

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (status !== undefined && !isItemStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (category !== undefined && category !== null && !isItemCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (priority !== undefined && !isItemPriority(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  let qty = 1;
  if (quantity !== undefined) {
    const n = typeof quantity === "number" ? quantity : Number(quantity);
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json(
        { error: "Quantity must be a whole number of at least 1" },
        { status: 400 },
      );
    }
    qty = n;
  }

  // Validate the referenced location exists (if provided).
  let resolvedLocationId: string | null = null;
  if (typeof locationId === "string" && locationId.length > 0) {
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    if (!loc) {
      return NextResponse.json({ error: "Location not found" }, { status: 400 });
    }
    resolvedLocationId = locationId;
  }

  const gallery = photoList(photoUrls);
  const cover =
    gallery[0] ?? (typeof photoUrl === "string" && photoUrl ? photoUrl : null);

  const item = await prisma.item.create({
    data: {
      name: name.trim(),
      description: str(description),
      status: isItemStatus(status) ? status : "NEEDED",
      quantity: qty,
      category: isItemCategory(category) ? category : null,
      priority: isItemPriority(priority) ? priority : "MEDIUM",
      vendorName: str(vendorName),
      vendorUrl: str(vendorUrl),
      notes: str(notes),
      photoUrl: cover,
      photoUrls: gallery,
      planX: toFrac(planX),
      planY: toFrac(planY),
      locationId: resolvedLocationId,
    },
  });
  await logAudit({
    action: "create",
    entity: "item",
    entityId: item.id,
    summary: `Added item "${item.name}"`,
  });
  return NextResponse.json(item, { status: 201 });
}
