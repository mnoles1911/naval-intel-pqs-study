import { formatMoney } from "./money";

export interface CategoryRow {
  key: string;
  label: string;
  count: number;
  estimated: number;
  actual: number;
}

/**
 * Table of spend by category. Each row shows item count, estimated + actual
 * totals, and estimated share of the whole budget with a .meter bar. Rows are
 * expected pre-sorted by estimated total descending.
 */
export default function CategoryBreakdown({
  rows,
  totalEstimated,
}: {
  rows: CategoryRow[];
  totalEstimated: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">
          Estimated and actual spend by category
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="eyebrow py-2 pr-3 font-semibold">
              Category
            </th>
            <th scope="col" className="eyebrow py-2 px-3 text-right font-semibold">
              Items
            </th>
            <th scope="col" className="eyebrow py-2 px-3 text-right font-semibold">
              Estimated
            </th>
            <th scope="col" className="eyebrow py-2 px-3 text-right font-semibold">
              Actual
            </th>
            <th scope="col" className="eyebrow py-2 pl-3 font-semibold">
              Share of budget
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pct =
              totalEstimated > 0 ? (r.estimated / totalEstimated) * 100 : 0;
            return (
              <tr key={r.key} className="border-b border-border/70 last:border-0">
                <th scope="row" className="py-3 pr-3 text-left font-medium">
                  {r.label}
                </th>
                <td className="py-3 px-3 text-right tabular-nums text-muted">
                  {r.count}
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {formatMoney(r.estimated)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-muted">
                  {formatMoney(r.actual)}
                </td>
                <td className="py-3 pl-3">
                  <div className="flex items-center gap-3">
                    <div className="meter min-w-[6rem] flex-1">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
