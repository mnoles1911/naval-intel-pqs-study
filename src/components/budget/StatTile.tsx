import type { ReactNode } from "react";

/**
 * A single summary tile: an eyebrow label above a large serif value, with an
 * optional hint line beneath. Value color can be tinted via `tone`.
 */
export default function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "over" | "under" | "muted";
}) {
  const toneClass =
    tone === "over"
      ? "text-danger"
      : tone === "under"
        ? "text-ready"
        : tone === "muted"
          ? "text-muted"
          : "text-foreground";

  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p className={`font-display mt-2 text-3xl leading-none sm:text-4xl ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
