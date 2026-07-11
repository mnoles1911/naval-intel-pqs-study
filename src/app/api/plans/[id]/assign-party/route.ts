import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { SeatError, seatAtNextFree } from "@/lib/seatOps";

type Params = { params: Promise<{ id: string }> };

// POST /api/plans/:id/assign-party — { personId, locationId }
// Seats the guest and the rest of their party into free seats at the table so
// they stay together. Members that don't fit are skipped. The dragged guest is
// seated first. Returns { assignments, seated, skipped }.
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

  const { personId, locationId } = (body ?? {}) as Record<string, unknown>;
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

  // Order: the dragged guest first, then the rest of their party.
  const members = person.partyId
    ? [
        person,
        ...(await prisma.person.findMany({
          where: { partyId: person.partyId, id: { not: person.id } },
          orderBy: { name: "asc" },
        })),
      ]
    : [person];

  let seated = 0;
  let skipped = 0;
  for (const m of members) {
    try {
      await seatAtNextFree(planId, m.id, locationId, location.seatCount);
      seated += 1;
    } catch (err) {
      if (err instanceof SeatError) skipped += 1;
      else throw err;
    }
  }

  const assignments = await prisma.seatAssignment.findMany({ where: { planId } });
  return NextResponse.json({ assignments, seated, skipped });
}
