import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { LOCATION_COLORS } from "@/lib/constants";

// POST /api/people/link — { aId, bId }
// Ensures the two guests share a party:
//   - neither in a party -> create a new party with both
//   - one in a party      -> add the other to it
//   - both in parties      -> merge b's party into a's, then delete b's
// Returns { party, personIds } where personIds are everyone now in the party.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { aId, bId } = (body ?? {}) as Record<string, unknown>;
  if (typeof aId !== "string" || typeof bId !== "string" || aId === bId) {
    return NextResponse.json(
      { error: "Two different people are required" },
      { status: 400 },
    );
  }

  const [a, b] = await Promise.all([
    prisma.person.findUnique({ where: { id: aId } }),
    prisma.person.findUnique({ where: { id: bId } }),
  ]);
  if (!a || !b) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  let partyId: string;

  if (a.partyId && b.partyId) {
    if (a.partyId === b.partyId) {
      partyId = a.partyId;
    } else {
      // Merge: move everyone from b's party into a's, then remove b's party.
      partyId = a.partyId;
      const losingPartyId = b.partyId;
      await prisma.$transaction([
        prisma.person.updateMany({
          where: { partyId: losingPartyId },
          data: { partyId },
        }),
        prisma.party.delete({ where: { id: losingPartyId } }),
      ]);
    }
  } else if (a.partyId) {
    partyId = a.partyId;
    await prisma.person.update({ where: { id: b.id }, data: { partyId } });
  } else if (b.partyId) {
    partyId = b.partyId;
    await prisma.person.update({ where: { id: a.id }, data: { partyId } });
  } else {
    // Neither is in a party — create one and add both.
    const count = await prisma.party.count();
    const party = await prisma.party.create({
      data: {
        name: `${a.name} & ${b.name}`,
        color: LOCATION_COLORS[count % LOCATION_COLORS.length],
      },
    });
    partyId = party.id;
    await prisma.person.updateMany({
      where: { id: { in: [a.id, b.id] } },
      data: { partyId },
    });
  }

  const [party, members] = await Promise.all([
    prisma.party.findUnique({ where: { id: partyId } }),
    prisma.person.findMany({ where: { partyId }, select: { id: true } }),
  ]);
  await logAudit({
    action: "update",
    entity: "party",
    entityId: partyId,
    summary: `Linked "${a.name}" and "${b.name}"`,
  });
  return NextResponse.json({ party, personIds: members.map((m) => m.id) });
}
