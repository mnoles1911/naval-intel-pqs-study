// Whole-dollar USD formatting shared across the Budget view.

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Format a number as a whole-dollar USD string, e.g. 1234.5 -> "$1,235". */
export function formatMoney(value: number): string {
  return USD.format(Number.isFinite(value) ? value : 0);
}
