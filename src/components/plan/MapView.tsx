"use client";

import { useMemo, useRef, useState } from "react";
import type {
  ItemDTO,
  LocationDTO,
  PartyDTO,
  PersonDTO,
  SeatAssignmentDTO,
} from "@/lib/types";
import {
  clamp01,
  resolvePosition,
  sortLocations,
  STATUS_COLOR,
} from "@/components/plan/planUtils";
import { MIN_TABLE_SIZE, resolveSize } from "@/components/plan/mapGeometry";
import TableMarker from "@/components/plan/TableMarker";
import TableDetailPanel from "@/components/plan/TableDetailPanel";

interface Props {
  locations: LocationDTO[];
  items: ItemDTO[];
  people: PersonDTO[];
  parties: PartyDTO[];
  // Seat assignments for the active seating plan.
  assignments: SeatAssignmentDTO[];
  onMoveLocation: (id: string, planX: number, planY: number) => void;
  onResizeLocation: (id: string, planW: number, planH: number) => void;
  // Place/move an item on the map; pass locationId to also (re)assign it.
  onPlaceItem: (
    id: string,
    planX: number,
    planY: number,
    locationId?: string,
  ) => void;
}

const NUDGE = 0.02; // keyboard step (2% of the canvas)

type LocMove = { id: string; x: number; y: number };
type LocResize = { id: string; w: number; h: number; cx: number; cy: number };
type ItemDrag = {
  id: string;
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  fromTray: boolean;
  overLocId: string | null;
};

// Tracks the pointer grab so a click (no movement) can open the detail panel
// instead of committing a no-op move.
interface Grab {
  px: number;
  py: number;
  offX: number;
  offY: number;
  moved: boolean;
}

export default function MapView({
  locations,
  items,
  people,
  parties,
  assignments,
  onMoveLocation,
  onResizeLocation,
  onPlaceItem,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<Grab | null>(null);

  const [locMove, setLocMove] = useState<LocMove | null>(null);
  const [locResize, setLocResize] = useState<LocResize | null>(null);
  const [itemDrag, setItemDrag] = useState<ItemDrag | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ordered = useMemo(() => sortLocations(locations), [locations]);

  // Default-resolved canvas position per location (before any live drag).
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    ordered.forEach((loc, i) =>
      map.set(loc.id, resolvePosition(loc, i, ordered.length)),
    );
    return map;
  }, [ordered]);

  // Lookups.
  const peopleById = useMemo(() => {
    const m = new Map<string, PersonDTO>();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  const partiesById = useMemo(() => {
    const m = new Map<string, PartyDTO>();
    for (const p of parties) m.set(p.id, p);
    return m;
  }, [parties]);

  // locationId -> set of occupied seat indices, in the active plan.
  const seatsByLocation = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const a of assignments) {
      let set = m.get(a.locationId);
      if (!set) {
        set = new Set();
        m.set(a.locationId, set);
      }
      set.add(a.seatIndex);
    }
    return m;
  }, [assignments]);

  // locationId -> items assigned there.
  const itemsByLocation = useMemo(() => {
    const m = new Map<string, ItemDTO[]>();
    for (const it of items) {
      if (!it.locationId) continue;
      const list = m.get(it.locationId);
      if (list) list.push(it);
      else m.set(it.locationId, [it]);
    }
    return m;
  }, [items]);

  const placedItems = useMemo(
    () => items.filter((it) => it.planX != null && it.planY != null),
    [items],
  );
  const trayItems = useMemo(
    () => items.filter((it) => it.planX == null || it.planY == null),
    [items],
  );

  const selected = selectedId
    ? (ordered.find((l) => l.id === selectedId) ?? null)
    : null;

  // --- Coordinate helpers ---------------------------------------------------

  function frac(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0)
      return { x: 0.5, y: 0.5 };
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  function insideCanvas(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function currentSize(loc: LocationDTO) {
    if (locResize?.id === loc.id) return { w: locResize.w, h: locResize.h };
    return resolveSize(loc);
  }

  function currentPos(loc: LocationDTO) {
    if (locMove?.id === loc.id) return { x: locMove.x, y: locMove.y };
    return positions.get(loc.id) ?? { x: 0.5, y: 0.5 };
  }

  // Which table (if any) contains the given fraction point (topmost first).
  function locationAt(x: number, y: number): string | null {
    for (let i = ordered.length - 1; i >= 0; i--) {
      const loc = ordered[i];
      const pos = currentPos(loc);
      const sz = currentSize(loc);
      if (
        Math.abs(x - pos.x) <= sz.w / 2 &&
        Math.abs(y - pos.y) <= sz.h / 2
      ) {
        return loc.id;
      }
    }
    return null;
  }

  // --- Table move -----------------------------------------------------------

  function startLocMove(e: React.PointerEvent, loc: LocationDTO) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = frac(e.clientX, e.clientY);
    const base = currentPos(loc);
    grabRef.current = {
      px: p.x,
      py: p.y,
      offX: p.x - base.x,
      offY: p.y - base.y,
      moved: false,
    };
    setLocMove({ id: loc.id, x: base.x, y: base.y });
  }

  function moveLocMove(e: React.PointerEvent) {
    if (!locMove) return;
    const p = frac(e.clientX, e.clientY);
    const g = grabRef.current;
    if (g && (Math.abs(p.x - g.px) > 0.008 || Math.abs(p.y - g.py) > 0.008)) {
      g.moved = true;
    }
    setLocMove({
      id: locMove.id,
      x: clamp01(p.x - (g?.offX ?? 0)),
      y: clamp01(p.y - (g?.offY ?? 0)),
    });
  }

  function endLocMove(e: React.PointerEvent, loc: LocationDTO) {
    if (!locMove) return;
    const g = grabRef.current;
    const final = { x: locMove.x, y: locMove.y };
    setLocMove(null);
    grabRef.current = null;
    if (g && !g.moved) {
      // Treat as a tap: open the detail panel.
      setSelectedId(loc.id);
      return;
    }
    onMoveLocation(loc.id, final.x, final.y);
  }

  // --- Table resize ---------------------------------------------------------

  function startLocResize(e: React.PointerEvent, loc: LocationDTO) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const c = currentPos(loc);
    const s = resolveSize(loc);
    setLocResize({ id: loc.id, w: s.w, h: s.h, cx: c.x, cy: c.y });
  }

  function moveLocResize(e: React.PointerEvent) {
    if (!locResize) return;
    e.stopPropagation();
    const p = frac(e.clientX, e.clientY);
    const { cx, cy } = locResize;
    // Keep the table centered; the handle drives half-width/height. Clamp to a
    // minimum and keep the box within the canvas.
    const w = Math.max(
      MIN_TABLE_SIZE,
      Math.min(2 * Math.abs(p.x - cx), 2 * Math.min(cx, 1 - cx)),
    );
    const h = Math.max(
      MIN_TABLE_SIZE,
      Math.min(2 * Math.abs(p.y - cy), 2 * Math.min(cy, 1 - cy)),
    );
    setLocResize({ ...locResize, w, h });
  }

  function endLocResize(e: React.PointerEvent, loc: LocationDTO) {
    if (!locResize) return;
    e.stopPropagation();
    const { w, h } = locResize;
    setLocResize(null);
    onResizeLocation(loc.id, w, h);
  }

  function cancelLocDrag() {
    setLocMove(null);
    setLocResize(null);
    grabRef.current = null;
  }

  function onLocKeyDown(e: React.KeyboardEvent, loc: LocationDTO) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedId(loc.id);
      return;
    }
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -NUDGE;
    else if (e.key === "ArrowRight") dx = NUDGE;
    else if (e.key === "ArrowUp") dy = -NUDGE;
    else if (e.key === "ArrowDown") dy = NUDGE;
    else return;
    e.preventDefault();
    const pos = currentPos(loc);
    onMoveLocation(loc.id, clamp01(pos.x + dx), clamp01(pos.y + dy));
  }

  // --- Item drag (place / move / assign) ------------------------------------

  function startItemDrag(
    e: React.PointerEvent,
    item: ItemDTO,
    fromTray: boolean,
  ) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = frac(e.clientX, e.clientY);
    setItemDrag({
      id: item.id,
      x: p.x,
      y: p.y,
      clientX: e.clientX,
      clientY: e.clientY,
      fromTray,
      overLocId: fromTray ? null : locationAt(p.x, p.y),
    });
  }

  function moveItemDrag(e: React.PointerEvent) {
    if (!itemDrag) return;
    const p = frac(e.clientX, e.clientY);
    const over = insideCanvas(e.clientX, e.clientY)
      ? locationAt(p.x, p.y)
      : null;
    setItemDrag({
      ...itemDrag,
      x: p.x,
      y: p.y,
      clientX: e.clientX,
      clientY: e.clientY,
      overLocId: over,
    });
  }

  function endItemDrag(e: React.PointerEvent) {
    if (!itemDrag) return;
    const drag = itemDrag;
    setItemDrag(null);
    const inside = insideCanvas(e.clientX, e.clientY);
    // A tray item dropped off-canvas is a cancel.
    if (drag.fromTray && !inside) return;
    if (!inside) return; // a placed item dragged off-canvas: leave it be.
    const p = frac(e.clientX, e.clientY);
    const over = locationAt(p.x, p.y);
    if (over) onPlaceItem(drag.id, p.x, p.y, over);
    else onPlaceItem(drag.id, p.x, p.y);
  }

  function cancelItemDrag() {
    setItemDrag(null);
  }

  const draggingItem =
    itemDrag && itemDrag.fromTray
      ? items.find((it) => it.id === itemDrag.id)
      : null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Drag a table to arrange it, or drag its corner handle to resize. Tap a
        table for who&apos;s seated and what&apos;s assigned. Drag items onto the
        plan — drop one on a table to assign it there.
      </p>

      <div
        ref={canvasRef}
        className="card relative aspect-[16/10] w-full touch-none overflow-hidden bg-surface-2 sm:aspect-video"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "10% 10%, 10% 10%",
        }}
        role="group"
        aria-label="Venue floor plan. Tables and items can be dragged to reposition."
      >
        {ordered.length === 0 && placedItems.length === 0 ? (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">
            No tables yet. Add locations to arrange them on the plan.
          </p>
        ) : null}

        {/* Tables */}
        {ordered.map((loc) => {
          const pos = currentPos(loc);
          const sz = currentSize(loc);
          const occupied = seatsByLocation.get(loc.id);
          const seatOccupied = Array.from(
            { length: loc.seatCount },
            (_, i) => occupied?.has(i) ?? false,
          );
          const seatedCount = occupied ? occupied.size : 0;
          return (
            <TableMarker
              key={loc.id}
              loc={loc}
              x={pos.x}
              y={pos.y}
              w={sz.w}
              h={sz.h}
              seatOccupied={seatOccupied}
              seatedCount={seatedCount}
              isDragging={locMove?.id === loc.id}
              isResizing={locResize?.id === loc.id}
              isDropTarget={itemDrag?.overLocId === loc.id}
              onMoveStart={startLocMove}
              onMoveMove={moveLocMove}
              onMoveEnd={endLocMove}
              onPointerCancel={cancelLocDrag}
              onResizeStart={startLocResize}
              onResizeMove={moveLocResize}
              onResizeEnd={endLocResize}
              onKeyDown={onLocKeyDown}
            />
          );
        })}

        {/* Placed item markers */}
        {placedItems.map((it) => {
          const dragging = itemDrag?.id === it.id;
          const x = dragging ? itemDrag!.x : clamp01(it.planX as number);
          const y = dragging ? itemDrag!.y : clamp01(it.planY as number);
          return (
            <button
              key={it.id}
              type="button"
              onPointerDown={(e) => startItemDrag(e, it, false)}
              onPointerMove={moveItemDrag}
              onPointerUp={endItemDrag}
              onPointerCancel={cancelItemDrag}
              aria-label={`${it.name}${
                it.quantity > 1 ? `, quantity ${it.quantity}` : ""
              }. Drag to reposition or onto a table to assign.`}
              className={`absolute flex max-w-[40%] touch-none items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-xs shadow-sm ${
                dragging
                  ? "z-40 cursor-grabbing ring-2 ring-[var(--ring)]"
                  : "z-20 cursor-grab hover:border-border-strong"
              }`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <span
                aria-hidden
                className="dot shrink-0"
                style={{ background: STATUS_COLOR[it.status] }}
              />
              <span className="truncate">{it.name}</span>
              {it.quantity > 1 && (
                <span className="shrink-0 text-muted">×{it.quantity}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tray of not-yet-placed items */}
      <div className="card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="label">Unplaced items</h3>
          <span className="chip text-xs">{trayItems.length}</span>
        </div>
        {trayItems.length === 0 ? (
          <p className="text-xs text-muted">
            Every item is on the plan. Drag a marker back around to rearrange.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {trayItems.map((it) => {
              const dragging = itemDrag?.id === it.id;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onPointerDown={(e) => startItemDrag(e, it, true)}
                    onPointerMove={moveItemDrag}
                    onPointerUp={endItemDrag}
                    onPointerCancel={cancelItemDrag}
                    aria-label={`${it.name}. Drag onto the plan to place it.`}
                    className={`flex touch-none items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs transition ${
                      dragging
                        ? "cursor-grabbing opacity-40"
                        : "cursor-grab hover:border-border-strong"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="dot shrink-0"
                      style={{ background: STATUS_COLOR[it.status] }}
                    />
                    <span className="max-w-[10rem] truncate">{it.name}</span>
                    {it.quantity > 1 && (
                      <span className="text-muted">×{it.quantity}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Floating preview while dragging a tray item onto the canvas. */}
      {draggingItem && itemDrag && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2 py-1 text-xs shadow-lg"
          style={{
            left: itemDrag.clientX,
            top: itemDrag.clientY,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            aria-hidden
            className="dot shrink-0"
            style={{ background: STATUS_COLOR[draggingItem.status] }}
          />
          <span className="max-w-[10rem] truncate">{draggingItem.name}</span>
        </div>
      )}

      {selected && (
        <TableDetailPanel
          loc={selected}
          assignments={assignments}
          people={peopleById}
          parties={partiesById}
          items={itemsByLocation.get(selected.id) ?? []}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
