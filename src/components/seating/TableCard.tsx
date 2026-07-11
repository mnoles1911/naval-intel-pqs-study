"use client";

import { useState } from "react";
import { TABLE_SHAPE_LABELS, UNASSIGNED } from "@/lib/constants";
import type { LocationDTO, PartyDTO, PersonDTO } from "@/lib/types";
import {
  GUEST_MIME,
  guestInitials,
  partyColorFor,
  rectSeatPositions,
  roundSeatPositions,
} from "./seatingUtils";
import GuestPuck from "./GuestPuck";
import { useTouchDrag } from "@/lib/useTouchDrag";
import { CloseIcon, SearchIcon, TrashIcon } from "@/components/icons";

interface Props {
  table: LocationDTO;
  occupants: Map<number, PersonDTO>; // seatIndex -> guest
  peopleById: Map<string, PersonDTO>;
  parties: Map<string, PartyDTO>;
  tables: LocationDTO[];
  // Unseated guests (already name-sorted) offered by the click-to-seat picker.
  unseatedGuests: PersonDTO[];
  // Active guest search text from the chart filter; seeds the picker's search.
  guestQuery: string;
  warnings: Map<string, { separated: boolean; text: string }>;
  onSeat: (personId: string, locationId: string, seatIndex?: number) => void;
  onSeatParty: (personId: string, locationId: string) => void;
  onUnseat: (personId: string) => void;
}

export default function TableCard({
  table,
  occupants,
  peopleById,
  parties,
  tables,
  unseatedGuests,
  guestQuery,
  warnings,
  onSeat,
  onSeatParty,
  onUnseat,
}: Props) {
  const [hoverSeat, setHoverSeat] = useState<number | null>(null);
  const [hoverBody, setHoverBody] = useState(false);

  // Click-to-assign picker: which seat index is being edited (null = closed),
  // plus a local search seeded from the chart's active guest filter.
  const [pickerSeat, setPickerSeat] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  function openPicker(seatIndex: number) {
    setPickerSeat(seatIndex);
    setPickerQuery(guestQuery);
  }
  function closePicker() {
    setPickerSeat(null);
  }

  const pickerOccupant =
    pickerSeat !== null ? occupants.get(pickerSeat) : undefined;

  const pickerMatches = (() => {
    if (pickerSeat === null || pickerOccupant) return [];
    const q = pickerQuery.trim().toLowerCase();
    return q
      ? unseatedGuests.filter((p) => p.name.toLowerCase().includes(q))
      : unseatedGuests;
  })();

  // Touch path for occupied seats (drag source). dropId encodes the target the
  // same way the HTML5 drops resolve it: UNASSIGNED, a table id (whole party /
  // next free seat), or `${tableId}:${seatIndex}` for a specific seat.
  const bindTouchDrag = useTouchDrag({
    onDrop: (personId, dropId) => {
      if (dropId === UNASSIGNED) {
        onUnseat(personId);
        return;
      }
      const [locationId, seat] = dropId.split(":");
      if (seat !== undefined) {
        onSeat(personId, locationId, Number(seat));
        return;
      }
      const person = peopleById.get(personId);
      if (person?.partyId) onSeatParty(personId, locationId);
      else onSeat(personId, locationId);
    },
  });

  const isRound = table.shape === "ROUND";
  const positions = isRound
    ? roundSeatPositions(table.seatCount)
    : rectSeatPositions(table.seatCount);

  // Drop on the table body (not a specific seat): keep parties together.
  function handleBodyDrop(e: React.DragEvent) {
    e.preventDefault();
    setHoverBody(false);
    const id = e.dataTransfer.getData(GUEST_MIME);
    if (!id) return;
    const person = peopleById.get(id);
    if (person?.partyId) onSeatParty(id, table.id);
    else onSeat(id, table.id);
  }

  // Drop on a specific seat: place there (parent swaps if occupied).
  function handleSeatDrop(e: React.DragEvent, seatIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    setHoverSeat(null);
    setHoverBody(false);
    const id = e.dataTransfer.getData(GUEST_MIME);
    if (!id) return;
    onSeat(id, table.id, seatIndex);
  }

  const seatedRoster = Array.from(occupants.entries()).sort(
    (a, b) => a[0] - b[0],
  );

  return (
    <div className="card card-hover flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display truncate text-lg" title={table.name}>
            {table.name}
          </h3>
          <span className="eyebrow">{TABLE_SHAPE_LABELS[table.shape]}</span>
        </div>
        <span className="chip shrink-0">
          {occupants.size} / {table.seatCount}
        </span>
      </div>

      {/* Shape visual + seats. The body is a drop target for whole-party seating. */}
      <div
        className={`relative mx-auto w-full max-w-[15rem] ${
          isRound ? "aspect-square" : "aspect-[3/2]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setHoverBody(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setHoverBody(false);
        }}
        onDrop={handleBodyDrop}
        // Touch body-drop target: seats the whole party (or next free seat).
        data-drop-id={table.id}
      >
        {/* The tabletop */}
        <div
          aria-hidden
          className={`absolute inset-[18%] border-2 bg-surface-2 transition-colors ${
            isRound ? "rounded-full" : "rounded-lg"
          } ${hoverBody ? "border-accent" : "border-border-strong"}`}
        >
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
            {hoverBody ? "Seat party here" : ""}
          </span>
        </div>

        {/* Seats */}
        {positions.map((pos, seatIndex) => {
          const guest = occupants.get(seatIndex);
          const warning = guest ? warnings.get(guest.id) : undefined;
          const separated = warning?.separated ?? false;
          const isHover = hoverSeat === seatIndex;
          const color = guest ? partyColorFor(guest, parties) : undefined;

          return (
            <button
              key={seatIndex}
              type="button"
              draggable={!!guest}
              // Touch-drop target for this exact seat.
              data-drop-id={`${table.id}:${seatIndex}`}
              // Touch drag source when occupied (mirrors the HTML5 source).
              {...(guest ? bindTouchDrag(guest.id) : {})}
              onClick={() => openPicker(seatIndex)}
              onDragStart={(e) => {
                if (!guest) return;
                e.dataTransfer.setData(GUEST_MIME, guest.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setHoverSeat(seatIndex);
              }}
              onDragLeave={() => setHoverSeat((s) => (s === seatIndex ? null : s))}
              onDrop={(e) => handleSeatDrop(e, seatIndex)}
              title={
                guest
                  ? separated
                    ? `${guest.name} — ${warning?.text}`
                    : guest.name
                  : `Empty seat ${seatIndex + 1}`
              }
              aria-label={
                guest
                  ? `Seat ${seatIndex + 1}: ${guest.name}${separated ? " (party split)" : ""}. Activate to remove.`
                  : `Empty seat ${seatIndex + 1}. Activate to assign a guest.`
              }
              className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border text-[0.65rem] font-semibold transition ${
                guest
                  ? "cursor-grab active:cursor-grabbing"
                  : "border-dashed border-border-strong bg-surface"
              } ${
                isHover
                  ? "ring-2 ring-accent"
                  : separated
                    ? "ring-2 ring-danger"
                    : ""
              }`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                ...(guest
                  ? {
                      backgroundColor: `color-mix(in srgb, ${color} 32%, var(--surface))`,
                      borderColor: color,
                      color: "var(--foreground)",
                    }
                  : {}),
              }}
            >
              {guest ? (
                <>
                  {guestInitials(guest.name)}
                  {separated && (
                    <span
                      aria-hidden
                      className="absolute -right-1 -top-1 leading-none text-danger"
                    >
                      ⚠
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted opacity-50">{seatIndex + 1}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Seated roster: accessible per-guest control + drag source. */}
      {seatedRoster.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Seated</span>
          {seatedRoster.map(([, guest]) => (
            <GuestPuck
              key={guest.id}
              person={guest}
              parties={parties}
              tables={tables}
              warning={warnings.get(guest.id)}
              seatedAt={table.id}
              onSeat={onSeat}
              onSeatParty={onSeatParty}
              onUnseat={onUnseat}
            />
          ))}
        </div>
      )}

      {/* Click-to-assign picker (lightweight modal). */}
      {pickerSeat !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close seat picker"
            className="absolute inset-0 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Seat ${pickerSeat + 1} at ${table.name}`}
            className="card relative z-10 flex w-full max-w-sm flex-col gap-3 p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="eyebrow">{table.name}</span>
                <h4 className="font-display text-lg">
                  Seat {pickerSeat + 1}
                </h4>
              </div>
              <button
                type="button"
                onClick={closePicker}
                className="btn-ghost rounded-md p-1"
                aria-label="Close"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {pickerOccupant ? (
              // Occupied seat: offer to clear it.
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  <span className="font-medium text-foreground">
                    {pickerOccupant.name}
                  </span>{" "}
                  is seated here.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onUnseat(pickerOccupant.id);
                    closePicker();
                  }}
                  className="btn btn-sm btn-ghost self-start text-danger"
                  aria-label={`Remove ${pickerOccupant.name} from seat ${pickerSeat + 1}`}
                >
                  <TrashIcon size={15} />
                  Remove from seat
                </button>
              </div>
            ) : (
              // Empty seat: pick an unseated guest to assign here.
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <SearchIcon
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                  <input
                    autoFocus
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Search unseated guests…"
                    className="input w-full pl-8"
                    aria-label="Search unseated guests"
                  />
                </div>

                {pickerMatches.length === 0 ? (
                  <p className="text-sm text-muted">
                    {unseatedGuests.length === 0
                      ? "Everyone already has a seat."
                      : "No unseated guests match your search."}
                  </p>
                ) : (
                  <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
                    {pickerMatches.map((person) => {
                      const color = partyColorFor(person, parties);
                      const party = person.partyId
                        ? parties.get(person.partyId)
                        : undefined;
                      return (
                        <li key={person.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onSeat(person.id, table.id, pickerSeat);
                              closePicker();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-left text-sm transition hover:border-border-strong"
                            aria-label={`Seat ${person.name} in seat ${pickerSeat + 1}`}
                          >
                            <span
                              className="dot shrink-0"
                              style={{ background: color }}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {person.name}
                            </span>
                            {party && (
                              <span className="chip max-w-[7rem] shrink-0 truncate">
                                {party.name}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
