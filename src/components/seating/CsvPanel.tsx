"use client";

import { useRef, useState } from "react";
import { importSeatingCsv, type ImportResult } from "@/lib/client";

interface CsvPanelProps {
  planId: string;
  planName: string;
  onImported: () => void; // call after a successful import so the parent can refetch
}

export default function CsvPanel({ planId, planName, onImported }: CsvPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportUrl = `/api/plans/${planId}/export`;

  async function handleImport() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await importSeatingCsv(planId, file);
      setResult(res);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-col gap-6" aria-labelledby="csv-panel-title">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Import / Export</p>
        <h2 id="csv-panel-title" className="font-display text-2xl leading-tight">
          {planName}
        </h2>
      </header>

      {/* Export */}
      <div className="flex flex-col gap-2">
        <p className="label">Export</p>
        <p className="text-sm text-muted">
          Download a CSV snapshot of every guest and their seat in this plan.
        </p>
        <a
          className="btn btn-ghost self-start"
          href={exportUrl}
          download={`${planName || "seating"}.csv`}
        >
          Export this plan
        </a>
      </div>

      <hr className="border-border" />

      {/* Import */}
      <div className="flex flex-col gap-3">
        <p className="label">Import</p>
        <p className="text-sm text-danger">
          Import replaces this plan&apos;s current seating.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Choose a CSV file to import"
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
            className="btn btn-primary self-start whitespace-nowrap"
            disabled={!file || busy}
            onClick={handleImport}
            aria-busy={busy}
          >
            {busy ? "Importing…" : "Import CSV"}
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
              Imported {result.imported} seats · created {result.createdGuests} guests · created{" "}
              {result.createdParties} parties
            </p>
            {result.skipped.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-danger">
                  Skipped {result.skipped.length}{" "}
                  {result.skipped.length === 1 ? "row" : "rows"}:
                </p>
                <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-surface p-2 text-sm">
                  {result.skipped.map((s, i) => (
                    <li key={i} className="flex gap-2 py-0.5">
                      <span className="shrink-0 font-mono text-danger">Row {s.row}</span>
                      <span className="text-muted">{s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
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
      </div>

      {/* Format guidance */}
      <details className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
        <summary className="cursor-pointer select-none font-medium text-foreground">
          What should the CSV look like?
        </summary>

        <div className="mt-3 flex flex-col gap-3">
          <p className="text-muted">
            The first row must be a header. Column names are matched case-insensitively and map
            exactly to the headers below.
          </p>

          {/* Example header preview */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {["Guest", "Party", "Table", "Seat"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="border border-border-strong bg-accent-soft px-3 py-1.5 font-mono text-xs font-semibold text-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-muted">
                  <td className="border border-border px-3 py-1.5">Ada Lovelace</td>
                  <td className="border border-border px-3 py-1.5">Lovelace Family</td>
                  <td className="border border-border px-3 py-1.5">Head Table</td>
                  <td className="border border-border px-3 py-1.5">2</td>
                </tr>
              </tbody>
            </table>
          </div>

          <dl className="flex flex-col gap-2">
            <div>
              <dt className="inline font-mono font-semibold text-foreground">Guest</dt>{" "}
              <span className="text-accent">(required)</span>
              <dd className="text-muted">
                The guest&apos;s full name. Created if it doesn&apos;t exist yet.
              </dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">Party</dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">
                The name of the group they sit with (a couple or family). Created and linked if new.
              </dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">Table</dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">
                The table name; must match an existing table. Blank = leave the guest unseated.
              </dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">Seat</dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">
                The seat number at that table (1-based). Blank = next free seat.
              </dd>
            </div>
          </dl>
        </div>
      </details>
    </section>
  );
}
