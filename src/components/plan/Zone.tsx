"use client";

import { useState } from "react";
import { UNASSIGNED } from "@/lib/constants";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import ItemChip, { DRAG_MIME } from "@/components/plan/ItemChip";
import { accentColor, purchasedProgress } from "@/components/plan/planUtils";
import { PencilIcon } from "@/components/icons";

interface Props {
  // null represents the Unassigned zone.
  locationId: string | null;
  name: string;
  color: string | null;
  items: ItemDTO[];
  allLocations: LocationDTO[];
  onReassign: (itemId: string, locationId: string | null) => void;
  onManage?: (locationId: string) => void;
}

export default function Zone({
  locationId,
  name,
  color,
  items,
  allLocations,
  onReassign,
  onManage,
}: Props) {
  const [isOver, setIsOver] = useState(false);
  const isUnassigned = locationId === null;
  const { purchased, total, pct } = purchasedProgress(items);

  function handleDragOver(e: React.DragEvent) {
    // Allowing a drop requires cancelling the default handling.
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isOver) setIsOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Ignore leaves that are really just moves onto a child element.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (id) onReassign(id, locationId);
  }

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      // Touch-drop target: encodes the same value the HTML5 drop resolves to
      // (a location id, or the UNASSIGNED sentinel for the Unassigned zone).
      data-drop-id={locationId ?? UNASSIGNED}
      aria-label={`${name} zone, ${total} ${total === 1 ? "item" : "items"}`}
      className={`card card-hover flex flex-col p-4 transition ${
        isOver ? "border-accent ring-2 ring-[var(--ring)]" : ""
      } ${isUnassigned ? "border-dashed" : ""}`}
    >
      <header className="mb-3 space-y-2">
        <div className="flex items-center gap-2">
          {isUnassigned ? (
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-border-strong"
            />
          ) : (
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: accentColor(color) }}
            />
          )}
          <h2 className="font-display truncate text-base leading-tight">
            {name}
          </h2>
          <span className="chip ml-auto shrink-0">
            {total} {total === 1 ? "item" : "items"}
          </span>
          {onManage && locationId != null && (
            <button
              type="button"
              onClick={() => onManage(locationId)}
              aria-label={`Manage ${name}`}
              className="btn btn-ghost btn-sm shrink-0"
            >
              <PencilIcon size={14} />
            </button>
          )}
        </div>

        {total > 0 && (
          <div className="space-y-1">
            <div className="meter" role="presentation">
              <span
                style={{ width: `${pct}%`, background: "var(--purchased)" }}
              />
            </div>
            <p className="text-xs text-muted">
              {purchased} of {total} purchased
            </p>
          </div>
        )}
      </header>

      {items.length === 0 ? (
        <p className="flex-1 rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
          {isOver ? "Drop to place here" : "Drop items here"}
        </p>
      ) : (
        <ul className="flex flex-1 flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <ItemChip
                item={item}
                locations={allLocations}
                onReassign={onReassign}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
