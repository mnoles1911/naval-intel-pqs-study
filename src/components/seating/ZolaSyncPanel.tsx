"use client";

import { useRef, useState } from "react";
import { importZolaRsvps, type ZolaImportResult } from "@/lib/client";
import { ImportIcon } from "@/components/icons";

interface ZolaSyncPanelProps {
  // Called after a successful sync so the parent can refetch guests and reflect
  // the new RSVP statuses in the roster.
  onSynced: () => void;
}

// Uploads a Zola "Track RSVPs" export and matches guests by name, updating each
// one's RSVP status and meal choice. Sits next to the seating CSV panel.
export default function ZolaSyncPanel({ onSynced }: ZolaSyncPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ZolaImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await importZolaRsvps(file);
      setResult(res);
      onSynced();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sync failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="card flex flex-col gap-4"
      aria-labelledby="zola-panel-title"
    >
      <header className="flex flex-col gap-1">
        <p className="eyebrow">RSVPs</p>
        <h2 id="zola-panel-title" className="font-display text-2xl leading-tight">
          Sync RSVPs from Zola
        </h2>
        <p className="text-sm text-muted">
          Export from Zola&apos;s &ldquo;Track RSVPs&rdquo; page, then upload it
          here — we match guests by name and update each one&apos;s RSVP status
          and meal choice.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Choose a Zola RSVP export to upload"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
            setError(null);
          }}
          className="input file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-sm file:text-foreground"
        />
        <button
          type="button"
          className="btn btn-primary flex items-center gap-1.5 self-start whitespace-nowrap"
          disabled={!file || busy}
          onClick={handleSync}
          aria-busy={busy}
        >
          <ImportIcon size={16} aria-hidden />
          {busy ? "Syncing…" : "Sync RSVPs"}
        </button>
      </div>

      {/* Success summary */}
      {result && (
        <div
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-ready">
            Updated {result.updated}{" "}
            {result.updated === 1 ? "guest" : "guests"}
            {result.totalRows > 0 ? ` from ${result.totalRows} rows` : ""}.
          </p>

          {result.unmatchedCount > 0 && (
            <details className="rounded-md border border-border bg-surface p-2">
              <summary className="cursor-pointer select-none text-sm font-medium text-danger">
                {result.unmatchedCount}{" "}
                {result.unmatchedCount === 1 ? "name" : "names"} didn&apos;t
                match your guest list
              </summary>
              <p className="mt-2 text-xs text-muted">
                These names weren&apos;t found in your guest list — they may
                differ from the invitation names. Reconcile them by hand.
              </p>
              <ul className="mt-2 max-h-40 overflow-y-auto text-sm">
                {result.unmatched.map((u, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2 py-0.5">
                    <span className="font-medium text-foreground">{u.name}</span>
                    {u.rsvp && <span className="text-muted">· {u.rsvp}</span>}
                    {u.meal && <span className="text-muted">· {u.meal}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
}
