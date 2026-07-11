"use client";

import { useCallback, useEffect, useState } from "react";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  fetchItems,
  fetchLocations,
  updateItem,
  updateLocation,
} from "@/lib/client";
import BoardView from "@/components/plan/BoardView";
import MapView from "@/components/plan/MapView";
import { clamp01 } from "@/components/plan/planUtils";

type View = "board" | "map";

export default function PlanPage() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [view, setView] = useState<View>("board");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [locs, its] = await Promise.all([fetchLocations(), fetchItems()]);
        if (!active) return;
        setLocations(locs);
        setItems(its);
      } catch (err) {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load the plan.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Reassign an item to a location (or null for Unassigned). Optimistic: move
  // the chip immediately, then revert just that item's location on failure.
  const reassignItem = useCallback(
    async (itemId: string, locationId: string | null) => {
      const target = items.find((it) => it.id === itemId);
      if (!target || target.locationId === locationId) return;
      const previousLocationId = target.locationId;

      setActionError(null);
      setItems((cur) =>
        cur.map((it) => (it.id === itemId ? { ...it, locationId } : it)),
      );

      try {
        const updated = await updateItem(itemId, { locationId });
        setItems((cur) => cur.map((it) => (it.id === itemId ? updated : it)));
      } catch (err) {
        setItems((cur) =>
          cur.map((it) =>
            it.id === itemId
              ? { ...it, locationId: previousLocationId }
              : it,
          ),
        );
        setActionError(
          err instanceof Error
            ? `Couldn't move "${target.name}": ${err.message}`
            : `Couldn't move "${target.name}".`,
        );
      }
    },
    [items],
  );

  // Persist a location's map position. Optimistic with per-field revert.
  const moveLocation = useCallback(
    async (id: string, planX: number, planY: number) => {
      const loc = locations.find((l) => l.id === id);
      if (!loc) return;
      const prevX = loc.planX;
      const prevY = loc.planY;
      const x = clamp01(planX);
      const y = clamp01(planY);

      setActionError(null);
      setLocations((cur) =>
        cur.map((l) => (l.id === id ? { ...l, planX: x, planY: y } : l)),
      );

      try {
        const updated = await updateLocation(id, { planX: x, planY: y });
        setLocations((cur) => cur.map((l) => (l.id === id ? updated : l)));
      } catch (err) {
        setLocations((cur) =>
          cur.map((l) =>
            l.id === id ? { ...l, planX: prevX, planY: prevY } : l,
          ),
        );
        setActionError(
          err instanceof Error
            ? `Couldn't move "${loc.name}": ${err.message}`
            : `Couldn't move "${loc.name}".`,
        );
      }
    },
    [locations],
  );

  const isEmpty = locations.length === 0 && items.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Placement</p>
          <h1 className="font-display text-2xl leading-tight">Floor plan</h1>
          <p className="text-sm text-muted">
            Drag items between zones to assign them, or arrange your venue on the
            map.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Plan view"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {(["board", "map"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`btn btn-sm rounded-md capitalize ${
                view === v ? "btn-primary" : "btn-ghost border-transparent"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {actionError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-danger"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading your plan…</p>
      ) : loadError ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-danger">{loadError}</p>
        </div>
      ) : isEmpty ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-lg">Nothing to place yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add some locations and items first — then you can drag them into
            place here.
          </p>
        </div>
      ) : view === "board" ? (
        <BoardView
          locations={locations}
          items={items}
          onReassign={reassignItem}
        />
      ) : (
        <MapView
          locations={locations}
          items={items}
          onMoveLocation={moveLocation}
        />
      )}
    </div>
  );
}
