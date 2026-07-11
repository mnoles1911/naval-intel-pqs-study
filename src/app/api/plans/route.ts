import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";

// GET /api/plans — list all seating plans (oldest first).
export async function GET() {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const plans = await prisma.seatingPlan.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(plans);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// POST /api/plans — create a plan. Pass copyFromPlanId to duplicate an
// existing plan's seat assignments into the new one ("save as new version").
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, notes, copyFromPlanId } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let copyAssignments: { personId: string; locationId: string; seatIndex: number }[] =
    [];
  if (typeof copyFromPlanId === "string" && copyFromPlanId.length > 0) {
    const source = await prisma.seatingPlan.findUnique({
      where: { id: copyFromPlanId },
      include: { assignments: true },
    });
    if (!source) {
      return NextResponse.json(
        { error: "Plan to copy from was not found" },
        { status: 400 },
      );
    }
    copyAssignments = source.assignments.map((a) => ({
      personId: a.personId,
      locationId: a.locationId,
      seatIndex: a.seatIndex,
    }));
  }

  // The very first plan is active by default; otherwise the new plan is created
  // inactive and the caller can switch to it.
  const isFirst = (await prisma.seatingPlan.count()) === 0;

  const plan = await prisma.seatingPlan.create({
    data: {
      name: name.trim(),
      notes: str(notes),
      isActive: isFirst,
      assignments: copyAssignments.length
        ? { create: copyAssignments }
        : undefined,
    },
  });
  return NextResponse.json(plan, { status: 201 });
}
