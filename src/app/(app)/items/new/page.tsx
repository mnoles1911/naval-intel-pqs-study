"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUpload from "@/components/PhotoUpload";
import { bulkCreateItems, fetchLocations } from "@/lib/client";
import type { ItemInput } from "@/lib/client";
import type { LocationDTO } from "@/lib/types";
import {
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  ITEM_PRIORITIES,
  ITEM_PRIORITY_LABELS,
  ITEM_STATUSES,
  ITEM_STATUS_LABELS,
  type ItemCategory,
  type ItemPriority,
  type ItemStatus,
} from "@/lib/constants";

// The two entry modes for the page.
type Mode = "one" | "bulk";

// How the created item(s) get distributed across tables.
type PlacementMode = "unassigned" | "one" | "multiple" | "every";

// Sentinel for the "None" category option in the <select>.
const NO_CATEGORY = "__NONE__";

// --- Small presentational helpers (kept in-file per task constraints) -------

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-border bg-surface-2 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer " +
              (active
                ? "bg-accent text-on-accent"
                : "text-muted hover:text-foreground")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Page -------------------------------------------------------------------

export default function NewItemPage() {
  const router = useRouter();

  // Locations (for placement).
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);

  // Mode.
  const [mode, setMode] = useState<Mode>("one");

  // Shared "one item" fields.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorUrl, setVendorUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Bulk textarea.
  const [bulkText, setBulkText] = useState("");

  // Fields shared by both modes.
  const [status, setStatus] = useState<ItemStatus>("NEEDED");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState<ItemCategory | typeof NO_CATEGORY>(
    NO_CATEGORY,
  );
  const [priority, setPriority] = useState<ItemPriority>("MEDIUM");

  // Placement.
  const [placement, setPlacement] = useState<PlacementMode>("unassigned");
  const [oneLocationId, setOneLocationId] = useState<string>("");
  const [checkedLocationIds, setCheckedLocationIds] = useState<Set<string>>(
    new Set(),
  );

  // Submission.
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLocations()
      .then((locs) => {
        if (cancelled) return;
        setLocations(locs);
        if (locs.length > 0) setOneLocationId(locs[0].id);
      })
      .catch((e) => {
        if (cancelled) return;
        setLocError(e instanceof Error ? e.message : "Failed to load tables");
      })
      .finally(() => {
        if (!cancelled) setLocLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Parsed, de-duplicated list of names being created.
  const names = useMemo(() => {
    if (mode === "one") {
      const n = name.trim();
      return n ? [n] : [];
    }
    return bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }, [mode, name, bulkText]);

  // The concrete set of location ids to place into (null = Unassigned copy).
  const targetLocationIds = useMemo<(string | null)[]>(() => {
    switch (placement) {
      case "unassigned":
        return [null];
      case "one":
        return oneLocationId ? [oneLocationId] : [];
      case "multiple":
        return locations
          .filter((l) => checkedLocationIds.has(l.id))
          .map((l) => l.id);
      case "every":
        return locations.map((l) => l.id);
      default:
        return [null];
    }
  }, [placement, oneLocationId, checkedLocationIds, locations]);

  // Validation of the quantity field.
  const quantityNum = Number(quantity);
  const quantityValid =
    quantity.trim() !== "" &&
    Number.isInteger(quantityNum) &&
    quantityNum >= 1;

  // Live count of items that will be created.
  const willCreate = names.length * targetLocationIds.length;

  const canSubmit =
    !submitting && names.length > 0 && quantityValid && willCreate > 0;

  function toggleChecked(id: string) {
    setCheckedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (names.length === 0) {
      setSubmitError(
        mode === "one"
          ? "Please enter a name."
          : "Please enter at least one item name.",
      );
      return;
    }
    if (!quantityValid) {
      setSubmitError("Quantity must be a whole number of 1 or more.");
      return;
    }
    if (targetLocationIds.length === 0) {
      setSubmitError("Please choose at least one table for placement.");
      return;
    }

    // Base fields shared by every created item.
    const base: ItemInput = {
      status,
      quantity: quantityNum,
      category: category === NO_CATEGORY ? null : category,
      priority,
    };
    if (mode === "one") {
      base.description = description.trim() || null;
      base.vendorName = vendorName.trim() || null;
      base.vendorUrl = vendorUrl.trim() || null;
      base.notes = notes.trim() || null;
      base.photoUrl = photoUrl;
    }

    // Cross-product of names × target locations.
    const list: (ItemInput & { name: string })[] = [];
    for (const itemName of names) {
      for (const locationId of targetLocationIds) {
        list.push({ ...base, name: itemName, locationId });
      }
    }

    setSubmitting(true);
    try {
      await bulkCreateItems(list);
      router.push("/items");
      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setSubmitting(false);
    }
  }

  const noTables = !locLoading && !locError && locations.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 space-y-1">
        <p className="eyebrow">New</p>
        <h1 className="font-display text-3xl sm:text-4xl">Add items</h1>
        <p className="text-muted">
          Create a single item or add many at once, and place them at your
          tables.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode toggle */}
        <SegmentedToggle
          ariaLabel="Entry mode"
          value={mode}
          onChange={(m) => setMode(m)}
          options={[
            { value: "one", label: "One item" },
            { value: "bulk", label: "Bulk add" },
          ]}
        />

        {/* Details */}
        <section className="card space-y-5">
          {mode === "one" ? (
            <>
              <Field label="Name" htmlFor="name">
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ivory table runner"
                  required
                  autoFocus
                />
              </Field>

              <Field label="Description" htmlFor="description">
                <textarea
                  id="description"
                  className="input min-h-20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details"
                />
              </Field>
            </>
          ) : (
            <Field
              label="Item names"
              htmlFor="bulk"
              hint="One item per line. Blank lines are ignored."
            >
              <textarea
                id="bulk"
                className="input min-h-40 font-mono text-sm"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Ivory table runner\nTaper candles\nMenu card"}
                autoFocus
              />
              <p className="text-xs text-muted">
                {names.length} name{names.length === 1 ? "" : "s"} detected
              </p>
            </Field>
          )}

          {/* Shared quantity / category / status / priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Quantity" htmlFor="quantity">
              <input
                id="quantity"
                type="number"
                min={1}
                step={1}
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={!quantityValid}
              />
            </Field>

            <Field label="Status" htmlFor="status">
              <select
                id="status"
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
              >
                {ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ITEM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category" htmlFor="category">
              <select
                id="category"
                className="input"
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value === NO_CATEGORY
                      ? NO_CATEGORY
                      : (e.target.value as ItemCategory),
                  )
                }
              >
                <option value={NO_CATEGORY}>None</option>
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ITEM_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority" htmlFor="priority">
              <select
                id="priority"
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ItemPriority)}
              >
                {ITEM_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {ITEM_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* One-item-only extra fields */}
          {mode === "one" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Vendor" htmlFor="vendorName">
                  <input
                    id="vendorName"
                    className="input"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Vendor URL" htmlFor="vendorUrl">
                  <input
                    id="vendorUrl"
                    type="url"
                    className="input"
                    value={vendorUrl}
                    onChange={(e) => setVendorUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </Field>
              </div>

              <Field label="Notes" htmlFor="notes">
                <textarea
                  id="notes"
                  className="input min-h-20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Photo">
                <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />
              </Field>
            </>
          )}
        </section>

        {/* Placement */}
        <section className="card space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-xl">Placement</h2>
            <p className="text-sm text-muted">
              Choose where the item{names.length === 1 ? "" : "s"} should go.
              Targeting more than one table creates a separate copy per table.
            </p>
          </div>

          {locLoading ? (
            <p className="text-sm text-muted">Loading tables…</p>
          ) : locError ? (
            <p className="text-sm text-danger">{locError}</p>
          ) : (
            <>
              <SegmentedToggle
                ariaLabel="Placement"
                value={placement}
                onChange={(p) => setPlacement(p)}
                options={[
                  { value: "unassigned", label: "Unassigned" },
                  { value: "one", label: "One table" },
                  { value: "multiple", label: "Multiple tables" },
                  { value: "every", label: "Every table" },
                ]}
              />

              {noTables && placement !== "unassigned" && (
                <p className="text-sm text-muted">
                  No tables exist yet — items will be created unassigned.
                </p>
              )}

              {placement === "one" && locations.length > 0 && (
                <Field label="Table" htmlFor="oneLocation">
                  <select
                    id="oneLocation"
                    className="input"
                    value={oneLocationId}
                    onChange={(e) => setOneLocationId(e.target.value)}
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {placement === "multiple" && locations.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="label mb-1">Tables</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {locations.map((l) => {
                      const checked = checkedLocationIds.has(l.id);
                      return (
                        <label
                          key={l.id}
                          className={
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors " +
                            (checked
                              ? "border-border-strong bg-surface-2"
                              : "border-border hover:bg-surface-2")
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChecked(l.id)}
                          />
                          <span className="truncate">{l.name}</span>
                          <span className="ml-auto text-xs text-muted">
                            {l.seatCount} seats
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {placement === "every" && locations.length > 0 && (
                <p className="text-sm text-muted">
                  Placing at all {locations.length} table
                  {locations.length === 1 ? "" : "s"}.
                </p>
              )}
            </>
          )}
        </section>

        {/* Submit bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {willCreate > 0 ? (
              <>
                Will create{" "}
                <span className="font-medium text-foreground">
                  {willCreate}
                </span>{" "}
                item{willCreate === 1 ? "" : "s"}.
              </>
            ) : (
              "Nothing to create yet."
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push("/items")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit}
            >
              {submitting
                ? "Creating…"
                : willCreate > 1
                  ? `Create ${willCreate} items`
                  : "Create item"}
            </button>
          </div>
        </div>

        {submitError && (
          <p className="text-sm text-danger" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </div>
  );
}
