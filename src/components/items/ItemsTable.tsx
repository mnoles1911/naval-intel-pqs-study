"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  UNASSIGNED,
  NEXT_STATUS,
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  type ItemStatus,
  type ItemCategory,
} from "@/lib/constants";
import { updateItem, deleteItem } from "@/lib/client";

interface ItemsTableProps {
  items: ItemDTO[];
  locations: LocationDTO[];
  onChange: () => void;
}

type StatusFilter = "ALL" | ItemStatus;
type CategoryFilter = "ALL" | ItemCategory;

export default function ItemsTable({
  items,
  locations,
  onChange,
}: ItemsTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");

  // Track per-row busy state so one row's mutation doesn't disable the others.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter !== "ALL" && it.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && it.category !== categoryFilter)
        return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, statusFilter, categoryFilter]);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  function handleToggle(item: ItemDTO) {
    const next = NEXT_STATUS[item.status];
    void run(item.id, () => updateItem(item.id, { status: next }));
  }

  function handleReassign(
    item: ItemDTO,
    e: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const value = e.target.value;
    void run(item.id, () =>
      updateItem(item.id, { locationId: value === UNASSIGNED ? null : value }),
    );
  }

  function handleDelete(item: ItemDTO) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    void run(item.id, () => deleteItem(item.id));
  }

  const hasItems = items.length > 0;

  return (
    <section className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="item-search" className="label">
            Search
          </label>
          <input
            id="item-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="item-status-filter" className="label">
            Status
          </label>
          <select
            id="item-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="input"
          >
            <option value="ALL">All</option>
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ITEM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="item-category-filter" className="label">
            Category
          </label>
          <select
            id="item-category-filter"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as CategoryFilter)
            }
            className="input"
          >
            <option value="ALL">All</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ITEM_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-muted" aria-live="polite">
        {filtered.length} of {items.length}{" "}
        {items.length === 1 ? "item" : "items"}
      </p>

      {filtered.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">
          {hasItems
            ? "No items match your filters."
            : "No items yet — add your first with “Add items”."}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const busy = busyId === item.id;
            const next = NEXT_STATUS[item.status];
            const toggleLabel = `Mark ${ITEM_STATUS_LABELS[next].toLowerCase()}`;
            return (
              <li
                key={item.id}
                className="card flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4"
              >
                {/* Name + meta */}
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {item.photoUrl ? (
                    <Image
                      src={item.photoUrl}
                      alt={item.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-center text-[10px] leading-tight text-muted">
                      No photo
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                      <span className="font-medium">{item.name}</span>
                      {item.quantity > 1 ? (
                        <span className="text-sm text-muted">
                          ×{item.quantity}
                        </span>
                      ) : null}
                      {item.priority === "HIGH" ? (
                        <span className="chip text-rose">
                          <span
                            className="dot"
                            style={{ background: "var(--rose)" }}
                          />
                          High
                        </span>
                      ) : null}
                    </div>
                    {item.category ? (
                      <span className="chip mt-1.5">
                        {ITEM_CATEGORY_LABELS[item.category]}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Status toggle */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    disabled={busy}
                    className={`btn btn-sm btn-ghost ${
                      item.status === "PURCHASED"
                        ? "text-purchased"
                        : "text-needed"
                    }`}
                  >
                    {toggleLabel}
                  </button>
                </div>

                {/* Location assignment */}
                <div className="shrink-0 md:w-44">
                  <label className="sr-only" htmlFor={`loc-${item.id}`}>
                    Location for {item.name}
                  </label>
                  <select
                    id={`loc-${item.id}`}
                    value={item.locationId ?? UNASSIGNED}
                    onChange={(e) => handleReassign(item, e)}
                    disabled={busy}
                    className="input disabled:opacity-60"
                  >
                    <option value={UNASSIGNED}>Unassigned</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/items/${item.id}`}
                    className="btn btn-ghost btn-sm"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busy}
                    className="btn btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
