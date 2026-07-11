import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// PATCH /api/parties/:id — rename or recolor a party.
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

  const { name, color } = (body ?? {}) as Record<string, unknown>;
  const data: { name?: string; color?: string | null } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (color !== undefined) data.color = str(color);

  try {
    const party = await prisma.party.update({ where: { id }, data });
    return NextResponse.json(party);
  } catch {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
}

// DELETE /api/parties/:id — disband a party. Its members' partyId is set back
// to null automatically via the onDelete: SetNull relation.
export async function DELETE(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    await prisma.party.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
}
