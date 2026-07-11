import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  type ItemCategory,
} from "@/lib/constants";

interface QuantityRollupProps {
  items: ItemDTO[];
  locations: LocationDTO[];
}

const UNCATEGORIZED = "__uncategorized__";
const UNASSIGNED_LOC = "__unassigned__";

interface Bucket {
  key: string;
  label: string;
  qty: number;
  color?: string | null;
}

export default function QuantityRollup({
  items,
  locations,
}: QuantityRollupProps) {
  const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const itemCount = items.length;

  // --- By category ---
  const categoryQty = new Map<string, number>();
  for (const it of items) {
    const key = it.category ?? UNCATEGORIZED;
    categoryQty.set(key, (categoryQty.get(key) ?? 0) + (it.quantity || 0));
  }
  const categoryBuckets: Bucket[] = [];
  for (const cat of ITEM_CATEGORIES) {
    const qty = categoryQty.get(cat);
    if (qty) {
      categoryBuckets.push({
        key: cat,
        label: ITEM_CATEGORY_LABELS[cat as ItemCategory],
        qty,
      });
    }
  }
  if (categoryQty.get(UNCATEGORIZED)) {
    categoryBuckets.push({
      key: UNCATEGORIZED,
      label: "Uncategorized",
      qty: categoryQty.get(UNCATEGORIZED)!,
    });
  }
  categoryBuckets.sort((a, b) => b.qty - a.qty);
  const maxCategoryQty = categoryBuckets.reduce(
    (m, b) => Math.max(m, b.qty),
    0,
  );

  // --- By location ---
  const locationQty = new Map<string, number>();
  for (const it of items) {
    const key = it.locationId ?? UNASSIGNED_LOC;
    locationQty.set(key, (locationQty.get(key) ?? 0) + (it.quantity || 0));
  }
  const locationBuckets: Bucket[] = [];
  for (const loc of locations) {
    const qty = locationQty.get(loc.id);
    if (qty) {
      locationBuckets.push({
        key: loc.id,
        label: loc.name,
        qty,
        color: loc.color,
      });
    }
  }
  locationBuckets.sort((a, b) => b.qty - a.qty);
  if (locationQty.get(UNASSIGNED_LOC)) {
    locationBuckets.push({
      key: UNASSIGNED_LOC,
      label: "Unassigned",
      qty: locationQty.get(UNASSIGNED_LOC)!,
    });
  }
  const maxLocationQty = locationBuckets.reduce(
    (m, b) => Math.max(m, b.qty),
    0,
  );

  // --- Shopping list (group by name, case-insensitive) ---
  const shoppingMap = new Map<string, { label: string; qty: number }>();
  for (const it of items) {
    const key = it.name.trim().toLowerCase();
    const existing = shoppingMap.get(key);
    if (existing) {
      existing.qty += it.quantity || 0;
    } else {
      shoppingMap.set(key, { label: it.name.trim(), qty: it.quantity || 0 });
    }
  }
  const shoppingList = Array.from(shoppingMap.values()).sort(
    (a, b) => b.qty - a.qty,
  );

  if (itemCount === 0) return null;

  return (
    <section className="card space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl sm:text-2xl">Quantity totals</h2>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{totalQty}</span> pieces
          across{" "}
          <span className="font-medium text-foreground">{itemCount}</span>{" "}
          {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* By category */}
        <div className="space-y-3">
          <h3 className="eyebrow">By category</h3>
          {categoryBuckets.length === 0 ? (
            <p className="text-sm text-muted">No items yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {categoryBuckets.map((b) => (
                <li key={b.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{b.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {b.qty}
                    </span>
                  </div>
                  <div
                    className="meter"
                    role="progressbar"
                    aria-valuenow={b.qty}
                    aria-valuemin={0}
                    aria-valuemax={maxCategoryQty}
                    aria-label={`${b.label}: ${b.qty}`}
                  >
                    <span
                      style={{
                        width: `${
                          maxCategoryQty > 0
                            ? (b.qty / maxCategoryQty) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* By location */}
        <div className="space-y-3">
          <h3 className="eyebrow">By table</h3>
          {locationBuckets.length === 0 ? (
            <p className="text-sm text-muted">Nothing assigned yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {locationBuckets.map((b) => (
                <li key={b.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="dot shrink-0"
                        style={{
                          background: b.color ?? "var(--accent)",
                        }}
                      />
                      <span className="truncate">{b.label}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {b.qty}
                    </span>
                  </div>
                  <div
                    className="meter"
                    role="progressbar"
                    aria-valuenow={b.qty}
                    aria-valuemin={0}
                    aria-valuemax={maxLocationQty}
                    aria-label={`${b.label}: ${b.qty}`}
                  >
                    <span
                      style={{
                        width: `${
                          maxLocationQty > 0
                            ? (b.qty / maxLocationQty) * 100
                            : 0
                        }%`,
                        background: b.color ?? "var(--accent)",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Shopping list */}
      <div className="space-y-3">
        <h3 className="eyebrow">Shopping list</h3>
        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {shoppingList.map((row) => (
            <li
              key={row.label.toLowerCase()}
              className="flex items-baseline justify-between gap-2 border-b border-border py-1 text-sm"
            >
              <span className="truncate">{row.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-accent">
                {row.qty}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
