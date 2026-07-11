import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

// GET /api/plans/:id/export — CSV of this plan's seating.
// Columns: Guest, Party, Table, Seat. Every guest is included; unseated guests
// have blank Table/Seat so the file round-trips through import.
export async function GET(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id: planId } = await params;
  const plan = await prisma.seatingPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const [people, assignments] = await Promise.all([
    prisma.person.findMany({
      orderBy: { name: "asc" },
      include: { party: true },
    }),
    prisma.seatAssignment.findMany({
      where: { planId },
      include: { location: true },
    }),
  ]);
  const seatOf = new Map(assignments.map((a) => [a.personId, a]));

  const header = ["Guest", "Party", "Table", "Seat"].map(csvCell).join(",");
  const rows = people.map((p) => {
    const seat = seatOf.get(p.id);
    return [
      csvCell(p.name),
      csvCell(p.party?.name ?? ""),
      csvCell(seat?.location.name ?? ""),
      csvCell(seat ? seat.seatIndex + 1 : ""),
    ].join(",");
  });

  const body = "﻿" + [header, ...rows].join("\r\n") + "\r\n";
  const filename = `seating-${plan.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
