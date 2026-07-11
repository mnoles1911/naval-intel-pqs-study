import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

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

  const { name, description, color, planX, planY, sortOrder } = (body ??
    {}) as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      name: name.trim(),
      description: str(description),
      color: str(color),
      planX: toFraction(planX),
      planY: toFraction(planY),
      sortOrder:
        typeof sortOrder === "number" && Number.isInteger(sortOrder)
          ? sortOrder
          : 0,
    },
  });
  return NextResponse.json(location, { status: 201 });
}
