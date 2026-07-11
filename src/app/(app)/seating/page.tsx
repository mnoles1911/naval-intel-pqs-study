"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LocationDTO,
  PartyDTO,
  PersonDTO,
  SeatAssignmentDTO,
  SeatingPlanDTO,
} from "@/lib/types";
import type { TableShape } from "@/lib/constants";
import {
  fetchPlans,
  fetchPlan,
  createPlan,
  updatePlan,
  activatePlan,
  duplicatePlan,
  deletePlan,
  fetchPeople,
  fetchParties,
  fetchLocations,
  createPerson,
  deletePerson,
  linkPeople,
  unlinkPerson,
  assignSeat,
  assignParty,
  unassignSeat,
  updateLocation,
} from "@/lib/client";
import { buildWarnings } from "@/components/seating/seatingView";
import PlanBar from "@/components/seating/PlanBar";
import GuestRoster from "@/components/seating/GuestRoster";
import CsvPanel from "@/components/seating/CsvPanel";
import SeatingChart from "@/components/seating/SeatingChart";
import VenueMap from "@/components/seating/VenueMap";

type View = "chart" | "map";

export default function SeatingPage() {
  const [plans, setPlans] = useState<SeatingPlanDTO[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<SeatAssignmentDTO[]>([]);
  const [people, setPeople] = useState<PersonDTO[]>([]);
  const [parties, setParties] = useState<PartyDTO[]>([]);
  const [tables, setTables] = useState<LocationDTO[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("chart");

  // --- Loading ---------------------------------------------------------------
  const loadAll = useCallback(async () => {
    const [pl, ppl, pt, locs] = await Promise.all([
      fetchPlans(),
      fetchPeople(),
      fetchParties(),
      fetchLocations(),
    ]);
    let planList = pl;
    let active = pl.find((p) => p.isActive) ?? pl[0];
    if (!active) {
      active = await createPlan({ name: "Plan A" });
      planList = await fetchPlans();
    }
    const { assignments: seats } = await fetchPlan(active.id);
    setPlans(planList);
    setActivePlanId(active.id);
    setAssignments(seats);
    setPeople(ppl);
    setParties(pt);
    setTables(locs);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadAll();
      } catch (err) {
        if (active)
          setLoadError(
            err instanceof Error ? err.message : "Failed to load seating.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadAll]);

  // Run an action with a busy flag and centralized error surface.
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, []);

  const reloadRoster = useCallback(async () => {
    const [ppl, pt] = await Promise.all([fetchPeople(), fetchParties()]);
    setPeople(ppl);
    setParties(pt);
  }, []);

  const reloadAssignments = useCallback(async (planId: string) => {
    const { assignments: seats } = await fetchPlan(planId);
    setAssignments(seats);
  }, []);

  // --- Derived ---------------------------------------------------------------
  const seatOf = useMemo(() => {
    const m = new Map<string, { locationId: string; seatIndex: number }>();
    for (const a of assignments)
      m.set(a.personId, { locationId: a.locationId, seatIndex: a.seatIndex });
    return m;
  }, [assignments]);

  const tableOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of assignments) m.set(a.personId, a.locationId);
    return m;
  }, [assignments]);

  const warnings = useMemo(
    () => buildWarnings(people, tables, tableOf),
    [people, tables, tableOf],
  );

  const splitPartyCount = useMemo(() => {
    const partyIds = new Set<string>();
    for (const p of people) {
      if (p.partyId && warnings.get(p.id)?.separated) partyIds.add(p.partyId);
    }
    return partyIds.size;
  }, [people, warnings]);

  // --- Seat actions ----------------------------------------------------------
  const onSeat = useCallback(
    (personId: string, locationId: string, seatIndex?: number) =>
      run(async () => {
        if (!activePlanId) return;
        const seats = await assignSeat(activePlanId, {
          personId,
          locationId,
          seatIndex,
        });
        setAssignments(seats);
      }),
    [activePlanId, run],
  );

  const onSeatParty = useCallback(
    (personId: string, locationId: string) =>
      run(async () => {
        if (!activePlanId) return;
        const res = await assignParty(activePlanId, { personId, locationId });
        setAssignments(res.assignments);
        if (res.skipped > 0) {
          setActionError(
            `Seated ${res.seated}; ${res.skipped} couldn't fit — that table is full.`,
          );
        }
      }),
    [activePlanId, run],
  );

  const onUnseat = useCallback(
    (personId: string) =>
      run(async () => {
        if (!activePlanId) return;
        await unassignSeat(activePlanId, personId);
        setAssignments((cur) => cur.filter((a) => a.personId !== personId));
      }),
    [activePlanId, run],
  );

  // --- Table actions ---------------------------------------------------------
  const onMoveTable = useCallback(
    (id: string, planX: number, planY: number) =>
      run(async () => {
        setTables((cur) =>
          cur.map((t) => (t.id === id ? { ...t, planX, planY } : t)),
        );
        const updated = await updateLocation(id, { planX, planY });
        setTables((cur) => cur.map((t) => (t.id === id ? updated : t)));
      }),
    [run],
  );

  const onEditTable = useCallback(
    (
      id: string,
      patch: { name?: string; shape?: TableShape; seatCount?: number },
    ) =>
      run(async () => {
        const updated = await updateLocation(id, patch);
        setTables((cur) => cur.map((t) => (t.id === id ? updated : t)));
      }),
    [run],
  );

  // --- Plan actions ----------------------------------------------------------
  const switchPlan = useCallback(
    (id: string) =>
      run(async () => {
        await activatePlan(id);
        const { assignments: seats } = await fetchPlan(id);
        setActivePlanId(id);
        setAssignments(seats);
        setPlans((cur) =>
          cur.map((p) => ({ ...p, isActive: p.id === id })),
        );
      }),
    [run],
  );

  const createNewPlan = useCallback(
    (name: string) =>
      run(async () => {
        const created = await createPlan({ name });
        await activatePlan(created.id);
        setPlans(await fetchPlans());
        setActivePlanId(created.id);
        await reloadAssignments(created.id);
      }),
    [run, reloadAssignments],
  );

  const duplicateCurrentPlan = useCallback(
    (name: string) =>
      run(async () => {
        if (!activePlanId) return;
        const created = await duplicatePlan(activePlanId, name);
        await activatePlan(created.id);
        setPlans(await fetchPlans());
        setActivePlanId(created.id);
        await reloadAssignments(created.id);
      }),
    [activePlanId, run, reloadAssignments],
  );

  const renamePlan = useCallback(
    (id: string, name: string) =>
      run(async () => {
        await updatePlan(id, { name });
        setPlans((cur) => cur.map((p) => (p.id === id ? { ...p, name } : p)));
      }),
    [run],
  );

  const removePlan = useCallback(
    (id: string) =>
      run(async () => {
        await deletePlan(id);
        const pl = await fetchPlans();
        setPlans(pl);
        const active = pl.find((p) => p.isActive) ?? pl[0] ?? null;
        setActivePlanId(active?.id ?? null);
        if (active) await reloadAssignments(active.id);
        else setAssignments([]);
      }),
    [run, reloadAssignments],
  );

  // --- Guest actions ---------------------------------------------------------
  const addGuest = useCallback(
    (name: string) =>
      run(async () => {
        await createPerson({ name });
        await reloadRoster();
      }),
    [run, reloadRoster],
  );

  const removeGuest = useCallback(
    (id: string) =>
      run(async () => {
        await deletePerson(id);
        await reloadRoster();
        setAssignments((cur) => cur.filter((a) => a.personId !== id));
      }),
    [run, reloadRoster],
  );

  const linkGuests = useCallback(
    (aId: string, bId: string) =>
      run(async () => {
        await linkPeople(aId, bId);
        await reloadRoster();
      }),
    [run, reloadRoster],
  );

  const unlinkGuest = useCallback(
    (id: string) =>
      run(async () => {
        await unlinkPerson(id);
        await reloadRoster();
      }),
    [run, reloadRoster],
  );

  const onImported = useCallback(() => {
    void run(async () => {
      await reloadRoster();
      if (activePlanId) await reloadAssignments(activePlanId);
    });
  }, [run, reloadRoster, reloadAssignments, activePlanId]);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  // --- Render ----------------------------------------------------------------
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Guests</p>
          <h1 className="font-display text-2xl leading-tight">Seating</h1>
          <p className="text-sm text-muted">
            Seat your guests at tables, keep parties together, and save
            different plans to compare.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Seating view"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {(["chart", "map"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`btn btn-sm rounded-md capitalize ${
                view === v ? "btn-primary" : "btn-ghost border-transparent"
              }`}
            >
              {v === "chart" ? "Seating chart" : "Venue map"}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading your seating…</p>
      ) : loadError ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-danger">{loadError}</p>
        </div>
      ) : (
        <>
          <PlanBar
            plans={plans}
            activePlanId={activePlanId}
            busy={busy}
            onSwitch={switchPlan}
            onCreate={createNewPlan}
            onDuplicate={duplicateCurrentPlan}
            onRename={renamePlan}
            onDelete={removePlan}
          />

          {splitPartyCount > 0 && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-danger"
            >
              <span aria-hidden>⚠</span>
              <span>
                {splitPartyCount}{" "}
                {splitPartyCount === 1 ? "party is" : "parties are"} split
                across tables — check the highlighted guests.
              </span>
            </div>
          )}

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

          {view === "chart" ? (
            <SeatingChart
              tables={tables}
              people={people}
              parties={parties}
              seatOf={seatOf}
              warnings={warnings}
              onSeat={onSeat}
              onSeatParty={onSeatParty}
              onUnseat={onUnseat}
            />
          ) : (
            <VenueMap
              tables={tables}
              people={people}
              seatOf={seatOf}
              onMoveTable={onMoveTable}
              onEditTable={onEditTable}
            />
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GuestRoster
              people={people}
              parties={parties}
              busy={busy}
              onAdd={addGuest}
              onDelete={removeGuest}
              onLink={linkGuests}
              onUnlink={unlinkGuest}
            />
            {activePlan && (
              <CsvPanel
                planId={activePlan.id}
                planName={activePlan.name}
                onImported={onImported}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
