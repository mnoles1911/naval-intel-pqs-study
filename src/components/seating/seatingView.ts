import type { PartyDTO, PersonDTO, LocationDTO } from "@/lib/types";
import { partyStatuses } from "@/lib/seating";

// A party's puck color, falling back to a neutral tone for solo guests.
export function partyColor(party: PartyDTO | undefined | null): string {
  return party?.color && party.color.trim()
    ? party.color
    : "var(--border-strong)";
}

export interface PersonWarning {
  separated: boolean;
  text: string;
}

// For every guest in a split party, build a warning describing where the rest
// of their party is sitting. `tableOf` maps personId -> tableId in the plan.
export function buildWarnings(
  people: PersonDTO[],
  locations: LocationDTO[],
  tableOf: Map<string, string>,
): Map<string, PersonWarning> {
  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const byId = new Map(people.map((p) => [p.id, p]));
  const out = new Map<string, PersonWarning>();

  for (const status of partyStatuses(people, tableOf).values()) {
    if (!status.separated) continue;
    for (const id of status.memberIds) {
      const others = status.memberIds
        .filter((x) => x !== id)
        .map((x) => {
          const m = byId.get(x);
          if (!m) return "";
          const tableId = tableOf.get(m.id);
          const where = tableId
            ? locName.get(tableId) ?? "another table"
            : "Unseated";
          return `${m.name} (${where})`;
        })
        .filter(Boolean);
      out.set(id, { separated: true, text: `Split from ${others.join(", ")}` });
    }
  }
  return out;
}
