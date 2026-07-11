"use client";

import { useEffect, useState } from "react";
import type { LocationDTO, ItemDTO } from "@/lib/types";
import {
  LOCATION_COLORS,
  TABLE_SHAPES,
  TABLE_SHAPE_LABELS,
  type TableShape,
} from "@/lib/constants";
import {
  fetchLocations,
  createLocation,
  createLocationsBulk,
  updateLocation,
  deleteLocation,
  fetchItems,
  updateItem,
} from "@/lib/client";

const DEFAULT_SHAPE: TableShape = "ROUND";
const DEFAULT_SEATS = 8;
const MIN_SEATS = 1;
const MAX_SEATS = 40;

function clampSeats(value: number): number {
  if (Number.isNaN(value)) return MIN_SEATS;
  return Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(value)));
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {LOCATION_COLORS.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(selected ? null : color)}
            aria-label={`Color ${color}`}
            aria-pressed={selected}
            className={`h-7 w-7 rounded-full transition-transform cursor-pointer hover:scale-110 ${
              selected ? "ring-2 ring-offset-2 ring-offset-surface" : ""
            }`}
            style={{
              background: color,
              boxShadow: selected ? `0 0 0 2px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function ShapeToggle({
  value,
  onChange,
  idPrefix,
}: {
  value: TableShape;
  onChange: (shape: TableShape) => void;
  idPrefix: string;
}) {
  return (
    <div
      role="group"
      aria-label="Table shape"
      className="inline-flex gap-1 rounded-lg border border-border bg-surface-2 p-1"
    >
      {TABLE_SHAPES.map((shape) => {
        const selected = value === shape;
        return (
          <button
            key={shape}
            id={`${idPrefix}-${shape}`}
            type="button"
            onClick={() => onChange(shape)}
            aria-pressed={selected}
            className={`btn btn-sm ${selected ? "btn-primary" : "btn-ghost"}`}
          >
            {TABLE_SHAPE_LABELS[shape]}
          </button>
        );
      })}
    </div>
  );
}

/** Shared shape + seat-count fields for the create / edit forms. */
function TableSettingsFields({
  shape,
  onShapeChange,
  seatCount,
  onSeatCountChange,
  idPrefix,
}: {
  shape: TableShape;
  onShapeChange: (shape: TableShape) => void;
  seatCount: number;
  onSeatCountChange: (seats: number) => void;
  idPrefix: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <div>
        <span className="label">Shape</span>
        <ShapeToggle value={shape} onChange={onShapeChange} idPrefix={idPrefix} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-seats`} className="label">
          Seats
        </label>
        <input
          id={`${idPrefix}-seats`}
          type="number"
          min={MIN_SEATS}
          max={MAX_SEATS}
          value={seatCount}
          onChange={(e) => onSeatCountChange(clampSeats(e.target.valueAsNumber))}
          className="input w-24"
        />
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [shape, setShape] = useState<TableShape>(DEFAULT_SHAPE);
  const [seatCount, setSeatCount] = useState<number>(DEFAULT_SEATS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk "add many tables" state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState<number>(18);
  const [bulkSeats, setBulkSeats] = useState<number>(10);
  const [bulkShape, setBulkShape] = useState<TableShape>(DEFAULT_SHAPE);
  const [bulkPrefix, setBulkPrefix] = useState("Table ");
  const [bulkStart, setBulkStart] = useState<number>(1);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editShape, setEditShape] = useState<TableShape>(DEFAULT_SHAPE);
  const [editSeatCount, setEditSeatCount] = useState<number>(DEFAULT_SEATS);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Item-assignment state
  const [itemError, setItemError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // Inline seat stepper state
  const [seatBusyId, setSeatBusyId] = useState<string | null>(null);
  const [seatError, setSeatError] = useState<string | null>(null);

  async function load() {
    const [locs, its] = await Promise.all([fetchLocations(), fetchItems()]);
    setLocations(locs);
    setItems(its);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [locs, its] = await Promise.all([fetchLocations(), fetchItems()]);
        if (!active) return;
        setLocations(locs);
        setItems(its);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load locations.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function countItems(locationId: string): number {
    return items.filter((it) => it.locationId === locationId).length;
  }

  function locationName(locationId: string): string {
    return locations.find((l) => l.id === locationId)?.name ?? "Unknown";
  }

  function placementLabel(item: ItemDTO): string {
    return item.locationId ? locationName(item.locationId) : "Unassigned";
  }

  async function assignItem(itemId: string, locationId: string | null) {
    setBusyItemId(itemId);
    setItemError(null);
    try {
      await updateItem(itemId, { locationId });
      await load();
    } catch (err) {
      setItemError(
        err instanceof Error ? err.message : "Failed to move item.",
      );
    } finally {
      setBusyItemId(null);
    }
  }

  // Bump a table's seat count up or down in place (clamped 1..40), persisting
  // immediately. Optimistic so the number responds instantly.
  async function adjustSeats(loc: LocationDTO, delta: number) {
    const next = clampSeats(loc.seatCount + delta);
    if (next === loc.seatCount) return;
    setSeatBusyId(loc.id);
    setSeatError(null);
    setLocations((prev) =>
      prev.map((l) => (l.id === loc.id ? { ...l, seatCount: next } : l)),
    );
    try {
      await updateLocation(loc.id, { seatCount: next });
    } catch (err) {
      // Roll back the optimistic change on failure.
      setLocations((prev) =>
        prev.map((l) =>
          l.id === loc.id ? { ...l, seatCount: loc.seatCount } : l,
        ),
      );
      setSeatError(
        err instanceof Error ? err.message : "Failed to update seats.",
      );
    } finally {
      setSeatBusyId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createLocation({
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        color: color ?? undefined,
        shape,
        seatCount,
      });
      await load();
      setName("");
      setDescription("");
      setColor(null);
      setShape(DEFAULT_SHAPE);
      setSeatCount(DEFAULT_SEATS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location.");
    } finally {
      setSaving(false);
    }
  }

  // Highest number already used by a "<prefix>N" table, so the bulk add can
  // continue the sequence instead of colliding with existing tables.
  function nextNumberFor(prefix: string): number {
    const re = new RegExp(
      `^${prefix.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(\\d+)$`,
      "i",
    );
    let max = 0;
    for (const loc of locations) {
      const m = loc.name.trim().match(re);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return max + 1;
  }

  function openBulk() {
    setBulkError(null);
    setBulkStart(nextNumberFor(bulkPrefix));
    setBulkOpen(true);
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const count = Math.round(bulkCount);
    if (!Number.isInteger(count) || count < 1 || count > 200) {
      setBulkError("Choose between 1 and 200 tables.");
      return;
    }
    setBulkSaving(true);
    setBulkError(null);
    try {
      const maxOrder = locations.reduce((m, l) => Math.max(m, l.sortOrder), 0);
      const batch = Array.from({ length: count }, (_, i) => ({
        name: `${bulkPrefix}${bulkStart + i}`,
        shape: bulkShape,
        seatCount: clampSeats(bulkSeats),
        sortOrder: maxOrder + 1 + i,
      }));
      await createLocationsBulk(batch);
      await load();
      setBulkOpen(false);
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : "Failed to add tables.",
      );
    } finally {
      setBulkSaving(false);
    }
  }

  function startEdit(loc: LocationDTO) {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditDescription(loc.description ?? "");
    setEditColor(loc.color ?? null);
    setEditShape(loc.shape);
    setEditSeatCount(loc.seatCount);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditColor(null);
    setEditShape(DEFAULT_SHAPE);
    setEditSeatCount(DEFAULT_SEATS);
    setEditError(null);
  }

  async function handleUpdate(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateLocation(id, {
        name: editName.trim(),
        description: editDescription.trim() ? editDescription.trim() : undefined,
        color: editColor,
        shape: editShape,
        seatCount: editSeatCount,
      });
      await load();
      cancelEdit();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update location.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(loc: LocationDTO) {
    const confirmed = window.confirm(
      `Delete "${loc.name}"? Its items will become Unassigned (not deleted).`,
    );
    if (!confirmed) return;
    try {
      await deleteLocation(loc.id);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete location.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <p className="eyebrow">Venue</p>
        <h1 className="font-display text-3xl sm:text-4xl">Locations</h1>
        <p className="text-muted">
          Places at your venue where decor and stationery will be set up. Each
          location is also a table you can size and assign items to.
        </p>
      </header>

      {/* Add location form */}
      <form onSubmit={handleAdd} className="card space-y-4 p-5">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Head table"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="description" className="label">
            Description <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Any notes about this location"
            className="input"
          />
        </div>
        <div>
          <span className="label">Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <TableSettingsFields
          shape={shape}
          onShapeChange={setShape}
          seatCount={seatCount}
          onSeatCountChange={setSeatCount}
          idPrefix="add-shape"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn btn-primary"
        >
          {saving ? "Adding…" : "Add location"}
        </button>
      </form>

      {/* Bulk add tables */}
      <div className="card p-5">
        {!bulkOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Add many tables at once</h2>
              <p className="text-sm text-muted">
                Lay out a whole floor of identical tables, numbered
                automatically.
              </p>
            </div>
            <button type="button" onClick={openBulk} className="btn btn-ghost">
              Add tables in bulk
            </button>
          </div>
        ) : (
          <form onSubmit={handleBulkAdd} className="space-y-4">
            <h2 className="font-medium">Add many tables at once</h2>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <label htmlFor="bulk-count" className="label">
                  How many
                </label>
                <input
                  id="bulk-count"
                  type="number"
                  min={1}
                  max={200}
                  value={bulkCount}
                  onChange={(e) =>
                    setBulkCount(Math.round(e.target.valueAsNumber) || 0)
                  }
                  className="input w-24"
                />
              </div>
              <div>
                <label htmlFor="bulk-seats" className="label">
                  Seats each
                </label>
                <input
                  id="bulk-seats"
                  type="number"
                  min={MIN_SEATS}
                  max={MAX_SEATS}
                  value={bulkSeats}
                  onChange={(e) =>
                    setBulkSeats(clampSeats(e.target.valueAsNumber))
                  }
                  className="input w-24"
                />
              </div>
              <div>
                <span className="label">Shape</span>
                <ShapeToggle
                  value={bulkShape}
                  onChange={setBulkShape}
                  idPrefix="bulk-shape"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <label htmlFor="bulk-prefix" className="label">
                  Name prefix
                </label>
                <input
                  id="bulk-prefix"
                  type="text"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  className="input w-40"
                />
              </div>
              <div>
                <label htmlFor="bulk-start" className="label">
                  Start number
                </label>
                <input
                  id="bulk-start"
                  type="number"
                  min={0}
                  value={bulkStart}
                  onChange={(e) =>
                    setBulkStart(Math.round(e.target.valueAsNumber) || 0)
                  }
                  className="input w-24"
                />
              </div>
            </div>
            <p className="text-sm text-muted">
              Creates{" "}
              <span className="text-foreground">
                {bulkPrefix}
                {bulkStart}
              </span>{" "}
              through{" "}
              <span className="text-foreground">
                {bulkPrefix}
                {bulkStart + Math.max(0, Math.round(bulkCount) - 1)}
              </span>{" "}
              — {Math.max(0, Math.round(bulkCount)) * clampSeats(bulkSeats)} seats
              total.
            </p>
            {bulkError && <p className="text-sm text-danger">{bulkError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={bulkSaving}
                className="btn btn-primary"
              >
                {bulkSaving ? "Adding…" : `Add ${Math.max(0, Math.round(bulkCount))} tables`}
              </button>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Capacity summary */}
      {locations.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>
            <span className="text-foreground">{locations.length}</span> tables
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="text-foreground">
              {locations.reduce((sum, l) => sum + l.seatCount, 0)}
            </span>{" "}
            seats total
          </span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted">Loading locations…</p>
      ) : locations.length === 0 ? (
        <p className="text-sm text-muted">
          No locations yet — add your first above.
        </p>
      ) : (
        <ul className="space-y-4">
          {locations.map((loc) => {
            const isEditing = editingId === loc.id;
            const count = countItems(loc.id);
            const assignedItems = items.filter(
              (it) => it.locationId === loc.id,
            );
            const assignableItems = items.filter(
              (it) => it.locationId !== loc.id,
            );
            return (
              <li key={loc.id} className="card p-4">
                {isEditing ? (
                  <form
                    onSubmit={(e) => handleUpdate(e, loc.id)}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor={`edit-name-${loc.id}`}
                        className="label"
                      >
                        Name
                      </label>
                      <input
                        id={`edit-name-${loc.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`edit-description-${loc.id}`}
                        className="label"
                      >
                        Description{" "}
                        <span className="text-muted">(optional)</span>
                      </label>
                      <textarea
                        id={`edit-description-${loc.id}`}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="input"
                      />
                    </div>
                    <div>
                      <span className="label">Color</span>
                      <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>
                    <TableSettingsFields
                      shape={editShape}
                      onShapeChange={setEditShape}
                      seatCount={editSeatCount}
                      onSeatCountChange={setEditSeatCount}
                      idPrefix={`edit-shape-${loc.id}`}
                    />
                    {editError && (
                      <p className="text-sm text-danger">{editError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editSaving || !editName.trim()}
                        className="btn btn-primary"
                      >
                        {editSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn btn-ghost"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ background: loc.color ?? "var(--accent)" }}
                        />
                        <div className="space-y-1">
                          <h2 className="font-medium">{loc.name}</h2>
                          {loc.description && (
                            <p className="text-sm text-muted">
                              {loc.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="chip">
                              {TABLE_SHAPE_LABELS[loc.shape]}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 p-0.5"
                              aria-label={`${loc.name} seats`}
                            >
                              <button
                                type="button"
                                onClick={() => adjustSeats(loc, -1)}
                                disabled={
                                  seatBusyId === loc.id ||
                                  loc.seatCount <= MIN_SEATS
                                }
                                aria-label={`Remove a seat from ${loc.name}`}
                                className="grid h-6 w-6 place-items-center rounded-full text-foreground transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                −
                              </button>
                              <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums">
                                {loc.seatCount}{" "}
                                {loc.seatCount === 1 ? "seat" : "seats"}
                              </span>
                              <button
                                type="button"
                                onClick={() => adjustSeats(loc, 1)}
                                disabled={
                                  seatBusyId === loc.id ||
                                  loc.seatCount >= MAX_SEATS
                                }
                                aria-label={`Add a seat to ${loc.name}`}
                                className="grid h-6 w-6 place-items-center rounded-full text-foreground transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                +
                              </button>
                            </span>
                            <span className="text-sm text-muted">
                              {count} {count === 1 ? "item" : "items"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(loc)}
                          className="btn btn-ghost btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(loc)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Assigned items */}
                    <div className="space-y-2 border-t border-border pt-3">
                      <span className="label">Items at this table</span>
                      {assignedItems.length === 0 ? (
                        <p className="text-sm text-muted">
                          No items assigned yet.
                        </p>
                      ) : (
                        <ul className="flex flex-wrap gap-2">
                          {assignedItems.map((it) => (
                            <li
                              key={it.id}
                              className="chip inline-flex items-center gap-2"
                            >
                              <span>
                                {it.name}{" "}
                                <span className="text-muted">
                                  ×{it.quantity}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => assignItem(it.id, null)}
                                disabled={busyItemId === it.id}
                                aria-label={`Remove ${it.name} from ${loc.name}`}
                                className="text-danger hover:opacity-80 disabled:opacity-50 cursor-pointer"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Assign control */}
                      {assignableItems.length > 0 && (
                        <div>
                          <label
                            htmlFor={`assign-${loc.id}`}
                            className="sr-only"
                          >
                            Assign an item to {loc.name}
                          </label>
                          <select
                            id={`assign-${loc.id}`}
                            value=""
                            disabled={busyItemId !== null}
                            onChange={(e) => {
                              const itemId = e.target.value;
                              if (itemId) assignItem(itemId, loc.id);
                            }}
                            className="input"
                          >
                            <option value="">Assign an item…</option>
                            {assignableItems.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({placementLabel(it)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {itemError && <p className="text-sm text-danger">{itemError}</p>}
      {seatError && <p className="text-sm text-danger">{seatError}</p>}
    </div>
  );
}
