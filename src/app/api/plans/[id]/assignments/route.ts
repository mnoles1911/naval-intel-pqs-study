import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { SeatError, seatAtExactSeat, seatAtNextFree } from "@/lib/seatOps";

type Params = { params: Promise<{ id: string }> };

// Return the plan's full assignment list (so the client can resync after a
// swap that may have moved more than one guest).
async function assignmentsFor(planId: string) {
  return prisma.seatAssignment.findMany({ where: { planId } });
}

// POST /api/plans/:id/assignments — seat a guest.
//   { personId, locationId }              -> next free seat at the table
//   { personId, locationId, seatIndex }   -> that exact seat (swaps occupant)
export async function POST(request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id: planId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { personId, locationId, seatIndex } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof personId !== "string" || typeof locationId !== "string") {
    return NextResponse.json(
      { error: "personId and locationId are required" },
      { status: 400 },
    );
  }

  const [plan, person, location] = await Promise.all([
    prisma.seatingPlan.findUnique({ where: { id: planId } }),
    prisma.person.findUnique({ where: { id: personId } }),
    prisma.location.findUnique({ where: { id: locationId } }),
  ]);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (!person)
    return NextResponse.json({ error: "Guest not found" }, { status: 400 });
  if (!location)
    return NextResponse.json({ error: "Table not found" }, { status: 400 });

  try {
    if (seatIndex === undefined || seatIndex === null) {
      await seatAtNextFree(planId, personId, locationId, location.seatCount);
    } else {
      const n = typeof seatIndex === "number" ? seatIndex : Number(seatIndex);
      if (!Number.isInteger(n) || n < 0 || n >= location.seatCount) {
        return NextResponse.json(
          { error: "Seat is out of range for this table" },
          { status: 400 },
        );
      }
      await seatAtExactSeat(planId, personId, locationId, n);
    }
  } catch (err) {
    if (err instanceof SeatError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  await logAudit({
    action: "assign",
    entity: "seat",
    entityId: null,
    summary: `Seated "${person.name}" at "${location.name}"`,
  });
  return NextResponse.json(await assignmentsFor(planId));
}

// DELETE /api/plans/:id/assignments?personId=... — unseat a guest.
export async function DELETE(request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id: planId } = await params;
  const personId = new URL(request.url).searchParams.get("personId");
  if (!personId) {
    return NextResponse.json({ error: "personId is required" }, { status: 400 });
  }

  const person = await prisma.person.findUnique({ where: { id: personId } });
  await prisma.seatAssignment.deleteMany({ where: { planId, personId } });
  await logAudit({
    action: "unassign",
    entity: "seat",
    entityId: null,
    summary: person ? `Unseated "${person.name}"` : `Unseated ${personId}`,
  });
  return NextResponse.json({ ok: true });
}
