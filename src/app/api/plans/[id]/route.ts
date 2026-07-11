import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// GET /api/plans/:id — the plan plus all of its seat assignments.
export async function GET(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const plan = await prisma.seatingPlan.findUnique({
    where: { id },
    include: { assignments: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  const { assignments, ...rest } = plan;
  return NextResponse.json({ plan: rest, assignments });
}

// PATCH /api/plans/:id — rename, edit notes, or activate. Activating one plan
// deactivates the others so exactly one is active.
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

  const { name, notes, isActive } = (body ?? {}) as Record<string, unknown>;
  const data: { name?: string; notes?: string | null; isActive?: boolean } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (notes !== undefined) data.notes = str(notes);
  if (isActive !== undefined) data.isActive = isActive === true;

  const exists = await prisma.seatingPlan.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Activating this plan deactivates every other plan, atomically.
  if (data.isActive === true) {
    await prisma.$transaction([
      prisma.seatingPlan.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      }),
      prisma.seatingPlan.update({ where: { id }, data }),
    ]);
  } else {
    await prisma.seatingPlan.update({ where: { id }, data });
  }

  const updated = await prisma.seatingPlan.findUnique({ where: { id } });
  await logAudit({
    action: "update",
    entity: "plan",
    entityId: id,
    summary: `Updated plan "${updated?.name ?? exists.name}"`,
  });
  return NextResponse.json(updated);
}

// DELETE /api/plans/:id — remove a plan (its assignments cascade). If the
// active plan is deleted, the most recent remaining plan becomes active.
export async function DELETE(_request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const plan = await prisma.seatingPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  await prisma.seatingPlan.delete({ where: { id } });

  if (plan.isActive) {
    const next = await prisma.seatingPlan.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.seatingPlan.update({
        where: { id: next.id },
        data: { isActive: true },
      });
    }
  }
  await logAudit({
    action: "delete",
    entity: "plan",
    entityId: id,
    summary: `Deleted plan "${plan.name}"`,
  });
  return NextResponse.json({ ok: true });
}
