# Chart engine — use-case catalog

**Status:** Active (P8 Workstream A — slice honesty)  
**Engine:** `chart` (`packages/chart-engine`)  
**Contract:** `docs/engines/chart/SPEC.md`  
**Vision:** `docs/engines/chart/VISION.md`

## How to read this document

Each use case is a **lesson archetype**. Implementers ship fixtures that match acceptance criteria; authors and agents copy those fixtures, not abstract prop grids.

Use cases are grouped by **chart kind** (`bar`, `line`). Stable selectable node ids follow `{measureId}-bar-{rowId}` or `{measureId}-point-{rowId}` (e.g. `rainfall-bar-row-may`).

**D7 boundary (always):**

| Layer | Owns |
|-------|------|
| **Engine** | Data model, scales, scene, layout, SVG, semantic targets, D5 `select` / `focus` / `filter` / `reset`, snapshot, tabular alternative |
| **OpenEdu host** | Prompt text, answer key, correct/incorrect feedback, hints, progression, scoring, data citations |

---

## Interaction modes by chart kind

| Mode | Kind | Authoring signal | Learner experience | Engine events |
|------|------|------------------|--------------------|---------------|
| **display** | bar, line | Host asks without requiring selection; chart is evidence | Learner reads values/trends from axes and labels | — |
| **guided-select** | bar, line | Host narrows candidates (e.g. `filter` to one row) or future per-row gating | Learner taps the prompted bar or point | `chart.data-point-selected` |
| **discovery-select** | bar, line | All rows visible; host scores the selected `rowId` | Learner finds max/min/correct category among all bars or points | `chart.data-point-selected` |
| **explore** | bar, line | `interaction.mode: "explore"` | Free exploration; no single correct answer enforced by engine | `chart.data-point-selected`, `chart.data-point-focused` |
| **focus** | bar, line | `focus` in `interaction.actions` | Keyboard / programmatic emphasis without committing an answer | `chart.data-point-focused` |
| **filter** | bar, line | `filter` / `clear-filter` in `interaction.actions` | Subset of rows rendered in chart and tabular view | — *(state change only; no `chart.*` result event)* |
| **compare-multi** *(planned)* | bar | Multiple `measures[]` on the same dimension | Learner compares two quantities per category | `chart.data-point-selected` |

**Node id convention:** `{measureId}-bar-{rowId}` for bar charts; `{measureId}-point-{rowId}` for line charts. Row ids come from `data[].id` (or zero-padded index when omitted).

**Guided vs discovery (current slice):** every data point is `interactive: true` in the scene. Host distinguishes guided lessons by pre-filtering (`filter` with a single `rowId`) or by scoring the selected row. Per-row `interactive` gating is not implemented yet — propose in SPEC if two or more use cases require it.

---

## Bar chart (`content.kind: "bar"`)

Reference UX: discrete category comparison with baseline at zero. Bars encode one measure per row.

### `ch-b1-compare-categories` — Compare values across categories (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–6: explores monthly rainfall to see which months are wetter or drier. |
| **Prompt** | Host: “Compare rainfall across these months.” |
| **Action** | Select or focus any bar |
| **Acceptance** | Ordinal x-axis with category labels; quantitative y-axis with unit (`mm`); four bars from four rows; `select` → `chart.data-point-selected` with full row payload; tabular alternative matches rendered rows |
| **Spec** | `kind: "bar"`, one ordinal dimension, one quantitative measure, ≥ 2 rows |
| **Fixture** | `packages/chart-engine/fixture/bar/` |
| **Host** | Lesson framing only |
| **Status** | `done` |

### `ch-b2-identify-max` — Which category has the highest value? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–6: sees four monthly bars; selects the month with the most rainfall. |
| **Prompt** | Host: “Which month had the highest rainfall?” |
| **Action** | Tap the tallest bar |
| **Acceptance** | Bar heights reflect measure values deterministically; selection id `rainfall-bar-row-may` (or equivalent max row); event payload includes `rowId` and `measureValue` |
| **Spec** | Same as `ch-b1-compare-categories`; host scores on `rowId` |
| **Fixture** | `packages/chart-engine/fixture/bar/` |
| **Host** | Answer key: `row-may` |
| **Status** | `done` |

### `ch-b3-identify-min` — Which category has the lowest value? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–6: selects the month with the least rainfall. |
| **Prompt** | Host: “Which month had the lowest rainfall?” |
| **Action** | Tap the shortest bar |
| **Acceptance** | Same chart as max case; wrong selections still emit `chart.data-point-selected` (host scores) |
| **Spec** | Same bar model as `ch-b2-identify-max` |
| **Fixture** | `packages/chart-engine/fixture/bar/` |
| **Host** | Answer key: `row-nov` |
| **Status** | `done` |

### `ch-b4-filter-subset` — Narrow visible categories (filter)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–7: compares only a subset of months after a host-driven filter. |
| **Prompt** | Host: “Look at February and November only.” |
| **Action** | Host dispatches `filter` with `{ ids: ["row-feb", "row-nov"] }`; learner selects within subset |
| **Acceptance** | Tabular snapshot shows only filtered rows; SVG re-renders matching subset; `clear-filter` restores all four rows; filter does not emit `chart.*` events |
| **Spec** | `interaction.actions` includes `filter`, `clear-filter` |
| **Fixture** | `packages/chart-engine/fixture/bar/` |
| **Host** | Filter control or scripted dispatch |
| **Status** | `done` (e2e: `packages/chart-engine/e2e/chart.spec.ts`) |

### `ch-b5-read-value` — Read a value from the chart (display)

| Field | Value |
|-------|-------|
| **Learner** | Grades 3–5: reads approximate rainfall for a named month from axis and bar height. |
| **Prompt** | Host: “About how much rain fell in August?” |
| **Action** | None required (oral or typed answer in host) |
| **Acceptance** | Y-axis scale and value labels allow reading `80 mm` for August; tabular alternative exposes exact value for a11y |
| **Spec** | `measures[].unit` set; sufficient tick density for reading |
| **Fixture** | `packages/chart-engine/fixture/bar/` |
| **Host** | Tolerance band on numeric answer |
| **Status** | `done` |

---

## Line chart (`content.kind: "line"`)

Reference UX: trend over ordered categories or time. Requires ≥ 2 data points.

### `ch-l1-read-trend` — Describe a trend (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–7: explores quarterly temperatures to see warming and cooling across the year. |
| **Prompt** | Host: “How does temperature change across these quarters?” |
| **Action** | Select or focus any point |
| **Acceptance** | Line connects ≥ 2 points in dimension order; points are selectable; `select` → `chart.data-point-selected`; path visible between points |
| **Spec** | `kind: "line"`, one dimension, one measure, ≥ 2 rows |
| **Fixture** | `packages/chart-engine/fixture/line/` |
| **Host** | Discussion / open response |
| **Status** | `planned` (reopened: acceptance "path visible between points" fails — `line/expected.svg` holds only `<circle>` markers, no `<polyline>`/`<path>` series code; re-flips in W-2.4/T11) |

### `ch-l2-identify-peak` — Which point is the maximum? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–7: selects the hottest quarter on the line chart. |
| **Prompt** | Host: “Which quarter had the highest temperature?” |
| **Action** | Tap the highest point |
| **Acceptance** | Selection id `temp-point-row-jul` (or equivalent max row); payload includes `measureValue: 22` |
| **Spec** | Same line model as `ch-l1-read-trend` |
| **Fixture** | `packages/chart-engine/fixture/line/` |
| **Host** | Answer key: `row-jul` |
| **Status** | `done` |

### `ch-l3-identify-trough` — Which point is the minimum? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–7: selects the coldest quarter. |
| **Prompt** | Host: “Which quarter had the lowest temperature?” |
| **Action** | Tap the lowest point |
| **Acceptance** | Wrong taps still emit selection events; host scores on `rowId` |
| **Spec** | Same line model as `ch-l2-identify-peak` |
| **Fixture** | `packages/chart-engine/fixture/line/` |
| **Host** | Answer key: `row-jan` |
| **Status** | `done` |

### `ch-l4-time-series` — Trend over time (time dimension)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–8: reads a measurement series with ISO-8601 dates on the x-axis. |
| **Prompt** | Host: “When did the reading increase?” |
| **Action** | Select points along the time axis |
| **Acceptance** | `dimensions[].type: "time"` accepts ISO-8601 strings; non-ISO values rejected with `INVALID_ENTITY`; line renders with ordered time scale |
| **Spec** | `kind: "line"`, `dimensions: [{ id: "when", type: "time" }]` |
| **Fixture** | `packages/chart-engine/fixture/line-time/` |
| **Host** | Scoring on `rowId` or date |
| **Status** | `done` |

---

## Cross-kind

### `ch-x1-focus-datapoint` — Focus without selecting (keyboard / programmatic)

| Field | Value |
|-------|-------|
| **Learner** | Uses keyboard or host-driven focus to inspect a bar or point before answering. |
| **Prompt** | Host: optional (“Use arrow keys to explore each month.”) |
| **Action** | `focus` on `{measureId}-bar-{rowId}` or `{measureId}-point-{rowId}` |
| **Acceptance** | `chart.data-point-focused` emitted with row payload; selection unchanged unless `select` also dispatched |
| **Spec** | `interaction.actions` includes `focus` |
| **Fixture** | `packages/chart-engine/fixture/bar/` or `line/` |
| **Host** | — |
| **Status** | `done` |

### `ch-x2-multi-measure` — Compare two measures per category

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–8: compares rainfall and sunshine hours for the same months. |
| **Prompt** | Host: “Which month had more rainfall than sunshine hours?” |
| **Action** | Select the correct bar among grouped measures |
| **Acceptance** | Two measures produce distinct node ids per row (`rainfall-bar-row-jan`, `sunshine-bar-row-jan`); legend distinguishes measures; tabular lists both values per row |
| **Spec** | `measures[]` length 2, shared dimension |
| **Fixture** | `planned` |
| **Host** | Scoring on `rowId` + `measureId` |
| **Status** | `planned` |

### `ch-x3-guided-narrow` — Guided select via pre-filter

| Field | Value |
|-------|-------|
| **Learner** | Host shows only one bar; learner confirms the prompted month. |
| **Prompt** | Host: “Tap May.” |
| **Action** | Host dispatches `filter: { ids: ["row-may"] }`; learner `select`s the visible bar |
| **Acceptance** | Single visible bar; selection event matches filtered row; `reset` / `clear-filter` restores full chart between steps |
| **Spec** | `filter` + `select` + `reset` in `interaction.actions` |
| **Fixture** | `packages/chart-engine/fixture/bar-guided-narrow/` |
| **Host** | Multi-step workflow |
| **Status** | `done` |

---

## Accessibility and data fidelity

### `ch-a1-tabular-alternative` — Tabular representation

| Field | Value |
|-------|-------|
| **Learner** | Uses a data table instead of the SVG chart to review or select values. |
| **Prompt** | — |
| **Action** | Host binds table row → `select` dispatch |
| **Acceptance** | `snapshot.tabular` lists every row with `rowLabel` and measure values; table present in rendered output; nothing conveyed by color alone (P6) |
| **Spec** | Any fixture with `accessibility.label` |
| **Fixture** | `packages/chart-engine/fixture/bar/` |
| **Host** | Table presentation chrome |
| **Status** | `done` |

### `ch-a2-validate-data` — Reject invalid specs

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Unknown `kind` (e.g. `scatter`) → `INVALID_ENTITY`; missing `sources` → `INVALID_SPEC`; 1-point line → `INVALID_ENTITY`; undeclared row keys → `INVALID_ENTITY`; non-numeric measure → `INVALID_ENTITY`; invalid provenance class → `INVALID_SPEC`; bad `links` → `INVALID_REFERENCE`; non-D5 actions (e.g. `click`) rejected |
| **Spec** | Negative cases in unit tests + e2e `tryCreate` |
| **Fixture** | `packages/chart-engine/test/validation.test.ts`, `packages/chart-engine/e2e/chart.spec.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Future chart kinds (SPEC — not in MVP slice)

### `ch-p1-area-chart` — Cumulative or filled trend

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–8: interprets filled area under a time series. |
| **Prompt** | Host: “When did the total start to level off?” |
| **Action** | Select points or regions along the series |
| **Acceptance** | `content.kind: "area"` renders filled path; same D5 events as line |
| **Spec** | `kind: "area"` (future enum value) |
| **Fixture** | `planned` |
| **Host** | Scoring |
| **Status** | `planned` |

### `ch-p2-scatter-plot` — Relationship between two measures

| Field | Value |
|-------|-------|
| **Learner** | Grades 7–9: identifies correlation between two quantitative variables. |
| **Prompt** | Host: “Which point is the outlier?” |
| **Action** | Select a point |
| **Acceptance** | `content.kind: "scatter"` with two quantitative dimensions or measure encoding |
| **Spec** | `kind: "scatter"` (future enum value) |
| **Fixture** | `planned` |
| **Host** | Scoring |
| **Status** | `planned` |

---

## Fixture map

| Fixture path | Use cases | Notes |
|--------------|-----------|-------|
| `packages/chart-engine/fixture/bar/` | `ch-b1-compare-categories`, `ch-b2-identify-max`, `ch-b3-identify-min`, `ch-b4-filter-subset`, `ch-b5-read-value`, `ch-x1-focus-datapoint`, `ch-a1-tabular-alternative` | `rainfall-monthly`; default e2e harness fixture |
| `packages/chart-engine/fixture/line/` | `ch-l1-read-trend`, `ch-l2-identify-peak`, `ch-l3-identify-trough`, `ch-x1-focus-datapoint` | `temperature-quarterly`; ≥ 2 points |
| `docs/engines/chart/skills/quantitative-chart/SKILL.md` | Authoring reference | Example spec in skill doc |

Conformance harness: `/?engine=chart` (default fixture: `bar`).

---

## P8 priority (Workstream A — slice honesty)

| Priority | Use case | Rationale |
|----------|----------|-----------|
| P0 | `ch-b1-compare-categories`, `ch-a1-tabular-alternative`, `ch-a2-validate-data` | Exit gate: bar render, a11y table, validation |
| P0 | `ch-l1-read-trend` | Line kind baseline |
| P1 | `ch-b2-identify-max`, `ch-b3-identify-min`, `ch-l2-identify-peak`, `ch-l3-identify-trough` | Discovery scoring paths |
| P1 | `ch-b4-filter-subset`, `ch-x1-focus-datapoint` | Filter and focus mechanics |
| P2 | `ch-l4-time-series`, `ch-x2-multi-measure`, `ch-x3-guided-narrow` | Time dimension fixture, grouped measures, guided workflow |
| P3 | `ch-p1-area-chart`, `ch-p2-scatter-plot` | Future kinds named in SPEC; not started |

---

## Contract changes (none proposed)

All `done` use cases are expressible with the current Chart spec surface (`bar` / `line`, `dimensions[]`, `measures[]`, `data[]`, D5 `select` / `focus` / `filter` / `clear-filter` / `reset`). Planned cases (`ch-l4-time-series`, `ch-x2-multi-measure`, `ch-x3-guided-narrow`, `ch-p1-area-chart`, `ch-p2-scatter-plot`) may require new fixtures, `kind` enum values, or per-row `interactive` gating — propose in SPEC before implementation.
