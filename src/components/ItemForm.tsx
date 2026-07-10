"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
  UNASSIGNED,
  type ItemStatus,
} from "@/lib/constants";
import {
  fetchLocations,
  createItem,
  updateItem,
  deleteItem,
} from "@/lib/client";
import PhotoUpload from "@/components/PhotoUpload";

type ItemFormProps = {
  mode: "create" | "edit";
  itemId?: string;
  initial?: Partial<ItemDTO>;
};

export default function ItemForm({ mode, itemId, initial }: ItemFormProps) {
  const router = useRouter();

  const [name, setName] = useState<string>(initial?.name ?? "");
  const [description, setDescription] = useState<string>(
    initial?.description ?? "",
  );
  const [status, setStatus] = useState<ItemStatus>(
    initial?.status ?? "NEEDED",
  );
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    initial?.photoUrl ?? null,
  );
  const [locationValue, setLocationValue] = useState<string>(
    initial?.locationId ?? UNASSIGNED,
  );

  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchLocations()
      .then((locs) => {
        if (active) setLocations(locs);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Failed to load locations");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const locationId = locationValue === UNASSIGNED ? null : locationValue;
    try {
      if (mode === "edit") {
        if (!itemId) throw new Error("Missing item id.");
        await updateItem(itemId, {
          name: trimmed,
          description: description.trim() ? description.trim() : null,
          status,
          photoUrl,
          locationId,
        });
      } else {
        await createItem({
          name: trimmed,
          description: description.trim() ? description.trim() : undefined,
          status,
          photoUrl,
          locationId,
        });
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!itemId) return;
    if (!window.confirm("Delete this item? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteItem(itemId);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4"
    >
      <div>
        <label htmlFor="item-name" className="block text-sm font-medium mb-1">
          Name
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div>
        <label
          htmlFor="item-description"
          className="block text-sm font-medium mb-1"
        >
          Description
        </label>
        <textarea
          id="item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="item-status" className="block text-sm font-medium mb-1">
          Status
        </label>
        <select
          id="item-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ItemStatus)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        >
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ITEM_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="item-location"
          className="block text-sm font-medium mb-1"
        >
          Location
        </label>
        <select
          id="item-location"
          value={locationValue}
          onChange={(e) => setLocationValue(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        >
          <option value={UNASSIGNED}>Unassigned</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-sm font-medium mb-1">Photo</span>
        <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent text-white font-medium px-4 py-2 disabled:opacity-50"
        >
          {mode === "edit"
            ? saving
              ? "Saving…"
              : "Save changes"
            : saving
              ? "Adding…"
              : "Add item"}
        </button>
        <Link
          href="/"
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </Link>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto text-sm text-red-500 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete item"}
          </button>
        )}
      </div>
    </form>
  );
}
