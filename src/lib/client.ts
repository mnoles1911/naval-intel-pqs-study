// Typed client-side wrappers around the JSON API. All functions throw an
// Error (with the server's message when available) on non-2xx responses.

import type {
  LocationDTO,
  ItemDTO,
  PartyDTO,
  PersonDTO,
  SeatingPlanDTO,
  SeatAssignmentDTO,
  AuditLogDTO,
} from "@/lib/types";
import type {
  ItemStatus,
  ItemCategory,
  ItemPriority,
  TableShape,
} from "@/lib/constants";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// --- Audit trail ---

export function fetchAudit(opts?: {
  actor?: string;
  entity?: string;
  limit?: number;
}): Promise<AuditLogDTO[]> {
  const params = new URLSearchParams();
  if (opts?.actor) params.set("actor", opts.actor);
  if (opts?.entity) params.set("entity", opts.entity);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return fetch(`/api/audit${qs ? `?${qs}` : ""}`).then((r) =>
    handle<AuditLogDTO[]>(r),
  );
}

// --- Locations ---

export interface LocationInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  planX?: number | null;
  planY?: number | null;
  planW?: number | null;
  planH?: number | null;
  sortOrder?: number;
  seatable?: boolean;
  shape?: TableShape;
  seatCount?: number;
}

export function fetchLocations(): Promise<LocationDTO[]> {
  return fetch("/api/locations").then((r) => handle<LocationDTO[]>(r));
}

export function createLocation(
  input: LocationInput & { name: string },
): Promise<LocationDTO> {
  return fetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<LocationDTO>(r));
}

export function createLocationsBulk(
  locations: Array<LocationInput & { name: string }>,
): Promise<{ count: number }> {
  return fetch("/api/locations/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locations }),
  }).then((r) => handle<{ count: number }>(r));
}

export function updateLocation(
  id: string,
  input: LocationInput,
): Promise<LocationDTO> {
  return fetch(`/api/locations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<LocationDTO>(r));
}

export function deleteLocation(id: string): Promise<void> {
  return fetch(`/api/locations/${id}`, { method: "DELETE" }).then((r) =>
    handle<void>(r),
  );
}

// --- Items ---

// Every writable item field. Create requires `name`; all others optional.
export interface ItemInput {
  name?: string;
  description?: string | null;
  status?: ItemStatus;
  quantity?: number;
  category?: ItemCategory | null;
  priority?: ItemPriority;
  vendorName?: string | null;
  vendorUrl?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[];
  planX?: number | null;
  planY?: number | null;
  locationId?: string | null;
}

export function fetchItems(params?: {
  status?: ItemStatus;
  locationId?: string;
  q?: string;
}): Promise<ItemDTO[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.locationId) qs.set("locationId", params.locationId);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return fetch(`/api/items${suffix}`).then((r) => handle<ItemDTO[]>(r));
}

export function fetchItem(id: string): Promise<ItemDTO> {
  return fetch(`/api/items/${id}`).then((r) => handle<ItemDTO>(r));
}

export function createItem(
  input: ItemInput & { name: string },
): Promise<ItemDTO> {
  return fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<ItemDTO>(r));
}

export function updateItem(id: string, input: ItemInput): Promise<ItemDTO> {
  return fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<ItemDTO>(r));
}

export function deleteItem(id: string): Promise<void> {
  return fetch(`/api/items/${id}`, { method: "DELETE" }).then((r) =>
    handle<void>(r),
  );
}

// Create many items at once — used for bulk entry and for duplicating one item
// across several locations. Returns how many were created.
export function bulkCreateItems(
  items: (ItemInput & { name: string })[],
): Promise<{ count: number }> {
  return fetch("/api/items/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }).then((r) => handle<{ count: number }>(r));
}

// Apply one patch to many items at once (bulk actions on a selection).
export function bulkUpdateItems(
  ids: string[],
  patch: Pick<ItemInput, "status" | "locationId" | "category" | "priority">,
): Promise<{ count: number }> {
  return fetch("/api/items/bulk-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, patch }),
  }).then((r) => handle<{ count: number }>(r));
}

export function bulkDeleteItems(ids: string[]): Promise<{ count: number }> {
  return fetch("/api/items/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  }).then((r) => handle<{ count: number }>(r));
}

export interface ItemImportResult {
  imported: number;
  skipped: { row: number; reason: string }[];
}

// Import items from a CSV file (adds to the existing list).
export async function importItemsCsv(file: File): Promise<ItemImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/items/import", { method: "POST", body: form });
  return handle<ItemImportResult>(res);
}

// --- People & seating ---

export interface PersonInput {
  name?: string;
  notes?: string | null;
  partyId?: string | null;
}

export function fetchPeople(): Promise<PersonDTO[]> {
  return fetch("/api/people").then((r) => handle<PersonDTO[]>(r));
}

export function createPerson(
  input: PersonInput & { name: string },
): Promise<PersonDTO> {
  return fetch("/api/people", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<PersonDTO>(r));
}

export function updatePerson(
  id: string,
  input: PersonInput,
): Promise<PersonDTO> {
  return fetch(`/api/people/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<PersonDTO>(r));
}

export function deletePerson(id: string): Promise<void> {
  return fetch(`/api/people/${id}`, { method: "DELETE" }).then((r) =>
    handle<void>(r),
  );
}

// Link two people so they share a party (creating or merging parties as
// needed). Returns the resulting party plus the ids of every affected person.
export function linkPeople(
  aId: string,
  bId: string,
): Promise<{ party: PartyDTO; personIds: string[] }> {
  return fetch("/api/people/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aId, bId }),
  }).then((r) => handle<{ party: PartyDTO; personIds: string[] }>(r));
}

// Remove a person from their party (leaving them a solo guest).
export function unlinkPerson(id: string): Promise<PersonDTO> {
  return updatePerson(id, { partyId: null });
}

export function fetchParties(): Promise<PartyDTO[]> {
  return fetch("/api/parties").then((r) => handle<PartyDTO[]>(r));
}

export function updateParty(
  id: string,
  input: { name?: string; color?: string | null },
): Promise<PartyDTO> {
  return fetch(`/api/parties/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<PartyDTO>(r));
}

// --- Seating plans (version control) ---

export function fetchPlans(): Promise<SeatingPlanDTO[]> {
  return fetch("/api/plans").then((r) => handle<SeatingPlanDTO[]>(r));
}

// A plan plus all of its seat assignments.
export interface PlanWithAssignments {
  plan: SeatingPlanDTO;
  assignments: SeatAssignmentDTO[];
}

export function fetchPlan(id: string): Promise<PlanWithAssignments> {
  return fetch(`/api/plans/${id}`).then((r) => handle<PlanWithAssignments>(r));
}

// Create a plan. Pass copyFromPlanId to duplicate an existing plan's seating.
export function createPlan(input: {
  name: string;
  notes?: string | null;
  copyFromPlanId?: string;
}): Promise<SeatingPlanDTO> {
  return fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<SeatingPlanDTO>(r));
}

export function updatePlan(
  id: string,
  input: { name?: string; notes?: string | null; isActive?: boolean },
): Promise<SeatingPlanDTO> {
  return fetch(`/api/plans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<SeatingPlanDTO>(r));
}

// Make this plan the active one (deactivates the others).
export function activatePlan(id: string): Promise<SeatingPlanDTO> {
  return updatePlan(id, { isActive: true });
}

export function duplicatePlan(
  id: string,
  name: string,
): Promise<SeatingPlanDTO> {
  return createPlan({ name, copyFromPlanId: id });
}

export function deletePlan(id: string): Promise<void> {
  return fetch(`/api/plans/${id}`, { method: "DELETE" }).then((r) =>
    handle<void>(r),
  );
}

// --- Seat assignments (within a plan) ---

// Seat a guest. Omit seatIndex to take the table's next free seat; provide it
// to seat at a specific seat (swapping with any current occupant).
export function assignSeat(
  planId: string,
  input: { personId: string; locationId: string; seatIndex?: number },
): Promise<SeatAssignmentDTO[]> {
  return fetch(`/api/plans/${planId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<SeatAssignmentDTO[]>(r));
}

// Seat a guest and the rest of their party into free seats at one table so
// couples/families stay together. Returns { assignments, seated, skipped }.
export function assignParty(
  planId: string,
  input: { personId: string; locationId: string },
): Promise<{ assignments: SeatAssignmentDTO[]; seated: number; skipped: number }> {
  return fetch(`/api/plans/${planId}/assign-party`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) =>
    handle<{
      assignments: SeatAssignmentDTO[];
      seated: number;
      skipped: number;
    }>(r),
  );
}

// Unseat a guest in this plan.
export function unassignSeat(
  planId: string,
  personId: string,
): Promise<void> {
  return fetch(
    `/api/plans/${planId}/assignments?personId=${encodeURIComponent(personId)}`,
    { method: "DELETE" },
  ).then((r) => handle<void>(r));
}

// Import a plan's seating from a CSV file. Returns a summary of what happened.
export interface ImportResult {
  imported: number;
  createdGuests: number;
  createdParties: number;
  skipped: { row: number; reason: string }[];
}

export async function importSeatingCsv(
  planId: string,
  file: File,
): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/plans/${planId}/import`, {
    method: "POST",
    body: form,
  });
  return handle<ImportResult>(res);
}

// --- Photo upload ---

export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await handle<{ url: string }>(res);
  return data.url;
}
