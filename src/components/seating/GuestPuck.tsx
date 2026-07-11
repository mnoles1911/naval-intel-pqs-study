"use client";

import { useState } from "react";
import {
  UNASSIGNED,
  RSVP_STATUS_COLOR,
  RSVP_STATUS_LABELS,
  isRsvpStatus,
} from "@/lib/constants";
import type { LocationDTO, PartyDTO, PersonDTO } from "@/lib/types";
import { GUEST_MIME, partyColorFor } from "./seatingUtils";
import { useTouchDrag } from "@/lib/useTouchDrag";

interface Props {
  person: PersonDTO;
  parties: Map<string, PartyDTO>;
  tables: LocationDTO[];
  warning?: { separated: boolean; text: string };
  // Table id where the guest currently sits, or null when unseated. Drives the
  // accessible <select> value.
  seatedAt: string | null;
  // Next-free-seat placement (drag/select share the same path). The optional
  // seatIndex is honoured by the touch path when a guest is dropped on a
  // specific seat; callers that don't care may ignore it.
  onSeat: (personId: string, locationId: string, seatIndex?: number) => void;
  onUnseat: (personId: string) => void;
  // Optional: seat a guest's whole party together (touch body-drop parity).
  onSeatParty?: (personId: string, locationId: string) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

// A draggable guest "puck": party dot + name + party chip + accessible
// "Seat at…" select. Used in the unseated tray and each table's seated roster.
export default function GuestPuck({
  person,
  parties,
  tables,
  warning,
  seatedAt,
  onSeat,
  onUnseat,
  onSeatParty,
  onDragStateChange,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const color = partyColorFor(person, parties);
  const party = person.partyId ? parties.get(person.partyId) : undefined;
  const separated = warning?.separated ?? false;

  // RSVP: fall back to PENDING for any unexpected value from the API.
  const rsvp = isRsvpStatus(person.rsvpStatus) ? person.rsvpStatus : "PENDING";
  const rsvpLabel = RSVP_STATUS_LABELS[rsvp];
  const rsvpColor = RSVP_STATUS_COLOR[rsvp];

  // Rich hover tooltip: name, any split-party warning, then RSVP details.
  const titleParts = [person.name];
  if (separated && warning?.text) titleParts.push(warning.text);
  titleParts.push(`RSVP: ${rsvpLabel}`);
  if (person.mealChoice) titleParts.push(`Meal: ${person.mealChoice}`);
  if (person.dietaryNotes) titleParts.push(`Dietary: ${person.dietaryNotes}`);
  const title = titleParts.join(" · ");

  // Touch path: dropId is UNASSIGNED (unseat), a table id, or `${tableId}:${seatIndex}`
  // for a specific seat — resolved via data-drop-id on the seating targets.
  const bindTouchDrag = useTouchDrag({
    onDrop: (personId, dropId) => {
      if (dropId === UNASSIGNED) {
        onUnseat(personId);
        return;
      }
      const [locationId, seat] = dropId.split(":");
      if (seat !== undefined) {
        onSeat(personId, locationId, Number(seat));
      } else if (person.partyId && onSeatParty) {
        onSeatParty(personId, locationId);
      } else {
        onSeat(personId, locationId);
      }
    },
    onDragStart: () => {
      setDragging(true);
      onDragStateChange?.(true);
    },
    onDragEnd: () => {
      setDragging(false);
      onDragStateChange?.(false);
    },
  });

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(GUEST_MIME, person.id);
    e.dataTransfer.effectAllowed = "move";
    setDragging(true);
    onDragStateChange?.(true);
  }

  function handleDragEnd() {
    setDragging(false);
    onDragStateChange?.(false);
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === UNASSIGNED) onUnseat(person.id);
    else onSeat(person.id, value);
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      {...bindTouchDrag(person.id)}
      title={title}
      className={`group flex touch-none items-center gap-2 rounded-lg border bg-surface-2 px-2 py-1.5 text-sm transition ${
        separated ? "border-danger" : "border-border hover:border-border-strong"
      } ${dragging ? "opacity-40" : ""}`}
    >
      <span
        aria-hidden
        className="cursor-grab text-muted select-none active:cursor-grabbing"
      >
        ⠿
      </span>

      <span
        className="dot shrink-0"
        style={{ background: color }}
        aria-hidden
      />

      <span className="min-w-0 flex-1 truncate" title={person.name}>
        {person.name}
      </span>

      {/* RSVP status dot — color per status, labelled for screen readers. */}
      <span
        className="dot shrink-0"
        style={{ background: rsvpColor }}
        role="img"
        aria-label={rsvpLabel}
        title={rsvpLabel}
      />

      {person.mealChoice && (
        <span
          className="max-w-[5rem] shrink-0 truncate text-xs text-muted"
          title={`Meal: ${person.mealChoice}`}
        >
          {person.mealChoice}
        </span>
      )}

      {separated && (
        <span className="shrink-0 text-danger" title={warning?.text} aria-label="Party is split across tables">
          ⚠
        </span>
      )}

      {party && (
        <span className="chip max-w-[7rem]">
          <span className="dot" style={{ background: color }} aria-hidden />
          <span className="truncate">{party.name}</span>
        </span>
      )}

      {/* Accessible fallback: keyboard/touch users get full control here. */}
      <select
        value={seatedAt ?? UNASSIGNED}
        onChange={handleSelect}
        className="input w-auto max-w-[9rem] shrink-0 px-2 py-1 text-xs"
        aria-label={`Seat ${person.name} at a table`}
      >
        <option value={UNASSIGNED}>Unseated</option>
        {tables.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
