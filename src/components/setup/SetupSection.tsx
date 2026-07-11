import type { ItemDTO } from "@/lib/types";
import SetupItemRow from "./SetupItemRow";

/**
 * One printable block of the setup guide: a titled section (a venue location,
 * or the "Unassigned" catch-all) followed by its checklist of items.
 *
 * `color` tints the location dot; omit it (and pass `unassigned`) for the
 * needs-a-home section so its rows read as a warning.
 */
export default function SetupSection({
  title,
  description,
  color,
  items,
  unassigned = false,
}: {
  title: string;
  description?: string | null;
  color?: string | null;
  items: ItemDTO[];
  unassigned?: boolean;
}) {
  return (
    <section
      className={`card break-inside-avoid p-5 print:break-inside-avoid print:border print:border-black print:bg-white print:text-black print:shadow-none ${
        unassigned ? "border-danger/60" : ""
      }`}
    >
      <header className="mb-3 border-b border-border pb-3 print:border-black">
        <div className="flex items-center gap-2.5">
          {!unassigned && (
            <span
              className="dot h-3 w-3 shrink-0"
              style={{ backgroundColor: color ?? "var(--accent)" }}
              aria-hidden
            />
          )}
          <h2
            className={`font-display text-2xl leading-tight print:text-black ${
              unassigned ? "text-danger print:text-black" : ""
            }`}
          >
            {title}
          </h2>
          <span className="ml-auto chip print:border print:border-black print:bg-white print:text-black">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-muted print:text-black">
            {description}
          </p>
        )}
        {unassigned && (
          <p className="mt-1.5 text-sm font-medium text-danger print:text-black">
            These items still need a home — assign a location before the big day.
          </p>
        )}
      </header>

      <ul className="divide-y divide-border print:divide-black/30">
        {items.map((item) => (
          <SetupItemRow key={item.id} item={item} unassigned={unassigned} />
        ))}
      </ul>
    </section>
  );
}
