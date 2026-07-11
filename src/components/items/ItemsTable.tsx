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
  ITEM_PRIORITIES,
  ITEM_PRIORITY_LABELS,
  type ItemStatus,
  type ItemCategory,
} from "@/lib/constants";
import {
  updateItem,
  deleteItem,
  bulkUpdateItems,
  bulkDeleteItems,
} from "@/lib/client";

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

  // Multi-select bulk actions.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

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

  // Only ever act on selected rows that are currently visible, so bulk actions
  // never touch items hidden by a filter or removed by a refetch. Derived (no
  // effect needed) — stale ids left in `selected` are simply ignored here.
  const selectedIds = useMemo(
    () => filtered.filter((it) => selected.has(it.id)).map((it) => it.id),
    [filtered, selected],
  );
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((it) => selected.has(it.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      if (filtered.every((it) => prev.has(it.id))) return new Set();
      return new Set(filtered.map((it) => it.id));
    });
  }

  async function runBulk(fn: () => Promise<unknown>) {
    setBulkBusy(true);
    setBulkError(null);
    try {
      await fn();
      setSelected(new Set());
      onChange();
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : "Bulk action failed.",
      );
    } finally {
      setBulkBusy(false);
    }
  }

  function bulkPatch(
    patch: Parameters<typeof bulkUpdateItems>[1],
  ) {
    if (selectedIds.length === 0) return;
    void runBulk(() => bulkUpdateItems(selectedIds, patch));
  }

  function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected ${
          selectedIds.length === 1 ? "item" : "items"
        }? This cannot be undone.`,
      )
    )
      return;
    void runBulk(() => bulkDeleteItems(selectedIds));
  }

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        {filtered.length > 0 ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-[var(--accent)]"
              checked={allFilteredSelected}
              ref={(el) => {
                if (el)
                  el.indeterminate = selected.size > 0 && !allFilteredSelected;
              }}
              onChange={toggleAllFiltered}
              aria-label="Select all filtered items"
            />
            Select all
          </label>
        ) : (
          <span />
        )}
        <p className="text-sm text-muted" aria-live="polite">
          {filtered.length} of {items.length}{" "}
          {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Bulk action bar — appears when at least one row is selected. */}
      {selected.size > 0 ? (
        <div className="sticky top-2 z-10 space-y-3 rounded-lg border border-border-strong bg-surface-2 p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium" aria-live="polite">
              {selected.size} selected
            </span>

            <label className="sr-only" htmlFor="bulk-status">
              Set status
            </label>
            <select
              id="bulk-status"
              className="input w-auto"
              value=""
              disabled={bulkBusy}
              onChange={(e) => {
                if (e.target.value)
                  bulkPatch({ status: e.target.value as ItemStatus });
              }}
            >
              <option value="">Set status…</option>
              {ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ITEM_STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="bulk-location">
              Assign location
            </label>
            <select
              id="bulk-location"
              className="input w-auto"
              value=""
              disabled={bulkBusy}
              onChange={(e) => {
                if (e.target.value)
                  bulkPatch({
                    locationId:
                      e.target.value === UNASSIGNED ? null : e.target.value,
                  });
              }}
            >
              <option value="">Assign table…</option>
              <option value={UNASSIGNED}>Unassigned</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="bulk-category">
              Set category
            </label>
            <select
              id="bulk-category"
              className="input w-auto"
              value=""
              disabled={bulkBusy}
              onChange={(e) => {
                if (e.target.value)
                  bulkPatch({ category: e.target.value as ItemCategory });
              }}
            >
              <option value="">Set category…</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {ITEM_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="bulk-priority">
              Set priority
            </label>
            <select
              id="bulk-priority"
              className="input w-auto"
              value=""
              disabled={bulkBusy}
              onChange={(e) => {
                if (e.target.value)
                  bulkPatch({
                    priority: e.target.value as (typeof ITEM_PRIORITIES)[number],
                  });
              }}
            >
              <option value="">Set priority…</option>
              {ITEM_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {ITEM_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={bulkBusy}
              onClick={handleBulkDelete}
            >
              Delete selected
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={bulkBusy}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>

            {bulkBusy ? (
              <span className="text-sm text-muted" aria-live="polite">
                Working…
              </span>
            ) : null}
          </div>

          {bulkError ? (
            <p className="text-sm text-danger" role="alert">
              {bulkError}
            </p>
          ) : null}
        </div>
      ) : null}

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
                className={`card flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-4 ${
                  selected.has(item.id) ? "ring-1 ring-[var(--accent)]" : ""
                }`}
              >
                {/* Select */}
                <div className="flex shrink-0 items-center md:self-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    aria-label={`Select ${item.name}`}
                  />
                </div>

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
