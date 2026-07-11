import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { isTableShape } from "@/lib/constants";

// GET /api/locations — list all locations (by manual order, then name).
export async function GET() {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const locations = await prisma.location.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(locations);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// Coerce a 0..1 plan coordinate to a clamped number or null.
function toFraction(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

// Validate a seat count. Returns the number when valid, null when not provided
// (caller applies the default), or undefined when invalid (caller 400s).
// A seat count of 0 is valid — a non-seatable location (bar, greeting table)
// has no seats. Tables use 1..40.
function toSeatCount(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 40) return undefined;
  return n;
}

// POST /api/locations — create a location.
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
    color,
    planX,
    planY,
    planW,
    planH,
    sortOrder,
    seatable,
    shape,
    seatCount,
  } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (seatable !== undefined && typeof seatable !== "boolean") {
    return NextResponse.json(
      { error: "seatable must be true or false" },
      { status: 400 },
    );
  }
  if (shape !== undefined && !isTableShape(shape)) {
    return NextResponse.json({ error: "Invalid table shape" }, { status: 400 });
  }
  const seats = toSeatCount(seatCount);
  if (seats === undefined) {
    return NextResponse.json(
      { error: "Seat count must be a whole number from 0 to 40" },
      { status: 400 },
    );
  }

  const location = await prisma.location.create({
    data: {
      name: name.trim(),
      description: str(description),
      color: str(color),
      planX: toFraction(planX),
      planY: toFraction(planY),
      planW: toFraction(planW),
      planH: toFraction(planH),
      sortOrder:
        typeof sortOrder === "number" && Number.isInteger(sortOrder)
          ? sortOrder
          : 0,
      seatable: typeof seatable === "boolean" ? seatable : true,
      shape: isTableShape(shape) ? shape : "ROUND",
      seatCount: seats ?? 8,
    },
  });
  return NextResponse.json(location, { status: 201 });
}
