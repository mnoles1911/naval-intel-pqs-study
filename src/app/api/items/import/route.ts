import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import {
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  ITEM_PRIORITIES,
  ITEM_PRIORITY_LABELS,
} from "@/lib/constants";

export const runtime = "nodejs";

// Resolve a cell to one of `codes`, matching either the code itself or its
// human label (both case-insensitive). Returns null when the cell is blank and
// undefined when it's an unrecognized value.
function resolveEnum<T extends string>(
  cell: string,
  codes: readonly T[],
  labels: Record<T, string>,
): T | null | undefined {
  const v = cell.trim().toLowerCase();
  if (!v) return null;
  for (const code of codes) {
    if (code.toLowerCase() === v || labels[code].toLowerCase() === v) {
      return code;
    }
  }
  return undefined;
}

// POST /api/items/import — multipart form with a "file" CSV field.
// Expected headers (case-insensitive): Name (required), Quantity, Category,
// Status, Priority, Location, Vendor, Vendor URL, Notes. Adds the items to the
// existing list (does not replace). Returns { imported, skipped }.
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
      { error: "The CSV needs a header row and at least one item row." },
      { status: 400 },
    );
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = {
    name: header.indexOf("name"),
    quantity: header.indexOf("quantity"),
    category: header.indexOf("category"),
    status: header.indexOf("status"),
    priority: header.indexOf("priority"),
    location: header.indexOf("location"),
    vendor: header.indexOf("vendor"),
    vendorUrl: header.indexOf("vendor url"),
    notes: header.indexOf("notes"),
  };
  if (col.name === -1) {
    return NextResponse.json(
      { error: 'The CSV must have a "Name" column.' },
      { status: 400 },
    );
  }

  const locations = await prisma.location.findMany();
  const locByName = new Map(locations.map((l) => [l.name.toLowerCase(), l]));

  const toCreate = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? "").trim() : "");

    const name = get(col.name);
    if (!name) {
      skipped.push({ row: i + 1, reason: "Missing name" });
      continue;
    }

    let quantity = 1;
    const qRaw = get(col.quantity);
    if (qRaw) {
      const n = Number(qRaw);
      if (!Number.isInteger(n) || n < 1) {
        skipped.push({ row: i + 1, reason: `Invalid quantity "${qRaw}"` });
        continue;
      }
      quantity = n;
    }

    const category = resolveEnum(
      get(col.category),
      ITEM_CATEGORIES,
      ITEM_CATEGORY_LABELS,
    );
    if (category === undefined) {
      skipped.push({ row: i + 1, reason: `Unknown category "${get(col.category)}"` });
      continue;
    }
    const status = resolveEnum(get(col.status), ITEM_STATUSES, ITEM_STATUS_LABELS);
    if (status === undefined) {
      skipped.push({ row: i + 1, reason: `Unknown status "${get(col.status)}"` });
      continue;
    }
    const priority = resolveEnum(
      get(col.priority),
      ITEM_PRIORITIES,
      ITEM_PRIORITY_LABELS,
    );
    if (priority === undefined) {
      skipped.push({ row: i + 1, reason: `Unknown priority "${get(col.priority)}"` });
      continue;
    }

    // Location: match by name; a blank or "Unassigned" leaves it unassigned.
    let locationId: string | null = null;
    const locName = get(col.location);
    if (locName && locName.toLowerCase() !== "unassigned") {
      const loc = locByName.get(locName.toLowerCase());
      if (!loc) {
        skipped.push({ row: i + 1, reason: `Table "${locName}" not found` });
        continue;
      }
      locationId = loc.id;
    }

    toCreate.push({
      name,
      quantity,
      category: category ?? null,
      status: status ?? "NEEDED",
      priority: priority ?? "MEDIUM",
      vendorName: get(col.vendor) || null,
      vendorUrl: get(col.vendorUrl) || null,
      notes: get(col.notes) || null,
      locationId,
    });
  }

  let imported = 0;
  if (toCreate.length > 0) {
    const result = await prisma.item.createMany({ data: toCreate });
    imported = result.count;
  }
  await logAudit({
    action: "import",
    entity: "item",
    entityId: null,
    summary: `Imported ${imported} items`,
  });
  return NextResponse.json({ imported, skipped });
}
