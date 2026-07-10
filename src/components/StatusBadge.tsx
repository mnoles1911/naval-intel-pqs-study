import { ITEM_STATUS_LABELS, type ItemStatus } from "@/lib/constants";

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const purchased = status === "PURCHASED";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        purchased
          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          purchased ? "bg-green-600" : "bg-amber-500"
        }`}
      />
      {ITEM_STATUS_LABELS[status]}
    </span>
  );
}
