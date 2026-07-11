import { formatMoney } from "./money";

export interface BudgetRow {
  key: string;
  label: string;
  estimated: number;
  actual: number;
}

/**
 * A grouped horizontal bar chart (no chart library): for each row an estimated
 * bar and an actual bar, both scaled to the largest value across all rows so
 * bars are comparable. An overall total row is rendered separately, scaled to
 * itself. Colors: estimated = accent, actual = ready/green.
 */
export default function EstimatedVsActualChart({
  rows,
  total,
}: {
  rows: BudgetRow[];
  total: { estimated: number; actual: number };
}) {
  // Scale the per-category bars to the max single value among them.
  const rowMax = Math.max(
    1,
    ...rows.map((r) => Math.max(r.estimated, r.actual)),
  );
  const totalMax = Math.max(1, total.estimated, total.actual);

  return (
    <div className="space-y-5">
      <Legend />
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.key}>
            <GroupedBar
              label={r.label}
              estimated={r.estimated}
              actual={r.actual}
              max={rowMax}
            />
          </li>
        ))}
      </ul>

      <div className="border-t border-border pt-4">
        <GroupedBar
          label="Total"
          estimated={total.estimated}
          actual={total.actual}
          max={totalMax}
          emphasize
        />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-4 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        Estimated
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-4 rounded-full"
          style={{ background: "var(--ready)" }}
        />
        Actual
      </span>
    </div>
  );
}

function GroupedBar({
  label,
  estimated,
  actual,
  max,
  emphasize = false,
}: {
  label: string;
  estimated: number;
  actual: number;
  max: number;
  emphasize?: boolean;
}) {
  const estPct = Math.max(0, Math.min(100, (estimated / max) * 100));
  const actPct = Math.max(0, Math.min(100, (actual / max) * 100));

  return (
    <div
      role="group"
      aria-label={`${label}: estimated ${formatMoney(estimated)}, actual ${formatMoney(actual)}`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span
          className={emphasize ? "font-display text-base" : "text-sm font-medium"}
        >
          {label}
        </span>
        <span className="text-xs text-muted">
          <span className="text-accent">{formatMoney(estimated)}</span>
          <span className="mx-1.5 opacity-50">/</span>
          <span className="text-ready">{formatMoney(actual)}</span>
        </span>
      </div>
      <div className="space-y-1.5">
        <Bar pct={estPct} color="var(--accent)" srLabel={`Estimated ${formatMoney(estimated)}`} />
        <Bar pct={actPct} color="var(--ready)" srLabel={`Actual ${formatMoney(actual)}`} />
      </div>
    </div>
  );
}

function Bar({
  pct,
  color,
  srLabel,
}: {
  pct: number;
  color: string;
  srLabel: string;
}) {
  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-full bg-surface-2"
      role="img"
      aria-label={srLabel}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color, minWidth: pct > 0 ? "0.5rem" : 0 }}
      />
    </div>
  );
}
