"use client";

import { useMemo, useState } from "react";
import type { LocationDTO, PartyDTO, PersonDTO } from "@/lib/types";
import { RSVP_STATUS_LABELS, isRsvpStatus, type RsvpStatus } from "@/lib/constants";
import { GUEST_MIME } from "./seatingUtils";
import TableCard from "./TableCard";
import GuestPuck from "./GuestPuck";
import { SearchIcon, CloseIcon } from "@/components/icons";

interface SeatingChartProps {
  tables: LocationDTO[];
  people: PersonDTO[];
  parties: PartyDTO[];
  seatOf: Map<string, { locationId: string; seatIndex: number }>;
  warnings: Map<string, { separated: boolean; text: string }>;
  onSeat: (personId: string, locationId: string, seatIndex?: number) => void;
  onSeatParty: (personId: string, locationId: string) => void;
  onUnseat: (personId: string) => void;
}

type GuestScope = "all" | "unseated" | "seated";

const SCOPES: { value: GuestScope; label: string }[] = [
  { value: "unseated", label: "Unseated" },
  { value: "seated", label: "Seated" },
  { value: "all", label: "All" },
];

type RsvpFilter = "all" | RsvpStatus;

const RSVP_FILTERS: { value: RsvpFilter; label: string }[] = [
  { value: "all", label: "All RSVPs" },
  { value: "ATTENDING", label: RSVP_STATUS_LABELS.ATTENDING },
  { value: "DECLINED", label: RSVP_STATUS_LABELS.DECLINED },
  { value: "PENDING", label: RSVP_STATUS_LABELS.PENDING },
];

export default function SeatingChart({
  tables,
  people,
  parties,
  seatOf,
  warnings,
  onSeat,
  onSeatParty,
  onUnseat,
}: SeatingChartProps) {
  const [trayHover, setTrayHover] = useState(false);

  // --- Filters (chart view only) --------------------------------------------
  const [guestQuery, setGuestQuery] = useState("");
  const [guestScope, setGuestScope] = useState<GuestScope>("unseated");
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>("all");
  const [tableQuery, setTableQuery] = useState("");

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

  // occupant map: locationId -> (seatIndex -> guest)
  const occupantsByTable = useMemo(() => {
    const m = new Map<string, Map<number, PersonDTO>>();
    for (const [personId, seat] of seatOf) {
      const person = peopleById.get(personId);
      if (!person) continue;
      let inner = m.get(seat.locationId);
      if (!inner) {
        inner = new Map();
        m.set(seat.locationId, inner);
      }
      inner.set(seat.seatIndex, person);
    }
    return m;
  }, [seatOf, peopleById]);

  // Unseated = guests not present in seatOf. Passed to each table's seat picker.
  const unseated = useMemo(
    () =>
      people
        .filter((p) => !seatOf.has(p.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [people, seatOf],
  );

  // Tables shown in the grid, narrowed by the table-name filter. The full
  // `tables` list is still handed to each card so the "Seat at…" selects can
  // target any table.
  const visibleTables = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(q));
  }, [tables, tableQuery]);

  // Guests shown in the tray, narrowed by scope + RSVP status + name search.
  const trayGuests = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    return people
      .filter((p) => {
        const seated = seatOf.has(p.id);
        if (guestScope === "unseated" && seated) return false;
        if (guestScope === "seated" && !seated) return false;
        if (rsvpFilter !== "all") {
          const status = isRsvpStatus(p.rsvpStatus) ? p.rsvpStatus : "PENDING";
          if (status !== rsvpFilter) return false;
        }
        return !q || p.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, seatOf, guestScope, rsvpFilter, guestQuery]);

  // RSVP tallies across the whole guest list (independent of the active filter).
  const rsvpCounts = useMemo(() => {
    let attending = 0;
    let declined = 0;
    let pending = 0;
    for (const p of people) {
      const status = isRsvpStatus(p.rsvpStatus) ? p.rsvpStatus : "PENDING";
      if (status === "ATTENDING") attending += 1;
      else if (status === "DECLINED") declined += 1;
      else pending += 1;
    }
    return { attending, declined, pending };
  }, [people]);

  function handleTrayDrop(e: React.DragEvent) {
    e.preventDefault();
    setTrayHover(false);
    const id = e.dataTransfer.getData(GUEST_MIME);
    if (id) onUnseat(id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">Seating chart</span>
        <h2 className="font-display text-2xl">Tables</h2>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Guest filter: name search + scope segmented control + RSVP select */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-60">
            <SearchIcon
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={guestQuery}
              onChange={(e) => setGuestQuery(e.target.value)}
              placeholder="Search guests…"
              className="input w-full pl-8"
              aria-label="Search guests by name"
            />
            {guestQuery && (
              <button
                type="button"
                onClick={() => setGuestQuery("")}
                className="btn-ghost absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1"
                aria-label="Clear guest search"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter guests by seating status"
            className="inline-flex rounded-lg border border-border bg-surface p-0.5"
          >
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={guestScope === s.value}
                onClick={() => setGuestScope(s.value)}
                className={`btn btn-sm rounded-md ${
                  guestScope === s.value
                    ? "btn-primary"
                    : "btn-ghost border-transparent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <select
            value={rsvpFilter}
            onChange={(e) => setRsvpFilter(e.target.value as RsvpFilter)}
            className="input w-auto sm:w-40"
            aria-label="Filter guests by RSVP status"
          >
            {RSVP_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table filter: name search */}
        <div className="relative sm:w-60">
          <SearchIcon
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={tableQuery}
            onChange={(e) => setTableQuery(e.target.value)}
            placeholder="Filter tables…"
            className="input w-full pl-8"
            aria-label="Filter tables by name"
          />
          {tableQuery && (
            <button
              type="button"
              onClick={() => setTableQuery("")}
              className="btn-ghost absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1"
              aria-label="Clear table filter"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* RSVP summary across the whole guest list */}
      {people.length > 0 && (
        <p className="text-sm text-muted" role="status">
          {rsvpCounts.attending} attending · {rsvpCounts.declined} declined ·{" "}
          {rsvpCounts.pending} no response
        </p>
      )}
      </div>

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="toile-veil card p-8 text-center text-muted">
          No tables yet. Add a table to start seating guests.
        </div>
      ) : visibleTables.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No tables match “{tableQuery}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              occupants={occupantsByTable.get(table.id) ?? new Map()}
              peopleById={peopleById}
              parties={partiesById}
              tables={tables}
              unseatedGuests={unseated}
              guestQuery={guestQuery}
              warnings={warnings}
              onSeat={onSeat}
              onSeatParty={onSeatParty}
              onUnseat={onUnseat}
            />
          ))}
        </div>
      )}

      {/* Guest tray — respects the guest filter, and drops here unseat a guest. */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setTrayHover(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setTrayHover(false);
        }}
        onDrop={handleTrayDrop}
        className={`card flex flex-col gap-3 p-4 transition-colors ${
          trayHover ? "border-accent bg-accent-soft" : ""
        }`}
        aria-label="Guest list. Drop a guest here to unseat them."
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">
            {guestScope === "seated"
              ? "Seated"
              : guestScope === "all"
                ? "Guests"
                : "Unseated"}
          </h3>
          <span className="chip">{trayGuests.length}</span>
        </div>

        {people.length === 0 ? (
          <p className="text-sm text-muted">No guests added yet.</p>
        ) : trayGuests.length === 0 ? (
          <p className="text-sm text-muted">
            {guestQuery
              ? `No guests match “${guestQuery}”.`
              : guestScope === "unseated"
                ? "Everyone has a seat. Drag a guest here to unseat them."
                : "No guests to show."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {trayGuests.map((person) => (
              <GuestPuck
                key={person.id}
                person={person}
                parties={partiesById}
                tables={tables}
                warning={warnings.get(person.id)}
                seatedAt={seatOf.get(person.id)?.locationId ?? null}
                onSeat={onSeat}
                onSeatParty={onSeatParty}
                onUnseat={onUnseat}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
