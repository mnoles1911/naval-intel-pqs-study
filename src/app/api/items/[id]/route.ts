import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { isItemStatus, UNASSIGNED } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

// GET /api/items/:id — fetch a single item.
export async function GET(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

// PATCH /api/items/:id — partial update. Any subset of fields may be sent.
// Set locationId to the UNASSIGNED sentinel (or null) to unassign.
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

  const { name, description, status, photoUrl, locationId } = (body ??
    {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

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
  if (status !== undefined) {
    if (!isItemStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = status;
  }
  if (photoUrl !== undefined) {
    data.photoUrl =
      typeof photoUrl === "string" && photoUrl.length > 0 ? photoUrl : null;
  }
  if (locationId !== undefined) {
    if (
      locationId === null ||
      locationId === UNASSIGNED ||
      locationId === ""
    ) {
      data.locationId = null;
    } else if (typeof locationId === "string") {
      const loc = await prisma.location.findUnique({
        where: { id: locationId },
      });
      if (!loc) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 400 },
        );
      }
      data.locationId = locationId;
    }
  }

  try {
    const item = await prisma.item.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}

// DELETE /api/items/:id
export async function DELETE(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  try {
    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
}
