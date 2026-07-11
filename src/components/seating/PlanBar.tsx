"use client";

import type { SeatingPlanDTO } from "@/lib/types";

interface PlanBarProps {
  plans: SeatingPlanDTO[];
  activePlanId: string | null;
  busy?: boolean;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onDuplicate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

// Version control for seating plans: switch between saved arrangements,
// start a fresh one, duplicate the current one, rename, or delete.
export default function PlanBar({
  plans,
  activePlanId,
  busy,
  onSwitch,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
}: PlanBarProps) {
  const active = plans.find((p) => p.id === activePlanId) ?? null;

  function handleNew() {
    const name = window.prompt("Name for the new (empty) seating plan:");
    if (name && name.trim()) onCreate(name.trim());
  }

  function handleDuplicate() {
    if (!active) return;
    const name = window.prompt(
      "Name for the duplicated plan:",
      `Copy of ${active.name}`,
    );
    if (name && name.trim()) onDuplicate(name.trim());
  }

  function handleRename() {
    if (!active) return;
    const name = window.prompt("Rename this plan:", active.name);
    if (name && name.trim() && name.trim() !== active.name)
      onRename(active.id, name.trim());
  }

  function handleDelete() {
    if (!active) return;
    if (plans.length <= 1) return;
    if (
      window.confirm(
        `Delete the seating plan "${active.name}"? This can't be undone.`,
      )
    )
      onDelete(active.id);
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-3">
      <div className="flex items-center gap-2">
        <label htmlFor="plan-select" className="eyebrow">
          Plan
        </label>
        <select
          id="plan-select"
          value={activePlanId ?? ""}
          disabled={busy}
          onChange={(e) => onSwitch(e.target.value)}
          className="input w-auto max-w-[16rem] py-1.5"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.isActive ? " (active)" : ""}
            </option>
          ))}
        </select>
      </div>

      <span className="hidden h-5 w-px bg-border sm:block" />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleNew}
          disabled={busy}
        >
          + New plan
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleDuplicate}
          disabled={busy || !active}
          title="Save the current arrangement as a new version"
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleRename}
          disabled={busy || !active}
        >
          Rename
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={handleDelete}
          disabled={busy || !active || plans.length <= 1}
          title={
            plans.length <= 1
              ? "You can't delete your only plan"
              : "Delete this plan"
          }
        >
          Delete
        </button>
      </div>

      <p className="ml-auto text-xs text-muted">
        {plans.length} {plans.length === 1 ? "plan" : "plans"} saved
      </p>
    </div>
  );
}
