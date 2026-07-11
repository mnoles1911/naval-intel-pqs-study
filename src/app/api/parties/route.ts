import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

// GET /api/parties — list all parties (guest groups).
export async function GET() {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const parties = await prisma.party.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(parties);
}
