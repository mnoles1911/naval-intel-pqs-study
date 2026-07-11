"use client";

import { useMemo } from "react";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import Zone from "@/components/plan/Zone";
import { sortLocations } from "@/components/plan/planUtils";

interface Props {
  locations: LocationDTO[];
  items: ItemDTO[];
  onReassign: (itemId: string, locationId: string | null) => void;
  onManage?: (locationId: string) => void;
}

export default function BoardView({
  locations,
  items,
  onReassign,
  onManage,
}: Props) {
  const ordered = useMemo(() => sortLocations(locations), [locations]);

  // Group items by location id once; O(n) instead of filtering per zone.
  const byLocation = useMemo(() => {
    const map = new Map<string, ItemDTO[]>();
    const unassigned: ItemDTO[] = [];
    for (const it of items) {
      if (it.locationId == null) {
        unassigned.push(it);
      } else {
        const list = map.get(it.locationId);
        if (list) list.push(it);
        else map.set(it.locationId, [it]);
      }
    }
    return { map, unassigned };
  }, [items]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((loc) => (
        <Zone
          key={loc.id}
          locationId={loc.id}
          name={loc.name}
          color={loc.color}
          items={byLocation.map.get(loc.id) ?? []}
          allLocations={ordered}
          onReassign={onReassign}
          onManage={onManage}
        />
      ))}

      <Zone
        key="__unassigned__"
        locationId={null}
        name="Unassigned"
        color={null}
        items={byLocation.unassigned}
        allLocations={ordered}
        onReassign={onReassign}
      />
    </div>
  );
}
