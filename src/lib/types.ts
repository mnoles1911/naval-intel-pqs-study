import type { ItemStatus } from "./constants";

// Serialized shapes returned by the JSON API (dates as ISO strings).

export interface LocationDTO {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface ItemDTO {
  id: string;
  name: string;
  description: string | null;
  status: ItemStatus;
  photoUrl: string | null;
  locationId: string | null;
  createdAt: string;
}
