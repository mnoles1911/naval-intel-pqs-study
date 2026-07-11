import { formatMoney } from "./money";

export interface LocationSpendRow {
  key: string;
  label: string;
  color: string | null;
  estimated: number;
}

/**
 * Compact estimated-spend-per-location list. Each row uses the location's own
 * accent color for its dot and bar; the "Unassigned" row falls back to muted.
 * Rows are expected pre-sorted by estimated total descending.
 */
export default function LocationSpend({ rows }: { rows: LocationSpendRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.estimated));

  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const pct = Math.max(0, Math.min(100, (r.estimated / max) * 100));
        const color = r.color ?? "var(--muted)";
        return (
          <li
            key={r.key}
            aria-label={`${r.label}: estimated ${formatMoney(r.estimated)}`}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  aria-hidden
                  className="dot"
                  style={{ background: color }}
                />
                {r.label}
              </span>
              <span className="text-xs tabular-nums text-muted">
                {formatMoney(r.estimated)}
              </span>
            </div>
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`Estimated ${formatMoney(r.estimated)}`}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  background: color,
                  minWidth: r.estimated > 0 ? "0.5rem" : 0,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
