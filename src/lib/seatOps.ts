// Server-side seat placement logic, shared by the assignment, party, and CSV
// import routes. Import only from route handlers (this pulls in Prisma).

import { prisma } from "@/lib/db";

export class SeatError extends Error {}

// The lowest free seat index at a table in a plan, or null if the table is
// full. A seat already held by `ignorePersonId` counts as free (so re-seating
// the same guest doesn't report the table as full).
export async function nextFreeSeatIndex(
  planId: string,
  locationId: string,
  seatCount: number,
  ignorePersonId?: string,
): Promise<number | null> {
  const taken = await prisma.seatAssignment.findMany({
    where: { planId, locationId },
    select: { seatIndex: true, personId: true },
  });
  const used = new Set(
    taken.filter((t) => t.personId !== ignorePersonId).map((t) => t.seatIndex),
  );
  for (let i = 0; i < seatCount; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

// Seat a guest at an exact seat, swapping with any current occupant. If the
// guest already sits there this is a no-op.
export async function seatAtExactSeat(
  planId: string,
  personId: string,
  locationId: string,
  seatIndex: number,
): Promise<void> {
  const occupant = await prisma.seatAssignment.findUnique({
    where: { planId_locationId_seatIndex: { planId, locationId, seatIndex } },
  });
  if (occupant?.personId === personId) return;

  const mine = await prisma.seatAssignment.findUnique({
    where: { planId_personId: { planId, personId } },
  });

  const ops = [];
  // Remove both existing rows first so the unique constraints don't collide,
  // then recreate in the new arrangement.
  if (occupant) {
    ops.push(prisma.seatAssignment.delete({ where: { id: occupant.id } }));
  }
  if (mine) {
    ops.push(prisma.seatAssignment.delete({ where: { id: mine.id } }));
  }
  ops.push(
    prisma.seatAssignment.create({
      data: { planId, personId, locationId, seatIndex },
    }),
  );
  // If both seats were occupied, the displaced occupant takes the mover's old
  // seat (a swap). Otherwise they are simply bumped to Unseated.
  if (occupant && mine) {
    ops.push(
      prisma.seatAssignment.create({
        data: {
          planId,
          personId: occupant.personId,
          locationId: mine.locationId,
          seatIndex: mine.seatIndex,
        },
      }),
    );
  }
  await prisma.$transaction(ops);
}

// Seat a guest at a table's next free seat. If they already sit at that table
// this is a no-op. Throws SeatError when the table is full.
export async function seatAtNextFree(
  planId: string,
  personId: string,
  locationId: string,
  seatCount: number,
): Promise<number> {
  const mine = await prisma.seatAssignment.findUnique({
    where: { planId_personId: { planId, personId } },
  });
  if (mine && mine.locationId === locationId) return mine.seatIndex;

  const idx = await nextFreeSeatIndex(planId, locationId, seatCount, personId);
  if (idx === null) throw new SeatError("That table is full.");
  await seatAtExactSeat(planId, personId, locationId, idx);
  return idx;
}
