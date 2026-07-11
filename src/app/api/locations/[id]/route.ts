import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { isTableShape } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// A seat count of 0 is valid — a non-seatable location (bar, greeting table)
// has no seats. Tables use 1..40.
function toSeatCount(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 40) return undefined;
  return n;
}

function toFraction(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, n));
}

// PATCH /api/locations/:id — update name/description/color/plan position/order.
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
  const data: Record<string, unknown> = {};

  if (seatable !== undefined) {
    if (typeof seatable !== "boolean") {
      return NextResponse.json(
        { error: "seatable must be true or false" },
        { status: 400 },
      );
    }
    data.seatable = seatable;
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (description !== undefined) data.description = str(description);
  if (color !== undefined) data.color = str(color);
  if (planX !== undefined) data.planX = toFraction(planX);
  if (planY !== undefined) data.planY = toFraction(planY);
  if (planW !== undefined) data.planW = toFraction(planW);
  if (planH !== undefined) data.planH = toFraction(planH);
  if (sortOrder !== undefined) {
    const n =
      typeof sortOrder === "number" ? sortOrder : Number(sortOrder);
    if (!Number.isInteger(n)) {
      return NextResponse.json(
        { error: "sortOrder must be an integer" },
        { status: 400 },
      );
    }
    data.sortOrder = n;
  }
  if (shape !== undefined) {
    if (!isTableShape(shape)) {
      return NextResponse.json(
        { error: "Invalid table shape" },
        { status: 400 },
      );
    }
    data.shape = shape;
  }
  if (seatCount !== undefined) {
    const seats = toSeatCount(seatCount);
    if (seats === undefined || seats === null) {
      return NextResponse.json(
        { error: "Seat count must be a whole number from 0 to 40" },
        { status: 400 },
      );
    }
    data.seatCount = seats;
  }

  try {
    const location = await prisma.location.update({ where: { id }, data });
    return NextResponse.json(location);
  } catch {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
}

// DELETE /api/locations/:id — delete a location. Its items are set to
// Unassigned automatically via the onDelete: SetNull relation.
export async function DELETE(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
}
