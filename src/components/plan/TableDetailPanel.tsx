"use client";

import { useEffect, useMemo, useRef } from "react";
import { TABLE_SHAPE_LABELS } from "@/lib/constants";
import type {
  ItemDTO,
  LocationDTO,
  PartyDTO,
  PersonDTO,
  SeatAssignmentDTO,
} from "@/lib/types";
import { accentColor, STATUS_COLOR } from "@/components/plan/planUtils";

interface Props {
  loc: LocationDTO;
  // All seat assignments in the active plan (filtered here for this table).
  assignments: SeatAssignmentDTO[];
  people: Map<string, PersonDTO>;
  parties: Map<string, PartyDTO>;
  // Items assigned to this location.
  items: ItemDTO[];
  onClose: () => void;
}

interface PartyGroup {
  key: string;
  name: string;
  color: string;
  people: string[];
}

export default function TableDetailPanel({
  loc,
  assignments,
  people,
  parties,
  items,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close on Escape and move focus to the close button on open.
  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Seated guests grouped by their party (solo guests share an "Individual"
  // bucket), ordered by seat index within each group.
  const groups = useMemo<PartyGroup[]>(() => {
    const seated = assignments
      .filter((a) => a.locationId === loc.id)
      .sort((a, b) => a.seatIndex - b.seatIndex);

    const byKey = new Map<string, PartyGroup>();
    for (const a of seated) {
      const person = people.get(a.personId);
      if (!person) continue;
      const party = person.partyId ? parties.get(person.partyId) : undefined;
      const key = party?.id ?? `__solo_${a.personId}`;
      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          name: party?.name ?? "Individual guest",
          color: accentColor(party?.color ?? null),
          people: [],
        };
        byKey.set(key, group);
      }
      group.people.push(person.name);
    }
    return [...byKey.values()];
  }, [assignments, loc.id, people, parties]);

  const seatedCount = groups.reduce((n, g) => n + g.people.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close table details"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${loc.name} details`}
        className="card relative z-10 flex h-full w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-none border-l p-5 shadow-xl"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={`h-3 w-3 shrink-0 ${
                  loc.shape === "ROUND" ? "rounded-full" : "rounded-[3px]"
                }`}
                style={{ background: accentColor(loc.color) }}
              />
              <h2 className="font-display truncate text-lg leading-tight">
                {loc.name}
              </h2>
            </div>
            <p className="text-xs text-muted">
              {TABLE_SHAPE_LABELS[loc.shape]} table · {seatedCount}/
              {loc.seatCount} seated
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm shrink-0"
          >
            Close
          </button>
        </header>

        {loc.description && (
          <p className="text-sm text-muted">{loc.description}</p>
        )}

        {/* Seated guests, grouped by party. */}
        <section className="space-y-2">
          <h3 className="label">Seated ({seatedCount})</h3>
          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
              No one seated here yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.key} className="rounded-lg bg-surface-2 p-2.5">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: g.color }}
                    />
                    <span className="truncate text-xs font-medium text-muted">
                      {g.name}
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {g.people.map((name, i) => (
                      <li key={i} className="chip text-xs">
                        {name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Items assigned to this table. */}
        <section className="space-y-2">
          <h3 className="label">Items ({items.length})</h3>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
              No items assigned here.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm"
                >
                  <span
                    aria-hidden
                    className="dot shrink-0"
                    style={{ background: STATUS_COLOR[it.status] }}
                  />
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  {it.quantity > 1 && (
                    <span className="shrink-0 text-xs text-muted">
                      ×{it.quantity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
