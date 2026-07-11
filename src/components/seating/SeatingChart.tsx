"use client";

import { useMemo, useState } from "react";
import type { LocationDTO, PartyDTO, PersonDTO } from "@/lib/types";
import { GUEST_MIME } from "./seatingUtils";
import TableCard from "./TableCard";
import GuestPuck from "./GuestPuck";

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

  // Unseated = guests not present in seatOf.
  const unseated = useMemo(
    () => people.filter((p) => !seatOf.has(p.id)),
    [people, seatOf],
  );

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

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          No tables yet. Add a table to start seating guests.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              occupants={occupantsByTable.get(table.id) ?? new Map()}
              peopleById={peopleById}
              parties={partiesById}
              tables={tables}
              warnings={warnings}
              onSeat={onSeat}
              onSeatParty={onSeatParty}
              onUnseat={onUnseat}
            />
          ))}
        </div>
      )}

      {/* Unseated tray — also a drop target that unseats. */}
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
        aria-label="Unseated guests. Drop a guest here to unseat them."
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">Unseated</h3>
          <span className="chip">{unseated.length}</span>
        </div>

        {people.length === 0 ? (
          <p className="text-sm text-muted">No guests added yet.</p>
        ) : unseated.length === 0 ? (
          <p className="text-sm text-muted">
            Everyone has a seat. Drag a guest here to unseat them.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unseated.map((person) => (
              <GuestPuck
                key={person.id}
                person={person}
                parties={partiesById}
                tables={tables}
                warning={warnings.get(person.id)}
                seatedAt={null}
                onSeat={(personId, locationId) => onSeat(personId, locationId)}
                onUnseat={onUnseat}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
