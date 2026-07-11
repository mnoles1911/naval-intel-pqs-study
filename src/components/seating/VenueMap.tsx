"use client";

import { useMemo, useRef, useState } from "react";
import type { LocationDTO, PersonDTO } from "@/lib/types";
import {
  TABLE_SHAPES,
  TABLE_SHAPE_LABELS,
  type TableShape,
} from "@/lib/constants";
import {
  accentColor,
  clamp01,
  resolvePosition,
  sortLocations,
} from "@/components/plan/planUtils";

interface VenueMapProps {
  tables: LocationDTO[];
  people: PersonDTO[];
  // seatOf: seated guests -> their table+seat in the current plan (use it to
  // compute each table's occupancy count).
  seatOf: Map<string, { locationId: string; seatIndex: number }>;
  onMoveTable: (id: string, planX: number, planY: number) => void; // persist new 0..1 position
  onEditTable: (
    id: string,
    patch: { name?: string; shape?: TableShape; seatCount?: number },
  ) => void;
}

interface DragState {
  id: string;
  x: number;
  y: number;
  moved: boolean;
  startX: number;
  startY: number;
}

const NUDGE = 0.02; // keyboard step (2% of the canvas)
const DRAG_THRESHOLD = 4; // px the pointer must travel before a click becomes a drag
const MIN_SEATS = 1;
const MAX_SEATS = 40;

export default function VenueMap({
  tables,
  people,
  seatOf,
  onMoveTable,
  onEditTable,
}: VenueMapProps) {
  void people; // guests are not drawn here; occupancy comes from seatOf
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ordered = useMemo(() => sortLocations(tables), [tables]);

  // Occupancy per table = number of seated guests whose seat is at that table.
  const occupancy = useMemo(() => {
    const map = new Map<string, number>();
    for (const seat of seatOf.values()) {
      map.set(seat.locationId, (map.get(seat.locationId) ?? 0) + 1);
    }
    return map;
  }, [seatOf]);

  const selected = useMemo(
    () => ordered.find((t) => t.id === selectedId) ?? null,
    [ordered, selectedId],
  );

  // Convert a client point to a clamped [0,1] fraction of the live canvas rect.
  function fractionFromPointer(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0)
      return { x: 0.5, y: 0.5 };
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return; // primary button only
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = fractionFromPointer(e.clientX, e.clientY);
    setDrag({ id, x, y, moved: false, startX: e.clientX, startY: e.clientY });
  }

  function handlePointerMove(e: React.PointerEvent, id: string) {
    if (!drag || drag.id !== id) return;
    const moved =
      drag.moved ||
      Math.abs(e.clientX - drag.startX) > DRAG_THRESHOLD ||
      Math.abs(e.clientY - drag.startY) > DRAG_THRESHOLD;
    if (!moved) return;
    e.preventDefault();
    const { x, y } = fractionFromPointer(e.clientX, e.clientY);
    setDrag({ ...drag, x, y, moved: true });
  }

  function handlePointerUp(e: React.PointerEvent, id: string) {
    if (!drag || drag.id !== id) {
      setDrag(null);
      return;
    }
    if (drag.moved) {
      const { x, y } = fractionFromPointer(e.clientX, e.clientY);
      onMoveTable(id, x, y);
    } else {
      // A tap without movement selects (toggles) the table.
      setSelectedId((cur) => (cur === id ? null : id));
    }
    setDrag(null);
  }

  function handleKeyDown(
    e: React.KeyboardEvent,
    table: LocationDTO,
    pos: { x: number; y: number },
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedId((cur) => (cur === table.id ? null : table.id));
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
    onMoveTable(table.id, clamp01(pos.x + dx), clamp01(pos.y + dy));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Drag a table to arrange your venue, or focus one and nudge it with the
          arrow keys. Click a table to rename it or change its shape and size.
        </p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full border border-border-strong"
            />
            Round
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-3 w-4 rounded-[4px] border border-border-strong"
            />
            Rect
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          ref={canvasRef}
          className="card relative min-h-[30rem] w-full overflow-hidden bg-surface-2 lg:aspect-video lg:min-h-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "10% 10%, 10% 10%",
          }}
          role="group"
          aria-label="Venue floor plan. Tables can be dragged to reposition them."
        >
          {ordered.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <div className="space-y-1">
                <p className="font-display text-lg">No tables yet</p>
                <p className="text-sm text-muted">
                  Add tables to arrange them on your venue floor plan.
                </p>
              </div>
            </div>
          ) : (
            ordered.map((table, i) => {
              const base = resolvePosition(table, i, ordered.length);
              const pos =
                drag && drag.id === table.id && drag.moved
                  ? { x: drag.x, y: drag.y }
                  : base;
              const seated = occupancy.get(table.id) ?? 0;
              const tint = accentColor(table.color);
              const active = drag?.id === table.id && drag.moved;
              const isSelected = selectedId === table.id;
              const isRound = table.shape === "ROUND";
              return (
                <button
                  key={table.id}
                  type="button"
                  onPointerDown={(e) => handlePointerDown(e, table.id)}
                  onPointerMove={(e) => handlePointerMove(e, table.id)}
                  onPointerUp={(e) => handlePointerUp(e, table.id)}
                  onKeyDown={(e) => handleKeyDown(e, table, base)}
                  aria-pressed={isSelected}
                  aria-label={`${table.name}, ${TABLE_SHAPE_LABELS[table.shape]} table, ${seated} of ${table.seatCount} seats filled. Drag or use arrow keys to reposition, Enter to edit.`}
                  className={`absolute flex touch-none flex-col items-center justify-center gap-0.5 border p-2 text-center shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                    isRound
                      ? "h-24 w-24 rounded-full"
                      : "h-20 w-28 rounded-xl"
                  } ${
                    active
                      ? "z-20 cursor-grabbing ring-2 ring-[var(--ring)]"
                      : "z-10 cursor-grab hover:shadow-lg"
                  } ${isSelected ? "ring-2 ring-[var(--ring)]" : ""}`}
                  style={{
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: `color-mix(in srgb, ${tint} 22%, var(--surface))`,
                    borderColor: `color-mix(in srgb, ${tint} 55%, var(--border-strong))`,
                  }}
                >
                  <span className="max-w-full truncate px-1 text-xs font-medium text-foreground">
                    {table.name}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-foreground"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${tint} 32%, var(--surface))`,
                    }}
                  >
                    {seated}/{table.seatCount}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {selected && (
          <TableEditor
            key={selected.id}
            table={selected}
            seated={occupancy.get(selected.id) ?? 0}
            onEditTable={onEditTable}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

interface TableEditorProps {
  table: LocationDTO;
  seated: number;
  onEditTable: (
    id: string,
    patch: { name?: string; shape?: TableShape; seatCount?: number },
  ) => void;
  onClose: () => void;
}

function TableEditor({ table, seated, onEditTable, onClose }: TableEditorProps) {
  const nameId = `venue-table-name-${table.id}`;
  const seatId = `venue-table-seats-${table.id}`;

  function handleSeatChange(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const next = Math.min(MAX_SEATS, Math.max(MIN_SEATS, parsed));
    if (next !== table.seatCount) onEditTable(table.id, { seatCount: next });
  }

  return (
    <aside
      className="card h-fit space-y-4 p-4"
      aria-label={`Edit table ${table.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">Editing</p>
          <p className="font-display text-base">{table.name}</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close table editor"
        >
          Done
        </button>
      </div>

      <div className="space-y-1">
        <label className="label" htmlFor={nameId}>
          Table name
        </label>
        <input
          id={nameId}
          className="input"
          type="text"
          value={table.name}
          onChange={(e) => onEditTable(table.id, { name: e.target.value })}
          placeholder="Table name"
        />
      </div>

      <div className="space-y-1">
        <span className="label" id={`${table.id}-shape-label`}>
          Shape
        </span>
        <div
          className="flex gap-2"
          role="group"
          aria-labelledby={`${table.id}-shape-label`}
        >
          {TABLE_SHAPES.map((shape) => {
            const isActive = table.shape === shape;
            return (
              <button
                key={shape}
                type="button"
                aria-pressed={isActive}
                className={`btn btn-sm flex-1 ${
                  isActive ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() =>
                  !isActive && onEditTable(table.id, { shape })
                }
              >
                {TABLE_SHAPE_LABELS[shape]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="label" htmlFor={seatId}>
          Seats ({MIN_SEATS}–{MAX_SEATS})
        </label>
        <input
          id={seatId}
          className="input"
          type="number"
          inputMode="numeric"
          min={MIN_SEATS}
          max={MAX_SEATS}
          value={table.seatCount}
          onChange={(e) => handleSeatChange(e.target.value)}
        />
        <p className="text-xs text-muted">
          {seated > table.seatCount ? (
            <span className="text-danger">
              {seated} guests seated — over capacity by{" "}
              {seated - table.seatCount}.
            </span>
          ) : (
            <>
              {seated} of {table.seatCount} seats filled.
            </>
          )}
        </p>
      </div>
    </aside>
  );
}
