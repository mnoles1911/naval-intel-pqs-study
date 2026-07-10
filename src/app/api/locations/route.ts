import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

// GET /api/locations — list all locations (alphabetical).
export async function GET() {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
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

  const { name, description } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      name: name.trim(),
      description:
        typeof description === "string" && description.trim().length > 0
          ? description.trim()
          : null,
    },
  });
  return NextResponse.json(location, { status: 201 });
}
