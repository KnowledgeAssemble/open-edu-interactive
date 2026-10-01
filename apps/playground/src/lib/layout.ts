import type { CSSProperties } from "react";

/**
 * Two-column inspector layout: rendered interactive beside the input spec JSON.
 * `auto-fit` + `min()` collapses to a single stacked column when the available
 * width drops below two readable columns, so neither pane is ever crushed.
 *
 * The 340px floor keeps the side-by-side view alive down to a ~700px main pane.
 * A wider floor (420px) held two columns only above ~860px, so crossing the
 * breakpoint made the SVG jump from a ~480px column to the full pane width.
 */
export const COMPARE_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
  gap: 16,
  alignItems: "start",
  marginTop: 8,
};

export const COMPARE_CELL: CSSProperties = {
  minWidth: 0,
};