"use client";

import type { LocationDTO } from "@/lib/types";
import { accentColor } from "@/components/plan/planUtils";
import { seatPositions } from "@/components/plan/mapGeometry";

interface Props {
  loc: LocationDTO;
  // Current canvas position + footprint as fractions (0..1).
  x: number;
  y: number;
  w: number;
  h: number;
  // Occupancy: seatOccupied[seatIndex] === true when someone is seated there.
  seatOccupied: boolean[];
  seatedCount: number;
  isDragging: boolean;
  isResizing: boolean;
  // True when an item is being dragged over this table (drop target).
  isDropTarget: boolean;

  onMoveStart: (e: React.PointerEvent, loc: LocationDTO) => void;
  onMoveMove: (e: React.PointerEvent) => void;
  onMoveEnd: (e: React.PointerEvent, loc: LocationDTO) => void;
  onPointerCancel: (e: React.PointerEvent) => void;

  onResizeStart: (e: React.PointerEvent, loc: LocationDTO) => void;
  onResizeMove: (e: React.PointerEvent) => void;
  onResizeEnd: (e: React.PointerEvent, loc: LocationDTO) => void;

  onKeyDown: (e: React.KeyboardEvent, loc: LocationDTO) => void;
}

export default function TableMarker({
  loc,
  x,
  y,
  w,
  h,
  seatOccupied,
  seatedCount,
  isDragging,
  isResizing,
  isDropTarget,
  onMoveStart,
  onMoveMove,
  onMoveEnd,
  onPointerCancel,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onKeyDown,
}: Props) {
  const color = accentColor(loc.color);
  const round = loc.shape === "ROUND";
  const seats = seatPositions(loc.shape, loc.seatCount);
  const active = isDragging || isResizing;

  const ring = isDropTarget
    ? "0 0 0 2px var(--accent)"
    : active
      ? "0 0 0 2px var(--ring)"
      : null;
  const elevation = active ? "0 6px 18px rgba(0,0,0,0.18)" : null;
  const boxShadow = [ring, elevation].filter(Boolean).join(", ") || undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${loc.name}, ${
        round ? "round" : "rectangular"
      } table, ${seatedCount} of ${loc.seatCount} seats filled. Press Enter for details, arrow keys to move.`}
      onPointerDown={(e) => onMoveStart(e, loc)}
      onPointerMove={onMoveMove}
      onPointerUp={(e) => onMoveEnd(e, loc)}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => onKeyDown(e, loc)}
      className={`absolute touch-none select-none focus:outline-none ${
        active ? "z-30 cursor-grabbing" : "z-10 cursor-grab"
      }`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Seats around the table. Non-interactive; the table body handles drags. */}
      {seats.map((s, i) => {
        const filled = seatOccupied[i];
        return (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute h-2.5 w-2.5 rounded-[3px] border"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              transform: "translate(-50%, -50%)",
              background: filled ? color : "var(--surface)",
              borderColor: filled ? color : "var(--border-strong)",
            }}
          />
        );
      })}

      {/* Table body: shaped + tinted, shows name + occupancy. */}
      <div
        className={`grid h-full w-full place-items-center overflow-hidden border px-1.5 text-center transition-shadow ${
          round ? "rounded-full" : "rounded-xl"
        }`}
        style={{
          background: `color-mix(in srgb, ${color} 22%, var(--surface))`,
          borderColor: color,
          boxShadow,
        }}
      >
        <span className="pointer-events-none min-w-0 leading-tight">
          <span className="block truncate text-[0.72rem] font-medium text-foreground">
            {loc.name}
          </span>
          <span className="block text-[0.62rem] tabular-nums text-muted">
            {seatedCount}/{loc.seatCount}
          </span>
        </span>
      </div>

      {/* Resize handle (bottom-right). Its own pointer capture. */}
      <span
        aria-hidden
        title={`Drag to resize ${loc.name}`}
        onPointerDown={(e) => onResizeStart(e, loc)}
        onPointerMove={onResizeMove}
        onPointerUp={(e) => onResizeEnd(e, loc)}
        onPointerCancel={onPointerCancel}
        className="absolute -bottom-1 -right-1 z-40 h-3.5 w-3.5 cursor-se-resize touch-none rounded-full border border-[var(--surface)] shadow"
        style={{ background: color }}
      />
    </div>
  );
}
