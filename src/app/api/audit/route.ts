import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/audit?actor=&entity=&limit= — the audit trail, newest first.
// Optional filters: actor (matt/emma), entity (item/location/…). limit caps
// the page size (default 200, max 500).
export async function GET(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const actor = searchParams.get("actor")?.trim().toLowerCase() || undefined;
  const entity = searchParams.get("entity")?.trim().toLowerCase() || undefined;
  const limitRaw = Number(searchParams.get("limit"));
  const limit =
    Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

  const where: { actor?: string; entity?: string } = {};
  if (actor) where.actor = actor;
  if (entity) where.entity = entity;

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(entries);
}
