# Interactive Engine Next-Phase Implementation Plan

**Date:** 2026-09-13
**Spec source:** `docs/_archive/review-mandates/Agent-Prompt-Spec.md` (architecture review + next-phase planning)
**Authority:** `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → `docs/PLAN-P8.md` (Workstreams A–E)
**Audience:** AI coding agents, maintainers, engine implementers
**Branch:** `feat/p8-slice-honesty-completion` from `main`

---

## 0. Status snapshot (verified 2026-09-13 on main)

| Claim | Reality |
|-------|---------|
| PLAN-P8 Workstream A: "A1 — Diagram edges render as empty `<g>`" | **DONE.** `packages/diagram-engine/src/render/svg.ts:28–44` renders `<path d="..." marker-end="url(#arrowhead)" ...>` with `data-oedu-relationship`. `layout/engine.ts:132` produces `edgeGeometry`. All 5 diagram fixtures have `expected.{svg,scene,a11y,alternative}.json`. e2e asserts edge primitives and `follow` action. |
| PLAN-P8 Workstream A: "A2 — Visual D9 kinds hollow layout, only number-line has strategy" | **DONE.** `packages/visual-engine/src/layout/engine.ts` has dedicated strategies for all 7 D9 kinds + `illustration`. 14 fixture dirs exist with golden SVGs. |
| PLAN-P8 Workstream A: "A3 — Audit honesty: chart/timeline hollow render" | **DONE (2026-09-13, gate green on `feat/architecture-review-docs` via N1).** Chart (`bar`, `line`) and Timeline (`events`, `independence`, `periods`, `tracks`) carry `expected.{scene,svg,a11y}.json` asserted byte-stable in each engine's `fixture.test.ts`; timeline fixtures gained `validation.json` parity. Goldens document chart `kind: line` as **discrete point markers only** — no connecting series stroke (tracked in N1.8). |
| PLAN-P8 Workstream A: "A4 — Test bar: non-stub render tests" | **DONE (2026-09-13, gate green on `feat/architecture-review-docs` via N1).** `render.test.ts` added in chart (bar `<rect>` bars + labeled axes; line point markers, non-hollow) and timeline (period `<rect>` bands; event markers; labeled track lanes; non-overlapping lanes). dev-harness honesty audit (125 tests) passes. |
| PLAN-P8 non-goal: "No D3/d3-geo until Workstream A green" | **VIOLATED.** `packages/geomap-engine/package.json` has production dependency `d3-geo: ^3.1.1` + `@types/d3-geo`. Used in `layout/projection.ts` (geoEquirectangular/geoMercator/geoAlbers), `scene/build.ts` (geoCentroid/geoArea), `scene/derive.ts` (geoDistance). All pure-math transforms, no DOM/spec-surface use — accepted exception (see ADR-10). |
| DESIGN.md §3: "Chart JSON Schema missing (TODO)" | **Stale.** `packages/chart-engine/src/schemas/chart-spec.schema.json` exists and is authoritative. Not mirrored to `docs/schemas/` — canonical location gap. |
| docs/engines/visual/VISION.md | **Does not exist.** DESIGN §3 says "—" for Visual VISION maturity — correct. Visual SPEC.md (3115 lines) is the de facto vision+spec combined. |

---

## 1. This plan maps to PLAN-P8 as follows

```
PLAN-P8 Workstream A (slice honesty)
  A1 — Diagram edges .............. DONE (main)
  A2 — Visual D9 kinds ............ DONE (main)
  A3 — Honesty audit .............. THIS PLAN N0–N2
  A4 — Test bar ................... THIS PLAN N0–N2
  ──── A-green gate ──────────────────────────────
PLAN-P8 Workstream C (publish)
  C1 — npm publish ................ THIS PLAN N6
PLAN-P8 Workstream B (OpenEdu proof)
  B1–B7 ........................... TRACKED via docs/p7-acceptance.md; no in-repo implementation
PLAN-P8 Workstream D (next slices)
  .................................. GATED on A-green; NOT in this plan
PLAN-P8 Workstream E (CLI)
  .................................. DEFERRED; NOT in this plan
```

---

## 2. Phases and dependency graph

```
N0 — Architecture/contract cleanup (doc updates, ADRs, schema parity)
 │
 ├─► N1 — Chart/Timeline golden fixtures + render tests (A3/A4 completion)
 │       │
 │       └─► N2 — Core runtime hardening (shared instance factory, event shape parity)
 │                │
 │                └─► N3 — Validation/accessibility infrastructure
 │                         │
 │                         └─► N4 — Engine-agnostic conformance suite
 │                                  │
 │                                  └─► N5 — Composition hardening (stretch)
 │                                           │
 │                                           └─► N6 — Release verification
 │
 └─► A-green gate (for PLAN-P8 Workstreams D/E)
```

---

## 3. N0 — Architecture/contract cleanup

**Goal:** Resolve all doc-vs-code contradictions found in this review. Record new ADRs. No engine code changes.

**Exit gate:** `pnpm typecheck && pnpm lint` green (doc-only).

---

### N0.1 — Fix SYSTEM-ARCHITECTURE.md event shape

**Goal:** Correct §3.4 event shape from `state?` to `data?` to match actual code.

**Why:** `packages/interactive-engine/src/runtime/event-log.ts` records `{ id, seq, name, instanceId, action?, data? }`. SYSTEM-ARCHITECTURE line 113 says `state?` — incorrect.

**Affected files:**
- `docs/SYSTEM-ARCHITECTURE.md` (line 113)

**Contract impact:** None (documentation only).

**Requirements:**
- Change "Events carry `{ seq, name, instanceId, action?, state? }`" → "Events carry `{ id, seq, name, instanceId, action?, data? }`"
- Add note that `data?` carries engine-specific payloads (composition events use `event.data` for routing).

**Tests required:** None (doc-only).

**Acceptance criteria:**
- [ ] `docs/SYSTEM-ARCHITECTURE.md` §3.4 matches actual `LogEntry` shape in `runtime/event-log.ts`
- [ ] `pnpm typecheck && pnpm lint` green

**Non-goals:** Changing the event type itself.

---

### N0.2 — Update PLAN-P8.md Workstream A status

**Goal:** Reflect A1/A2 DONE, identify A3/A4 remaining work (chart/timeline goldens), record d3-geo exception.

**Why:** PLAN-P8 §3 claims diagram edges are "empty `<g>`" and visual has no layout strategies — both stale. The d3-geo non-goal is contradicted by geomap production dependency.

**Affected files:**
- `docs/PLAN-P8.md`

**Requirements:**
- Add status note: A1 DONE (diagram edges with geometry, arrowheads, e2e), A2 DONE (visual D9 strategies + 14 fixtures with goldens)
- A3 remaining: chart (2 fixtures, no scene/svg/a11y goldens), timeline (4 fixtures, no scene/svg/a11y goldens)
- A4 remaining: chart/timeline need render tests asserting visible SVG primitives (not just validation parity)
- §0 non-goal: append note — "geomap-engine uses d3-geo as a deterministic-math exception (ADR-10); no other D3 adoption"

**Contract impact:** None (documentation only).

**Tests required:** None.

**Acceptance criteria:**
- [ ] PLAN-P8 accurately reflects current main state
- [ ] d3-geo exception documented with ADR reference
- [ ] A3/A4 remaining work is explicit

**Non-goals:** Implementing the golden fixtures (that's N1).

---

### N0.3 — Record ADR-10: Deterministic geo-math exception

**Goal:** Record the accepted exception for d3-geo usage in geomap-engine.

**Why:** PLAN-P8 §0 bans "D3/d3-geo/ELK until Workstream A green" but geomap already uses d3-geo for pure deterministic math (no randomness, no DOM, no spec-surface coupling). The dependency is real, shipped, and architecturally sound — it should be documented, not ignored.

**Affected files:**
- `docs/adr/ADR-10.md` (new)

**Contract impact:** None (decision record only).

**Requirements:**
- Status: Accepted
- Supersedes: PLAN-P8 §0 "no d3" non-goal (partial)
- Context: geomap needs spherical centroid/area/distance math and projection constructors for geographic content. d3-geo provides deterministic spherical math. No alternatives as compact.
- Decision: d3-geo is an accepted exception for `layout/projection.ts` + `scene/` pure-math call sites; there is **no** `src/geo.ts` facade — isolation is *semantic* (pure math only), never a module boundary. No d3-scale, d3-time, d3 DOM, or ELK. Exception applies only to geomap-engine. Reviewed at A-green.
- Consequences: documentation debt resolved; geomap package has production dep; other engines remain d3-free.

**Tests required:** None.

**Acceptance criteria:**
- [ ] `docs/adr/ADR-10.md` follows ADR-01..09 format (Status, Supersedes, Context, Decision, Consequences)
- [ ] Referenced in PLAN-P8 §0 update

---

### N0.4 — Mirror chart-spec.schema.json to docs/schemas

**Goal:** Ensure the canonical `docs/schemas/` directory contains all engine JSON Schemas.

**Why:** `docs/schemas/` has `diagram-spec.schema.json`, `geomap-spec.schema.json`, `timeline-spec.schema.json` — but NOT `chart-spec.schema.json`. `packages/chart-engine/src/schemas/chart-spec.schema.json` is the authoritative source but the canonical docs location is missing.

**Affected files:**
- `docs/schemas/chart-spec.schema.json` (new, mirror of package source)

**Contract impact:** None (doc-mirror only; package source stays authoritative).

**Requirements:**
- Copy `packages/chart-engine/src/schemas/chart-spec.schema.json` → `docs/schemas/chart-spec.schema.json`
- Update any parity test that references this path if applicable

**Tests required:**
- Add to `scripts/check-engine-skills-fresh.mjs` or equivalent freshness guard that `docs/schemas/chart-spec.schema.json` matches `packages/chart-engine/src/schemas/chart-spec.schema.json`

**Acceptance criteria:**
- [ ] `docs/schemas/chart-spec.schema.json` exists and matches package source
- [ ] `pnpm typecheck && pnpm lint` green

**Non-goals:** Changing the chart schema content.

---

### N0.5 — Fix AGENTS.md composition status

**Goal:** Correct stale claim that composition is a "(placeholder)".

**Why:** `docs/AGENTS.md` repo layout says `composition/ (placeholder)` under `packages/interactive-engine/`. But `src/composition/` has real, functional `schema.ts`, `lesson.ts`, `router.ts` — with Zod validation, `Lesson.load`, `Lesson.start`, `Router.match`, and the P7 conformance test proves it works end-to-end.

**Affected files:**
- `docs/AGENTS.md`

**Requirements:**
- Change `composition/ (placeholder)` → `composition/ (lesson, router, schema — implemented P2.5/P7)`

**Contract impact:** None (documentation only).

**Tests required:** None.

**Acceptance criteria:**
- [ ] AGENTS.md accurately reflects composition implementation status

---

### N0.6 — Document createPlatformInstance divergence

**Goal:** Add a note in SYSTEM-ARCHITECTURE.md acknowledging engines diverge from `createPlatformInstance`.

**Why:** SYSTEM-ARCHITECTURE §3 says `createPlatformInstance` is "the canonical implementation" and "engines may build a richer instance." This is accurate. But no engine uses it — all five reimplement the same event-loop boilerplate (EventLog/listeners/dispatch/emit/teardown/announce). This is documented divergence, not a bug — but it's the most significant shared-mechanics duplication in the codebase and should be called out for future consideration.

**Affected files:**
- `docs/SYSTEM-ARCHITECTURE.md` (§3 or §3.3, add a "Note" paragraph)

**Requirements:**
- Add note: "Currently, all five engines implement their own instance lifecycle rather than using `createPlatformInstance`. This is an accepted divergence (engines need per-engine hook points like namespaced event emission). Consideration of a shared `createEngineInstance` factory with per-engine hooks is deferred to a future phase."
- No code changes.

**Contract impact:** None.

**Tests required:** None.

**Acceptance criteria:**
- [ ] SYSTEM-ARCHITECTURE §3 acknowledges the divergence explicitly

---

## 4. N1 — Chart/Timeline golden fixtures + render tests (A3/A4 completion)

**Goal:** Close the fixture maturity gap. Every engine fixture has `expected.{scene,svg,a11y}.json` goldens and render tests asserting visible SVG primitives.

**Exit gate:** `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright` green. Chart/timeline fixtures have full golden sets. No hollow SVG.

**Why:** P8 A3/A4 requires "every catalog fixture shows the slice the SPEC names" with tests. Chart and timeline are the only engines lacking golden SVGs — they have real layout + rendering but no golden assertions.

---

### N1.1 — Chart bar fixture golden set

**Goal:** Generate `expected.{scene,svg,a11y}.json` for `packages/chart-engine/fixture/bar`.

**Why:** Chart bar has `input.chart.json` + `validation.json` only. No golden assertions for visible SVG output.

**Affected files:**
- `packages/chart-engine/fixture/bar/expected.scene.json` (new)
- `packages/chart-engine/fixture/bar/expected.svg` (new)
- `packages/chart-engine/fixture/bar/expected.a11y.json` (new)

**Dependencies:** N0 complete.

**Requirements:**
- Run chart engine's `instantiate()` on the bar fixture spec to produce `expected.scene.json`
- Capture SVG output to `expected.svg`
- Extract a11y tree to `expected.a11y.json`
- Assert the SVG contains actual `<rect>` bars (not empty `<g>`) and `<text>` labels

**Tests required:**
- Extend `packages/chart-engine/test/fixture.test.ts` to assert:
  - `expected.scene.json` byte-match (like visual/diagram fixtures do)
  - SVG contains at least one `<rect>` (bars visible)
  - SVG axis/bar `<text>` elements carry `aria-label`; `expected.a11y.json` exposes the selectable bars as labeled buttons

**Fixture required:** `expected.{scene,svg,a11y}.json` for `bar`

**Acceptance criteria:**
- [ ] `bar` has all 3 golden files
- [ ] `fixture.test.ts` asserts byte-stability of scene + presence of SVG bar primitives
- [ ] SVG is not hollow (bars are `<rect>`, not empty `<g>`)

**Non-goals:** Changing the chart spec or layout algorithms.

---

### N1.2 — Chart line fixture golden set

**Goal:** Same as N1.1 for `packages/chart-engine/fixture/line`.

**Affected files:**
- `packages/chart-engine/fixture/line/expected.{scene,svg,a11y}.json` (new)

**Requirements:**
- Assert SVG contains `<circle>` for every data point plus `<text>` axis labels with `aria-label`
- Verified (2026-09-13): as of N1 the chart line kind emits **discrete point markers only** — `packages/chart-engine/src/` contains no `<polyline>`/`<path>` series-stroke code. The original plan text ("assert `<polyline>`/`<path>` for data series") was unfulfillable without a layout change, which N1's non-goals exclude; it is tracked in N1.8 instead of being silently dropped.

**Tests required:**
- Extend `fixture.test.ts` to assert golden byte-stability + SVG primitive presence

**Acceptance criteria:**
- [ ] `line` has full golden set
- [ ] Render tests assert visible point markers + labeled axes (no series-stroke claim)
- [ ] Marker-only line representation is tracked as a follow-on

---

### N1.3 — Timeline events fixture golden set

**Goal:** Generate `expected.{scene,svg,a11y}.json` for `packages/timeline-engine/fixture/events`.

**Why:** Timeline has 4 fixtures but no golden assertions for visible SVG.

**Affected files:**
- `packages/timeline-engine/fixture/events/expected.{scene,svg,a11y}.json` (new)

**Dependencies:** N0 complete.

**Requirements:**
- Assert SVG contains `<circle>` event markers inside a `<rect>` track lane, plus `<text>` labels (the events fixture is events-only; period bands are asserted in N1.4)
- a11y tree has labeled events

**Tests required:**
- Extend `packages/timeline-engine/test/fixture.test.ts` to assert golden byte-stability + SVG primitive presence

**Acceptance criteria:**
- [ ] `events` has full golden set
- [ ] Render tests pass

---

### N1.4 — Timeline periods fixture golden set

**Goal:** Same as N1.3 for `packages/timeline-engine/fixture/periods`.

**Affected files:**
- `packages/timeline-engine/fixture/periods/expected.{scene,svg,a11y}.json` (new)

**Requirements:**
- Assert SVG contains `<rect>` bars for period durations

---

### N1.5 — Timeline tracks fixture golden set

**Goal:** Same for `packages/timeline-engine/fixture/tracks`.

**Requirements:**
- Assert SVG has `data-oedu-role="label"` track label text with `aria-label`, `data-oedu-role="track-lane"` rects, and `<circle>` event markers inside lanes

---

### N1.6 — Timeline independence fixture golden set

**Goal:** Same for `packages/timeline-engine/fixture/independence`.

**Requirements:**
- Assert SVG has multiple `data-oedu-role="track-lane"` rects whose y-ranges do not overlap, with event/period markers positioned inside lanes

---

### N1.7 — Chart/Timeline render assertion tests

**Goal:** Add Vitest tests in each engine that assert the rendered SVG contains specific expected primitives.

**Why:** Golden byte-stability alone doesn't prove "no hollow SVG" — we need semantic assertions that the SPEC-claimed elements are visible.

**Affected files:**
- `packages/chart-engine/test/render.test.ts` (new)
- `packages/timeline-engine/test/render.test.ts` (new)

**Requirements:**
- Chart render test: instantiate from bar fixture → assert `svgResult.svg` contains at least one `<rect>` and one `<text>` with `data-oedu-role`
- Timeline render test: instantiate from events fixture → assert `svgResult.svg` contains at least one `<rect>` or `<circle>` and track `<text>` labels
- Both tests should fail on a stub/hollow renderer and pass on the real one (test-first principle)

**Acceptance criteria:**
- [ ] Both render test files exist and pass
- [ ] Tests would fail if the engine returned empty `<g>` wrappers

### N1.8 — Post-N1 follow-ons (tracked, out of N1 scope)

N1's exit gate is green — `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs` — on `feat/architecture-review-docs`. The honesty work surfaced these items; they stay in N1's non-goal (no chart spec/layout changes):

- **Chart `kind: line` renders discrete point markers only.** `packages/chart-engine/src/` has no connecting `<polyline>`/`<path>` series-stroke code, and the goldens/tests assert none. Decide in a chart SPEC slice (Workstream D/E) whether line should draw a series stroke; update `expected.svg` + N1.2 wording when it does.
- **A11y-tree scope:** `svgResult.a11y` surfaces interactive entities (selectable → `button` role); axis/tick labels are `aria-label` on SVG elements, not a11y-tree nodes. Promoting axis labels into the tree would be a snapshot contract change (recorded, not implemented).

---

## 5. N2 — Core runtime hardening

**Goal:** Address core-level technical debt that affects all engines. Deferred until A3/A4 fixtures are green to avoid scope creep during honesty work.

**Exit gate:** `pnpm typecheck && pnpm lint && pnpm -w test` green. Shared instance factory available. Event shape parity documented.

**Why:** The five engine instance lifecycles are ~200 lines of duplicated boilerplate each. `createPlatformInstance` exists but no engine uses it. This duplication makes every bugfix or lifecycle change a five-way merge risk.

---

### N2.1 — Evaluate shared engine instance factory

**Goal:** Determine whether to (a) refactor engines to use `createPlatformInstance` with per-engine hooks, or (b) document the divergence and leave it.

**Why:** SYSTEM-ARCHITECTURE §3 already acknowledges "engines may build a richer instance." The practical question: is the duplication costly enough to justify a shared factory?

**Affected files:**
- `docs/ADR-11.md` (new, if decision is to refactor; or update SYSTEM-ARCHITECTURE note if leaving as-is)

**Requirements:**
- Compare the five `instantiate()` implementations side-by-side
- Identify the shared parts (EventLog, listeners, dispatch, emit, teardown, announce) vs per-engine hooks (namespaced event emission, reducer, announce messages, snapshot shape)
- Decision options:
  - (a) Add `createEngineInstance(config)` in core that takes per-engine hooks `{ reducer, namespacedEventFactory, announceMessage, deregister }` → engines call it instead of reimplementing
  - (b) Leave as-is; document the divergence (lower risk, no churn)
- Record decision as ADR-11

**Tests required:**
- If (a): all existing engine unit + e2e tests must still pass after refactor
- If (b): no code changes

**Acceptance criteria:**
- [ ] ADR-11 recorded with context, options, decision, consequences
- [ ] If (a), all engines refactored and all tests pass

**Risk:** High churn for marginal benefit if engines are about to diverge further in Workstream D. Recommend (b) unless evidence of active bugfix pain.

---

### N2.2 — Document snapshot renderer-independence status

**Goal:** Clarify whether `snapshot().svgResult` is a renderer-dependent output (currently it is) or should be removed from the canonical `EngineState`.

**Why:** DESIGN P3 says "renderer-independent." But `EngineState` as defined in `src/core/state.ts` does NOT include `svgResult` — it's added ad-hoc by each engine's `snapshot()` method. The canonical state shape is `{ instanceId, engine, phase, selection, focus, filter, annotations, expanded, playback, step, lastAction }`. The `svgResult` is engine-added, not contract-defined.

**Affected files:**
- `docs/SYSTEM-ARCHITECTURE.md` (§3.2 or §7, add note)

**Requirements:**
- Note: "Each engine's `snapshot()` may include renderer-specific output (e.g. `svgResult`). This output is engine-internal and consumed by the harness/rendering layer. The canonical `EngineState` shape (`instanceId`, `engine`, `phase`, `selection`, `focus`, `filter`, `annotations`, `expanded`, `playback`, `step`, `lastAction`) is renderer-independent and is what composition and OpenEdu consume."

**Tests required:** None.

**Acceptance criteria:**
- [ ] SYSTEM-ARCHITECTURE clearly distinguishes canonical state from engine-added snapshot fields

---

## 6. N3 — Validation/accessibility infrastructure

**Goal:** Strengthen shared validation and accessibility infrastructure.

**Exit gate:** L4 parity tests exist per engine. Interaction.actions semantics documented.

---

### N3.1 — Document interaction.actions semantics

**Goal:** Record the architectural decision on whether `interaction.actions` is an authoring declaration or a runtime enforcement mechanism.

**Why:** Currently `interaction.actions` is validated at L2 (must be ⊆ D5) and checked at composition load (bindings must declare their action). But at runtime, the reducer accepts any D5 action regardless of declared set. The declared set is NOT enforced as an access-control list at dispatch time.

**Affected files:**
- `docs/ADR-12.md` (new)

**Requirements:**
- Decision: `interaction.actions` is an authoring-level contract (what the author intends to be interactive), enforced at validation time and composition binding time. Runtime enforcement is NOT applied — the D5 reducer's closed enum is the runtime boundary. This matches the host's role: OpenEdu may dispatch additional actions programmatically (e.g. `reset` from a lesson control) that the author didn't declare.
- If runtime enforcement is ever needed (e.g. a learner-facing `reset` button), it should be a per-engine opt-in, not a core requirement.

**Tests required:** None.

**Acceptance criteria:**
- [ ] ADR-12 recorded
- [ ] Referenced in INTERACTIVE-ENGINE-SPEC §? or SYSTEM-ARCHITECTURE §3.3 note

---

### N3.2 — L4 a11y parity tests per engine

**Goal:** Assert that each engine's L4 validation hook catches missing accessibility labels.

**Why:** L4 validation exists in each engine's `validation/accessibility.ts` but test coverage varies. Visual and diagram have a11y tests; chart/timeline coverage is thin.

**Affected files:**
- `packages/chart-engine/test/validation.test.ts` (extend)
- `packages/timeline-engine/test/validation.test.ts` (extend)

**Requirements:**
- Add test: spec with missing `accessibility.label` → L4 `ACCESSIBILITY_ERROR`
- Add test: spec with empty `content.components[].accessibility.label` → L4 error
- Each test runs through the engine's full `validate()` pipeline

**Acceptance criteria:**
- [ ] Chart L4 tests: at least 2 failure cases (missing root label, missing component label)
- [ ] Timeline L4 tests: same
- [ ] All existing tests still pass

---

## 7. N4 — Engine-agnostic conformance suite

**Goal:** Define and implement a minimal shared conformance test that runs against any engine instance, asserting lifecycle, dispatch, events, snapshot, a11y, and reset behavior.

**Why:** Each engine has its own e2e tests (Playwright against `?engine=<type>`), but there is no shared test that validates the common `EngineInstance` contract across all five engines. A shared conformance suite catches contract drift early.

**Exit gate:** A `packages/interactive-engine/test/conformance/` directory with shared test helpers. Each engine imports and runs the shared suite against its own engine.

---

### N4.1 — Shared conformance test helpers

**Goal:** Create reusable test functions that exercise the `EngineInstance` contract.

**Affected files:**
- `packages/interactive-engine/test/conformance/engine-contract.test.ts` (new, or helper module)

**Requirements:**
- Test: `instantiate()` returns `{ id, engine, dispatch, snapshot, subscribe, teardown }`
- Test: `snapshot()` returns `{ instanceId, engine, phase }` with `phase === 'running'`
- Test: dispatch `select` → `state-changed` event → `snapshot().lastAction.type === 'select'`
- Test: dispatch `reset` → `selection` and `focus` cleared
- Test: dispatch unknown action → `EngineError` with `UNSUPPORTED_ACTION`
- Test: superseded action (`highlight`) → `UNSUPPORTED_ACTION`
- Test: `subscribe()` receives `state-changed` events
- Test: `teardown()` disconnects subscribers
- Test: dispatch after teardown → error or no-op (documented behavior)

**Acceptance criteria:**
- [ ] Shared test helper exists and passes for all 5 engines when invoked

---

### N4.2 — Integrate shared suite per engine

**Goal:** Each engine's `test/` directory includes a conformance test file that runs the shared suite.

**Affected files:**
- `packages/visual-engine/test/conformance.test.ts` (new)
- `packages/geomap-engine/test/conformance.test.ts` (new)
- `packages/chart-engine/test/conformance.test.ts` (new)
- `packages/timeline-engine/test/conformance.test.ts` (new)
- `packages/diagram-engine/test/conformance.test.ts` (new)

**Requirements:**
- Each file imports the shared suite and runs it against the engine's `instantiate()` with a minimal valid spec
- All 5 files pass

**Acceptance criteria:**
- [ ] `pnpm -w test` passes with all 5 conformance files green

---

## 8. N5 — Composition hardening (stretch)

**Goal:** Optional improvements to composition infrastructure. Only proceed if N0–N4 are green and there's time before Workstream B needs it.

---

### N5.1 — Composed-lesson golden fixture test

**Goal:** Assert that the canonical composed lesson (`docs/fixtures/p7/composed-lesson.json`) loads, starts, dispatches, and produces expected event sequences.

**Why:** Composition works (P7 conformance test proves it) but there is no golden-fixture-level assertion for the composed event log.

**Affected files:**
- `packages/interactive-engine/test/composition/conformance.test.ts` (new or extend existing)

**Requirements:**
- Load the P7 composed-lesson fixture
- Start with two mock engines (timeline stub + visual stub)
- Dispatch `select` on timeline → assert visual receives `focus`
- Assert event log has monotonic seq, correct names

**Acceptance criteria:**
- [ ] Composition golden test passes
- [ ] Event sequence is deterministic and asserted

---

## 9. N6 — Release verification

**Goal:** Confirm published packages pass conformance against real installed `dist/`.

---

### N6.1 — Publish dry-run + smoke

**Goal:** Run `pnpm publish:dry` and `scripts/p7-publish-smoke.mjs` after N0–N5.

**Requirements:**
- All packages pack successfully
- Smoke installs into temp consumer, drives L1–L4 + composed lesson from `dist/`
- No regressions

**Acceptance criteria:**
- [ ] `pnpm publish:dry` succeeds
- [ ] `node scripts/p7-publish-smoke.mjs` succeeds

---

### N6.2 — Add freshness guard to CI

**Goal:** Add `node scripts/check-engine-skills-fresh.mjs` to `.github/workflows/ci.yml`.

**Why:** Currently the freshness guard is NOT in CI (only manual). Stale engine-skills can ship.

**Affected files:**
- `.github/workflows/ci.yml`

**Requirements:**
- Add step after lint: `node scripts/check-engine-skills-fresh.mjs`
- Fails CI if `packages/engine-skills/skills/` is out of date with `docs/engines/*/skills/` + `docs/fixtures/*/skill-example.json`

**Acceptance criteria:**
- [ ] Freshness guard runs in CI
- [ ] Intentionally stale skills would fail the gate

---

## 10. Summary: phases and gates

| Phase | What | Gate | Plan-P8 link |
|-------|------|------|--------------|
| N0 | Doc cleanup + ADRs | `typecheck + lint` | A3/A4 prerequisite |
| N1 | Chart/timeline goldens | `typecheck + lint + test + playwright` | A3/A4 completion |
| N2 | Core runtime hardening | `typecheck + lint + test` | Debt reduction |
| N3 | Validation/a11y infra | `typecheck + lint + test` | L4 parity |
| N4 | Shared conformance suite | `typecheck + lint + test` | Contract enforcement |
| N5 | Composition hardening (stretch) | `typecheck + lint + test` | Optional |
| N6 | Release verification | `publish:dry + smoke + CI gate` | C1 |

**A-green gate:** N0 + N1 complete → A-green → unlocks PLAN-P8 Workstreams D/E.

**Parallelizable:** N2, N3, N4 can run in parallel after N1 if multiple agents are available.

---

## 11. Explicit non-goals

- No new engine kinds (Workstream D — gated on A-green)
- No new D5 actions or envelope changes
- No library adoption (D3-scale/time, ELK, Recharts, MapLibre, Konva)
- No Workflow/scoring/telemetry/i18n (D6 — OpenEdu owns these)
- No CLI (Workstream E — deferred)
- No Playwright fixture changes without golden review
- No renderer refactoring (Canvas/WebGL deferred per DESIGN P3)

---

## 12. References

| Document | Role |
|----------|------|
| `docs/DESIGN.md` | Canonical principles P1–P12, decisions D1–D9 |
| `docs/INTERACTIVE-ENGINE-SPEC.md` | Shared contract: actions, events, state, error model |
| `docs/SYSTEM-ARCHITECTURE.md` | Runtime model, engine contract, composition |
| `docs/PLAN-P8.md` | Workstreams A–E (production readiness) |
| `docs/p7-acceptance.md` | Cross-repo acceptance items (Workstream B) |
| `docs/STRUCTURE.md` | Package layout, tech stack |
| `docs/adr/ADR-01..12.md` | Decision records |
| `docs/use-cases/*.md` | Per-engine use-case catalogs |
| `docs/_archive/implementation-plans/2026-09-09-p8-workstream-a-plan.md` | Prior A1/A2 plan (now stale for A1/A2 status) |
| `docs/_archive/implementation-plans/2026-09-10-visual-use-cases-implementation-plan.md` | Visual UC implementation plan |
