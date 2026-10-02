# Phase 2 — Visual Engine: Detailed Implementation Plan

**File:** `docs/PLAN-P2.md`
**Status:** Detailed task breakdown for the P2 phase (supersedes nothing; expands `docs/PLAN.md` §4 P2)
**Audience:** An AI coding agent (deepseek-4-flash) implementing P2
**Do this first:** read, in order — `docs/DESIGN.md` (§3, §4, §5, §8, §9, §11, §12.1, §14), `docs/INTERACTIVE-ENGINE-SPEC.md` (§15, §16, §22, §67, §68–69, §82–83), `docs/engines/visual/SPEC.md` (§4–§79), `docs/engines/visual/COMPONENTS.md` (§23–§30 only; §31+ science/general are out of scope), `docs/engines/visual/ARCHITECTURE.md` (§4, §7–§19, §54–§57, §61), `docs/PLAN.md` (§4 P2), `docs/PLAN-P1.md` (for conventions + the P1 API you build on). These are normative; this file is the how.

---

## 0. Goal and non-goals

**Goal.** Build `packages/visual-engine` — the first engine package (`EngineType 'visual'`) on top of the P1 `@knowledgeassemble/interactive-engine` core — and prove it through a **number-line vertical slice** end-to-end: spec → schema → semantic scene → layout → accessible SVG → validation → golden fixture → browser conformance. Then expand to the closed Visual component set.

**Non-goals (hard). Do NOT:**
- Build Timeline, Diagram, or GeoMap engine behavior. Visual's scope is the **closed, D9 component set**: 7 math kinds (`number-line`, `counting-set`, `fraction-bar`, `fraction-circle`, `clock`, `coordinate-grid`, `geometry-shape`) plus `comparison`. Timeline, flowchart, label-diagram, process-diagram, cycle, hierarchy, equation, measurement, angle **MUST NOT** be implemented here (DESIGN §15 "engine smuggling"; COMPONENTS §1). Any new `content.kind` or component name must be checked against this list. **Superseded 2026-10-02 — do not validate against the list above.** It records P2's scope at the time and is kept as history; it is no longer authoritative. `fraction-bar` and `geometry-shape` were never runtime kind names (they are `fraction` and `geometry`), and `fraction-comparison` and `illustration` were added after this phase. The canonical Visual closed set is `VISUAL_KINDS` in `packages/visual-engine/src/schema.ts` (ten kinds), and `packages/visual-engine/test/schema-parity.test.ts` enforces parity against it and against the prose enumerations in `docs/engines/visual/{SPEC,PROJECT}.md`.
- Import `@open-edu/*` or any other engine package (`geomap`/`chart`/`timeline`/`diagram`). `visual-engine` depends only on `@knowledgeassemble/interactive-engine` + `zod` (transitively) (DESIGN §6 / D2).
- Build React, a Studio app, telemetry storage, i18n product, theme source-of-truth, or scoring engine (D6). Theming comes **through `EngineHost.tokens`**; localization comes **through `EngineHost.locale`**; no parallel systems.
- Add runtime dependencies beyond what P1 already allows (`zod`). Layout math is hand-written (deterministic, no d3 at MVP). Do NOT pull d3 unless a later exit gate explicitly needs it.
- Use wall-clock time, `Math.random`, `Date.now`, or any non-determinism in scene/layout/SVG (P4). Determinism is tested.
- Add arbitrary JS, event handlers, or `javascript:` URIs to any spec or emitted SVG (P2/P10, SPEC §75).

**Non-negotiables (carried from P1, extended for Visual).**
- `additionalProperties:false` in the visual schema AND on every nested object (P11).
- Shared error codes only (§67): `INVALID_SPEC`, `INVALID_VERSION`, `INVALID_ENTITY`, `INVALID_REFERENCE`, `INVALID_ACTION`, `INVALID_STATE`, `UNSUPPORTED_ACTION`, `RESOURCE_ERROR`, `ACCESSIBILITY_ERROR`. Never bespoke.
- D5 semantic actions only (`select`, `deselect`, `focus`, `reset`, …). No `click`, `highlight`, `show`, `annotate` in specs (D5). Renderer maps pointer/keyboard input; that mapping is never in the spec.
- Event-only mutation; deterministic, replayable event log (P1 `createPlatformInstance`).
- Semantic-first (P1/P2): specs describe meaning (roles, values, props), never raw SVG/coordinates/pixels. Explicit geometry is allowed only when genuinely needed (SPEC §61); generated geometry must be derived, never authored to fake layout.
- SVG is a **compiled artifact**, never the canonical source (ARCHITECTURE §2, Invariant 5).
- Provenance: factual claims carry a `source` class (`authoritative` | `illustrative` | `simulated`); never invent values absent from the data (DESIGN §9).

---

## 1. Foundation: branch, repo, package, and module conventions

### 1.1 Branch strategy

P2 is new work; start from a clean base.

```text
git switch main && git pull
git switch -c feat/p2-visual-engine
```

> **Note (NodeNext).** Two commits on `feat/nodenext-bundlerless-publishing` (`77c8e0b`, `0eda6f1`) are **not yet on `main`** in the history reviewed: they enforce `moduleResolution: NodeNext` + `.js` import specifiers and add the CI gate. The P1 source already uses `.js` specifiers. **Write all P2 imports with `.js` specifiers** (`import { x } from './core/engine.js'`) so P2 type-checks under either resolution. If `main` is still on `moduleResolution: Bundler`, either (a) land/merge the NodeNext fix first, or (b) keep P2 builds passing under `main`'s current settings and add NodeNext only once the follow-up merges. Confirm with `pnpm typecheck` at the end of T1. Do not hand-edit `tsconfig` semantics mid-phase without a plan note.

### 1.2 Package scaffold

Create `packages/visual-engine/` mirroring the established package shape:

```text
packages/visual-engine/
  package.json                 # name: @knowledgeassemble/visual-engine
  tsconfig.json                # extends ../../tsconfig.base.json
  vitest.config.ts
  src/
    index.ts                   # public exports (types + functions only)
    schema.ts                  # VisualSpec type + visual envelope union validator
    schemas/
      visual-spec.schema.json  # canonical JSON Schema (from this phase's authoring)
    scene/
      types.ts                 # SceneNode, Bounds, SemanticRole, Scene
      build.ts                 # buildScene(spec) -> Scene  (component expansion)
    layout/
      types.ts                 # LayoutContext, LayoutResult
      engine.ts                # layout(scene, ctx) -> laid-out scene (deterministic)
      strategies.ts            # absolute, horizontal, vertical, center (MVP)
      geometry.ts              # Point, Size, Rect helpers, bounding-box math
    render/
      types.ts                 # svgNode tree
      svg.ts                   # svgFrom(scene) -> Svg + a11y tree + event wiring map
    validation/
      semantic.ts              # L2 visual validator (references, roles, kinds)
      layout.ts                # L3 visual validator (bounds, overlap, overflow)
      accessibility.ts         # L4 visual validator (labels, roles, no color-only)
    components/
      registry.ts              # component registry
      types.ts                 # VisualComponent<TProps>
      number-line.ts           # slice component (T2+)
      counting-set.ts
      fraction-bar.ts
      fraction-circle.ts
      clock.ts
      coordinate-grid.ts
      geometry-shape.ts
      comparison.ts
    engine.ts                  # VisualEngine implements core Engine (validate/instantiate)
  test/                        # Vitest (unit + integration)
    schema.test.ts
    scene.test.ts
    layout.test.ts
    render-svg.test.ts
    number-line.test.ts
    components.test.ts
    validation.test.ts
    schema-parity.test.ts
    instance.test.ts           # registered in core registry; end-to-end through dispatch
  e2e/
    number-line.spec.ts        # Playwright a11y + interaction + replay
  fixture/                     # golden fixtures (checked in)
    number-line/
      input.visual.json
      expected.svg
      expected.scene.json
      expected.a11y.json
      validation.json
```

`packages/visual-engine/package.json`:

```json
{
  "name": "@knowledgeassemble/visual-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@knowledgeassemble/interactive-engine": "0.1.0",
    "zod": "^3.23.0"
  },
  "scripts": {
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint src test",
    "test": "vitest run",
    "playwright": "playwright test"
  }
}
```

Register the workspace in `pnpm-workspace.yaml` (`packages/*` already covers it). Run `pnpm install` to link `@knowledgeassemble/interactive-engine` into `visual-engine`.

> **Dependency rule.** `visual-engine` may import from `interactive-engine`'s public surface (`src/index.ts`) **only**. Do not deep-import its internals. Verify with a lint/code-review boundary check (no `interactive-engine/src/...` specifiers).

---

## 2. The Visual specification contract (author this first)

The envelope (`interactive-engine.schema.json`) already enforces `type`/`version`/`id`/`purpose`/`interaction`/`questions`/`accessibility`. The **Visual** contract lives under `content` and is the new schema. Author `schemas/visual-spec.schema.json` per `visual/SPEC.md` §4–§79, migrated to the shared envelope (D1 — no `schemaVersion`, no `type: "number-line"` at the top).

**`content` shape (target):**

```jsonc
{
  "kind": "number-line",        // closed enum; see §3
  "canvas": {                    // optional, semantic intent only
    "aspectRatio": "16:10",
    "background": "surface.primary"   // token, not raw color
  },
  "theme": { "name": "openedu-calm", "mode": "light" },  // consumed via host tokens
  "data": { /* semantic data keyed to kind */ },
  "elements": [ /* explicit semantic elements (SPEC §17) */ ],
  "components": [ /* component instances (SPEC §32-34) */ ],
  "relationships": [ /* labels/points-to/compares-with (SPEC §35-36) */ ],
  "range": { "min": 0, "max": 10, "step": 1 },   // number-line convenience
  "highlight": [7],
  "selectable": ["highlight", "range"]
}
```

Rules to encode in the schema:
- `content.kind` is a closed enum (see §3 list). Unknown kind → `INVALID_ENTITY` at L2 (schema only constrains it to a known set optional; semantic layer decides compatibility).
- `content.elements[]` and `content.components[]` each have unique, id-pattern-validated `id`s (reuse `IDSchema` rules: `^[a-zA-Z][a-zA-Z0-9._-]*$`, ≤128).
- `relationships[]` reference existing element/component ids (`source`/`target`); broken refs are L2 `INVALID_REFERENCE`.
- Per-entity interaction uses D5 action names only, via `interactive?: boolean` + `acceptsActions: ActionType[]` (SPEC §37/§40). `acceptsActions` values are a subset of the D5 enum.
- Style tokens only: `style.fill/stroke` reference host tokens (`accent.primary`, `text.primary`, …); raw colors are rejected by default at L4, allowed raw color must be flagged. No `makeItPretty`/`svgMagic`/`drawNicely` (SPEC §79).
- `additionalProperties:false` at `content` and every nested object.
- `accessibility` at envelope level (label required) plus per-entity `accessibility` (SPEC §42-47).
- No numeric `x`/`y`/`width` at the spec surface for layout-able content (SPEC §30, §60). Explicit `geometry` allowed only for `kind`-independent absolute placement and validated as such.

Because the P1 core already implements L1 on the envelope, the Visual engine reuses `runPipeline`, providing the `L2 semantic`, `L3 layout`, `L4 accessibility` hooks itself.

---

## 3. Closed component set (D9) — the schema's `kind` enum

Map `content.kind` to the closed set (PROJECT §8, COMPONENTS §23-30 + §36). **This is the normative list; nothing else is a Visual kind.**

| `content.kind` | Component (`math.*`/`general.*`) | Required props (examples) |
|---|---|---|
| `number-line` | `math.number-line` | `min`, `max`, `step`, optional `majorStep`, `showLabels`, `points[]`, `highlight[]`, `rangeHighlight[]`, `direction` |
| `counting-set` | `math.counting-set` | `count`, `object` (semantic: circle/square/star/…), `arrangement`, optional `rows`/`columns`/`highlight`/`labels` |
| `fraction` | `math.fraction-bar` | `numerator`, `denominator`, optional `orientation`, `showFraction`, `highlightedParts[]` |
| `fraction-comparison` | (recipe over `fraction-bar`) | two fraction bars + `compares-with` relationship |
| `clock` | (math clock) | `hour`, `minute`, optional `showNumbers` |
| `coordinate-grid` | `math.coordinate-grid` | `x.{min,max,step}`, `y.{min,max,step}`, optional `points[]`/`lines[]`/`axes` |
| `geometry` | `math.geometry-shape` | `shape` (triangle/square/circle/…), plus semantic props (`radius`, `vertices`, `sides`) |
| `comparison` | `general.comparison` | `items[]` with `id`/`label`/`value`, `comparison` (`greater-than`/…) |

Schema validation (L1): the exact prop set per component is validated by the component's own prop schema (COMPONENTS §10, §34). The engine passes the raw `props` through; each component validates and normalizes its own props, throwing `INVALID_SPEC` / `INVALID_ENTITY` on violation (e.g. `min >= max`, `denominator <= 0`, `numerator > denominator` for proper fractions, `step <= 0`).

**Constraint checkpoints when authoring any kind:**
- `number-line`: `max > min`, `step > 0`, `majorStep > 0`, `majorStep` divides range evenly.
- `fraction-*`: `denominator > 0`, `0 <= numerator <= denominator` (unless explicit `allowImproper:true`).
- `coordinate-grid`: per-axis `max > min`, `step > 0`.
- `counting-set`: `count` is a positive integer; `object` from the semantic enum.
- `geometry`: `shape` from the closed shape enum; `vertices >= 3` for polygons.

---

## 4. Task list (implement in this order; commit after each)

### T1 — Visual-engine scaffold + schema parity
- Create the package tree (§1.2), `package.json`, `tsconfig.json`, `vitest.config.ts`, empty `src/index.ts`.
- Add the visual-engine workspace entry; `pnpm install`.
- Author `schemas/visual-spec.schema.json` (§2, §3) with `additionalProperties:false` and the closed `kind` enum.
- **Parity guardrail:** `test/schema-parity.test.ts` asserts: `content.kind.enum` (sorted) equals the TypeScript `VISUAL_KINDS` const; `content.kind` required; `additionalProperties === false` on `content` and `content.items`/`content.components`/`relationships`; style tokens pattern `^[a-z]+\.[a-z]+$`; no `makeItPretty|svgMagic|drawNicely` anywhere in the schema text.
- **Done when:** `pnpm --filter @knowledgeassemble/visual-engine typecheck` passes with `.js` specifier discipline; schema-parity test green; a minimal DESIGN §4 envelope + `content.kind:"number-line"` parses, and `content.kind:"timeline"` / an unknown key on `content` fails.

### T2 — Scene model + number-line component (slice core)
Files: `scene/types.ts`, `scene/build.ts`, `components/types.ts`, `components/registry.ts`, `components/number-line.ts`.

- `scene/types.ts`:

```ts
export type SemanticRole =
  | 'visual' | 'group' | 'label' | 'diagram' | 'diagram-part'
  | 'number' | 'number-line' | 'tick' | 'axis' | 'marker'
  | 'counting-object' | 'fraction' | 'fraction-part'
  | 'shape' | 'option' | 'answer' | 'drop-target'
  | 'selectable' | 'draggable' | 'hotspot';

export interface Bounds { x: number; y: number; width: number; height: number; }

export interface SceneNode {
  id: string;
  role: SemanticRole;
  kind: string;                 // 'line' | 'circle' | 'rect' | 'text' | 'group' | 'tick' | ...
  value?: number;
  label?: string;               // resolved text (via host.locale if key-based)
  bounds?: Bounds;              // set after layout; undefined before
  geometry?: Record<string, unknown>;  // renderer-neutral geometry (center/radius, endpoints)
  acceptsActions?: ActionType[];
  interactive?: boolean;
  annotationId?: string;
  metadata?: Record<string, unknown>;
  children: SceneNode[];
}
export interface Scene { nodes: SceneNode[]; semantics: Record<string, SceneNode>; }
```

- `scene/build.ts` — `buildScene(spec): Scene`. Expands `content.kind` + `content.components` through the registry into a scene tree with **deterministic** ids (`<parentId>-axis`, `<parentId>-tick-0`, `<parentId>-label-0`, … per SPEC §64-65). Resolves `relationships` into scene metadata. Asserts no duplicate ids (`INVALID_ENTITY`).
- `components/registry.ts` — map `kind → VisualComponent`. `register`, `get(kind)`, `list()`.
- `components/types.ts` — `VisualComponent<TProps> { kind; propSchema (Zod); create(props): SceneNode | SceneNode[] }` returning semantic child nodes (no SVG yet).
- `components/number-line.ts` — **the slice.** Given `{min,max,step,majorStep,showLabels,points,highlight,direction}`, produce a scene: an `axis` node, one `tick-<n>` + `label-<n>` pair per integer in range, `marker` nodes for `highlight[]`/`points[]`. Highlighted markers get `role:'selectable'`, `interactive:true`, `acceptsActions:['select','focus']`. IDs: `number-line-axis`, `number-line-tick-0`, `number-line-label-7`, `number-line-marker-7`.

**Done when:** `buildScene` from the DESIGN §4 number-line fixture yields a scene with `(max-min)/step + 1` ticks, deterministic ids, a selectable marker at each highlighted value; a spec with `min >= max` raises `INVALID_ENTITY` (component prop validation); duplicate ids raise `INVALID_ENTITY`.

### T3 — Deterministic layout engine
Files: `layout/types.ts`, `layout/geometry.ts`, `layout/strategies.ts`, `layout/engine.ts`.

- `layout/engine.ts` — `layout(scene, ctx): Scene`. Walks nodes depth-first; assigns `bounds` to every node. Pure function: identical input → identical bounds (P4). No randomness.
- `layout/geometry.ts` — Rect/Point math, `union(bounds[])`, `contained(bounds, rect)`, `overlaps(a, b)`, `translate`. Renderer-neutral.
- `layout/strategies.ts` — MVP:
  - `absolute` — honor explicit `geometry` only (assert author-provided; else `INVALID_STATE`).
  - `horizontal` — distribute children along x with `gap`; align centers; reverse for `direction:'vertical'`.
  - `center` — recenter children as a group.
  - `radial` — used by `clock` and `fraction-circle` (angle math, not needed for T3; stub returns conservative bounds until T7).
- **Number-line layout:** given a canvas width region, map `min..max` linearly to x; ticks at each step x; labels centered above/below; markers at their value's x, sized ≥ `ctx.minimumTouchTarget` when interactive (SPEC §51, §16).
- Layout context is derived from host: define `LayoutContext { width, height, minTouchTarget, textStyle }` sourced from `EngineHost.tokens` in `engine.ts` (T6).

**Done when:** `layout(scene, ctx)` on the number-line scene produces monotonic, gap-correct tick x-positions; identical calls yield identical bounds (determinism test); `overlaps`/`contained` unit tests pass; a required-constraint violation (e.g. marker out of canvas when `keepLabelsInsideCanvas` flag set) surfaces a layout `INVALID_STATE` issue for L3.

### T4 — SVG renderer + accessibility + event-wiring map
Files: `render/types.ts`, `render/svg.ts`.

- `render/svg.ts` — `svgFrom(scene, ctx): { svg: string; a11y: A11yNode[]; interactive: Array<{ id; action; }> }`.
  - Emit **semantic SVG**: `<svg>` with `<title>`/`<desc>` from envelope `accessibility`; a `<g id="visual-root">`; each scene node → a `<g>`/primitive with `id`, `data-oedu-role`, `data-oedu-value` (ARCHITECTURE §19-20). Groups map 1:1 to scene groups.
  - **Security (SPEC §75):** the renderer MUST NOT emit `<script>`, `on*` attributes, `javascript:` URIs, or raw `style` runtime injection. All attrs are whitelisted.
  - **Deterministic:** attribute order fixed; no timestamps; stable id order (walk scene order).
  - **a11y tree:** reuse `A11yNode` from `interactive-engine`; derive a node per interactive scene node with `role` (mapped from `SemanticRole`) and `label` (from node label or resolved locale string). Never empty label (fall back to `id`).
  - **event wiring map:** for each interactive node, map `acceptsActions` → the D5 action a renderer may dispatch on activation (e.g. `select`). This is *exposed for the host/conformance app to dispatch*, not embedded in the SVG.
- `render/types.ts` — the intermediate SVG node tree (tag, attrs, children) plus `data-oedu-*` metadata.

**Done when:** a golden `expected.svg` snapshot for the number-line fixture is generated and stable across two runs (determinism); output contains no `onclick`/`<script>`; the a11y tree has a labeled, `role:"button"`-or-equivalent node for the highlighted marker; `interactive` map lists `select` for marker `number-line-marker-7`.

### T5 — Visual validator (L2/L3/L4 hooks into core `runPipeline`)
Files: `validation/semantic.ts`, `validation/layout.ts`, `validation/accessibility.ts`.

- **L2 `semantic`** — references resolve (`relationships` source/target exist → else `INVALID_REFERENCE`); `content.kind` in closed set → else `INVALID_ENTITY`; component props valid → `INVALID_SPEC`/`INVALID_ENTITY`; `acceptsActions` ⊆ D5 enum → else `INVALID_ACTION`; `purpose` present when interactive.
- **L3 `layout`** — after `layout(scene)`, check: all bounds inside canvas (respect `keepLabelsInsideCanvas`); no required-region overlap (respect `avoidOverlap`) → `INVALID_STATE`; interactive targets ≥ `minimumTouchTarget` → `ACCESSIBILITY_ERROR` only if a required constraint, else warning.
- **L4 `accessibility`** — every interactive node has a label; no meaning conveyed by color alone (flag elements with a `style` but no `label`/`role` distinction); envelope `accessibility.label` present; reading order derivable.
- Hooks return `ValidationResult` and plug into `runPipeline(spec, { semantic, layout, accessibility })` from the core.

**Done when:** end-to-end validation of the number-line fixture returns `valid: true, issues: []`; a broken `relationships` ref returns `INVALID_REFERENCE` at L2; a color-only marker (`style` without label) fails L4 with `ACCESSIBILITY_ERROR`; a marker placed outside the canvas fails L3 with `INVALID_STATE`. (Test-first: write the negative tests before the validator passes them.)

### T6 — Visual engine facade + registry integration
File: `engine.ts`, and a unit test registering it in the core `EngineRegistry`.

- `engine.ts` implements the core `Engine` interface (from `interactive-engine`):
  - `type: 'visual'`
  - `validate(spec)` — `runPipeline(spec, { semantic, layout, accessibility })` (§T5).
  - `instantiate(spec, host, id?)` — validate (throw `INVALID_SPEC` on failure), then build/layout/render via the T2–T4 pipeline, wrap a base scene + reducer into an `EngineInstance` whose `dispatch` still uses the shared D5 reducer and emits namespaced events (`visual.<entity>-selected`, `visual.<entity>-focused` on `select`/`focus`) per SPEC §82.
- The instance's `snapshot()` should expose `EngineState` **plus** a `scene`/`bounds` read-only view so downstream can render SVG. Keep it deterministically derived.
- Wire `EngineHost.tokens` → `LayoutContext` and `EngineHost.locale` → text resolution (label `key` vs `value` per SPEC §50).

**Done when:** a test registers `VisualEngine` into `EngineRegistry`, `registry.get('visual')` returns it, `validate(nlSpec)` is valid, and `instantiate` → `dispatch(select marker-7)` → `snapshot().selection` contains `marker-7`; event names are namespaced (`visual...-selected`) and the reducer still emits lifecycle events; a spec with an unknown `content.kind` fails `validate`.

### T7 — Remaining components (closed set)
Files under `components/`: `counting-set.ts`, `fraction-bar.ts`, `fraction-circle.ts`, `clock.ts`, `coordinate-grid.ts`, `geometry-shape.ts`, `comparison.ts`.

Each component: add `kind` to the registry, its prop schema, and its `create()` producing a semantic scene (ticks, partitions, hands, gridlines, points, sides). Deterministic ids, semantic roles, accessibility labels on interactive parts. Stub the agreed scene shapes:
- `counting-set` — grid of `counting-object` nodes (rows×columns from `count`), `role:'counting-object'`.
- `fraction-bar` — `fraction-bar` group + `denominator` `fraction-part` children + label; `highlightedParts[]` become `selectable`.
- `fraction-circle` — radial partitions using `radial` layout (needs T3 `radial`).
- `clock` — face group + `hour-hand`/`minute-hand` (angle from hour/minute), `role:'marker'`.
- `coordinate-grid` — `axis` x/y, `gridline` nodes, `point`/`marker` children.
- `geometry-shape` — a `shape` node with semantic props (sides/vertices/radius), `role:'shape'`.
- `comparison` — two child components + a `compares-with` relationship, rendered as side-by-side (horizontal layout), each item `selectable` when `interactive`.

Add **one golden fixture per component** won't be complete at T7; instead each needs: a unit test (schema + scene + a smoke render) and at least a semantic scene snapshot. Full golden fixtures for number-line are mandatory (T4); others MAY share the `expected.scene.json` form if render output is claimable. Do not claim a component "done" until its test fails-first then passes.

**Done when:** every kind in §3 has a passing scene test + a passing schema test; every invalid-prop case raises a shared error code.

### T8 — Conformance app + browser e2e
Extend/reuse `apps/conformance`:
- Add a `visual` tab: import `VisualEngine` from `@knowledgeassemble/visual-engine`, register it, load the number-line fixture, render `svgFrom(...)` into the DOM (as safe SVG textContent), and expose `window.__harness = { dispatch, snapshot, events, svg }` (mirroring P1 shape §main.ts).
- `e2e/number-line.spec.ts` (Playwright):
  1. **a11y** — the rendered SVG has a `<title>`, a `desc`, and the highlighted marker has a non-empty `aria-label`/text; no element conveys meaning by color alone (check for `data-oedu-role` on interactive nodes).
  2. **interaction** — pointer/keyboard activation on `number-line-marker-7` dispatches `select`; snapshot selection contains it; a `visual.number-line-marker-7-selected` event is recorded.
  3. **replay** — emitted events replay in `seq` order by the core `EventLog`.
  4. **L1/L2 rejection** — a spec with unknown `content` key / unknown `kind` fails `tryCreate`.

**Done when:** all four specs pass in a real browser against the installed `visual-engine` + `interactive-engine`.

### T9 — Golden fixtures + exit-gate clean
- Ensure `fixture/number-line/{input.visual.json, expected.svg, expected.scene.json, expected.a11y.json, validation.json}` are checked in and asserted by `test/` snapshot tests (deterministic — re-running `pnpm -w test` does not mutate them).
- Add the agent skill `docs/engines/visual/skills/educational-visual/SKILL.md` (or sibling under `docs/` matching repo skill location) teaching: when to use Visual, reuse over regenerate, choose a component, write a valid spec, add semantic ids, D5 interaction, accessibility, validate. (The exact on-disk home should match whatever `PLAN.md`/skills convention the repo adopts; check and follow it.)
- Update `docs/PLAN.md`: flip P2 → DONE in the status board only when the full exit gate is green; add a change-log line.

**Done when:** full exit gate green (see §6).

---

## 5. Schema ↔ Zod parity guardrail (T1 must include)

Keep `visual-spec.schema.json` (canonical) and the runtime `zod` validators in sync; add `test/schema-parity.test.ts` that fails loudly if they drift:
- `content.kind.enum` (sorted) === `VISUAL_KINDS` (sorted).
- `content.kind` is required; `content.additionalProperties === false`.
- `relationships[].type` enum ⊆ {labels, points-to, contains, part-of, precedes, follows, compares-with, corresponds-to, belongs-to, associated-with}.
- Every component prop schema in `components/*` rejects an unknown prop and rejects `x`/`y`/`width` at the spec surface unless the component explicitly documents `absolute` controls.
- The emitted SVG contract: every interactive scene node appears in the a11y tree (parity between `render` map and `a11y`).

---

## 6. Exit gate (all green — run from repo root)

```text
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

Map to `docs/PLAN.md` §4 P2 exit criteria:

| # | PLAN criterion | Evidence |
|---|---|---|
| 1 | Number-line slice renders **accessible SVG from an AI-authored spec** (integration proof) | T4 golden `expected.svg` + a11y tree + T6 `instantiate` end-to-end (`spec → scene → layout → SVG`) for the plain AI-authored `input.visual.json` |
| 2 | Conformance **L1–L4 pass**; Playwright **a11y interaction test green** | `test/validation.test.ts` L1–L4 + `e2e/number-line.spec.ts` a11y + interaction + replay |
| 3 | `educational-visual/SKILL.md` lets an agent produce a validated `visual` spec without invalid fixtures | skill authored (T9); skill example round-trips through `validate` green; `fixture/number-line/validation.json` `valid:true` |

Additional self-checks per phase invariants (all MUST be checked, not just the three PLAN criteria):
- **No engine smuggling (D9):** `content.kind` never `timeline`/`label-diagram`/`flowchart`; no `components/*` for those. Grep `git diff` for `timeline|flowchart|label-diagram` in `visual-engine` src → only negative-test references.
- **No `@open-edu/*` or peer-engine imports** in `packages/visual-engine` (`grep -r "@open-edu\|geomap-engine\|chart-engine\|timeline-engine\|diagram-engine" packages/visual-engine` → empty).
- **Determinism:** `render-svg` determinism test (two runs byte-identical) green in CI even across workers (Playwright non-parallel here).
- **Shared error codes only:** `grep -rn "'[A-Z_]*ERROR'\|'INVALID_'" packages/visual-engine/src` yields only §67 codes.
- **No wall clock / randomness:** `grep -rn "Date.now\|Math.random\|performance.now" packages/visual-engine/src` → empty.
- **D6:** `packages/visual-engine/package.json` deps are only `interactive-engine` + `zod`; no store/i18n/studio/scoring modules.

---

## 7. Guardrails for the implementing agent (failure modes to avoid)

1. **Do not put React/DOM in `packages/visual-engine`.** SVG string generation is pure data. DOM lives only in `apps/conformance` / e2e.
2. **Do not import peer engines or OpenEdu** (D2/§6). Only `@knowledgeassemble/interactive-engine` public surface + `zod`.
3. **Do not build Timeline/Diagram/GeoMap behavior** (D9). A component named `timeline`, `label-diagram`, `flowchart`, `process-diagram`, `cycle`, `hierarchy`, `equation`, `measurement`, `angle` is a contract violation. Reject in review.
4. **Do not invent error codes.** Use the §67 set via `EngineError`. Bad spec → `INVALID_SPEC`; bad ref → `INVALID_REFERENCE`; bad kind/entity → `INVALID_ENTITY`; bad action → `INVALID_ACTION`/`UNSUPPORTED_ACTION`; layout infeasibility → `INVALID_STATE`; a11y gap → `ACCESSIBILITY_ERROR`.
5. **Do not emit unsafe SVG.** Whitelist attributes; never `on*`, `<script>`, `javascript:`. Security is non-negotiable (SPEC §75).
6. **Do not use wall-clock or randomness** anywhere in scene/layout/SVG (P4). Determinism is tested.
7. **Do not hand-edit the JSON Schema semantics** — author once, mirror in Zod, keep parity tests green (drift is a schema/spec bug).
8. **Keep `src/index.ts` the only public surface** of `visual-engine`; deep imports into `interactive-engine` internals are forbidden.
9. **Semantic-first discipline:** never emit `x`/`y`/`pixel` in specs to fake layout; layout is derived. Explicit geometry only where genuinely `absolute`-required. No LLM-pleaser props.
10. **Test-first:** every task T2–T7 starts with its failing test/fixture; a feature is "done" only when that test passes (P1 convention, DESIGN §11).
11. Write `.js` import specifiers everywhere (NodeNext + Bundler safe). Commit after each T1–T9 with a one-line message matching the repo style (e.g. `P2 T4: render number-line scene to accessible semantic SVG`).
12. Reuse the deterministic `EventLog`/reducer from the core — do not implement a second event system. Namespaced events follow `<engine>.<entity>-<result>` (SPEC §82).

---

## 8. Definition of Done (P2-specific)

P2 is complete when:
- `docs/PLAN.md` §4 P2 exit criteria 1–3 are green, verified by the §6 exit gate commands (not assertion).
- `packages/visual-engine` passes `typecheck`, `lint`, unit tests, and browser e2e.
- Number-line golden fixtures are checked in and stable.
- The Visual closed component set (§3) each has a scene/schema test and is registered.
- The skill exists and its canonical example round-trips validation.
- `docs/PLAN.md` marks P2 **DONE** and logs the change.

Do **not** start P2.5 until the §6 gate is green.
