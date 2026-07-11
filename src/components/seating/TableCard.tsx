"use client";

import { useState } from "react";
import { TABLE_SHAPE_LABELS } from "@/lib/constants";
import type { LocationDTO, PartyDTO, PersonDTO } from "@/lib/types";
import {
  GUEST_MIME,
  guestInitials,
  partyColorFor,
  rectSeatPositions,
  roundSeatPositions,
} from "./seatingUtils";
import GuestPuck from "./GuestPuck";

interface Props {
  table: LocationDTO;
  occupants: Map<number, PersonDTO>; // seatIndex -> guest
  peopleById: Map<string, PersonDTO>;
  parties: Map<string, PartyDTO>;
  tables: LocationDTO[];
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
  warnings,
  onSeat,
  onSeatParty,
  onUnseat,
}: Props) {
  const [hoverSeat, setHoverSeat] = useState<number | null>(null);
  const [hoverBody, setHoverBody] = useState(false);

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
            <div
              key={seatIndex}
              draggable={!!guest}
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
                  ? `Seat ${seatIndex + 1}: ${guest.name}${separated ? " (party split)" : ""}`
                  : `Empty seat ${seatIndex + 1}`
              }
              className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[0.65rem] font-semibold transition ${
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
            </div>
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
              onSeat={(personId, locationId) => onSeat(personId, locationId)}
              onUnseat={onUnseat}
            />
          ))}
        </div>
      )}
    </div>
  );
}
