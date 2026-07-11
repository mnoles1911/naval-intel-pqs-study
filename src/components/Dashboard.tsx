"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  ITEM_STATUS_LABELS,
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  type ItemStatus,
  type ItemCategory,
} from "@/lib/constants";
import { fetchLocations, fetchItems } from "@/lib/client";
import ItemCard from "@/components/ItemCard";

type StatusFilter = "ALL" | ItemStatus;
type CategoryFilter = "ALL" | ItemCategory;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "NEEDED", label: ITEM_STATUS_LABELS.NEEDED },
  { value: "PURCHASED", label: ITEM_STATUS_LABELS.PURCHASED },
];

export default function Dashboard() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const [locs, its] = await Promise.all([fetchLocations(), fetchItems()]);
      setLocations(locs);
      setItems(its);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [locs, its] = await Promise.all([fetchLocations(), fetchItems()]);
        if (!active) return;
        setLocations(locs);
        setItems(its);
      } catch (err) {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load data",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onChange = useCallback(() => {
    void reload();
  }, [reload]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && item.category !== categoryFilter)
        return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, statusFilter, categoryFilter]);

  const sortedLocations = useMemo(
    () =>
      [...locations].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [locations],
  );

  const summary = useMemo(() => {
    let purchased = 0;
    let needed = 0;
    let unassigned = 0;
    for (const item of items) {
      if (item.status === "PURCHASED") purchased += 1;
      else needed += 1;
      if (item.locationId === null) unassigned += 1;
    }
    return {
      total: items.length,
      purchased,
      needed,
      unassigned,
    };
  }, [items]);

  const purchasedPct =
    summary.total === 0
      ? 0
      : Math.round((summary.purchased / summary.total) * 100);

  const itemsFor = useCallback(
    (locationId: string | null) =>
      filteredItems.filter((item) => item.locationId === locationId),
    [filteredItems],
  );

  if (loading) {
    return <p className="text-muted">Loading your planner…</p>;
  }

  const noItemsAtAll = items.length === 0;

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Wedding day</p>
          <h1 className="font-display text-3xl sm:text-4xl">
            Placement Planner
          </h1>
          <p className="mt-1 text-muted">
            Where every item lives on the big day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/locations" className="btn btn-ghost">
            Manage locations
          </Link>
          <Link href="/items/new" className="btn btn-primary">
            Add item
          </Link>
        </div>
      </header>

      {loadError ? (
        <p className="mt-4 text-sm text-danger">{loadError}</p>
      ) : null}

      {noItemsAtAll ? (
        <div className="toile-veil card mt-10 p-10 text-center">
          <h2 className="font-display text-2xl">Nothing here yet</h2>
          <p className="mt-2 text-muted">
            Start by adding an item, then place it at a location.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/items/new" className="btn btn-primary">
              Add your first item
            </Link>
            <Link href="/locations" className="btn btn-ghost">
              Manage locations
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Total items" value={summary.total} />
            <SummaryTile
              label="Purchased"
              value={summary.purchased}
              accent="text-purchased"
            />
            <SummaryTile
              label="Needed"
              value={summary.needed}
              accent="text-needed"
            />
            <SummaryTile label="Unassigned" value={summary.unassigned} />
          </section>

          <section className="card mt-4 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">Purchased</span>
              <span className="text-sm text-muted">
                {summary.purchased} of {summary.total} · {purchasedPct}%
              </span>
            </div>
            <div className="meter mt-2">
              <span
                style={{
                  width: `${purchasedPct}%`,
                  background: "var(--purchased)",
                }}
              />
            </div>
          </section>

          <section className="mt-6 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items by name…"
              className="input min-w-0 flex-1"
            />
            <div className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors cursor-pointer ${
                    statusFilter === f.value
                      ? "bg-accent text-on-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as CategoryFilter)
              }
              aria-label="Filter by category"
              className="input w-auto"
            >
              <option value="ALL">All categories</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ITEM_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </section>

          <div className="mt-8 flex flex-col gap-10">
            {sortedLocations.map((location) => (
              <LocationSection
                key={location.id}
                name={location.name}
                description={location.description}
                color={location.color}
                items={itemsFor(location.id)}
                locations={locations}
                onChange={onChange}
              />
            ))}

            <LocationSection
              name="Unassigned"
              description="Items not yet placed at a location."
              color={null}
              items={itemsFor(null)}
              locations={locations}
              onChange={onChange}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <div className={`text-2xl font-semibold ${accent ?? ""}`}>{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function LocationSection({
  name,
  description,
  color,
  items,
  locations,
  onChange,
}: {
  name: string;
  description: string | null;
  color: string | null;
  items: ItemDTO[];
  locations: LocationDTO[];
  onChange: () => void;
}) {
  const purchasedCount = items.filter(
    (it) => it.status === "PURCHASED",
  ).length;
  const purchasedPct =
    items.length === 0 ? 0 : Math.round((purchasedCount / items.length) * 100);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: color ?? "var(--accent)" }}
        />
        <h2 className="font-display text-2xl">{name}</h2>
        <span className="text-sm text-muted">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        {items.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="meter h-1.5 w-24">
              <span
                style={{ width: `${purchasedPct}%`, background: "var(--purchased)" }}
              />
            </div>
            <span className="text-xs text-muted">{purchasedPct}% purchased</span>
          </div>
        ) : null}
      </div>
      {description ? (
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No items here yet.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              locations={locations}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}
