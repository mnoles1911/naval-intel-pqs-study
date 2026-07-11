"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuditLogDTO } from "@/lib/types";
import { fetchAudit } from "@/lib/client";
import { actorLabel } from "@/lib/session";
import { HistoryIcon } from "@/components/icons";

type ActorFilter = "all" | "matt" | "emma";

const ENTITY_FILTERS = [
  "all",
  "item",
  "location",
  "person",
  "party",
  "plan",
  "seat",
  "session",
] as const;
type EntityFilter = (typeof ENTITY_FILTERS)[number];

// Past-tense verb color per action, reusing the status token palette.
const ACTION_TONE: Record<string, string> = {
  create: "text-[var(--sage)]",
  import: "text-[var(--sage)]",
  assign: "text-accent",
  update: "text-[var(--needed)]",
  unassign: "text-muted",
  delete: "text-danger",
  login: "text-muted",
};

function timeAgo(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<AuditLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actor, setActor] = useState<ActorFilter>("all");
  const [entity, setEntity] = useState<EntityFilter>("all");
  // Stamp "now" once on mount so relative times are stable across renders.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Stamp the clock after mount so server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  useEffect(() => {
    let active = true;
    // Show the loading state while (re)fetching on a filter change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchAudit({
      actor: actor === "all" ? undefined : actor,
      entity: entity === "all" ? undefined : entity,
      limit: 500,
    })
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actor, entity]);

  // Group entries under a day heading for readability.
  const grouped = useMemo(() => {
    const groups: { day: string; rows: AuditLogDTO[] }[] = [];
    for (const row of entries) {
      const day = dayKey(row.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.rows.push(row);
      else groups.push({ day, rows: [row] });
    }
    return groups;
  }, [entries]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <p className="eyebrow">Activity</p>
        <h1 className="font-display text-3xl sm:text-4xl">History</h1>
        <p className="text-muted">
          Every change Matt and Emma make, newest first.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div
          role="group"
          aria-label="Filter by person"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {(["all", "matt", "emma"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={actor === a}
              onClick={() => setActor(a)}
              className={`btn btn-sm rounded-md capitalize ${
                actor === a ? "btn-primary" : "btn-ghost border-transparent"
              }`}
            >
              {a === "all" ? "Both" : a}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="entity-filter">
          Filter by type
        </label>
        <select
          id="entity-filter"
          value={entity}
          onChange={(e) => setEntity(e.target.value as EntityFilter)}
          className="input w-auto"
        >
          {ENTITY_FILTERS.map((e) => (
            <option key={e} value={e}>
              {e === "all" ? "All types" : `${e[0].toUpperCase()}${e.slice(1)}s`}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading history…</p>
      ) : entries.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <HistoryIcon size={28} className="text-muted" />
          <h2 className="font-display text-lg">No activity yet</h2>
          <p className="max-w-sm text-sm text-muted">
            Changes to items, locations, guests, and seating will show up here
            with who made them.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.day} className="space-y-2">
              <h2 className="eyebrow">{group.day}</h2>
              <ul className="card divide-y divide-border">
                {group.rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start gap-3 px-4 py-3 text-sm"
                  >
                    <span
                      className={`chip shrink-0 capitalize ${
                        row.actor === "matt"
                          ? "text-accent"
                          : "text-[var(--rose)]"
                      }`}
                    >
                      <span
                        className="dot"
                        style={{
                          background:
                            row.actor === "matt"
                              ? "var(--accent)"
                              : "var(--rose)",
                        }}
                      />
                      {actorLabel(row.actor)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`font-medium capitalize ${
                          ACTION_TONE[row.action] ?? "text-foreground"
                        }`}
                      >
                        {row.action}
                      </span>{" "}
                      <span className="text-foreground">{row.summary}</span>
                    </span>
                    <time
                      dateTime={row.createdAt}
                      title={new Date(row.createdAt).toLocaleString()}
                      className="shrink-0 text-xs text-muted tabular-nums"
                    >
                      {now === null ? "" : timeAgo(row.createdAt, now)}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
