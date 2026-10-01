import type { CSSProperties } from "react";

/**
 * Two-column inspector layout: rendered interactive beside the input spec JSON.
 * `auto-fit` + `min()` collapses to a single stacked column when the available
 * width drops below two readable columns, so neither pane is ever crushed.
 */
export const COMPARE_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
  gap: 16,
  alignItems: "start",
  marginTop: 8,
};

export const COMPARE_CELL: CSSProperties = {
  minWidth: 0,
};