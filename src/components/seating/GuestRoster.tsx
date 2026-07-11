"use client";

import { useMemo, useState } from "react";
import type { PersonDTO, PartyDTO } from "@/lib/types";
import { partyColor } from "@/components/seating/seatingView";

interface GuestRosterProps {
  people: PersonDTO[];
  parties: PartyDTO[];
  busy?: boolean;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onLink: (aId: string, bId: string) => void;
  onUnlink: (id: string) => void;
}

// The guest list: add guests, and link/unlink them into parties (couples or
// families who sit together). Seating itself happens on the chart.
export default function GuestRoster({
  people,
  parties,
  busy,
  onAdd,
  onDelete,
  onLink,
  onUnlink,
}: GuestRosterProps) {
  const [name, setName] = useState("");
  const partiesById = useMemo(
    () => new Map(parties.map((p) => [p.id, p])),
    [parties],
  );
  const sorted = useMemo(
    () => [...people].sort((a, b) => a.name.localeCompare(b.name)),
    [people],
  );

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
    }
  }

  return (
    <section className="card p-4">
      <header className="mb-3">
        <h2 className="font-display text-lg leading-tight">Guest list</h2>
        <p className="text-xs text-muted">
          {people.length} {people.length === 1 ? "guest" : "guests"} · link
          people so couples and families stay together.
        </p>
      </header>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a guest…"
          className="input flex-1"
          aria-label="New guest name"
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm shrink-0"
          disabled={busy || !name.trim()}
        >
          Add
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No guests yet — add your first above.</p>
      ) : (
        <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto pr-1">
          {sorted.map((person) => {
            const party = person.partyId
              ? partiesById.get(person.partyId)
              : undefined;
            const others = sorted.filter((p) => p.id !== person.id);
            return (
              <li
                key={person.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm"
              >
                <span
                  className="dot shrink-0"
                  style={{ background: partyColor(party) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate" title={person.name}>
                  {person.name}
                </span>

                {party ? (
                  <span
                    className="chip max-w-[7rem] shrink-0 truncate"
                    title={party.name}
                  >
                    {party.name}
                  </span>
                ) : null}

                {/* Link with another guest (creates/merges a party). */}
                <select
                  value=""
                  disabled={busy || others.length === 0}
                  onChange={(e) => {
                    if (e.target.value) onLink(person.id, e.target.value);
                    e.target.value = "";
                  }}
                  className="input w-auto max-w-[7.5rem] shrink-0 px-2 py-1 text-xs"
                  aria-label={`Link ${person.name} with another guest`}
                  title="Link with another guest"
                >
                  <option value="">Link…</option>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                {party ? (
                  <button
                    type="button"
                    onClick={() => onUnlink(person.id)}
                    disabled={busy}
                    className="shrink-0 text-xs font-medium text-muted hover:text-foreground"
                    title="Remove from party"
                  >
                    Unlink
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remove ${person.name} from the guest list?`))
                      onDelete(person.id);
                  }}
                  disabled={busy}
                  className="shrink-0 text-xs font-medium text-danger"
                  aria-label={`Delete ${person.name}`}
                  title="Delete guest"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
