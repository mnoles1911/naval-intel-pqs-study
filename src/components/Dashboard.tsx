"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import { ITEM_STATUS_LABELS, type ItemStatus } from "@/lib/constants";
import { fetchLocations, fetchItems } from "@/lib/client";
import ItemCard from "@/components/ItemCard";

type StatusFilter = "ALL" | ItemStatus;

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
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, statusFilter]);

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
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
    return { total: items.length, purchased, needed, unassigned };
  }, [items]);

  const itemsFor = useCallback(
    (locationId: string | null) =>
      filteredItems.filter((item) => item.locationId === locationId),
    [filteredItems],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-muted">Loading your planner…</p>
      </div>
    );
  }

  const noItemsAtAll = items.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Placement Planner</h1>
          <p className="mt-1 text-muted">
            Where every item lives on the big day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/locations"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background"
          >
            Manage locations
          </Link>
          <Link
            href="/items/new"
            className="rounded-lg bg-accent px-3 py-2 font-medium text-white"
          >
            Add item
          </Link>
        </div>
      </header>

      {loadError ? (
        <p className="mt-4 text-sm text-red-500">{loadError}</p>
      ) : null}

      {noItemsAtAll ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold">Nothing here yet</h2>
          <p className="mt-2 text-muted">
            Start by adding an item, then place it at a location.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/items/new"
              className="rounded-lg bg-accent px-3 py-2 font-medium text-white"
            >
              Add your first item
            </Link>
            <Link
              href="/locations"
              className="rounded-lg border border-border px-3 py-2 font-medium hover:bg-background"
            >
              Manage locations
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Total items" value={summary.total} />
            <SummaryTile label="Purchased" value={summary.purchased} />
            <SummaryTile label="Needed" value={summary.needed} />
            <SummaryTile label="Unassigned" value={summary.unassigned} />
          </section>

          <section className="mt-6 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items by name…"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            />
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    statusFilter === f.value
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <div className="mt-8 flex flex-col gap-10">
            {sortedLocations.map((location) => (
              <LocationSection
                key={location.id}
                name={location.name}
                description={location.description}
                items={itemsFor(location.id)}
                locations={locations}
                onChange={onChange}
              />
            ))}

            <LocationSection
              name="Unassigned"
              description="Items not yet placed at a location."
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

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function LocationSection({
  name,
  description,
  items,
  locations,
  onChange,
}: {
  name: string;
  description: string | null;
  items: ItemDTO[];
  locations: LocationDTO[];
  onChange: () => void;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">{name}</h2>
        <span className="text-sm text-muted">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
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
