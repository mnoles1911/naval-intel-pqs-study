"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ItemDTO,
  LocationDTO,
  PartyDTO,
  PersonDTO,
  SeatAssignmentDTO,
} from "@/lib/types";
import {
  fetchItems,
  fetchLocations,
  fetchParties,
  fetchPeople,
  fetchPlan,
  fetchPlans,
  updateItem,
  updateLocation,
} from "@/lib/client";
import MapView from "@/components/plan/MapView";
import { clamp01 } from "@/components/plan/planUtils";

export default function PlanWorkspace() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [people, setPeople] = useState<PersonDTO[]>([]);
  const [parties, setParties] = useState<PartyDTO[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [locs, its, ppl, pts, plans] = await Promise.all([
          fetchLocations(),
          fetchItems(),
          fetchPeople(),
          fetchParties(),
          fetchPlans(),
        ]);
        if (!active) return;
        setLocations(locs);
        setItems(its);
        setPeople(ppl);
        setParties(pts);

        // Load the active plan's seat assignments (fall back to the first).
        const activePlan = plans.find((p) => p.isActive) ?? plans[0];
        if (activePlan) {
          const { assignments: seats } = await fetchPlan(activePlan.id);
          if (!active) return;
          setAssignments(seats);
        }
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

  // Persist a location's map footprint. Optimistic with per-field revert.
  const resizeLocation = useCallback(
    async (id: string, planW: number, planH: number) => {
      const loc = locations.find((l) => l.id === id);
      if (!loc) return;
      const prevW = loc.planW;
      const prevH = loc.planH;

      setActionError(null);
      setLocations((cur) =>
        cur.map((l) => (l.id === id ? { ...l, planW, planH } : l)),
      );

      try {
        const updated = await updateLocation(id, { planW, planH });
        setLocations((cur) => cur.map((l) => (l.id === id ? updated : l)));
      } catch (err) {
        setLocations((cur) =>
          cur.map((l) =>
            l.id === id ? { ...l, planW: prevW, planH: prevH } : l,
          ),
        );
        setActionError(
          err instanceof Error
            ? `Couldn't resize "${loc.name}": ${err.message}`
            : `Couldn't resize "${loc.name}".`,
        );
      }
    },
    [locations],
  );

  // Place/move an item on the map, optionally (re)assigning it to a table.
  // Optimistic, reverting the touched fields on failure.
  const placeItem = useCallback(
    async (
      id: string,
      planX: number,
      planY: number,
      locationId?: string,
    ) => {
      const item = items.find((it) => it.id === id);
      if (!item) return;
      const prev = {
        planX: item.planX,
        planY: item.planY,
        locationId: item.locationId,
      };
      const patch =
        locationId !== undefined
          ? { planX, planY, locationId }
          : { planX, planY };

      setActionError(null);
      setItems((cur) =>
        cur.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      );

      try {
        const updated = await updateItem(id, patch);
        setItems((cur) => cur.map((it) => (it.id === id ? updated : it)));
      } catch (err) {
        setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...prev } : it)));
        setActionError(
          err instanceof Error
            ? `Couldn't place "${item.name}": ${err.message}`
            : `Couldn't place "${item.name}".`,
        );
      }
    },
    [items],
  );

  const isEmpty = locations.length === 0 && items.length === 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Arrange your venue: drag tables and areas to lay out the room, resize
        them, and drop items onto the map.
      </p>

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
        <div className="toile-veil card p-10 text-center">
          <h2 className="font-display text-lg">Nothing to place yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add some locations and items first — then you can arrange them on
            the map here.
          </p>
        </div>
      ) : (
        <MapView
          locations={locations}
          items={items}
          people={people}
          parties={parties}
          assignments={assignments}
          onMoveLocation={moveLocation}
          onResizeLocation={resizeLocation}
          onPlaceItem={placeItem}
        />
      )}
    </div>
  );
}
