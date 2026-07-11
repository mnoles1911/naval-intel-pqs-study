"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ItemDTO, LocationDTO } from "@/lib/types";
import {
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  ITEM_PRIORITIES,
  ITEM_PRIORITY_LABELS,
  UNASSIGNED,
  type ItemStatus,
  type ItemCategory,
  type ItemPriority,
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

// Empty string means "not set" for optional numeric inputs.
function numToField(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

export default function ItemForm({ mode, itemId, initial }: ItemFormProps) {
  const router = useRouter();

  const [name, setName] = useState<string>(initial?.name ?? "");
  const [description, setDescription] = useState<string>(
    initial?.description ?? "",
  );
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? "NEEDED");
  const [quantity, setQuantity] = useState<string>(
    initial?.quantity != null ? String(initial.quantity) : "1",
  );
  const [category, setCategory] = useState<ItemCategory | "">(
    initial?.category ?? "",
  );
  const [priority, setPriority] = useState<ItemPriority>(
    initial?.priority ?? "MEDIUM",
  );
  const [estimatedCost, setEstimatedCost] = useState<string>(
    numToField(initial?.estimatedCost),
  );
  const [actualCost, setActualCost] = useState<string>(
    numToField(initial?.actualCost),
  );
  const [vendorName, setVendorName] = useState<string>(
    initial?.vendorName ?? "",
  );
  const [vendorUrl, setVendorUrl] = useState<string>(initial?.vendorUrl ?? "");
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
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

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    // Optional numeric costs — blank means "not set".
    let estimated: number | null = null;
    if (estimatedCost.trim() !== "") {
      const v = Number(estimatedCost);
      if (!Number.isFinite(v) || v < 0) {
        setError("Estimated cost must be zero or more.");
        return;
      }
      estimated = v;
    }
    let actual: number | null = null;
    if (actualCost.trim() !== "") {
      const v = Number(actualCost);
      if (!Number.isFinite(v) || v < 0) {
        setError("Actual cost must be zero or more.");
        return;
      }
      actual = v;
    }

    setSaving(true);
    setError(null);
    const locationId = locationValue === UNASSIGNED ? null : locationValue;
    const payload = {
      description: description.trim() ? description.trim() : null,
      status,
      quantity: qty,
      category: category === "" ? null : category,
      priority,
      estimatedCost: estimated,
      actualCost: actual,
      vendorName: vendorName.trim() ? vendorName.trim() : null,
      vendorUrl: vendorUrl.trim() ? vendorUrl.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      photoUrl,
      locationId,
    };
    try {
      if (mode === "edit") {
        if (!itemId) throw new Error("Missing item id.");
        await updateItem(itemId, { name: trimmed, ...payload });
      } else {
        await createItem({ name: trimmed, ...payload });
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
    <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6">
      <div>
        <label htmlFor="item-name" className="label">
          Name
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input"
        />
      </div>

      <div>
        <label htmlFor="item-description" className="label">
          Description
        </label>
        <textarea
          id="item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="item-status" className="label">
            Status
          </label>
          <select
            id="item-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ItemStatus)}
            className="input"
          >
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ITEM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-location" className="label">
            Location
          </label>
          <select
            id="item-location"
            value={locationValue}
            onChange={(e) => setLocationValue(e.target.value)}
            className="input"
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
          <label htmlFor="item-quantity" className="label">
            Quantity
          </label>
          <input
            id="item-quantity"
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="item-category" className="label">
            Category
          </label>
          <select
            id="item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ItemCategory | "")}
            className="input"
          >
            <option value="">None</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ITEM_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-priority" className="label">
            Priority
          </label>
          <select
            id="item-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as ItemPriority)}
            className="input"
          >
            {ITEM_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {ITEM_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block" aria-hidden />

        <div>
          <label htmlFor="item-estimated-cost" className="label">
            Estimated cost
          </label>
          <input
            id="item-estimated-cost"
            type="number"
            min={0}
            step="0.01"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="0"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="item-actual-cost" className="label">
            Actual cost
          </label>
          <input
            id="item-actual-cost"
            type="number"
            min={0}
            step="0.01"
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            placeholder="0"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="item-vendor-name" className="label">
            Vendor
          </label>
          <input
            id="item-vendor-name"
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="item-vendor-url" className="label">
            Vendor link
          </label>
          <input
            id="item-vendor-url"
            type="url"
            value={vendorUrl}
            onChange={(e) => setVendorUrl(e.target.value)}
            placeholder="https://…"
            className="input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="item-notes" className="label">
          Notes
        </label>
        <textarea
          id="item-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input"
        />
      </div>

      <div>
        <span className="label">Photo</span>
        <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-4 pt-1">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {mode === "edit"
            ? saving
              ? "Saving…"
              : "Save changes"
            : saving
              ? "Adding…"
              : "Add item"}
        </button>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="btn btn-danger btn-sm ml-auto"
          >
            {deleting ? "Deleting…" : "Delete item"}
          </button>
        )}
      </div>
    </form>
  );
}
