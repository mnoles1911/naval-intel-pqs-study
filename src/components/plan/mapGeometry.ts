// Geometry helpers for the floor-plan Map view. Kept framework-free so the
// marker component and the canvas share one source of truth for table sizing
// and seat placement. All sizes are fractions (0..1) of the canvas.

import type { TableShape } from "@/lib/constants";
import type { LocationDTO } from "@/lib/types";

// Smallest a table may be shrunk to (fraction of the canvas on each axis).
export const MIN_TABLE_SIZE = 0.06;

// Sensible default footprint for a table that has no saved planW/planH.
export function defaultSize(shape: TableShape): { w: number; h: number } {
  return shape === "RECT" ? { w: 0.18, h: 0.11 } : { w: 0.13, h: 0.13 };
}

// Resolve a table's footprint, using saved planW/planH when present.
export function resolveSize(loc: LocationDTO): { w: number; h: number } {
  const d = defaultSize(loc.shape);
  return {
    w: loc.planW != null ? loc.planW : d.w,
    h: loc.planH != null ? loc.planH : d.h,
  };
}

// A seat's position as a percentage within the marker's bounding box. Seats may
// sit on the box edge (rect) or on the perimeter ellipse (round); the container
// renders with overflow visible so they read as chairs around the table.
export interface SeatPos {
  left: number; // 0..100
  top: number; // 0..100
}

// Positions for `seatCount` seats. Index matches SeatAssignment.seatIndex.
export function seatPositions(shape: TableShape, seatCount: number): SeatPos[] {
  const n = Math.max(0, seatCount);
  const seats: SeatPos[] = [];
  if (n === 0) return seats;

  if (shape === "ROUND") {
    // Evenly spaced around the perimeter, starting at the top.
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
      seats.push({
        left: 50 + Math.cos(angle) * 50,
        top: 50 + Math.sin(angle) * 50,
      });
    }
    return seats;
  }

  // RECT: split seats between the top and bottom edges.
  const topCount = Math.ceil(n / 2);
  const bottomCount = n - topCount;
  for (let i = 0; i < topCount; i++) {
    seats.push({ left: ((i + 0.5) / topCount) * 100, top: 0 });
  }
  for (let i = 0; i < bottomCount; i++) {
    seats.push({ left: ((i + 0.5) / bottomCount) * 100, top: 100 });
  }
  return seats;
}
