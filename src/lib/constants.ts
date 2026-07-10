// Shared domain constants.

export const ITEM_STATUSES = ["NEEDED", "PURCHASED"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  NEEDED: "Needed",
  PURCHASED: "Purchased",
};

export function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === "string" && ITEM_STATUSES.includes(value as ItemStatus);
}

// Sentinel used in the UI to represent "no location" (Unassigned).
export const UNASSIGNED = "UNASSIGNED";
