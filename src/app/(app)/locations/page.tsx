"use client";

import { useEffect, useState } from "react";
import type { LocationDTO, ItemDTO } from "@/lib/types";
import { LOCATION_COLORS } from "@/lib/constants";
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchItems,
} from "@/lib/client";

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

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
      });
      await load();
      setName("");
      setDescription("");
      setColor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(loc: LocationDTO) {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditDescription(loc.description ?? "");
    setEditColor(loc.color ?? null);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditColor(null);
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
          Places at your venue where decor and stationery will be set up.
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
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="btn btn-primary"
        >
          {saving ? "Adding…" : "Add location"}
        </button>
      </form>

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
                        <p className="text-sm text-muted">
                          {count} {count === 1 ? "item" : "items"}
                        </p>
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
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
