import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/locations/:id — update name/description.
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

  const { name, description } = (body ?? {}) as Record<string, unknown>;
  const data: { name?: string; description?: string | null } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (description !== undefined) {
    data.description =
      typeof description === "string" && description.trim().length > 0
        ? description.trim()
        : null;
  }

  try {
    const location = await prisma.location.update({ where: { id }, data });
    return NextResponse.json(location);
  } catch {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
}

// DELETE /api/locations/:id — delete a location. Its items are set to
// Unassigned automatically via the onDelete: SetNull relation.
export async function DELETE(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
}
