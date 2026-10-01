# Quantitative Chart Engine — AI Authoring Skill

## When to use

Use the Chart Engine when learners need to compare quantities, identify trends, or reason about data through bar or line charts. Set `content.kind` to `bar` or `line`.

| Kind | Purpose |
|------|---------|
| `bar` | Compare discrete values across categories (baseline at 0, honest ratio comparison) |
| `line` | Show trends over time or ordered categories (≥ 2 data points required) |

## Spec structure

Use the shared Interactive Engine envelope (`type: "chart"`, `version`, `id`). Chart content lives under `content`:

```json
{
  "type": "chart",
  "version": "1.0.0",
  "id": "rainfall-monthly",
  "purpose": {
    "learningObjective": "Compare rainfall across months",
    "reasoningMode": "compare"
  },
  "content": {
    "kind": "bar",
    "dimensions": [{ "id": "month", "type": "ordinal" }],
    "measures": [{ "id": "rainfall", "type": "quantitative", "unit": "mm" }],
    "data": [
      { "id": "row-jan", "month": "Jan", "rainfall": 20 },
      { "id": "row-may", "month": "May", "rainfall": 110 }
    ]
  },
  "interaction": { "mode": "explore", "actions": ["select", "deselect", "focus", "filter", "reset"] },
  "sources": [{ "class": "authoritative" }],
  "accessibility": { "label": "Bar chart of monthly rainfall in millimeters" }
}
```

## Rules

- `content.kind` is a closed enum: **only** `"bar"` or `"line"`. Do not use `"scatter"`, `"area"`, or other kinds.
- `dimensions[]` defines the independent axis (ordinal, categorical, quantitative, or time). At least 1 dimension.
- `measures[]` defines the quantitative values. `type` MUST be `"quantitative"`. At least 1 measure.
- `data[]` rows contain values for each dimension and measure. Every row MUST include every declared dimension and measure id. Row keys that reference undeclared ids are invalid.
- `sources[]` is **required** for provenance (DESIGN §9). Each source carries `class`, one of `"authoritative"` (canonical for the lesson), `"illustrative"` (simplified for teaching), or `"simulated"` (hypothetical). Use `{ "class": "authoritative" | "illustrative" | "simulated" }`.
- Never invent data or derived numbers. Values come only from `content.data` + declared measures.
- Never author `x`, `y`, `width`, `height`, `color` — axes, ticks, bars, and points are derived by the layout engine. Scales are deterministic (no d3).
- **Selection toggles.** Renderer input maps a repeat activation of a selected mark to `deselect`, so any interactive accepting `select` must also declare `deselect`.
- A line chart needs at least 2 data points (1 point is degenerate).
- Tabular alternative is derived from the same data — accessible by default.

## Interaction

- `select` of a bar/point → dispatches `chart.data-point-selected` with the full row payload.
- `focus` → `chart.data-point-focused` likewise.
- `filter` renders a subset of rows; `clear-filter` restores all.
- `reset` resets interaction state.

## Design constraints

- Do NOT use `scatter`, `area`, or other kinds outside the closed set.
- Do NOT import `@open-edu/*` or other engine packages from chart-engine code.
- Do NOT add inline scripts, `on*` event handlers, or `javascript:` URIs.
- Do NOT use wall-clock or random values for layout or IDs.
- Do NOT add scoring, hints, or quiz logic (OpenEdu owns it, D7).

## Validate

- Spec: validate against `packages/chart-engine/src/schemas/chart-spec.schema.json`.
- Envelope: validate against `packages/interactive-engine/src/schemas/interactive-engine.schema.json`.
- Runtime: `ChartEngine.validate(spec)` returns `{ valid: true, issues: [] }` for a correct spec.