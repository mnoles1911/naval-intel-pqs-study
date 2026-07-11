import type { ItemStatus, ItemCategory, ItemPriority } from "./constants";

// Serialized shapes returned by the JSON API (dates as ISO strings).

export interface LocationDTO {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  planX: number | null;
  planY: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface ItemDTO {
  id: string;
  name: string;
  description: string | null;
  status: ItemStatus;
  quantity: number;
  category: ItemCategory | null;
  priority: ItemPriority;
  estimatedCost: number | null;
  actualCost: number | null;
  vendorName: string | null;
  vendorUrl: string | null;
  notes: string | null;
  photoUrl: string | null;
  locationId: string | null;
  createdAt: string;
}
