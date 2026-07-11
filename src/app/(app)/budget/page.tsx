"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  type ItemCategory,
} from "@/lib/constants";
import { fetchItems, fetchLocations } from "@/lib/client";
import { formatMoney } from "@/components/budget/money";
import StatTile from "@/components/budget/StatTile";
import EstimatedVsActualChart, {
  type BudgetRow,
} from "@/components/budget/EstimatedVsActualChart";
import CategoryBreakdown, {
  type CategoryRow,
} from "@/components/budget/CategoryBreakdown";
import LocationSpend, {
  type LocationSpendRow,
} from "@/components/budget/LocationSpend";

const UNCATEGORIZED = "UNCATEGORIZED";
const UNASSIGNED = "UNASSIGNED";

export default function BudgetPage() {
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [its, locs] = await Promise.all([
          fetchItems(),
          fetchLocations(),
        ]);
        if (!active) return;
        setItems(its);
        setLocations(locs);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load budget data.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    let estimated = 0;
    let actual = 0;
    let missingEstimate = 0;
    for (const it of items) {
      if (it.estimatedCost != null) estimated += it.estimatedCost;
      else missingEstimate += 1;
      if (it.actualCost != null) actual += it.actualCost;
    }
    return {
      estimated,
      actual,
      variance: actual - estimated,
      missingEstimate,
    };
  }, [items]);

  // Aggregate by category (null -> Uncategorized), sorted by estimated desc.
  const categoryRows = useMemo<CategoryRow[]>(() => {
    const acc = new Map<
      string,
      { label: string; count: number; estimated: number; actual: number }
    >();
    const labelFor = (cat: ItemCategory | null) =>
      cat ? ITEM_CATEGORY_LABELS[cat] : "Uncategorized";

    for (const it of items) {
      const key = it.category ?? UNCATEGORIZED;
      const entry =
        acc.get(key) ??
        { label: labelFor(it.category), count: 0, estimated: 0, actual: 0 };
      entry.count += 1;
      entry.estimated += it.estimatedCost ?? 0;
      entry.actual += it.actualCost ?? 0;
      acc.set(key, entry);
    }

    // Stable category ordering underneath the estimated-desc sort.
    const order = [...ITEM_CATEGORIES, UNCATEGORIZED];
    return [...acc.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort(
        (a, b) =>
          b.estimated - a.estimated ||
          order.indexOf(a.key as ItemCategory) -
            order.indexOf(b.key as ItemCategory),
      );
  }, [items]);

  // Bars only make sense where there's money to show.
  const chartRows = useMemo<BudgetRow[]>(
    () =>
      categoryRows
        .filter((r) => r.estimated > 0 || r.actual > 0)
        .map((r) => ({
          key: r.key,
          label: r.label,
          estimated: r.estimated,
          actual: r.actual,
        })),
    [categoryRows],
  );

  const locationRows = useMemo<LocationSpendRow[]>(() => {
    const byLoc = new Map<string, number>();
    for (const it of items) {
      const key = it.locationId ?? UNASSIGNED;
      byLoc.set(key, (byLoc.get(key) ?? 0) + (it.estimatedCost ?? 0));
    }
    const rows: LocationSpendRow[] = locations.map((loc) => ({
      key: loc.id,
      label: loc.name,
      color: loc.color,
      estimated: byLoc.get(loc.id) ?? 0,
    }));
    if (byLoc.has(UNASSIGNED)) {
      rows.push({
        key: UNASSIGNED,
        label: "Unassigned",
        color: null,
        estimated: byLoc.get(UNASSIGNED) ?? 0,
      });
    }
    return rows.sort((a, b) => b.estimated - a.estimated);
  }, [items, locations]);

  if (loading) {
    return <p className="text-muted">Tallying your budget…</p>;
  }

  if (error) {
    return (
      <div className="card p-6" role="alert">
        <h1 className="text-lg font-semibold">Couldn’t load the budget</h1>
        <p className="mt-1 text-sm text-danger">{error}</p>
      </div>
    );
  }

  const hasCosts = summary.estimated > 0 || summary.actual > 0;
  const locationsHaveCosts = locationRows.some((r) => r.estimated > 0);
  const overBudget = summary.variance > 0;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="eyebrow">Money</p>
        <h1 className="font-display text-3xl">Budget</h1>
        <p className="text-muted">
          Estimated versus actual spend across every item and location.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="No items to budget yet"
          body="Add items with estimated and actual costs to see your budget take shape."
          cta
        />
      ) : (
        <>
          <section aria-label="Budget summary">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Estimated"
                value={formatMoney(summary.estimated)}
              />
              <StatTile label="Actual" value={formatMoney(summary.actual)} />
              <StatTile
                label={overBudget ? "Over budget" : "Under budget"}
                value={`${summary.variance > 0 ? "+" : ""}${formatMoney(
                  summary.variance,
                )}`}
                tone={
                  summary.variance === 0
                    ? "muted"
                    : overBudget
                      ? "over"
                      : "under"
                }
                hint={
                  summary.variance === 0
                    ? "Right on estimate"
                    : overBudget
                      ? "Actual above estimate"
                      : "Actual below estimate"
                }
              />
              <StatTile
                label="Missing estimate"
                value={summary.missingEstimate}
                tone="muted"
                hint={
                  summary.missingEstimate === 1
                    ? "1 item has no estimate"
                    : `${summary.missingEstimate} items have no estimate`
                }
              />
            </div>
          </section>

          <section aria-labelledby="eva-heading" className="space-y-4">
            <div>
              <h2 id="eva-heading" className="text-lg font-semibold">
                Estimated vs Actual
              </h2>
              <p className="text-sm text-muted">By category, with an overall total.</p>
            </div>
            {chartRows.length > 0 ? (
              <div className="card p-6">
                <EstimatedVsActualChart
                  rows={chartRows}
                  total={{
                    estimated: summary.estimated,
                    actual: summary.actual,
                  }}
                />
              </div>
            ) : (
              <EmptyState
                title="No costs entered yet"
                body="Add an estimated or actual cost to an item to compare spend."
              />
            )}
          </section>

          <section aria-labelledby="cat-heading" className="space-y-4">
            <div>
              <h2 id="cat-heading" className="text-lg font-semibold">
                Category breakdown
              </h2>
              <p className="text-sm text-muted">
                Share of the estimated budget, largest first.
              </p>
            </div>
            <div className="card p-4 sm:p-6">
              <CategoryBreakdown
                rows={categoryRows}
                totalEstimated={summary.estimated}
              />
            </div>
          </section>

          <section aria-labelledby="loc-heading" className="space-y-4">
            <div>
              <h2 id="loc-heading" className="text-lg font-semibold">
                Estimated spend by location
              </h2>
              <p className="text-sm text-muted">Where the budget is going.</p>
            </div>
            {locationsHaveCosts ? (
              <div className="card p-6">
                <LocationSpend rows={locationRows} />
              </div>
            ) : (
              <EmptyState
                title="No location estimates yet"
                body="Assign items to locations and give them estimated costs to see this split."
              />
            )}
          </section>

          {!hasCosts ? (
            <p className="text-sm text-muted">
              Tip: enter estimated and actual costs on your items to unlock the
              full budget picture.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta = false,
}: {
  title: string;
  body: string;
  cta?: boolean;
}) {
  return (
    <div className="card p-10 text-center">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>
      {cta ? (
        <div className="mt-5">
          <Link href="/items/new" className="btn btn-primary">
            Add your first item
          </Link>
        </div>
      ) : null}
    </div>
  );
}
