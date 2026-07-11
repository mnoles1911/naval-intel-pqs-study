"use client";

import { useState } from "react";
import LocationsManager from "@/components/venue/LocationsManager";
import PlanWorkspace from "@/components/venue/PlanWorkspace";

type Tab = "manage" | "plan";

// The Venue tab merges what used to be two nav items: managing locations
// (tables and no-seat areas) and the visual floor plan (assign board + map).
export default function VenuePage() {
  const [tab, setTab] = useState<Tab>("manage");

  const tabs: { key: Tab; label: string }[] = [
    { key: "manage", label: "Tables & areas" },
    { key: "plan", label: "Floor plan" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="eyebrow">Venue</p>
          <h1 className="font-display text-3xl sm:text-4xl">Venue &amp; floor plan</h1>
        </div>
        <div
          role="tablist"
          aria-label="Venue view"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`btn btn-sm rounded-md ${
                tab === t.key ? "btn-primary" : "btn-ghost border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "manage" ? <LocationsManager /> : <PlanWorkspace />}
    </div>
  );
}
