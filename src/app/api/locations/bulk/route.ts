import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { isTableShape } from "@/lib/constants";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// POST /api/locations/bulk — create many locations (tables) at once.
// Body: { locations: Array<{ name, description?, color?, shape?, seatCount?,
//   sortOrder? }> }. Used to lay out a whole floor of identical round tables in
// one action. Returns { count }.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body as { locations?: unknown })?.locations;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty locations array" },
      { status: 400 },
    );
  }
  if (raw.length > 200) {
    return NextResponse.json(
      { error: "Too many tables at once (max 200)" },
      { status: 400 },
    );
  }

  const data = [];
  for (let i = 0; i < raw.length; i++) {
    const loc = (raw[i] ?? {}) as Record<string, unknown>;
    const name = loc.name;
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: `Table ${i + 1} is missing a name` },
        { status: 400 },
      );
    }
    if (loc.shape !== undefined && !isTableShape(loc.shape)) {
      return NextResponse.json(
        { error: `Table ${i + 1} has an invalid shape` },
        { status: 400 },
      );
    }
    if (loc.seatable !== undefined && typeof loc.seatable !== "boolean") {
      return NextResponse.json(
        { error: `Table ${i + 1} has an invalid seatable flag` },
        { status: 400 },
      );
    }
    let seatCount = 8;
    if (loc.seatCount !== undefined && loc.seatCount !== null) {
      const n =
        typeof loc.seatCount === "number"
          ? loc.seatCount
          : Number(loc.seatCount);
      if (!Number.isInteger(n) || n < 0 || n > 40) {
        return NextResponse.json(
          { error: `Table ${i + 1} needs a whole seat count from 0 to 40` },
          { status: 400 },
        );
      }
      seatCount = n;
    }
    let sortOrder = 0;
    if (typeof loc.sortOrder === "number" && Number.isInteger(loc.sortOrder)) {
      sortOrder = loc.sortOrder;
    }

    data.push({
      name: name.trim(),
      description: str(loc.description),
      color: str(loc.color),
      seatable: typeof loc.seatable === "boolean" ? loc.seatable : true,
      shape: isTableShape(loc.shape) ? loc.shape : "ROUND",
      seatCount,
      sortOrder,
    });
  }

  const result = await prisma.location.createMany({ data });
  return NextResponse.json({ count: result.count }, { status: 201 });
}
