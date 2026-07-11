import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { UNASSIGNED } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// GET /api/people/:id
export async function GET(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
  return NextResponse.json(person);
}

// PATCH /api/people/:id — update name/notes/party/location. Set partyId or
// locationId to null (or the UNASSIGNED sentinel) to clear them.
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

  const { name, notes, partyId } = (body ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (notes !== undefined) data.notes = str(notes);

  if (partyId !== undefined) {
    if (partyId === null || partyId === "" || partyId === UNASSIGNED) {
      data.partyId = null;
    } else if (typeof partyId === "string") {
      const party = await prisma.party.findUnique({ where: { id: partyId } });
      if (!party) {
        return NextResponse.json({ error: "Party not found" }, { status: 400 });
      }
      data.partyId = partyId;
    }
  }

  try {
    const person = await prisma.person.update({ where: { id }, data });
    // Clean up a party that has been emptied (or left with a single member) by
    // this change, so stale one-person parties don't linger.
    if (partyId !== undefined) await pruneEmptyParties();
    await logAudit({
      action: "update",
      entity: "person",
      entityId: person.id,
      summary: `Updated guest "${person.name}"`,
    });
    return NextResponse.json(person);
  } catch {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
}

// DELETE /api/people/:id
export async function DELETE(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    const existing = await prisma.person.findUnique({ where: { id } });
    await prisma.person.delete({ where: { id } });
    await pruneEmptyParties();
    await logAudit({
      action: "delete",
      entity: "person",
      entityId: id,
      summary: existing
        ? `Deleted guest "${existing.name}"`
        : `Deleted guest ${id}`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
}

// A party only means something with two or more members. Delete any party that
// has dropped below that so it stops showing up as an empty group.
async function pruneEmptyParties(): Promise<void> {
  const parties = await prisma.party.findMany({
    include: { _count: { select: { people: true } } },
  });
  const stale = parties.filter((p) => p._count.people < 2).map((p) => p.id);
  if (stale.length > 0) {
    await prisma.party.deleteMany({ where: { id: { in: stale } } });
  }
}
