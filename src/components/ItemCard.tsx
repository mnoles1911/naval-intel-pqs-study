"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  UNASSIGNED,
  NEXT_STATUS,
  ITEM_STATUS_LABELS,
  ITEM_CATEGORY_LABELS,
} from "@/lib/constants";
import { updateItem, deleteItem } from "@/lib/client";
import StatusBadge from "@/components/StatusBadge";

interface ItemCardProps {
  item: ItemDTO;
  locations: LocationDTO[];
  onChange: () => void;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function money(value: number): string {
  // Show cents only when the amount is not whole.
  if (Number.isInteger(value)) return usd.format(value);
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ItemCard({ item, locations, onChange }: ItemCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = NEXT_STATUS[item.status];
  const toggleLabel = `Mark ${ITEM_STATUS_LABELS[nextStatus].toLowerCase()}`;

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
    <div className="card card-hover flex flex-col gap-3 p-4">
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
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-center text-[10px] leading-tight text-muted">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate font-medium">{item.name}</span>
            {item.quantity > 1 ? (
              <span className="shrink-0 text-sm text-muted">
                ×{item.quantity}
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted">
              {item.description}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={item.status} />
            {item.category ? (
              <span className="chip">{ITEM_CATEGORY_LABELS[item.category]}</span>
            ) : null}
            {item.priority === "HIGH" ? (
              <span className="chip text-rose">
                <span className="dot" style={{ background: "var(--rose)" }} />
                High priority
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {(item.estimatedCost != null ||
        item.actualCost != null ||
        item.vendorName) ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {item.estimatedCost != null ? (
            <span>
              Est.{" "}
              <span className="text-foreground">
                {money(item.estimatedCost)}
              </span>
            </span>
          ) : null}
          {item.actualCost != null ? (
            <span>
              Actual{" "}
              <span className="text-foreground">{money(item.actualCost)}</span>
            </span>
          ) : null}
          {item.vendorName ? (
            item.vendorUrl ? (
              <a
                href={item.vendorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {item.vendorName}
              </a>
            ) : (
              <span>{item.vendorName}</span>
            )
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="sr-only" htmlFor={`loc-${item.id}`}>
          Location
        </label>
        <select
          id={`loc-${item.id}`}
          value={item.locationId ?? UNASSIGNED}
          onChange={handleReassign}
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            className="btn btn-ghost btn-sm"
          >
            {toggleLabel}
          </button>
          <Link href={`/items/${item.id}`} className="btn btn-ghost btn-sm">
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="btn btn-danger btn-sm"
          >
            Delete
          </button>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
