"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LocationDTO, PersonDTO, SeatAssignmentDTO } from "@/lib/types";
import {
  RSVP_STATUS_COLOR,
  RSVP_STATUS_LABELS,
  isRsvpStatus,
  type RsvpStatus,
} from "@/lib/constants";
import { fetchPeople, fetchPlans, fetchPlan, fetchLocations } from "@/lib/client";
import { SeatingIcon } from "@/components/icons";

// A compact "glance" band on the dashboard: how far seating has come, and the
// RSVP breakdown. Reads the active plan's assignments; degrades to zeros while
// loading or if there are no guests yet.
export default function DashboardGlance() {
  const [people, setPeople] = useState<PersonDTO[]>([]);
  const [tables, setTables] = useState<LocationDTO[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignmentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ppl, locs, plans] = await Promise.all([
          fetchPeople(),
          fetchLocations(),
          fetchPlans(),
        ]);
        if (!active) return;
        setPeople(ppl);
        setTables(locs.filter((l) => l.seatable));
        const plan = plans.find((p) => p.isActive) ?? plans[0];
        if (plan) {
          const { assignments: seats } = await fetchPlan(plan.id);
          if (active) setAssignments(seats);
        }
      } catch {
        // The dashboard's item view surfaces load errors; stay quiet here.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading || people.length === 0) return null;

  const total = people.length;
  const counts: Record<RsvpStatus, number> = {
    ATTENDING: 0,
    DECLINED: 0,
    PENDING: 0,
  };
  for (const p of people) {
    const s = isRsvpStatus(p.rsvpStatus) ? p.rsvpStatus : "PENDING";
    counts[s] += 1;
  }

  const seatedIds = new Set(assignments.map((a) => a.personId));
  const seated = seatedIds.size;
  // Guests we still need to seat = everyone who hasn't declined.
  const toSeat = total - counts.DECLINED;
  const seatedPct = toSeat > 0 ? Math.round((seated / toSeat) * 100) : 0;
  const seatCapacity = tables.reduce((sum, t) => sum + t.seatCount, 0);

  const order: RsvpStatus[] = ["ATTENDING", "DECLINED", "PENDING"];

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2">
      {/* Seating progress */}
      <Link
        href="/seating"
        className="card card-hover flex flex-col gap-3 p-5"
      >
        <div className="flex items-center justify-between">
          <p className="eyebrow">Seating</p>
          <SeatingIcon size={18} className="text-muted" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl leading-none">{seated}</span>
          <span className="text-muted">
            of {toSeat} seated{" "}
            {counts.DECLINED > 0 && (
              <span className="text-xs">(declines excluded)</span>
            )}
          </span>
        </div>
        <div className="meter" aria-hidden>
          <span style={{ width: `${seatedPct}%` }} />
        </div>
        <p className="text-xs text-muted">
          {seatedPct}% placed · {tables.length} tables · {seatCapacity} seats
        </p>
      </Link>

      {/* RSVP breakdown */}
      <Link
        href="/seating"
        className="card card-hover flex flex-col gap-3 p-5"
      >
        <p className="eyebrow">RSVPs</p>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl leading-none">
            {counts.ATTENDING}
          </span>
          <span className="text-muted">of {total} attending</span>
        </div>
        {/* Stacked proportion bar */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
          {order.map((s) =>
            counts[s] > 0 ? (
              <span
                key={s}
                style={{
                  width: `${(counts[s] / total) * 100}%`,
                  background: RSVP_STATUS_COLOR[s],
                }}
                title={`${RSVP_STATUS_LABELS[s]}: ${counts[s]}`}
              />
            ) : null,
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {order.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-muted">
              <span
                className="dot"
                style={{ background: RSVP_STATUS_COLOR[s] }}
                aria-hidden
              />
              {RSVP_STATUS_LABELS[s]}{" "}
              <span className="text-foreground">{counts[s]}</span>
            </span>
          ))}
        </div>
      </Link>
    </div>
  );
}
