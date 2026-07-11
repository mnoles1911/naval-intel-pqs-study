"use client";

import { useMemo, useRef, useState } from "react";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  accentColor,
  clamp01,
  resolvePosition,
  sortLocations,
} from "@/components/plan/planUtils";

interface Props {
  locations: LocationDTO[];
  items: ItemDTO[];
  onMoveLocation: (id: string, planX: number, planY: number) => void;
}

interface DragState {
  id: string;
  x: number;
  y: number;
}

const NUDGE = 0.02; // keyboard step (2% of the canvas)

export default function MapView({ locations, items, onMoveLocation }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const ordered = useMemo(() => sortLocations(locations), [locations]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      if (it.locationId) map.set(it.locationId, (map.get(it.locationId) ?? 0) + 1);
    }
    return map;
  }, [items]);

  // Convert a client point to a clamped [0,1] fraction of the canvas.
  function fractionFromPointer(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 };
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent, id: string) {
    // Ignore secondary buttons; keep native scroll on touch until we drag.
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = fractionFromPointer(e.clientX, e.clientY);
    setDrag({ id, x, y });
  }

  function handlePointerMove(e: React.PointerEvent, id: string) {
    if (!drag || drag.id !== id) return;
    const { x, y } = fractionFromPointer(e.clientX, e.clientY);
    setDrag({ id, x, y });
  }

  function handlePointerUp(e: React.PointerEvent, id: string) {
    if (!drag || drag.id !== id) return;
    const { x, y } = fractionFromPointer(e.clientX, e.clientY);
    setDrag(null);
    onMoveLocation(id, x, y);
  }

  function handleKeyDown(
    e: React.KeyboardEvent,
    loc: LocationDTO,
    pos: { x: number; y: number },
  ) {
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -NUDGE;
    else if (e.key === "ArrowRight") dx = NUDGE;
    else if (e.key === "ArrowUp") dy = -NUDGE;
    else if (e.key === "ArrowDown") dy = NUDGE;
    else return;
    e.preventDefault();
    onMoveLocation(loc.id, clamp01(pos.x + dx), clamp01(pos.y + dy));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Drag a marker to arrange your venue. With a marker focused, use the arrow
        keys to nudge it.
      </p>

      <div
        ref={canvasRef}
        className="card relative aspect-[16/10] w-full overflow-hidden bg-surface-2 sm:aspect-video"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "10% 10%, 10% 10%",
        }}
        role="group"
        aria-label="Venue floor plan. Markers can be dragged to reposition locations."
      >
        {ordered.length === 0 ? (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">
            No locations yet. Add locations to arrange them on the plan.
          </p>
        ) : (
          ordered.map((loc, i) => {
            const base = resolvePosition(loc, i, ordered.length);
            const pos =
              drag && drag.id === loc.id ? { x: drag.x, y: drag.y } : base;
            const count = counts.get(loc.id) ?? 0;
            const active = drag?.id === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onPointerDown={(e) => handlePointerDown(e, loc.id)}
                onPointerMove={(e) => handlePointerMove(e, loc.id)}
                onPointerUp={(e) => handlePointerUp(e, loc.id)}
                onKeyDown={(e) => handleKeyDown(e, loc, base)}
                aria-label={`${loc.name}, ${count} ${
                  count === 1 ? "item" : "items"
                }. Drag or use arrow keys to reposition.`}
                className={`card absolute flex max-w-[45%] touch-none items-center gap-2 px-2.5 py-1.5 text-sm shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                  active
                    ? "z-20 cursor-grabbing ring-2 ring-[var(--ring)]"
                    : "z-10 cursor-grab hover:shadow-lg"
                }`}
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: accentColor(loc.color) }}
                />
                <span className="truncate font-medium">{loc.name}</span>
                <span className="chip shrink-0 px-1.5 py-0 text-[0.65rem]">
                  {count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
