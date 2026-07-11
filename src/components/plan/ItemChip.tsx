"use client";

import { useState } from "react";
import { UNASSIGNED } from "@/lib/constants";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import { STATUS_COLOR } from "@/components/plan/planUtils";
import { useTouchDrag } from "@/lib/useTouchDrag";

// The value passed on drop: a real location id, or the UNASSIGNED sentinel.
export const DRAG_MIME = "text/plain";

interface Props {
  item: ItemDTO;
  locations: LocationDTO[];
  // Reassign via a location id, or null for Unassigned. Shared with the
  // drag-and-drop path so keyboard/touch users get identical behaviour.
  onReassign: (itemId: string, locationId: string | null) => void;
  onDragStateChange?: (itemId: string, dragging: boolean) => void;
}

export default function ItemChip({
  item,
  locations,
  onReassign,
  onDragStateChange,
}: Props) {
  const [dragging, setDragging] = useState(false);

  const currentValue = item.locationId ?? UNASSIGNED;

  // Touch path: mirrors the HTML5 drag. dropId is a location id or the
  // UNASSIGNED sentinel (encoded on each Zone via data-drop-id).
  const bindTouchDrag = useTouchDrag({
    onDrop: (itemId, dropId) =>
      onReassign(itemId, dropId === UNASSIGNED ? null : dropId),
    onDragStart: (itemId) => {
      setDragging(true);
      onDragStateChange?.(itemId, true);
    },
    onDragEnd: (itemId) => {
      setDragging(false);
      onDragStateChange?.(itemId, false);
    },
  });

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(DRAG_MIME, item.id);
    e.dataTransfer.effectAllowed = "move";
    setDragging(true);
    onDragStateChange?.(item.id, true);
  }

  function handleDragEnd() {
    setDragging(false);
    onDragStateChange?.(item.id, false);
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    onReassign(item.id, value === UNASSIGNED ? null : value);
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      {...bindTouchDrag(item.id)}
      className={`group flex touch-none items-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm transition ${
        dragging ? "opacity-40" : "hover:border-border-strong"
      }`}
    >
      <span
        aria-hidden
        className="cursor-grab text-muted select-none active:cursor-grabbing"
        title="Drag to another zone"
      >
        ⠿
      </span>

      <span
        className="dot shrink-0"
        style={{ background: STATUS_COLOR[item.status] }}
        aria-hidden
      />

      <span className="min-w-0 flex-1 truncate" title={item.name}>
        {item.name}
        {item.quantity > 1 && (
          <span className="ml-1 text-muted">×{item.quantity}</span>
        )}
      </span>

      {/* Accessible fallback: keyboard/touch reassignment via the same path. */}
      <select
        value={currentValue}
        onChange={handleSelect}
        className="input w-auto max-w-[8.5rem] shrink-0 px-2 py-1 text-xs"
        aria-label={`Move ${item.name} to a location`}
      >
        <option value={UNASSIGNED}>Unassigned</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </div>
  );
}
