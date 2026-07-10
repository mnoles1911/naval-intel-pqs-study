import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { isItemStatus } from "@/lib/constants";

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
  if (q && q.trim()) where.name = { contains: q.trim() };

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
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

  const { name, description, status, photoUrl, locationId } = (body ??
    {}) as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (status !== undefined && !isItemStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Validate the referenced location exists (if provided).
  let resolvedLocationId: string | null = null;
  if (typeof locationId === "string" && locationId.length > 0) {
    const loc = await prisma.location.findUnique({ where: { id: locationId } });
    if (!loc) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 400 },
      );
    }
    resolvedLocationId = locationId;
  }

  const item = await prisma.item.create({
    data: {
      name: name.trim(),
      description:
        typeof description === "string" && description.trim().length > 0
          ? description.trim()
          : null,
      status: isItemStatus(status) ? status : "NEEDED",
      photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : null,
      locationId: resolvedLocationId,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
