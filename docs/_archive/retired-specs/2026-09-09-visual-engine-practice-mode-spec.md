# Visual Engine Practice-Mode Spec

**Date:** 2026-09-09  
**Status:** Implemented (contract); UX superseded by use-case catalog  
**Implementation plan:** `docs/superpowers/specs/2026-09-09-visual-practice-mode-implementation-plan.md`  
**Use cases (canonical UX):** `docs/use-cases/visual.md`  
**Scope:** All 10 visual `content.kind` values (9 existing + new `fraction-circle`)  
**Depends on:** P0–P7 gates (done); P8 Workstream A layout/render baseline (green on branch)  
**Plan home:** derive `docs/PLAN-P8.md` Workstream A follow-up or dedicated Visual practice slice (record in `PLAN.md` §11 when scheduled)

> **UX authority.** Discovery/guided mechanics and event ids below remain normative for implementers. **What the learner sees** (e.g. number-line: no filled marker on every tick) is defined in `docs/use-cases/visual.md`. When this spec and the catalog disagree, update this spec or the catalog — do not ship playground-only fixes.

---

## 1. Problem

The Visual engine supports nine `content.kind` values today. Six kinds already emit selectable scene nodes in some configurations; three (`clock`, `coordinate-grid`, `geometry`) are read-only in practice fixtures. OpenEdu needs a **consistent, assessable select-only pattern** across kinds: the engine exposes clickable semantic targets and emits D5 events; OpenEdu owns the answer key and feedback (D7).

Additionally:

- There is no `fraction-circle` kind (circle sectors); `fraction-comparison` lives in `fraction-circle.ts` today and must not be conflated with the new kind.
- Four component props are declared but never read (`majorStep`, `rangeHighlight`, `orientation`, `size`).
- `content.selectable` exists in `VisualContentSchema` but is **not wired** in `buildScene`.
- Existing `highlight*` props **gate** interactivity (only highlighted nodes are clickable). That is valid for **guided** exercises but wrong for **discovery** exercises where learners must choose among distractors.

## 2. Goals

| Goal | Detail |
|------|--------|
| Practice-ready select targets | Every kind can expose at least one `interactive: true` scene node in a documented configuration |
| Two exercise shapes | **Discovery** (many candidates, OpenEdu scores) and **Guided** (only authored targets clickable) |
| New kind | `fraction-circle` — sector wedges, same interactivity rules as `fraction` bar |
| Schema hygiene | Remove dead props; no silent `additionalProperties` drift |
| Contract discipline | D7: no scoring in engine; D5: no new actions; D9: new kind is a documented contract change |
| Deterministic render | Hand-written wedge arcs and existing layout strategies; no new runtime dependencies |

## 3. Interaction model

### 3.1 Separation of concerns

| Layer | Owns | Does not own |
|-------|------|----------------|
| **Spec (author)** | Which nodes exist; which are selectable; optional visual emphasis | Correctness, hints, progression |
| **Engine** | Scene + layout + SVG; `interactive` / `acceptsActions`; namespaced events | Scoring, feedback strings |
| **OpenEdu** | Answer key (`questions`, quiz nodes, workflow); feedback | Renderer markup, coordinates |

`interaction.mode` (`identify`, `compare`, …) is an **envelope authoring hint** for OpenEdu and validators. The Visual engine **does not read** `interaction.mode` at runtime today and MUST NOT start scoring based on it.

### 3.2 Discovery vs guided

| Mode | Author intent | Selectability | Visual emphasis | OpenEdu answer key |
|------|---------------|---------------|-----------------|-------------------|
| **Discovery** | Learner picks among distractors | All **candidate** nodes for that component (`interactive: true` on component props) | Optional `highlight*` / `highlightedParts` — styling only, does not gate clicks | Envelope `questions` and/or host quiz logic |
| **Guided** | Learner taps pre-indicated targets | Only nodes listed in `highlight*` / `highlightedParts` / `highlightHand` / `highlightPoints` | Same props (emphasis = target) | Event `target.id` must match authored target (often trivial) |

**Backward compatibility:** If `interactive` is omitted/false, existing behavior is preserved — `highlight*` props **gate** selectability (current `number-line`, `counting-set`, `fraction` behavior). New practice fixtures SHOULD prefer `interactive: true` for discovery exercises.

### 3.3 Event contract (unchanged engine shape)

```
Student dispatches select { target: { id: '<scene-node-id>' } }
  ↓
Engine: baseReducer → interaction-started → state-changed
  ↓
Engine emits visual.<scene-node-id>-selected
  payload: { selection: <EngineState.selection> }
  action echoed on event
  ↓
OpenEdu compares target.id (and/or selection set) to answer key → feedback
```

Notes:

- Event name uses the **scene node id** (e.g. `nl-marker-7`, `hex-shape`), not the envelope `components[].id` alone.
- Payload is **`{ selection }`**, not a full node record (unlike Chart/Diagram). OpenEdu resolves correctness from `action.target.id` and accumulated `selection`.
- `deselect` emits `visual.<id>-deselected`; multi-select exercises use `selection` membership after each event.
- `focus` emits `visual.<id>-focused` (no scoring).

### 3.4 Shared component prop: `interactive`

Add optional `interactive?: boolean` (default `false`) to component props where practice is supported. Semantics:

- **`interactive: false` (default):** legacy/guided — only `highlight*` / `highlightedParts` / etc. create `interactive: true` on scene nodes.
- **`interactive: true`:** discovery — all **candidates** for that kind become selectable (see per-kind table in §4); `highlight*` affects presentation only.

Kinds that already use `interactive` (`comparison`, `fraction-comparison`, `illustration` entities) keep their current meaning.

### 3.5 Optional: `content.selectable` (future-friendly)

`VisualContentSchema` already declares `content.selectable: string[]`. **This spec does not require wiring it in v1.** If implemented later, it MUST reference scene node ids and merge with per-component rules without duplicating answer keys. Prefer per-component `interactive` + `highlight*` for v1.

---

## 4. Per-kind specification

**Convention:** Scene node ids are `{componentId}-{suffix}` unless noted. Events are `visual.{scene-node-id}-selected`.

### 4.0 Summary table

| Kind | Guided (legacy) | Discovery (`interactive: true`) | New/changed props |
|------|-----------------|--------------------------------|-------------------|
| `number-line` | `highlight: [n]` → markers at n | `{id}-label-{v}` (or `{id}-tick-{v}` if `showLabels: false`); no marker circles; `highlight` → `metadata.emphasized` only (see §4.1) | Remove dead props |
| `counting-set` | `highlight: [indices]` | All `{id}-object-{i}` for `i in 0..count-1` | — |
| `fraction` | `highlightedParts: [i]` | All `{id}-part-{i}` | Remove `orientation` |
| `fraction-circle` | **new** same as fraction | All `{id}-sector-{i}` | New kind |
| `fraction-comparison` | `interactive: true` on items | (unchanged) | — |
| `clock` | `highlightHand` gates hands | All declared hands selectable; `highlightHand` styles only | `highlightHand` |
| `coordinate-grid` | `highlightPoints: [ids]` | All points with `id` selectable | `highlightPoints`, require `id` when interactive |
| `geometry` | `highlight*` flags gate | Per flag, all matching parts selectable | `highlight`, `highlightVertices`, `highlightSides` |
| `comparison` | `interactive: true` | (unchanged) | — |
| `illustration` | entities always selectable | (unchanged) | — |

---

### 4.1 `number-line`

**Remove dead props:** `majorStep`, `rangeHighlight` (from component props and content-level duplicates if present).

**Candidates when `interactive: true`:** For each integer `v` in range, `{parentId}-label-{v}` (or `{parentId}-tick-{v}` when `showLabels: false`) with `interactive: true`. Do **not** emit `{parentId}-marker-{v}` in discovery. `highlight` sets `metadata.emphasized` only.

**Guided:** `highlight: [7]` → only `nl-marker-7` interactive (unchanged).

**Discovery example** — “Which number is 7?” (all positions clickable; OpenEdu checks selection):

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "nl-practice-which-is-7",
  "purpose": {
    "learningObjective": "Identify 7 on a number line",
    "interactionGoal": "Select the position that shows 7"
  },
  "content": {
    "kind": "number-line",
    "components": [{
      "id": "nl",
      "type": "number-line",
      "props": { "min": 0, "max": 10, "step": 1, "interactive": true, "highlight": [7] }
    }]
  },
  "questions": [{
    "id": "q1",
    "type": "identify",
    "prompt": "Select 7 on the number line.",
    "targets": [{ "id": "nl-marker-7" }]
  }],
  "accessibility": { "label": "Number line from 0 to 10" },
  "interaction": { "mode": "identify", "actions": ["select", "focus", "deselect", "reset"] }
}
```

**OpenEdu:** On `visual.nl-marker-7-selected`, mark correct; other `nl-marker-*` incorrect.

**Guided example** — “Tap the highlighted marker” (only one target clickable):

```json
"props": { "min": 0, "max": 10, "step": 1, "highlight": [7] }
```

**OpenEdu:** `visual.nl-marker-7-selected` → success (only one possible click).

---

### 4.2 `counting-set`

**Guided (unchanged):** `highlight: [2, 5]` → only those objects interactive.

**Discovery:** `interactive: true` → all `{id}-object-{i}` for `i ∈ [0, count)` interactive; `highlight` optional for emphasis only.

```json
{
  "content": {
    "kind": "counting-set",
    "components": [{
      "id": "cs",
      "type": "counting-set",
      "props": {
        "count": 5,
        "object": "star",
        "arrangement": "row",
        "interactive": true
      }
    }]
  },
  "questions": [{
    "id": "q1",
    "type": "identify",
    "prompt": "Select exactly three stars.",
    "targets": [
      { "id": "cs-object-0" },
      { "id": "cs-object-1" },
      { "id": "cs-object-2" }
    ]
  }],
  "interaction": { "mode": "identify", "actions": ["select", "focus", "deselect", "reset"] }
}
```

**OpenEdu:** After submit (host concern), compare `snapshot().selection` to expected set of three ids.

---

### 4.3 `fraction` (bar)

**Remove dead prop:** `orientation`.

**Guided:** `highlightedParts: [0,1,2]` → only those parts interactive (unchanged).

**Discovery:** `interactive: true` → all `{id}-part-{i}` interactive; `highlightedParts` visual only.

```json
"props": { "numerator": 3, "denominator": 4, "interactive": true, "highlightedParts": [0, 1, 2] }
```

**OpenEdu:** Expect selection `{fb-part-0, fb-part-1, fb-part-2}` for “show three quarters.”

---

### 4.4 `fraction-circle` — NEW KIND (contract change D9)

**Purpose:** Circle divided into equal sectors; parallel to `fraction` bar.

**File layout:**

- **New:** `packages/visual-engine/src/components/fraction-circle-sectors.ts` (`kind: 'fraction-circle'`).
- **Keep:** `packages/visual-engine/src/components/fraction-circle.ts` — rename internally if needed but continues to register **`fraction-comparison`** only.

**Props** (mirror bar; no extra `interactive` flag beyond shared §3.4):

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `numerator` | number | yes | Shaded/counting target; `0 <= numerator <= denominator` unless `allowImproper` |
| `denominator` | number | yes | `>= 2` |
| `highlightedParts` | number[] | no | Sector indices for **visual** emphasis; gates selectivity only when `interactive: false` |
| `showFraction` | boolean | no | default `true` — label `{numerator}/{denominator}` |
| `allowImproper` | boolean | no | same rule as bar |
| `interactive` | boolean | no | §3.4 discovery vs guided |

**Scene nodes:**

```
{parentId}                 kind: fraction-circle, role: group
  {parentId}-sector-{i}    kind: wedge, role: fraction-part, value: i
  {parentId}-label         kind: text, role: label  (if showFraction)
```

**Layout:** `layoutFractionCircle` in `layout/engine.ts` — bounds per sector (angular): deterministic, no `d3`.

**Render:** `wedge` kind in `render/svg.ts` — SVG `<path>` arc per sector.

**Validation (L2):** `denominator >= 2`; indices in `highlightedParts` < `denominator`; `numerator`/`denominator` rules match bar.

---

### 4.5 `fraction-comparison` — no schema change

`interactive: true` makes each item group selectable. Fixture: `fixture/fraction-comparison/`.

**OpenEdu:** `visual.fc-item-a-selected` or `visual.fc-item-b-selected` for “pick the larger fraction.”

---

### 4.6 `clock`

**New prop:** `highlightHand?: 'hour' | 'minute' | 'both'`

**Scene ids (parent `ck`):** `ck-face`, `ck-hour-hand`, `ck-minute-hand`, `ck-number-{1..12}`.

**Guided:** `highlightHand: 'hour'` → only `ck-hour-hand` interactive.

**Discovery:** `interactive: true` + `highlightHand: 'hour'` → **both hands** interactive; `highlightHand` controls **emphasis** styling on the named hand(s) only. For “identify the hour hand among two hands,” use guided mode, not discovery.

```json
{
  "content": {
    "kind": "clock",
    "components": [{
      "id": "ck",
      "type": "clock",
      "props": { "hour": 3, "minute": 30, "highlightHand": "hour" }
    }]
  },
  "interaction": { "mode": "identify", "actions": ["select", "focus", "reset"] }
}
```

**OpenEdu (guided):** `visual.ck-hour-hand-selected`.

**Validation:** `highlightHand ∈ {hour, minute, both}`; existing hour/minute range checks unchanged.

---

### 4.7 `coordinate-grid`

**New prop:** `highlightPoints?: string[]` (point `id`s)

**Point scene id:** `{parentId}-point-{pointId}`

**Guided:** only ids in `highlightPoints` interactive.

**Discovery:** `interactive: true` → every point with an `id` interactive; `highlightPoints` visual only.

**Rule:** When `interactive: true` or `highlightPoints` non-empty, every point in `points[]` **MUST** have `id` (INVALID_SPEC otherwise).

```json
"props": {
  "x": { "min": -5, "max": 5, "step": 1 },
  "y": { "min": -5, "max": 5, "step": 1 },
  "points": [
    { "x": 2, "y": 3, "id": "target" },
    { "x": -1, "y": 4, "id": "distractor" },
    { "x": 0, "y": 0, "id": "origin" }
  ],
  "interactive": true,
  "highlightPoints": ["target"]
}
```

**OpenEdu:** `visual.cg-point-target-selected` correct.

---

### 4.8 `geometry`

**Remove dead prop:** `size`

**New props:** `highlight?`, `highlightVertices?`, `highlightSides?` (booleans, default false)

**Shape scene id:** `{parentId}-shape` (role `shape`, kind `shape`) — **not** `{parentId}`.

**Guided:**

- `highlight: true` → only `{parentId}-shape` interactive
- `highlightVertices: true` → only `{parentId}-vertex-{i}` interactive (requires `showVertices: true`)
- `highlightSides: true` → only `{parentId}-side-{i}` interactive

**Discovery:** `interactive: true` + exactly one `highlight*` flag applies to **all** instances of that target type (all vertices, all sides, or whole shape).

**Multi-component spec** (three shapes, pick hexagon): each component `interactive: true` + `highlight: true` → three shapes selectable.

**OpenEdu (pick hexagon):** `visual.hex-shape-selected` (component id `hex`, shape node `hex-shape`).

**Validation:** At most one of `highlight`, `highlightVertices`, `highlightSides` true **per component instance**; `highlightVertices` requires `showVertices: true`.

---

### 4.9 `comparison` — no change

`interactive: true` → `{parentId}-item-{itemId}` selectable. Fixture: `fixture/comparison/`.

---

### 4.10 `illustration` — no change

`content.entities[]` → each entity id is always selectable. Fixture: `fixture/illustration/`.

---

## 5. Governance and schema

### 5.1 Contract change (D9)

Adding `fraction-circle` extends the Visual closed set (ADR-09). Before implementation:

1. Append `docs/PLAN.md` §11 line: Visual-D10 — `fraction-circle` kind for sector fractions.
2. Update ADR-09 consequences or add ADR-10 note: tenth Visual kind; not Timeline/Diagram scope creep.
3. Bump `visual-spec.schema.json` `$id` / document in changelog if repo policy requires.

### 5.2 `VISUAL_KINDS`

```typescript
export const VISUAL_KINDS = [
  'number-line',
  'counting-set',
  'fraction',
  'fraction-circle',      // NEW
  'fraction-comparison',
  'clock',
  'coordinate-grid',
  'geometry',
  'comparison',
  'illustration',
] as const;
```

### 5.3 Dead prop removal (non-breaking for in-repo fixtures)

| Kind | Remove | Notes |
|------|--------|-------|
| `number-line` | `majorStep`, `rangeHighlight` | No fixture uses them |
| `fraction` | `orientation` | No fixture uses it |
| `geometry` | `size` | No fixture uses it |

Removing from Zod + JSON Schema is a **minor** contract tightening; document in PLAN §11. External authors passing unknown keys still fail L1 (`additionalProperties: false`).

### 5.4 Envelope `questions` (D7)

Practice specs **MAY** include envelope `questions[]` (`id`, `type`, `prompt`, optional `targets[]` with scene node ids) as authoring hints for OpenEdu. Engines MUST remain correct with `questions: []`. Answer evaluation is host-owned (D7); `targets` are not read by the Visual engine at runtime.

---

## 6. Implementation plan input

Full agent-ready task breakdown: **`docs/superpowers/specs/2026-09-09-visual-practice-mode-implementation-plan.md`**. Summary below; order is exit-gated.

### Phase V0 — Schema and governance

| ID | Task | Done when |
|----|------|-----------|
| V0-1 | Record Visual-D10 in `PLAN.md` §11 | Changelog line committed |
| V0-2 | Add `fraction-circle` to `VISUAL_KINDS` + JSON Schema enum | Parity test updated |
| V0-3 | Remove dead props from schema + component interfaces | Parity test green |
| V0-4 | Document `interactive` + discovery/guided rules in `engines/visual/SPEC.md` (thin delta) | Spec matches this file |

### Phase V1 — Shared interactivity behavior

| ID | Task | Done when |
|----|------|-----------|
| V1-1 | Implement §3.4 `interactive` flag for `number-line`, `counting-set`, `fraction` | Tests: guided unchanged; discovery all candidates |
| V1-2 | Add `highlightHand` to clock + V1 behavior | Fixture `fixture/clock-practice/` |
| V1-3 | Add `highlightPoints` + point `id` rules to coordinate-grid | Fixture `fixture/coordinate-grid-practice/` |
| V1-4 | Add geometry `highlight*` props + fix ids (`{id}-shape`) | Fixture `fixture/geometry-practice/` |

### Phase V2 — `fraction-circle` kind

| ID | Task | Done when |
|----|------|-----------|
| V2-1 | `fraction-circle-sectors.ts` + register in `build.ts` | Scene test |
| V2-2 | `layoutFractionCircle` + `wedge` SVG | Golden `fixture/fraction-circle/` |
| V2-3 | L2 validation + e2e smoke | Playwright/conformance if routed |

### Phase V3 — Fixtures and docs

| ID | Task | Done when |
|----|------|-----------|
| V3-1 | One **discovery** practice fixture per kind (can be `*-practice` slug) | Catalog lists them |
| V3-2 | Agent skill `educational-visual` delta: discovery vs guided | Skill example validates |
| V3-3 | Playground manual check: distractors clickable in discovery specs | Human sign-off |

### Files touch list

| File | Change |
|------|--------|
| `packages/visual-engine/src/schema.ts` | `fraction-circle`; dead props |
| `packages/visual-engine/src/schemas/visual-spec.schema.json` | same |
| `packages/visual-engine/src/components/*.ts` | per §4 |
| `packages/visual-engine/src/components/fraction-circle-sectors.ts` | **new** |
| `packages/visual-engine/src/scene/build.ts` | register kind |
| `packages/visual-engine/src/layout/engine.ts` | `fraction-circle` layout |
| `packages/visual-engine/src/render/svg.ts` | `wedge` paths |
| `packages/visual-engine/test/**` | guided/discovery pairs |
| `packages/visual-engine/fixture/**` | see §7 |

### Explicit non-tasks

- Wire `content.selectable` (deferred)
- Construct/drag mode
- Engine-side scoring or `answer` action handling
- D3 / new dependencies
- Change namespaced event pattern or payload shape (host contract)

---

## 7. Fixtures

### Already present (baseline / read-only)

`number-line`, `counting-set`, `fraction`, `fraction-comparison`, `comparison`, `illustration`, `clock`, `coordinate-grid`, `geometry` — each has `fixture/<slug>/input.visual.json` + goldens.

### New or update required

| Fixture slug | Kind | Purpose |
|--------------|------|---------|
| `fraction-circle` | `fraction-circle` | Sector wedges + discovery select |
| `clock-practice` | `clock` | Guided `highlightHand: 'hour'` |
| `coordinate-grid-practice` | `coordinate-grid` | Discovery `interactive: true` + distractor points |
| `geometry-practice` | `geometry` | Multi-shape discovery (hexagon correct) |
| `number-line-identify-marked` | `number-line` | Discovery label targets (`interactive: true`, `highlight` for emphasis) |

Existing fixtures MUST keep passing **guided** behavior without `interactive: true`.

---

## 8. Validation rules (L2 additions)

| Kind | Rule | Code |
|------|------|------|
| `fraction-circle` | `denominator >= 2` | INVALID_ENTITY |
| `fraction-circle` | `highlightedParts` indices < `denominator` | INVALID_ENTITY |
| `fraction-circle` | `numerator`/`denominator` same as bar | INVALID_ENTITY |
| `clock` | `highlightHand` enum | INVALID_SPEC |
| `coordinate-grid` | `highlightPoints` refs resolve | INVALID_REFERENCE |
| `coordinate-grid` | points have `id` when `interactive` or `highlightPoints` | INVALID_SPEC |
| `geometry` | at most one `highlight*` true per component | INVALID_SPEC |
| `geometry` | `highlightVertices` ⇒ `showVertices` | INVALID_SPEC |

---

## 9. Out of scope

- Construct mode (drag hands, plot points, build fractions)
- Scoring, hints, telemetry (OpenEdu / D7)
- New D5 actions
- `content.selectable` wiring
- Richer visual emphasis tokens (separate styling spec)
- Cross-engine `links.*` on visual events

---

## 10. Success criteria

1. Every kind has a documented **discovery** and/or **guided** configuration with correct scene node ids and event names.
2. `fraction-circle` renders deterministic wedge SVG and participates in select events.
3. Dead props removed; parity test green.
4. New L2 rules enforced with shared error codes.
5. At least one new practice fixture per kind that gained interactivity (`clock`, `coordinate-grid`, `geometry`, `fraction-circle`).
6. **Regression:** all existing golden fixtures byte-stable without adding `interactive: true` to them.
7. Full gate: `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`.

---

## 11. Change log

| Date | Change |
|------|--------|
| 2026-09-09 | Initial draft |
| 2026-09-09 | **Revision:** discovery vs guided model; `interactive` prop semantics; fixed geometry/clock event ids; unified fraction-circle with bar; D7/D9 governance; event payload accuracy; fixture delta vs baseline; implementation plan input (§6) |
