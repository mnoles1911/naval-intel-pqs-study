// Shared domain constants used across the API, client, and UI.

// --- Status ------------------------------------------------------------------
// An item is either still to get (NEEDED) or acquired (PURCHASED).
export const ITEM_STATUSES = ["NEEDED", "PURCHASED"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  NEEDED: "Needed",
  PURCHASED: "Purchased",
};

// Short helper describing what each status means (used in tooltips/legends).
export const ITEM_STATUS_HINTS: Record<ItemStatus, string> = {
  NEEDED: "Still to buy or make",
  PURCHASED: "Bought",
};

// The toggle target: flips between the two states.
export const NEXT_STATUS: Record<ItemStatus, ItemStatus> = {
  NEEDED: "PURCHASED",
  PURCHASED: "NEEDED",
};

export function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === "string" && ITEM_STATUSES.includes(value as ItemStatus);
}

// --- Categories -------------------------------------------------------------
export const ITEM_CATEGORIES = [
  "FLORALS",
  "STATIONERY",
  "LIGHTING",
  "TABLEWARE",
  "SIGNAGE",
  "FURNITURE",
  "LINENS",
  "FAVORS",
  "OTHER",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  FLORALS: "Florals",
  STATIONERY: "Stationery",
  LIGHTING: "Lighting",
  TABLEWARE: "Tableware",
  SIGNAGE: "Signage",
  FURNITURE: "Furniture",
  LINENS: "Linens",
  FAVORS: "Favors",
  OTHER: "Other",
};

export function isItemCategory(value: unknown): value is ItemCategory {
  return (
    typeof value === "string" &&
    ITEM_CATEGORIES.includes(value as ItemCategory)
  );
}

// --- Priority ---------------------------------------------------------------
export const ITEM_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type ItemPriority = (typeof ITEM_PRIORITIES)[number];

export const ITEM_PRIORITY_LABELS: Record<ItemPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function isItemPriority(value: unknown): value is ItemPriority {
  return (
    typeof value === "string" &&
    ITEM_PRIORITIES.includes(value as ItemPriority)
  );
}

// --- Location accent palette ------------------------------------------------
// A curated set of muted, wedding-appropriate accent colors for locations.
// Stored as hex on the Location; the UI falls back to the theme accent when a
// location has no color set.
export const LOCATION_COLORS = [
  "#b08968", // warm taupe
  "#a3b18a", // sage
  "#cba0a0", // dusty rose
  "#9db4c0", // slate blue
  "#c9a66b", // antique gold
  "#b6a6ca", // muted lavender
  "#8fb8a8", // eucalyptus
  "#d0a98f", // terracotta
] as const;

// --- Table shapes (seating) -------------------------------------------------
export const TABLE_SHAPES = ["ROUND", "RECT"] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

export const TABLE_SHAPE_LABELS: Record<TableShape, string> = {
  ROUND: "Round",
  RECT: "Rectangular",
};

export function isTableShape(value: unknown): value is TableShape {
  return typeof value === "string" && TABLE_SHAPES.includes(value as TableShape);
}

// --- Misc -------------------------------------------------------------------
// Sentinel used in the UI to represent "no location" (Unassigned).
export const UNASSIGNED = "UNASSIGNED";
