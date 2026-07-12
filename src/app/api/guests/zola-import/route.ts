import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { normalizeRsvp } from "@/lib/constants";

export const runtime = "nodejs";

// Normalise a name for exact matching: lower-case, drop punctuation, collapse
// whitespace. "Mrs. James  Draper" -> "mrs james draper".
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HONORIFIC = /^(mr|mrs|ms|miss|dr|mx|rev|reverend)\b/i;

// Common nickname -> formal first name, so "Matt Dinneen" matches "Matthew
// Dinneen" and "Bob Decker" matches "Robert Decker". Applied to both sides.
const NICKNAMES: Record<string, string> = {
  matt: "matthew",
  matty: "matthew",
  bob: "robert",
  bobby: "robert",
  rob: "robert",
  robbie: "robert",
  rich: "richard",
  rick: "richard",
  dick: "richard",
  mike: "michael",
  chris: "christopher",
  tom: "thomas",
  tommy: "thomas",
  jim: "james",
  jimmy: "james",
  bill: "william",
  will: "william",
  billy: "william",
  dan: "daniel",
  danny: "daniel",
  dave: "david",
  joe: "joseph",
  joey: "joseph",
  tony: "anthony",
  ben: "benjamin",
  sam: "samuel",
  ted: "theodore",
  teddy: "theodore",
  ed: "edward",
  eddie: "edward",
  nick: "nicholas",
  steve: "steven",
  andy: "andrew",
  greg: "gregory",
  jeff: "jeffrey",
  ken: "kenneth",
  larry: "lawrence",
  charlie: "charles",
  chuck: "charles",
  kate: "katherine",
  katie: "katherine",
  kathy: "katherine",
  beth: "elizabeth",
  liz: "elizabeth",
  betsy: "elizabeth",
  peggy: "margaret",
  meg: "margaret",
  maggie: "margaret",
  sue: "susan",
  suzie: "susan",
  jen: "jennifer",
  jenny: "jennifer",
  abby: "abigail",
  becky: "rebecca",
  cathy: "catherine",
  patty: "patricia",
  trish: "patricia",
  tricia: "patricia",
  debbie: "deborah",
  deb: "deborah",
};

function canonFirst(token: string): string {
  return NICKNAMES[token] ?? token;
}

// First + last token of a name, ignoring honorific and middle names, with the
// first name canonicalised through the nickname map. So "Mark Alan Adcock" and
// "Mark Adcock" match, and "Matt Dinneen" and "Matthew Dinneen" match.
function firstLast(s: string): { first: string; last: string } {
  const clean = s
    .replace(HONORIFIC, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  return { first: canonFirst(parts[0]), last: parts[parts.length - 1] };
}

function findCol(header: string[], needles: string[]): number {
  return header.findIndex((h) => needles.some((n) => h.includes(n)));
}

// Values Zola puts in an event/RSVP column. Used to auto-detect the RSVP column
// when its header is just the event name (e.g. "Our Wedding").
const RSVP_VALUES = [
  "attending",
  "declined",
  "no response",
  "accepts",
  "regrets",
  "yes",
  "no",
  "maybe",
];

// POST /api/guests/zola-import — multipart form with a "file" field holding a
// Zola RSVP export (CSV). Matches guests by name (exact, then first+last) and
// updates RSVP status, meal choice, and dietary notes. Never creates or deletes
// guests; unmatched rows are returned so the couple can reconcile names.
// Idempotent — safe to re-run after every RSVP change. An optional "event" form
// field names which event column to read as the RSVP (defaults to the wedding).
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const eventHint =
    typeof form.get("event") === "string"
      ? (form.get("event") as string).trim().toLowerCase()
      : "";

  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "The file needs a header row and at least one guest row." },
      { status: 400 },
    );
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const nameCol = findCol(header, ["guest name", "full name", "name"]);
  const firstCol = findCol(header, ["first name", "first"]);
  const lastCol = findCol(header, ["last name", "last"]);
  const mealCol = findCol(header, ["meal", "entree", "entrée", "menu", "dinner"]);
  const dietCol = findCol(header, [
    "dietary",
    "restriction",
    "allergy",
    "allergies",
  ]);

  if (firstCol < 0 && nameCol < 0) {
    return NextResponse.json(
      { error: "Couldn't find a guest name column in the file." },
      { status: 400 },
    );
  }

  // RSVP column: prefer the caller's event hint, then a header with an RSVP
  // keyword or "wedding", then auto-detect by scanning which column holds
  // RSVP-like values (rightmost wins — the wedding is usually last).
  const excluded = new Set([nameCol, firstCol, lastCol, mealCol, dietCol]);
  let rsvpCol = eventHint ? findCol(header, [eventHint]) : -1;
  if (rsvpCol < 0)
    rsvpCol = findCol(header, ["rsvp", "attending", "response", "status", "wedding"]);
  if (rsvpCol < 0) {
    for (let c = header.length - 1; c >= 0; c--) {
      if (excluded.has(c)) continue;
      let hits = 0;
      let seen = 0;
      for (let i = 1; i < rows.length; i++) {
        const cell = (rows[i][c] ?? "").trim().toLowerCase();
        if (!cell) continue;
        seen++;
        if (RSVP_VALUES.some((v) => cell.includes(v))) hits++;
      }
      if (seen > 0 && hits / seen >= 0.6) {
        rsvpCol = c;
        break;
      }
    }
  }

  if (rsvpCol < 0 && mealCol < 0) {
    return NextResponse.json(
      {
        error:
          "Couldn't find an RSVP or meal column. Use Zola's 'Export RSVPs' file.",
      },
      { status: 400 },
    );
  }

  const rowName = (cells: string[]): string => {
    const first = firstCol >= 0 ? (cells[firstCol] ?? "").trim() : "";
    const last = lastCol >= 0 ? (cells[lastCol] ?? "").trim() : "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return nameCol >= 0 ? (cells[nameCol] ?? "").trim() : "";
  };

  // Build match indexes over existing guests:
  //  - exact: normalised full name
  //  - firstLast: "first|last" for real-named guests (skip honorific
  //    placeholders like "Mrs. John Smith" and any ambiguous key).
  const people = await prisma.person.findMany();
  const exact = new Map<string, (typeof people)[number]>();
  const fl = new Map<string, (typeof people)[number]>();
  const flDup = new Set<string>();
  for (const p of people) {
    const k = normName(p.name);
    if (!exact.has(k)) exact.set(k, p);
    if (HONORIFIC.test(p.name.trim())) continue;
    const { first, last } = firstLast(p.name);
    if (!first || !last) continue;
    const key = `${first}|${last}`;
    if (fl.has(key)) flDup.add(key);
    else fl.set(key, p);
  }

  let updated = 0;
  const unmatched: { name: string; rsvp: string; meal: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const name = rowName(cells);
    if (!name || /^guest$/i.test(name)) continue; // skip "+1 / Guest" placeholders

    const rsvpRaw = rsvpCol >= 0 ? (cells[rsvpCol] ?? "").trim() : "";
    const mealRaw = mealCol >= 0 ? (cells[mealCol] ?? "").trim() : "";
    const dietRaw = dietCol >= 0 ? (cells[dietCol] ?? "").trim() : "";

    let person = exact.get(normName(name));
    if (!person) {
      const { first, last } = firstLast(name);
      const key = `${first}|${last}`;
      if (first && last && !flDup.has(key)) person = fl.get(key);
    }
    if (!person) {
      unmatched.push({ name, rsvp: rsvpRaw, meal: mealRaw });
      continue;
    }

    const data: {
      rsvpStatus?: string;
      mealChoice?: string | null;
      dietaryNotes?: string | null;
    } = {};
    if (rsvpCol >= 0) data.rsvpStatus = normalizeRsvp(rsvpRaw);
    if (mealCol >= 0) data.mealChoice = mealRaw || null;
    if (dietCol >= 0) data.dietaryNotes = dietRaw || null;

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
    unmatched: unmatched.slice(0, 100),
    totalRows: rows.length - 1,
  });
}
