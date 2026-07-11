import { prisma } from "@/lib/db";
import { requireApiAuth } from "@/lib/auth";
import {
  ITEM_STATUS_LABELS,
  ITEM_CATEGORY_LABELS,
  ITEM_PRIORITY_LABELS,
} from "@/lib/constants";

// Map a stored enum-ish string through its label table. The DB stores these
// as plain strings, so fall back to the raw value if it isn't a known key.
function label(
  table: Record<string, string>,
  key: string | null,
): string {
  if (!key) return "";
  return table[key] ?? key;
}

// Escape a single CSV field: wrap in double quotes and double any embedded
// quotes. Quoting unconditionally keeps commas, newlines, and quotes safe and
// makes the output stable/diff-friendly.
function csvField(value: unknown): string {
  const s =
    value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function csvRow(fields: unknown[]): string {
  return fields.map(csvField).join(",");
}

// GET /api/export — download all items as a CSV spreadsheet.
export async function GET() {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  const items = await prisma.item.findMany({
    include: { location: true },
    orderBy: { name: "asc" },
  });

  const header = [
    "Name",
    "Quantity",
    "Category",
    "Status",
    "Priority",
    "Location",
    "Vendor",
    "Vendor URL",
    "Notes",
  ];

  const rows = items.map((item) =>
    csvRow([
      item.name,
      item.quantity,
      label(ITEM_CATEGORY_LABELS, item.category),
      label(ITEM_STATUS_LABELS, item.status),
      label(ITEM_PRIORITY_LABELS, item.priority),
      item.location?.name ?? "Unassigned",
      item.vendorName ?? "",
      item.vendorUrl ?? "",
      item.notes ?? "",
    ]),
  );

  // CRLF line endings are the most Excel-friendly; the leading ﻿ BOM makes
  // Excel read the file as UTF-8 so accented characters open cleanly.
  const csv = "﻿" + [csvRow(header), ...rows].join("\r\n") + "\r\n";

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wedding-items.csv"',
    },
  });
}
