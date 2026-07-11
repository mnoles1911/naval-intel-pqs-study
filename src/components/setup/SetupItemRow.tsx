"use client";

import { useId, useState } from "react";
import type { ItemDTO } from "@/lib/types";
import { ITEM_STATUS_LABELS } from "@/lib/constants";

/**
 * A single day-of checklist row. The checkbox is purely local React state —
 * it lets someone tick items off while setting up, but nothing is persisted.
 *
 * `unassigned` flags items that still need a home so they read as a warning.
 */
export default function SetupItemRow({
  item,
  unassigned = false,
}: {
  item: ItemDTO;
  unassigned?: boolean;
}) {
  const [done, setDone] = useState(false);
  const checkboxId = useId();

  return (
    <li className="flex items-start gap-3 py-2.5 break-inside-avoid print:py-1.5">
      <input
        id={checkboxId}
        type="checkbox"
        checked={done}
        onChange={(e) => setDone(e.target.checked)}
        // On print, force an empty hand-tickable box (no fill) regardless of
        // the on-screen checked state, with a crisp black outline for ink.
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]
          print:appearance-none print:h-3.5 print:w-3.5 print:rounded-none
          print:border print:border-black print:bg-white print:bg-none"
      />
      <label
        htmlFor={checkboxId}
        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 print:cursor-auto"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`font-medium print:text-black ${
              done ? "text-muted line-through print:no-underline" : ""
            } ${unassigned ? "text-danger print:text-black" : ""}`}
          >
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="text-sm text-muted print:text-black">
              ×{item.quantity}
            </span>
          )}
          <span className="chip print:border print:border-black print:bg-white print:text-black">
            <span
              className="dot"
              style={{
                backgroundColor:
                  item.status === "PURCHASED"
                    ? "var(--purchased)"
                    : "var(--needed)",
              }}
              aria-hidden
            />
            {ITEM_STATUS_LABELS[item.status]}
          </span>
        </span>

        {item.notes && (
          <span className="text-sm italic text-muted print:text-black">
            {item.notes}
          </span>
        )}
      </label>

      {item.photoUrl && (
        // Plain <img> keeps this dependency-free; the setup sheet just needs a
        // small visual reference for the item.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl}
          alt={`Photo of ${item.name}`}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-md border border-border object-cover print:border-black"
        />
      )}
    </li>
  );
}
