import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import {
  isItemStatus,
  isItemCategory,
  isItemPriority,
} from "@/lib/constants";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// POST /api/items/bulk — create many items at once.
// Body: { items: Array<{ name, description?, status?, quantity?, category?,
//   priority?, vendorName?, vendorUrl?, notes?, photoUrl?, locationId? }> }
// Used both for bulk entry (many names) and for duplicating one item across
// several locations (same fields, different locationId). Returns { count }.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body as { items?: unknown })?.items;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty items array" },
      { status: 400 },
    );
  }
  if (raw.length > 1000) {
    return NextResponse.json(
      { error: "Too many items at once (max 1000)" },
      { status: 400 },
    );
  }

  // Preload valid location ids once to validate any locationId references.
  const locations = await prisma.location.findMany({ select: { id: true } });
  const validLocationIds = new Set(locations.map((l) => l.id));

  const data = [];
  for (let i = 0; i < raw.length; i++) {
    const it = (raw[i] ?? {}) as Record<string, unknown>;
    const name = it.name;
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: `Item ${i + 1} is missing a name` },
        { status: 400 },
      );
    }
    if (it.status !== undefined && !isItemStatus(it.status)) {
      return NextResponse.json(
        { error: `Item ${i + 1} has an invalid status` },
        { status: 400 },
      );
    }
    if (
      it.category !== undefined &&
      it.category !== null &&
      !isItemCategory(it.category)
    ) {
      return NextResponse.json(
        { error: `Item ${i + 1} has an invalid category` },
        { status: 400 },
      );
    }
    if (it.priority !== undefined && !isItemPriority(it.priority)) {
      return NextResponse.json(
        { error: `Item ${i + 1} has an invalid priority` },
        { status: 400 },
      );
    }
    let quantity = 1;
    if (it.quantity !== undefined) {
      const n =
        typeof it.quantity === "number" ? it.quantity : Number(it.quantity);
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json(
          { error: `Item ${i + 1} has an invalid quantity` },
          { status: 400 },
        );
      }
      quantity = n;
    }
    let locationId: string | null = null;
    if (typeof it.locationId === "string" && it.locationId.length > 0) {
      if (!validLocationIds.has(it.locationId)) {
        return NextResponse.json(
          { error: `Item ${i + 1} references a location that doesn't exist` },
          { status: 400 },
        );
      }
      locationId = it.locationId;
    }

    data.push({
      name: name.trim(),
      description: str(it.description),
      status: isItemStatus(it.status) ? it.status : "NEEDED",
      quantity,
      category: isItemCategory(it.category) ? it.category : null,
      priority: isItemPriority(it.priority) ? it.priority : "MEDIUM",
      vendorName: str(it.vendorName),
      vendorUrl: str(it.vendorUrl),
      notes: str(it.notes),
      photoUrl:
        typeof it.photoUrl === "string" && it.photoUrl ? it.photoUrl : null,
      locationId,
    });
  }

  const result = await prisma.item.createMany({ data });
  return NextResponse.json({ count: result.count }, { status: 201 });
}
