"use client";

import { useRef, useState } from "react";
import { importItemsCsv, type ItemImportResult } from "@/lib/client";

interface ItemImportPanelProps {
  // Called after a successful import so the parent can refetch its item list.
  onImported: () => void;
}

const COLUMNS = [
  "Name",
  "Quantity",
  "Category",
  "Status",
  "Priority",
  "Location",
  "Vendor",
  "Vendor URL",
  "Notes",
] as const;

export default function ItemImportPanel({ onImported }: ItemImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ItemImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await importItemsCsv(file);
      setResult(res);
      onImported();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-col gap-5" aria-labelledby="import-title">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Bulk add</p>
        <h2 id="import-title" className="font-display text-2xl leading-tight">
          Import items from CSV
        </h2>
        <p className="text-sm text-muted">New items are added to your list.</p>
      </header>

      {/* File picker + import */}
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
          {busy ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Success summary */}
      {result ? (
        <div
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-ready">
            Imported {result.imported}{" "}
            {result.imported === 1 ? "item" : "items"}
          </p>
          {result.skipped.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-danger">
                Skipped {result.skipped.length}{" "}
                {result.skipped.length === 1 ? "row" : "rows"}:
              </p>
              <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-surface p-2 text-sm">
                {result.skipped.map((s, i) => (
                  <li key={i} className="flex gap-2 py-0.5">
                    <span className="shrink-0 font-mono text-danger">
                      Row {s.row}
                    </span>
                    <span className="text-muted">{s.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <p
          className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {/* Format help */}
      <details className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
        <summary className="cursor-pointer select-none font-medium text-foreground">
          What columns should the CSV have?
        </summary>

        <div className="mt-3 flex flex-col gap-3">
          <p className="text-muted">
            The first row must be a header. Only{" "}
            <span className="font-mono font-semibold text-foreground">Name</span>{" "}
            is required — every other column is optional.
          </p>

          {/* Example header row */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {COLUMNS.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="whitespace-nowrap border border-border-strong bg-accent-soft px-3 py-1.5 font-mono text-xs font-semibold text-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          <dl className="flex flex-col gap-2">
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Name
              </dt>{" "}
              <span className="text-accent">(required)</span>
              <dd className="text-muted">The item&apos;s name.</dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Quantity
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">
                A whole number. Defaults to 1 if blank.
              </dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Category
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">
                e.g. Florals, Stationery, Lighting, Tableware.
              </dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Status
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">
                Needed or Purchased. Defaults to Needed.
              </dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Priority
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">Low, Medium, or High.</dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Location
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">
                Must match an existing table name. Blank = Unassigned.
              </dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Vendor
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">The vendor or shop name.</dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Vendor URL
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">A link to the product or vendor.</dd>
            </div>
            <div>
              <dt className="inline font-mono font-semibold text-foreground">
                Notes
              </dt>{" "}
              <span className="text-muted">(optional)</span>
              <dd className="text-muted">Any extra details.</dd>
            </div>
          </dl>

          <a
            className="text-accent hover:underline"
            href="/api/export"
            download
          >
            Download current items as a template
          </a>
        </div>
      </details>
    </section>
  );
}
