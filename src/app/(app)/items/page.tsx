"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import { fetchItems, fetchLocations } from "@/lib/client";
import ItemsTable from "@/components/items/ItemsTable";
import ItemImportPanel from "@/components/items/ItemImportPanel";

export default function ItemsPage() {
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refetch just the items after a mutation/import (locations rarely change here).
  const refreshItems = useCallback(async () => {
    try {
      const its = await fetchItems();
      setItems(its);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items.");
    }
  }, []);

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
        setError(err instanceof Error ? err.message : "Failed to load items.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow">Manage</p>
          <h1 className="font-display text-3xl sm:text-4xl">Items</h1>
          <p className="text-muted">
            Every piece of decor and stationery for your day — track what&apos;s
            needed, assign it to a table, and mark it purchased.
          </p>
        </div>
        <Link href="/items/new" className="btn btn-primary shrink-0">
          Add items
        </Link>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading items…</p>
      ) : error ? (
        <p
          className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <>
          <ItemsTable
            items={items}
            locations={locations}
            onChange={refreshItems}
          />
          <ItemImportPanel onImported={refreshItems} />
        </>
      )}
    </div>
  );
}
