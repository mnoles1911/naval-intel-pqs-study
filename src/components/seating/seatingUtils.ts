import type { PersonDTO, PartyDTO } from "@/lib/types";

// The drag payload is just the guest's id. Native DnD only reliably carries
// "text/plain" across browsers, so we reuse it (same convention as the plan board).
export const GUEST_MIME = "text/plain";

// Neutral tint for guests with no party, or a party that has no colour set.
export const NEUTRAL_PARTY_COLOR = "var(--muted)";

// Up to two initials from a guest's name (falls back to "?").
export function guestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Resolve the colour a guest should be tinted with, via their party.
export function partyColorFor(
  person: PersonDTO,
  parties: Map<string, PartyDTO>,
): string {
  if (!person.partyId) return NEUTRAL_PARTY_COLOR;
  return parties.get(person.partyId)?.color ?? NEUTRAL_PARTY_COLOR;
}

// A seat's centre, expressed as a percentage of its container box (0–100).
export interface SeatPos {
  x: number;
  y: number;
}

// ROUND: seats evenly spaced around a circle, first seat at the top (12 o'clock).
export function roundSeatPositions(count: number): SeatPos[] {
  const positions: SeatPos[] = [];
  const r = 42; // radius as a % of the box (leaves room for the seat circles)
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    positions.push({
      x: 50 + r * Math.cos(angle),
      y: 50 + r * Math.sin(angle),
    });
  }
  return positions;
}

// RECT: seats split across the top and bottom edges, indexed 0..count-1
// (top row first, left→right, then bottom row left→right).
export function rectSeatPositions(count: number): SeatPos[] {
  const positions: SeatPos[] = [];
  const topCount = Math.ceil(count / 2);
  const bottomCount = count - topCount;

  const place = (n: number, y: number, startIndex: number) => {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 50 : 12 + (76 * i) / (n - 1);
      positions[startIndex + i] = { x, y };
    }
  };

  place(topCount, 15, 0);
  place(bottomCount, 85, topCount);
  return positions;
}
