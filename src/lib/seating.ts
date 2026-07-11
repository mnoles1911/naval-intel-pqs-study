import type { PersonDTO, SeatAssignmentDTO } from "./types";

// Seating status for a single party: who its members are and whether they are
// split across different tables in the current plan.
export interface PartyStatus {
  partyId: string;
  memberIds: string[];
  // True when the party's members occupy more than one distinct table (an
  // unseated member counts as its own distinct spot). A party with fewer than
  // two members is never separated.
  separated: boolean;
}

// Build a personId -> tableId (locationId) lookup from a plan's assignments.
// A person absent from the map is unseated.
export function seatingByPerson(
  assignments: SeatAssignmentDTO[],
): Map<string, string> {
  return new Map(assignments.map((a) => [a.personId, a.locationId]));
}

// Compute the seating status of every party. `tableOf` maps a personId to the
// table they sit at in the current plan (missing => unseated). People with no
// party are ignored (solo guests are never "separated").
export function partyStatuses(
  people: PersonDTO[],
  tableOf: Map<string, string>,
): Map<string, PartyStatus> {
  const byParty = new Map<string, PersonDTO[]>();
  for (const p of people) {
    if (!p.partyId) continue;
    const list = byParty.get(p.partyId);
    if (list) list.push(p);
    else byParty.set(p.partyId, [p]);
  }

  const result = new Map<string, PartyStatus>();
  for (const [partyId, members] of byParty) {
    const spots = new Set(members.map((m) => tableOf.get(m.id) ?? " unseated"));
    result.set(partyId, {
      partyId,
      memberIds: members.map((m) => m.id),
      separated: members.length > 1 && spots.size > 1,
    });
  }
  return result;
}

// The set of person ids that belong to a party split across tables.
export function separatedPersonIds(
  people: PersonDTO[],
  tableOf: Map<string, string>,
): Set<string> {
  const ids = new Set<string>();
  for (const status of partyStatuses(people, tableOf).values()) {
    if (status.separated) status.memberIds.forEach((id) => ids.add(id));
  }
  return ids;
}
