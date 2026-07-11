import type {
  ItemStatus,
  ItemCategory,
  ItemPriority,
  TableShape,
} from "./constants";

// Serialized shapes returned by the JSON API (dates as ISO strings).

export interface LocationDTO {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  planX: number | null;
  planY: number | null;
  sortOrder: number;
  shape: TableShape;
  seatCount: number;
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
  vendorName: string | null;
  vendorUrl: string | null;
  notes: string | null;
  photoUrl: string | null;
  locationId: string | null;
  createdAt: string;
}

export interface PartyDTO {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface PersonDTO {
  id: string;
  name: string;
  notes: string | null;
  partyId: string | null;
  createdAt: string;
}

export interface SeatingPlanDTO {
  id: string;
  name: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

// A guest seated in a specific seat at a table, within a plan.
export interface SeatAssignmentDTO {
  id: string;
  planId: string;
  personId: string;
  locationId: string;
  seatIndex: number;
}
