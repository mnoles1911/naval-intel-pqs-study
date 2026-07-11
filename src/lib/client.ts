// Typed client-side wrappers around the JSON API. All functions throw an
// Error (with the server's message when available) on non-2xx responses.

import type { LocationDTO, ItemDTO } from "@/lib/types";
import type { ItemStatus, ItemCategory, ItemPriority } from "@/lib/constants";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// --- Locations ---

export interface LocationInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  planX?: number | null;
  planY?: number | null;
  sortOrder?: number;
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
  estimatedCost?: number | null;
  actualCost?: number | null;
  vendorName?: string | null;
  vendorUrl?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
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

// --- Photo upload ---

export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await handle<{ url: string }>(res);
  return data.url;
}
