"use client";

import { useEffect, useMemo, useState } from "react";
import type { LocationDTO, ItemDTO } from "@/lib/types";
import { fetchLocations, fetchItems } from "@/lib/client";
import SetupSection from "@/components/setup/SetupSection";

export default function SetupPage() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [locs, its] = await Promise.all([fetchLocations(), fetchItems()]);
        if (!active) return;
        setLocations(locs);
        setItems(its);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load setup sheets.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Locations ordered by sortOrder, then name as a tiebreaker.
  const orderedLocations = useMemo(
    () =>
      [...locations].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [locations],
  );

  // Group items by location for quick lookup, keeping name order.
  const { byLocation, unassigned } = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map<string, ItemDTO[]>();
    const loose: ItemDTO[] = [];
    for (const item of sorted) {
      if (item.locationId === null) {
        loose.push(item);
      } else {
        const list = map.get(item.locationId) ?? [];
        list.push(item);
        map.set(item.locationId, list);
      }
    }
    return { byLocation: map, unassigned: loose };
  }, [items]);

  const populatedLocations = orderedLocations.filter(
    (loc) => (byLocation.get(loc.id)?.length ?? 0) > 0,
  );

  if (loading) {
    return (
      <div className="py-16 text-center text-muted">Loading setup sheets…</div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="font-medium text-danger">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-ghost btn-sm mt-4"
        >
          Try again
        </button>
      </div>
    );
  }

  const hasContent = items.length > 0;

  return (
    <div className="space-y-8 print:space-y-4 print:text-black">
      {/* Header + controls — screen only. */}
      <header className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Day-of guide</p>
          <h1 className="font-display text-3xl leading-tight">Setup sheets</h1>
          <p className="text-sm text-muted">
            {items.length} {items.length === 1 ? "item" : "items"} across{" "}
            {populatedLocations.length}{" "}
            {populatedLocations.length === 1 ? "location" : "locations"}
            {unassigned.length > 0 && (
              <>
                , <span className="text-danger">{unassigned.length} still </span>
                <span className="text-danger">unassigned</span>
              </>
            )}
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export" className="btn btn-ghost btn-sm" download>
            Download CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary btn-sm"
          >
            Print / Save as PDF
          </button>
        </div>
      </header>

      {/* Print-only title. */}
      <div className="hidden print:block print:text-black">
        <h1 className="font-display text-3xl leading-tight print:text-black">
          Day-of Setup Guide
        </h1>
        <p className="mt-1 text-sm print:text-black">
          {items.length} items · {populatedLocations.length} locations
          {unassigned.length > 0 && ` · ${unassigned.length} unassigned`}
        </p>
      </div>

      {!hasContent ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-xl">Nothing to set up yet</h2>
          <p className="mt-2 text-sm text-muted">
            Add some items and assign them to locations to build your day-of
            checklist.
          </p>
        </div>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {populatedLocations.map((loc) => (
            <SetupSection
              key={loc.id}
              title={loc.name}
              description={loc.description}
              color={loc.color}
              items={byLocation.get(loc.id) ?? []}
            />
          ))}

          {unassigned.length > 0 && (
            <SetupSection
              title="Unassigned — needs a home"
              items={unassigned}
              unassigned
            />
          )}
        </div>
      )}
    </div>
  );
}
