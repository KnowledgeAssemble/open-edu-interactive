# Chart Engine — Normative Specification (thin)

**File:** `docs/engines/chart/SPEC.md`  
**Status:** Proposed (thin — gates P3 implementation; expand in code, not prose)  
**Version:** 1.0.0  
**Parent:** DESIGN D1 · shared contract · `engines/chart/VISION.md` (non-normative)

---

## 1. Purpose

Normative surface for the Chart Engine: quantitative reasoning (`how much / how does it compare`). Vision and pedagogy live in `VISION.md`; this file defines the **envelope + content model + MVP slice** only.

## 2. Envelope

```json
{
  "type": "chart",
  "version": "1.0.0",
  "id": "rainfall-monthly",
  "metadata": { "title": "Monthly rainfall" },
  "purpose": {
    "learningObjective": "Compare rainfall across months",
    "reasoningMode": "compare"
  },
  "content": {
    "kind": "bar",
    "dimensions": [{ "id": "month", "type": "ordinal" }],
    "measures": [{ "id": "rainfall", "type": "quantitative", "unit": "mm" }],
    "data": [
      { "month": "Jan", "rainfall": 20 },
      { "month": "May", "rainfall": 110 }
    ]
  },
  "interaction": {
    "mode": "explore",
    "actions": ["select", "focus", "filter", "reset"]
  },
  "questions": [],
  "accessibility": {
    "label": "Bar chart of monthly rainfall in millimeters"
  }
}
```

Rules:

- `type` MUST be `"chart"`.
- Chart semantics live under `content`. No `{ "chart": { … } }` wrapper (D1).
- `content.kind` MVP: `bar` | `line`. Future: `area`, `scatter` (same envelope).
- Data and provenance (`sources` on envelope) MUST NOT invent values (DESIGN §9).
- `questions` MAY be empty; OpenEdu quiz nodes evaluate learners (D7).

## 3. MVP slice (P3)

1. **Bar** and **line** through spec → scene → layout → accessible SVG → golden fixture.
2. Emit `chart.data-point-selected` (namespaced) on D5 `select`.
3. Tabular alternative representation derived from the same semantic model (L4).

## 3.1 Scene node-id scheme

Scene nodes for data marks use a stable, deterministic id per measure and row:

- Bar: `{measureId}-bar-{rowId}` (e.g. `rainfall-bar-row-jan`, `sunshine-bar-row-jan`).
- Point: `{measureId}-point-{rowId}`.
- Axis: `axis-x` / `axis-y`; gridlines `gridline-{i}`; ticks `tick-x-{i}` / `tick-y-{i}`; labels `label-x-{i}` / `label-y-{i}`.
- Multi-measure legend: `legend-{measureId}` (emitted only when `measures[]` length ≥ 2 over one shared dimension).

## 3.2 Multi-measure grouped bars

When `content.kind === "bar"` and `measures[]` length ≥ 2 over one shared dimension, bars are grouped per category: within each band, one bar per measure, offset deterministically by measure index. A text legend distinguishes measures (`legend-{measureId}`). The tabular alternative lists **all** measures per row (each `measureId` → value). A single measure renders the un-grouped bar (existing behavior). Use case: `ch-x2-multi-measure`.

## 4. Non-goals

Not a dashboard library. Not a second assessment engine. See DESIGN §15 and `VISION.md`.
