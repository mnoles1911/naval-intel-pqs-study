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
import { PlusIcon, TrashIcon, CheckIcon, CloseIcon } from "@/components/icons";
import BoardView from "@/components/plan/BoardView";

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
  seatable,
  onSeatableChange,
  shape,
  onShapeChange,
  seatCount,
  onSeatCountChange,
  idPrefix,
}: {
  seatable: boolean;
  onSeatableChange: (seatable: boolean) => void;
  shape: TableShape;
  onShapeChange: (shape: TableShape) => void;
  seatCount: number;
  onSeatCountChange: (seats: number) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <span className="label">Type</span>
        <div
          role="group"
          aria-label="Location type"
          className="inline-flex gap-1 rounded-lg border border-border bg-surface-2 p-1"
        >
          <button
            type="button"
            aria-pressed={seatable}
            onClick={() => onSeatableChange(true)}
            className={`btn btn-sm ${seatable ? "btn-primary" : "btn-ghost"}`}
          >
            Seated table
          </button>
          <button
            type="button"
            aria-pressed={!seatable}
            onClick={() => onSeatableChange(false)}
            className={`btn btn-sm ${!seatable ? "btn-primary" : "btn-ghost"}`}
          >
            Area · no seats
          </button>
        </div>
        {!seatable && (
          <p className="mt-1.5 text-xs text-muted">
            A bar, greeting table, gift table, etc. — takes item assignments
            but never appears in the seating chart.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <span className="label">Shape</span>
          <ShapeToggle
            value={shape}
            onChange={onShapeChange}
            idPrefix={idPrefix}
          />
        </div>
        {seatable && (
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
              onChange={(e) =>
                onSeatCountChange(clampSeats(e.target.valueAsNumber))
              }
              className="input w-24"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LocationsManager() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-form state
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [seatable, setSeatable] = useState(true);
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
  const [editSeatable, setEditSeatable] = useState(true);
  const [editShape, setEditShape] = useState<TableShape>(DEFAULT_SHAPE);
  const [editSeatCount, setEditSeatCount] = useState<number>(DEFAULT_SEATS);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Item-assignment state
  const [itemError, setItemError] = useState<string | null>(null);

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

  async function assignItem(itemId: string, locationId: string | null) {
    setItemError(null);
    try {
      await updateItem(itemId, { locationId });
      await load();
    } catch (err) {
      setItemError(
        err instanceof Error ? err.message : "Failed to move item.",
      );
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
        seatable,
        shape,
        seatCount: seatable ? seatCount : 0,
      });
      await load();
      setName("");
      setDescription("");
      setColor(null);
      setSeatable(true);
      setShape(DEFAULT_SHAPE);
      setSeatCount(DEFAULT_SEATS);
      setAddOpen(false);
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
    setEditSeatable(loc.seatable);
    setEditShape(loc.shape);
    setEditSeatCount(loc.seatCount || DEFAULT_SEATS);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditColor(null);
    setEditSeatable(true);
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
        seatable: editSeatable,
        shape: editShape,
        seatCount: editSeatable ? editSeatCount : 0,
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
      cancelEdit();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete location.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <p className="text-muted">
        Places at your venue where decor and stationery are set up. A location
        can be a seated table, or a no-seat area like a bar or greeting table —
        either way you can assign items to it.
      </p>

      {/* Create prompt */}
      <div className="card p-5">
        {!addOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Add a location</h2>
              <p className="text-sm text-muted">
                Create a seated table or a no-seat area you can assign items to.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAddOpen(true);
              }}
              className="btn btn-primary"
            >
              <PlusIcon size={16} />
              Add a location
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium">Add a location</h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="Close add form"
                className="btn btn-ghost btn-sm shrink-0"
              >
                <CloseIcon size={16} />
              </button>
            </div>
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
              seatable={seatable}
              onSeatableChange={setSeatable}
              shape={shape}
              onShapeChange={setShape}
              seatCount={seatCount}
              onSeatCountChange={setSeatCount}
              idPrefix="add-shape"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="btn btn-primary"
              >
                <PlusIcon size={16} />
                {saving ? "Adding…" : "Add location"}
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

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
              <PlusIcon size={16} />
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
                <PlusIcon size={16} />
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
            <span className="text-foreground">
              {locations.filter((l) => l.seatable).length}
            </span>{" "}
            tables
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="text-foreground">
              {locations
                .filter((l) => l.seatable)
                .reduce((sum, l) => sum + l.seatCount, 0)}
            </span>{" "}
            seats total
          </span>
          {locations.some((l) => !l.seatable) && (
            <>
              <span aria-hidden>·</span>
              <span>
                <span className="text-foreground">
                  {locations.filter((l) => !l.seatable).length}
                </span>{" "}
                areas
              </span>
            </>
          )}
        </div>
      )}

      {/* Board */}
      {loading ? (
        <p className="text-sm text-muted">Loading locations…</p>
      ) : locations.length === 0 ? (
        <p className="text-sm text-muted">
          No locations yet — add your first above.
        </p>
      ) : (
        <BoardView
          locations={locations}
          items={items}
          onReassign={assignItem}
          onManage={(id) => {
            const loc = locations.find((l) => l.id === id);
            if (loc) startEdit(loc);
          }}
        />
      )}

      {itemError && <p className="text-sm text-danger">{itemError}</p>}

      {/* Edit modal */}
      {editingId != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Manage location"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            aria-hidden
            onClick={cancelEdit}
            className="absolute inset-0 bg-black/40"
          />
          <div className="card relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="font-medium">Manage location</h2>
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Close"
                className="btn btn-ghost btn-sm shrink-0"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => handleUpdate(e, editingId)}
              className="space-y-4"
            >
              <div>
                <label htmlFor="edit-name" className="label">
                  Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="label">
                  Description <span className="text-muted">(optional)</span>
                </label>
                <textarea
                  id="edit-description"
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
                seatable={editSeatable}
                onSeatableChange={setEditSeatable}
                shape={editShape}
                onShapeChange={setEditShape}
                seatCount={editSeatCount}
                onSeatCountChange={setEditSeatCount}
                idPrefix="edit-shape"
              />
              {editError && (
                <p className="text-sm text-danger">{editError}</p>
              )}
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <button
                  type="submit"
                  disabled={editSaving || !editName.trim()}
                  className="btn btn-primary"
                >
                  <CheckIcon size={16} />
                  {editSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const loc = locations.find((l) => l.id === editingId);
                    if (loc) handleDelete(loc);
                  }}
                  className="btn btn-danger ml-auto"
                >
                  <TrashIcon size={16} />
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
