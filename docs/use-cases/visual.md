# Visual engine — use-case catalog

**Status:** Active  
**Engine:** `visual` (`packages/visual-engine`)  
**Contract:** `docs/engines/visual/SPEC.md`  
**Widget migration notes:** `docs/fixtures/p7/widget-compat/`

## How to read this document

Each use case is a **lesson archetype**. Implementers ship fixtures that match acceptance criteria; authors and agents copy those fixtures, not abstract prop grids.

**D7 boundary (always):**

| Layer | Owns |
|-------|------|
| **Engine** | Scene, layout, SVG, semantic targets, D5 `select` / `focus` / `filter` events, snapshot |
| **OpenEdu host** | Prompt text, answer key, correct/incorrect feedback, hints, progression, scoring |

---

## Interaction modes by kind

| Kind | Supported modes | Do not use |
|------|-----------------|------------|
| `number-line` | guided-select, discovery-select (tick/label targets), construct-place (widget or future) | — (fixed: markers no longer blobs on every step) |
| `counting-set` | guided-select, discovery-select (all objects) | — |
| `fraction` | guided-select, discovery-select (all parts) | — |
| `fraction-circle` | Same as `fraction` | Conflate with `fraction-comparison` |
| `fraction-comparison` | discovery-select (items) | — |
| `clock` | guided-select, discovery-select (hands) | `highlightHand` as invalid prop name |
| `coordinate-grid` | guided-select, discovery-select (points), display | Pixel picking |
| `geometry` | guided-select, discovery-select (per flag scope) | Enable all sides when only one type is emphasized |
| `comparison` | discovery-select | — |
| `illustration` | explore (entities) | — |

---

## Number line (`number-line`)

Reference UX: OpenEdu `math.number-line` widget (place + snap). Engine targets **select among ticks/markers**, not full widget parity until construct mode exists.

### `nl-locate-guided` — Locate a value (guided)

| Field | Value |
|-------|-------|
| **Learner** | Grades K–3: “Find 7 on the line from 0 to 10.” |
| **Prompt** | Host: “Tap the number 7.” |
| **Action** | Select the tick/label (or single marker) at 7. |
| **Acceptance** | Axis with ticks and labels 0–10; **one** clear target affordance at 7; no filled discs on every integer; `select` → `visual.nl-marker-7-selected` (or tick id per spec); keyboard path to target; a11y name references position 7. |
| **Spec** | `highlight: [7]` only; `interactive` omitted or false (guided gating). |
| **Fixture** | `number-line` (golden) |
| **Host** | Correct if `action.target.id` is the 7 target. |
| **Status** | `done` (golden); render should not add spurious markers |

### `nl-identify-marked` — Which number is marked? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 2–4: A single position is emphasized; learner names it by selecting. |
| **Prompt** | Host: “What number is pointed to?” |
| **Action** | Select the emphasized tick/label (or the only marked position). |
| **Acceptance** | One visible emphasis (stroke, pointer, or label weight); other positions are **ticks/labels only**, not identical filled circles; all tick labels remain selectable hit targets if discovery requires distractors. |
| **Spec** | `interactive: true` + `highlight: [n]` where highlight is **presentation only**; candidates are tick/label nodes, not `{id}-marker-{v}` filled circles for every `v`. |
| **Fixture** | `number-line-identify-marked` |
| **Host** | Answer key: value `n` matching emphasis. |
| **Status** | `done` |

### `nl-compare-distance` — Which is farther from 0? (multi-step)

| Field | Value |
|-------|-------|
| **Learner** | Grades 3–5: Two values highlighted; learner compares distance to zero. |
| **Prompt** | Host: “Which number is farther from 0, 3 or 7?” |
| **Action** | Select one of two emphasized positions (or two-step select). |
| **Acceptance** | Two distinct emphases; no extra marker clutter; events distinguish which id was selected. |
| **Spec** | `highlight: [3, 7]`; guided or discovery per lesson. |
| **Fixture** | `number-line-compare-distance` (planned) |
| **Host** | Compares selected id to authored answer. |
| **Status** | `done` |

### `nl-place-value` — Place a value on the line (construct)

| Field | Value |
|-------|-------|
| **Learner** | Grades K–4: Click the line to place a marker at the correct value. |
| **Prompt** | Host: “Put 7 on the number line.” |
| **Action** | Click/drag on axis; marker snaps to step. |
| **Acceptance** | Single learner-placed marker; snap to `step`; event carries placed value (namespaced action or `answer` — contract TBD). |
| **Spec** | Not the current `select`-among-markers model. |
| **Fixture** | — |
| **Host** | Compares placed value to 7; feedback green/red. |
| **Status** | `widget-preferred` (`math.number-line`) until engine `construct` mode is specified |

---

## Counting set (`counting-set`)

### `cs-count-highlighted` — Count highlighted items (guided)

| Field | Value |
|-------|-------|
| **Learner** | Grades K–1: Select each highlighted star. |
| **Prompt** | Host: “Tap all the stars that are glowing.” |
| **Action** | Multi-select highlighted objects. |
| **Acceptance** | Objects visible; only highlighted indices interactive when guided; `selection` accumulates; deselect supported. |
| **Spec** | `highlight: [indices]`; `interactive` false/omitted. |
| **Fixture** | `counting-set` (golden) |
| **Host** | Set equality on selected indices. |
| **Status** | `done` |

### `cs-pick-n` — Pick exactly N objects (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades K–2: “Pick 3 stars.” |
| **Prompt** | Host: “Select three stars.” |
| **Action** | Multi-select any three objects. |
| **Acceptance** | All objects same affordance; no false “highlight” required; max selection enforced by host or spec `maxSelection` when added. |
| **Spec** | `interactive: true`, `count: n`. |
| **Fixture** | `counting-set-pick-n` (planned) |
| **Host** | `selection.length === 3` and optional identity check. |
| **Status** | `done` (promoted: W-2.1 `maxSelection` slice exit gate — cap rejects over-limit learner `select` with `INVALID_ACTION`, scoped to `select`/`deselect`; host dispatch of other D5 actions never capped per ADR-12; prop documented in visual SPEC A.2.1) |

---

## Fraction bar (`fraction`)

### `fr-identify-shaded` — Identify shaded parts (guided)

| Field | Value |
|-------|-------|
| **Learner** | Grades 2–4: Tap the shaded parts of a bar. |
| **Prompt** | Host: “Select the parts that show three fourths.” |
| **Action** | Select highlighted parts only (guided). |
| **Acceptance** | Bar divided into `denominator` parts; shaded parts match `numerator`; only highlighted parts clickable in guided mode. |
| **Spec** | `highlightedParts: [...]`; `interactive` false/omitted. |
| **Fixture** | `fraction` (golden) |
| **Host** | Compare selected part indices to answer. |
| **Status** | `done` |

### `fr-shade-n-parts` — Shade N parts (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 3–5: Tap parts until the bar shows the target fraction. |
| **Prompt** | Host: “Make the bar show 2/5.” |
| **Action** | Multi-select parts. |
| **Acceptance** | All parts selectable; visual fill updates on selection (engine state or static emphasis TBD); events per part id. |
| **Spec** | `interactive: true`, `denominator`, `numerator` as display or target hint only. |
| **Fixture** | `fraction-shade-n` (planned) |
| **Host** | Validates selected set size and indices. |
| **Status** | `done` (promoted: W-2.2 selection-driven fraction fill — engine-state `state.selection` re-derives `metadata.filled` per part and re-renders deterministically; SPEC A.2.2) |

---

## Fraction circle (`fraction-circle`)

### `fc-identify-sectors` — Identify sectors (guided / discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 2–4: Select sectors that represent a fraction. |
| **Prompt** | Host: “Select three quarters of the circle.” |
| **Action** | Multi-select sectors. |
| **Acceptance** | `denominator` wedge sectors; sector ids stable (`fc-sector-0`…); no duplicate scene ids; discovery enables all sectors; guided gates to `highlightedParts`. |
| **Spec** | Same rules as `fraction` bar. |
| **Fixture** | `fraction-circle` |
| **Host** | Set equality on sector indices. |
| **Status** | `done` |

---

## Fraction comparison (`fraction-comparison`)

### `fx-which-larger` — Which fraction is larger?

| Field | Value |
|-------|-------|
| **Learner** | Grades 3–5: Two visuals side by side; pick the larger fraction. |
| **Prompt** | Host: “Which shows more?” |
| **Action** | Select one comparison item. |
| **Acceptance** | Items have distinct ids; `interactive: true` on items; single selection event with item id. |
| **Spec** | Unchanged from golden. |
| **Fixture** | `fraction-comparison` (golden) |
| **Host** | Compares item id to key. |
| **Status** | `done` |

---

## Clock (`clock`)

### `ck-read-hour-hand` — Identify the hour hand (guided)

| Field | Value |
|-------|-------|
| **Learner** | Grades K–2: Given a clock face, tap the hour hand. |
| **Prompt** | Host: “Tap the hour hand.” |
| **Action** | Select hour hand entity. |
| **Acceptance** | Hour and minute hands visible; only hour hand selectable when guided; event `visual.ck-hour-hand-selected` (stable id). |
| **Spec** | `highlightHand: "hour"` (guided gating). |
| **Fixture** | `clock-practice` |
| **Host** | Trivial match on hand id. |
| **Status** | `done` |

### `ck-set-time` — Set the clock to a time (construct)

| Field | Value |
|-------|-------|
| **Learner** | Grades 1–3: Move hands to 3:00. |
| **Prompt** | Host: “Set the clock to three o’clock.” |
| **Action** | Drag or step hands. |
| **Acceptance** | Discrete hour/minute; events emit semantic time state. |
| **Spec** | Future: `adjust` or hand-drag actions — not select-only. |
| **Fixture** | — |
| **Host** | Compares `hour`/`minute` in snapshot. |
| **Status** | `planned` |

### `ck-which-hand` — Which hand is longer? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 1–2: Select the minute hand among both hands. |
| **Prompt** | Host: “Tap the longer hand.” |
| **Action** | Select minute hand. |
| **Acceptance** | Both hands selectable; `highlightHand` styles only when `interactive: true`. |
| **Spec** | `interactive: true`; discovery hands. |
| **Fixture** | `clock-discovery-minute` (planned) |
| **Host** | Target: minute hand id. |
| **Status** | `done` |

---

## Coordinate grid (`coordinate-grid`)

### `cg-plot-point` — Select a grid point (guided)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–6: “Find (3, 4) on the grid.” |
| **Prompt** | Host: “Tap the point at three, four.” |
| **Action** | Select point or cell for (3, 4). |
| **Acceptance** | Axes labeled; point ids stable; guided highlights gate selection. |
| **Spec** | `highlightPoints: ["p34"]` or equivalent. |
| **Fixture** | `coordinate-grid-practice` (verify against acceptance) |
| **Host** | Match point id. |
| **Status** | `done` — `coordinate-grid-practice` is guided; single interactive point |

### `cg-read-coordinates` — Read coordinates (display)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–6: Point shown; learner states coordinates (host input). |
| **Prompt** | Host: “What are the coordinates of point A?” |
| **Action** | Optional `focus` on point; no select required. |
| **Acceptance** | Point visible with label; a11y exposes coordinates via host or description. |
| **Spec** | Read-only point; no `interactive`. |
| **Fixture** | `coordinate-grid` (golden) |
| **Host** | Text/numeric answer check. |
| **Status** | `done` |

---

## Geometry (`geometry`)

### `geo-identify-side` — Identify a side (guided)

| Field | Value |
|-------|-------|
| **Learner** | Grades 3–6: “Tap the hypotenuse.” |
| **Prompt** | Host: “Select the longest side.” |
| **Action** | Select one side entity. |
| **Acceptance** | Multi-component layout does not overlap; only targeted side interactive when `highlightSides` scoped; event per side id. |
| **Spec** | `highlightSides: true` + side emphasis list (guided). |
| **Fixture** | `geometry-practice` |
| **Host** | Match side id. |
| **Status** | `done` (after highlight scoping fix) |

### `geo-identify-vertex` — Identify a vertex (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–6: Pick the right-angle vertex. |
| **Prompt** | Host: “Tap the corner where the right angle is.” |
| **Action** | Select vertex. |
| **Acceptance** | When `highlightVertices` sets discovery, only vertices of that type are candidates — not all sides. |
| **Spec** | `interactive: true` + `highlightVertices`. |
| **Fixture** | `geometry-discovery-vertex` (planned) |
| **Host** | Vertex id check. |
| **Status** | `done` |

---

## Comparison (`comparison`)

### `cmp-which-taller` — Compare two quantities

| Field | Value |
|-------|-------|
| **Learner** | Grades K–2: Which bar is taller? |
| **Prompt** | Host: “Which one is more?” |
| **Action** | Select one bar/item. |
| **Acceptance** | Items interactive; clear visual lengths; single-select event. |
| **Spec** | `interactive: true` on component. |
| **Fixture** | `comparison` (golden) |
| **Host** | Item id vs key. |
| **Status** | `done` |

---

## Illustration (`illustration`)

### `ill-explore-labels` — Explore labeled regions

| Field | Value |
|-------|-------|
| **Learner** | Any: Tap parts of a diagram to hear/read labels. |
| **Prompt** | Host: optional — “Tap each part to learn its name.” |
| **Action** | Select entities; focus for keyboard. |
| **Acceptance** | Each entity has role + label; events per entity id; no scoring in engine. |
| **Spec** | Entities with `interactive: true`. |
| **Fixture** | `illustration` (golden) |
| **Host** | May log exploration; no single answer. |
| **Status** | `done` |

---

## Fixture map (current → target)

| Current fixture | Use case ID | Notes |
|-----------------|-------------|-------|
| `number-line` | `nl-locate-guided` | Keep as golden |
| `number-line-practice` | — | **Replaced** by `number-line-identify-marked` in PR1 |
| `counting-set` | `cs-count-highlighted` | Keep |
| `fraction` | `fr-identify-shaded` | Keep |
| `fraction-circle` | `fc-identify-sectors` | Keep |
| `fraction-comparison` | `fx-which-larger` | Keep |
| `clock-practice` | `ck-read-hour-hand` | Keep |
| `coordinate-grid` | `cg-read-coordinates` | Keep |
| `coordinate-grid-practice` | `cg-plot-point` | Guided; single interactive point |
| `number-line-identify-marked` | `nl-identify-marked` | Discovery; label targets |
| `geometry-practice` | `geo-identify-side` | Keep |
| `comparison` | `cmp-which-taller` | Keep |
| `illustration` | `ill-explore-labels` | Keep |

---

## Implementation priority (P8 Workstream A)

Fix **ux-debt** before adding new kinds or props:

1. **`nl-identify-marked`** — tick/label targets; remove per-step filled marker blobs from discovery render. **Done.**
2. **`number-line-practice`** — replaced by `number-line-identify-marked`. **Done.**
3. **`cg-plot-point`** — confirm practice fixture matches guided acceptance. **Done.**

Then add **planned** fixtures only when a use case is scheduled in PLAN-P8.

**Agent implementation plan:** `docs/_archive/implementation-plans/2026-09-10-visual-use-cases-implementation-plan.md`

---

## Contract changes (when use cases require them)

| Use case need | Likely spec change |
|---------------|-------------------|
| Number-line discovery without blob markers | Scene: tick/label as interactive nodes; render: emphasis ≠ default fill for all steps |
| `nl-place-value`, `ck-set-time` | New interaction mode or D5 actions (document in SPEC + INTERACTIVE-ENGINE-SPEC) |
| `cs-pick-n` max selection | Optional `maxSelection` on component props |
| Construct modes | Prefer widget (`math.number-line`) until engine construct slice is gated |

Do not add props for symmetry across kinds. Add them when a catalogued use case fails acceptance without them.
