"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import { UNASSIGNED, type ItemStatus } from "@/lib/constants";
import { updateItem, deleteItem } from "@/lib/client";
import StatusBadge from "@/components/StatusBadge";

interface ItemCardProps {
  item: ItemDTO;
  locations: LocationDTO[];
  onChange: () => void;
}

export default function ItemCard({ item, locations, onChange }: ItemCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus: ItemStatus =
    item.status === "NEEDED" ? "PURCHASED" : "NEEDED";
  const toggleLabel =
    item.status === "NEEDED" ? "Mark purchased" : "Mark needed";

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleToggle() {
    void run(() => updateItem(item.id, { status: nextStatus }));
  }

  function handleReassign(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    void run(() =>
      updateItem(item.id, {
        locationId: value === UNASSIGNED ? null : value,
      }),
    );
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      return;
    }
    void run(() => deleteItem(item.id));
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex gap-3">
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={item.name}
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-center text-[10px] leading-tight text-muted">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{item.name}</div>
          {item.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">
              {item.description}
            </p>
          ) : null}
          <div className="mt-1.5">
            <StatusBadge status={item.status} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="sr-only" htmlFor={`loc-${item.id}`}>
          Location
        </label>
        <select
          id={`loc-${item.id}`}
          value={item.locationId ?? UNASSIGNED}
          onChange={handleReassign}
          disabled={busy}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
        >
          <option value={UNASSIGNED}>Unassigned</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            className="rounded-lg border border-border px-2.5 py-1 text-sm font-medium hover:bg-background disabled:opacity-60"
          >
            {toggleLabel}
          </button>
          <Link
            href={`/items/${item.id}`}
            className="rounded-lg border border-border px-2.5 py-1 text-sm font-medium hover:bg-background"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-lg border border-border px-2.5 py-1 text-sm font-medium text-red-500 hover:bg-background disabled:opacity-60"
          >
            Delete
          </button>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>
    </div>
  );
}
