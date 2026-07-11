import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

// GET /api/people — list all guests (alphabetical).
export async function GET() {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(people);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// POST /api/people — create a guest. Seating happens per-plan, so no seat here.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, notes, partyId } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let resolvedPartyId: string | null = null;
  if (typeof partyId === "string" && partyId.length > 0) {
    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 400 });
    }
    resolvedPartyId = partyId;
  }

  const person = await prisma.person.create({
    data: { name: name.trim(), notes: str(notes), partyId: resolvedPartyId },
  });
  return NextResponse.json(person, { status: 201 });
}
