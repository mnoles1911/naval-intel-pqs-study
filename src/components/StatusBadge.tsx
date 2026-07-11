import { ITEM_STATUS_LABELS, type ItemStatus } from "@/lib/constants";

const STATUS_COLOR: Record<ItemStatus, string> = {
  NEEDED: "var(--needed)",
  PURCHASED: "var(--purchased)",
  READY: "var(--ready)",
};

const STATUS_TEXT: Record<ItemStatus, string> = {
  NEEDED: "text-needed",
  PURCHASED: "text-purchased",
  READY: "text-ready",
};

export default function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={`chip ${STATUS_TEXT[status]}`}>
      <span className="dot" style={{ background: STATUS_COLOR[status] }} />
      {ITEM_STATUS_LABELS[status]}
    </span>
  );
}
