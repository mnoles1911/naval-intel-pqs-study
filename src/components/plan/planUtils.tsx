// Shared helpers for the floor-plan / placement board. Kept framework-free so
// both the Board and Map views draw from one source of truth.

import type { ItemStatus } from "@/lib/constants";
import type { ItemDTO, LocationDTO } from "@/lib/types";

// Status -> CSS custom property (matches StatusBadge / design system).
export const STATUS_COLOR: Record<ItemStatus, string> = {
  NEEDED: "var(--needed)",
  PURCHASED: "var(--purchased)",
  READY: "var(--ready)",
};

// A location's dot/marker color, falling back to the theme accent.
export function accentColor(color: string | null): string {
  return color && color.trim() ? color : "var(--accent)";
}

export interface Progress {
  ready: number;
  total: number;
  pct: number; // 0–100
}

// Ready-progress for a set of items ("ready" = packed and ready for the venue).
export function readyProgress(items: ItemDTO[]): Progress {
  const total = items.length;
  const ready = items.filter((it) => it.status === "READY").length;
  const pct = total === 0 ? 0 : Math.round((ready / total) * 100);
  return { ready, total, pct };
}

// A sensible default spread on the map canvas for locations that have no saved
// planX/planY. Positions are deterministic (grid based on list index) so a
// marker never jumps around between renders before it is first dragged.
export function defaultPosition(
  index: number,
  total: number,
): { x: number; y: number } {
  const count = Math.max(1, total);
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (col + 0.5) / cols,
    y: (row + 0.5) / rows,
  };
}

// Resolve a location's canvas position, using saved coords when present.
export function resolvePosition(
  loc: LocationDTO,
  index: number,
  total: number,
): { x: number; y: number } {
  if (loc.planX != null && loc.planY != null) {
    return { x: clamp01(loc.planX), y: clamp01(loc.planY) };
  }
  return defaultPosition(index, total);
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// Stable ordering shared by both views.
export function sortLocations(locations: LocationDTO[]): LocationDTO[] {
  return [...locations].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
  );
}
