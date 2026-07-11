import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { SeatError, seatAtExactSeat, seatAtNextFree } from "@/lib/seatOps";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Minimal RFC-4180-ish CSV parser (handles quotes, commas, CRLF, BOM).
function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop rows that are entirely empty.
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

// POST /api/plans/:id/import — multipart form with a "file" CSV field.
// Expected headers (case-insensitive): Guest (required), Party, Table, Seat.
// Replaces this plan's seating. Creates guests/parties referenced by name.
export async function POST(request: Request, { params }: Params) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const { id: planId } = await params;
  const plan = await prisma.seatingPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const rows = parseCsv(await file.text());
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "The CSV needs a header row and at least one guest row." },
      { status: 400 },
    );
  }

  // Resolve columns from the header (case-insensitive).
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = {
    guest: header.indexOf("guest"),
    party: header.indexOf("party"),
    table: header.indexOf("table"),
    seat: header.indexOf("seat"),
  };
  if (col.guest === -1) {
    return NextResponse.json(
      { error: 'The CSV must have a "Guest" column.' },
      { status: 400 },
    );
  }

  // Preload lookups (case-insensitive by name).
  const [locations, people, parties] = await Promise.all([
    prisma.location.findMany(),
    prisma.person.findMany(),
    prisma.party.findMany(),
  ]);
  const locByName = new Map(locations.map((l) => [l.name.toLowerCase(), l]));
  const personByName = new Map(people.map((p) => [p.name.toLowerCase(), p]));
  const partyByName = new Map(parties.map((p) => [p.name.toLowerCase(), p]));

  // Fresh import: clear this plan's assignments, then apply the file.
  await prisma.seatAssignment.deleteMany({ where: { planId } });

  let imported = 0;
  let createdGuests = 0;
  let createdParties = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const name = (cells[col.guest] ?? "").trim();
    if (!name) {
      skipped.push({ row: i + 1, reason: "Missing guest name" });
      continue;
    }

    // Find or create the guest.
    let person = personByName.get(name.toLowerCase());
    if (!person) {
      person = await prisma.person.create({ data: { name } });
      personByName.set(name.toLowerCase(), person);
      createdGuests += 1;
    }

    // Party (optional): find or create, then attach.
    const partyName = col.party >= 0 ? (cells[col.party] ?? "").trim() : "";
    if (partyName) {
      let party = partyByName.get(partyName.toLowerCase());
      if (!party) {
        party = await prisma.party.create({ data: { name: partyName } });
        partyByName.set(partyName.toLowerCase(), party);
        createdParties += 1;
      }
      if (person.partyId !== party.id) {
        await prisma.person.update({
          where: { id: person.id },
          data: { partyId: party.id },
        });
      }
    }

    // Table + seat (optional): unseated when Table is blank.
    const tableName = col.table >= 0 ? (cells[col.table] ?? "").trim() : "";
    if (!tableName) {
      imported += 1;
      continue;
    }
    const location = locByName.get(tableName.toLowerCase());
    if (!location) {
      skipped.push({ row: i + 1, reason: `Table "${tableName}" not found` });
      continue;
    }

    const seatRaw = col.seat >= 0 ? (cells[col.seat] ?? "").trim() : "";
    try {
      if (seatRaw) {
        const seatNum = Number(seatRaw);
        if (!Number.isInteger(seatNum) || seatNum < 1) {
          skipped.push({ row: i + 1, reason: `Invalid seat "${seatRaw}"` });
          continue;
        }
        if (seatNum > location.seatCount) {
          skipped.push({
            row: i + 1,
            reason: `Seat ${seatNum} exceeds ${location.name}'s ${location.seatCount} seats`,
          });
          continue;
        }
        await seatAtExactSeat(planId, person.id, location.id, seatNum - 1);
      } else {
        await seatAtNextFree(planId, person.id, location.id, location.seatCount);
      }
      imported += 1;
    } catch (err) {
      if (err instanceof SeatError) {
        skipped.push({ row: i + 1, reason: err.message });
      } else {
        throw err;
      }
    }
  }

  await logAudit({
    action: "import",
    entity: "person",
    entityId: planId,
    summary: `Imported ${imported} guests from CSV (${createdGuests} new, ${createdParties} parties)`,
  });

  return NextResponse.json({ imported, createdGuests, createdParties, skipped });
}
