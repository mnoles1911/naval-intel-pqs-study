"use client";

import { useEffect, useState } from "react";
import type { LocationDTO, ItemDTO } from "@/lib/types";
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchItems,
} from "@/lib/client";

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [items, setItems] = useState<ItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
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
        setError(err instanceof Error ? err.message : "Failed to load locations.");
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
      });
      await load();
      setName("");
      setDescription("");
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
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
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
      });
      await load();
      cancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update location.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(loc: LocationDTO) {
    const confirmed = window.confirm(
      `Delete "${loc.name}"? Its items will become Unassigned (not deleted).`
    );
    if (!confirmed) return;
    try {
      await deleteLocation(loc.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete location.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Locations</h1>
        <p className="text-sm text-muted">
          Places at your venue where decor and stationery will be set up.
        </p>
      </header>

      {/* Add location form */}
      <form
        onSubmit={handleAdd}
        className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4"
      >
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Head table"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Any notes about this location"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-lg bg-accent text-white font-medium px-3 py-2 disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add location"}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted">Loading locations...</p>
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
              <li
                key={loc.id}
                className="bg-card border border-border rounded-xl shadow-sm p-4"
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => handleUpdate(e, loc.id)}
                    className="space-y-3"
                  >
                    <div className="space-y-1">
                      <label
                        htmlFor={`edit-name-${loc.id}`}
                        className="text-sm font-medium"
                      >
                        Name
                      </label>
                      <input
                        id={`edit-name-${loc.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={`edit-description-${loc.id}`}
                        className="text-sm font-medium"
                      >
                        Description <span className="text-muted">(optional)</span>
                      </label>
                      <textarea
                        id={`edit-description-${loc.id}`}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
                      />
                    </div>
                    {editError && (
                      <p className="text-sm text-red-500">{editError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editSaving || !editName.trim()}
                        className="rounded-lg bg-accent text-white font-medium px-3 py-2 disabled:opacity-50"
                      >
                        {editSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="font-medium">{loc.name}</h2>
                      {loc.description && (
                        <p className="text-sm text-muted">{loc.description}</p>
                      )}
                      <p className="text-sm text-muted">
                        {count} {count === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(loc)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(loc)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-background"
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
