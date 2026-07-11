import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { normalizeRsvp } from "@/lib/constants";

export const runtime = "nodejs";

// Normalise a name for matching: lower-case, strip punctuation, collapse
// whitespace. "Mrs. James  Draper" -> "mrs james draper".
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Find the first header whose name contains any of the given needles.
function findCol(header: string[], needles: string[]): number {
  return header.findIndex((h) => needles.some((n) => h.includes(n)));
}

// POST /api/guests/zola-import — multipart form with a "file" field holding a
// Zola RSVP export (CSV). Matches guests by name and updates RSVP status, meal
// choice, and dietary notes. Never creates or deletes guests; unmatched rows
// are returned so the couple can reconcile names. Idempotent — safe to re-run
// after every RSVP change.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "The file needs a header row and at least one guest row." },
      { status: 400 },
    );
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  // Zola exports either a single "name" column or separate first/last, and the
  // RSVP/meal headers may be prefixed by the event name, so match on substrings.
  const col = {
    name: findCol(header, ["guest name", "full name", "name"]),
    first: findCol(header, ["first name", "first"]),
    last: findCol(header, ["last name", "last"]),
    rsvp: findCol(header, ["rsvp", "attending", "response", "status"]),
    meal: findCol(header, ["meal", "entree", "entrée", "menu", "dinner"]),
    dietary: findCol(header, [
      "dietary",
      "restriction",
      "allergy",
      "allergies",
    ]),
  };

  const rowName = (cells: string[]): string => {
    const first = col.first >= 0 ? (cells[col.first] ?? "").trim() : "";
    const last = col.last >= 0 ? (cells[col.last] ?? "").trim() : "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return col.name >= 0 ? (cells[col.name] ?? "").trim() : "";
  };

  if (col.first < 0 && col.name < 0) {
    return NextResponse.json(
      { error: "Couldn't find a guest name column in the file." },
      { status: 400 },
    );
  }
  if (col.rsvp < 0 && col.meal < 0) {
    return NextResponse.json(
      {
        error:
          "Couldn't find an RSVP or meal column. Use Zola's 'Export RSVPs' file.",
      },
      { status: 400 },
    );
  }

  // Index existing guests by normalised name (first match wins on duplicates).
  const people = await prisma.person.findMany();
  const byName = new Map<string, (typeof people)[number]>();
  for (const p of people) {
    const key = normName(p.name);
    if (!byName.has(key)) byName.set(key, p);
  }

  let updated = 0;
  const unmatched: { name: string; rsvp: string; meal: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const name = rowName(cells);
    if (!name) continue;

    const rsvpRaw = col.rsvp >= 0 ? (cells[col.rsvp] ?? "").trim() : "";
    const mealRaw = col.meal >= 0 ? (cells[col.meal] ?? "").trim() : "";
    const dietRaw = col.dietary >= 0 ? (cells[col.dietary] ?? "").trim() : "";

    const person = byName.get(normName(name));
    if (!person) {
      unmatched.push({ name, rsvp: rsvpRaw, meal: mealRaw });
      continue;
    }

    const data: {
      rsvpStatus?: string;
      mealChoice?: string | null;
      dietaryNotes?: string | null;
    } = {};
    if (col.rsvp >= 0) data.rsvpStatus = normalizeRsvp(rsvpRaw);
    if (col.meal >= 0) data.mealChoice = mealRaw || null;
    if (col.dietary >= 0) data.dietaryNotes = dietRaw || null;

    await prisma.person.update({ where: { id: person.id }, data });
    updated += 1;
  }

  await logAudit({
    action: "import",
    entity: "person",
    summary: `Synced Zola RSVPs — updated ${updated} guest${
      updated === 1 ? "" : "s"
    }${unmatched.length ? `, ${unmatched.length} unmatched` : ""}`,
  });

  return NextResponse.json({
    updated,
    matched: updated,
    unmatchedCount: unmatched.length,
    // Cap the echoed list so the response stays small.
    unmatched: unmatched.slice(0, 100),
    totalRows: rows.length - 1,
  });
}
