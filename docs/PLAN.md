# OpenEdu Interactive Engine — Implementation Plan

**File:** `docs/PLAN.md`
**Status:** Living (sequencing is maintained here, per DESIGN.md §14)
**Version:** 1.0.0
**Audience:** AI coding agents and engineers implementing the engines
**Scope:** When and who, in what order, and with what verification. DESIGN.md fixes *what and why*; this plan sequences *when and who*.

---

## 1. Purpose

This is the living sequencing document for building the interactive-engine package family from DESIGN.md D3 (**platform first, then engines**), then **P8 production readiness**. Every phase is **exit-criteria gated**: a phase is promoted only when its full exit checklist is green, as verified by automated commands — not by assertion. P0–P7 DONE means the in-repo gates; learner-ready product is P8 (`docs/PLAN-P8.md`).

Source of truth for content: `DESIGN.md` → `INTERACTIVE-ENGINE-SPEC.md` → engine `SPEC.md`/`VISION.md` → Visual architecture docs. When a conflict is found, fix the higher document, not the implementation.

---

## 2. Working Model

- **Who.** The implementation is performed by AI coding agents. Agents author and edit **engine specifications (JSON)**; they do not hand-author renderer markup or coordinates (DESIGN P2).
- **Test-first.** Every task starts with its conformance test or fixture. No engine feature is "done" without a test that fails first (DESIGN §11, STRUCTURE §36-37).
- **Gates.** Each phase ends with a checkpoint review against the exit checklist below. Phases are promoted one at a time; the next phase does not start until the previous gate is green.
- **Commits.** Land a git commit per completed task/phase. History is the review trail.
- **Non-negotiables.** `additionalProperties:false`; shared error codes (§67); deterministic output; no engine-to-engine package imports (DESIGN §6); no arbitrary JS in specifications (§93).
- **Skills.** Agents SHOULD load the authoring/execution skills referenced in `DESIGN.md` §14 before starting an engine phase.

---

## 3. Repository and Packages

Repository: `KnowledgeAssembly/open-edu-interactive` (created, pushed — main).

Package layout per DESIGN D2 / shared contract §90:

```text
packages/
  interactive-engine/        core: engine.ts, state, action, event, registry, validation;
                             accessibility/ · composition/ · runtime/ · schemas/
  visual-engine/             src/ + schemas/visual-spec.schema.json
  geomap-engine/             src/ + schemas/geomap-spec.schema.json
  chart-engine/              src/ + schemas/chart-spec.schema.json
  timeline-engine/           src/ + schemas/timeline-spec.schema.json
  diagram-engine/            src/ + schemas/diagram-spec.schema.json
apps/
  playground/                per-engine dev environment (P2+)
  cli/                       generate·validate·preview·inspect·components·recipes (P2+)
```

Namespace: `@knowledgeassemble/*` while standalone; `@open-edu/*` when integrated into the OpenEdu monorepo (D2 — namespace follows host).

Technology (DESIGN §8, STRUCTURE §8-16):

- TypeScript (strict mode), pnpm workspaces, Vite tooling.
- JSON Schema — canonical public contract; Zod — runtime validation; TS types generated/derived from schemas.
- Vitest (unit/component/integration), Playwright (browser: keyboard, pointer, responsive, a11y, cross-engine).
- React only at the integration layer (P7, `interactive-react`). The core runtime stays framework-independent.

---

## 4. Program Phases

### P0 — Foundation and Consolidation — DONE

**Goal.** Design stabilized, envelope canonical, decisions recorded, repo live.

**Completed**

- Full doc restructure; `DESIGN.md` (decisions D1-D3) and `README.md` written.
- D1-D3 recorded in DESIGN §16 decision register.
- Base envelope schema at `docs/schemas/interactive-engine.schema.json` (`type`/`version`/`id`, `additionalProperties:false`).
- Repo created and pushed to GitHub (`main`).

**Remaining**

- [x] Envelope `purpose` / `interaction` in DESIGN and this plan match `interactive-engine.schema.json` (D4). Engine-specific selectable targets live in `content`.
- [x] Replace the legacy envelope in engine docs and examples: GeoMap `geomap` wrapper (geomap SPEC §7) and Visual `schemaVersion` (visual SPEC §7) MUST NOT appear in new examples (D1).
- [ ] Code-first schema package lands here → moved to P1.1 (no code exists yet).

**Exit criteria (all green)**

1. `DESIGN.md` has no open conflicts with `INTERACTIVE-ENGINE-SPEC.md`.
2. No remaining legacy-envelope examples in `docs/engines/*`.
3. Docs commit is clean on `main`.

---

### P1 — Platform Skeleton (no engines yet)

**Detailed task breakdown:** [`PLAN-P1.md`](PLAN-P1.md).

**Goal.** Thin platform contract: envelope, registry, D5 reducer, host adapter stub, conformance — **with no engine and no duplicate OpenEdu products** (DESIGN D6).

**Scope (in order)**

1. **Workspace** — pnpm workspace, `tsconfig` strict, Vitest, Playwright, ESLint/Prettier, CI gate.
2. **Schema package** (`interactive-engine/schemas/`) — fold `interactive-engine.schema.json` in; Zod runtime validators derived; `additionalProperties:false` enforced; versioning rules (§38).
3. **Core** (`interactive-engine/core/`) — `engine.ts` interface, registry: `register → validate → instantiate → run → teardown` (§7.3).
4. **State + events** — event-only mutation, serializable/replayable log, read-only scene snapshot (§7.2).
5. **Interaction DSL** — D5 semantic action set in schema `$defs.actionType` (DESIGN §7.4). Renderer input is not part of the DSL.
6. **Host adapter** — `EngineHost` stub (locale, tokens, `reducedMotion`, `announce`, `onEvent`, `resolveAsset`). No OpenEdu package imports.
7. **Accessibility primitives** — roles/labels/ids derived for future renderers; consume host a11y prefs (DESIGN §12, D6).
8. **Conformance harness** — L1–L4 + Playwright replay using shared primitives only (no engine).

**Out of scope for P1 (owned by OpenEdu; do not build)**

- Telemetry storage / RxJS session product
- i18n catalogs and `LanguageSwitcher`
- Design-token source of truth / theme editor
- Quiz scoring, workflow, rewards
- Course Creator Studio or any “Interactive Studio” app
- Pipili, PWA, `.oep`, auth

**Deliverable.** `packages/interactive-engine` green; harness renders a minimal scene to DOM in Playwright without any engine package and without a second telemetry/i18n/theme stack.

**Exit criteria (all green)**
`pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`

1. Unknown keys rejected at L1 (`INVALID_SPEC`), not ignored (P11).
2. Events/state/interaction-DSL exercised through Playwright with a replay test.
3. A11y primitives validated (labels/roles present per §7/§12); host stub can set `reducedMotion`.
4. No engine package exists and none is required to pass the harness.
5. Repo contains no telemetry store, i18n product, Studio app, or scoring engine (D6).

---

### P2 — Visual Engine — DONE

**Goal.** First engine. Vertical slice: **number line** end-to-end (spec → schema → scene → layout → accessible SVG → fixtures), then the visual component library.

**Scope (in order)**

1. Author `schemas/visual-spec.schema.json` (from visual SPEC §7 semantics, migrated to envelope D1).
2. **Number-line vertical slice** (`engines/visual/PROJECT.md` §38-39) — restated in the shared envelope:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "purpose": {
    "learningObjective": "Estimate where a value sits between bounds",
    "interactionGoal": "Select the highlighted value on the number line",
    "reasoningMode": "estimate"
  },
  "content": {
    "kind": "number-line",
    "range": { "min": 0, "max": 10, "step": 1 },
    "highlight": [7],
    "selectable": ["highlight", "range"]
  },
  "interaction": {
    "mode": "explore",
    "actions": ["select", "deselect", "focus", "reset"]
  },
  "questions": []
}
```

Expected semantic behavior: `0 ─ 1 ─ … ─ 10` with `7` highlighted and interactive. Visual design is implementation-dependent; semantic behavior is not (§39).

3. SVG renderer + deterministic output + renderer tests (PROJECT Phase 2).
4. Layout: horizontal/vertical/grid, alignment, labels, collision detection (Phase 3).
5. Component library — visual-only subset of Phase 4 (1-7): number line, counting set, fraction bar, fraction circle, clock, coordinate grid, geometry shape. Items 8-11 (timeline, label diagram, flowchart, comparison) belong to Timeline/Diagram engines and MUST NOT be re-implemented here (no engine smuggling, DESIGN §15).
6. Validator, host-theme consumption (default + high contrast + low stimulation **via EngineHost tokens**), agent skill `educational-visual/SKILL.md`, playground + CLI scaffold. Do not add a Studio app (D6).
7. Golden fixtures checked in; renderer changes require fixture review.

**Exit criteria (all green)**

1. Number-line slice renders accessible SVG from an AI-authored spec (integration proof like Project §10 OpenEdu proof, minus OpenEdu).
2. Conformance L1-L4 pass; Playwright a11y interaction test green.
3. `educational-visual/SKILL.md` lets an agent produce a validated `visual` spec without invalid fixtures.

---

### P2.5 — Composition smoke test (D8)

**Goal.** Prove cross-engine value **before** building Chart, GeoMap, Timeline, and Diagram renderers. A timeline selection drives a visual focus via the shared event bus — not package imports.

**Scope (in order)**

1. **Composition schema** — `docs/schemas/composition.schema.json` (lesson `{ id, engines[], bindings[] }`; binding actions use D5 `$defs.actionType`).
2. **Composition harness** in `interactive-engine` — load lesson fixture, register two engine instances, route namespaced events to D5 actions on a peer instance.
3. **Fixture** — `docs/fixtures/composition/narrative-timeline-visual.json` (timeline stub spec + visual spec + bindings).
4. **Timeline stub** — minimal Timeline engine adapter: parse thin `engines/timeline/SPEC.md` event list, emit `timeline.event-selected` on `select`; no full timeline renderer required for exit.
5. **Visual target** — existing P2 number-line or illustration entity receives `focus` from binding (`targetIdFrom`: `links.visualEntityId`).

**Exit criteria (all green)**

1. Playwright (or unit) test: select timeline event → visual entity focused; event log replayable.
2. No engine-to-engine package imports; routing only through harness bindings.
3. Fixture validates against `composition.schema.json`; embedded engine specs pass L1 on envelope schema.

**Not in scope:** Full Timeline/GeoMap/Chart UI; lesson-level quiz scoring (D7).

---

### P3 — Chart Engine

**Goal.** Quantitative reasoning (`how much / how does it compare`).

**Scope (in order)**

1. Author `schemas/chart-spec.schema.json` from thin [`engines/chart/SPEC.md`](engines/chart/SPEC.md) (normative doc done — do not expand vision prose before code).
2. Slices: **bar** and **line** through the full pipeline (spec → scene → layout → accessible SVG → fixtures).
3. Scales, ticks, axes as derived layout — semantics only in the spec (DESIGN §8, P2).
4. Component surface: bar, line, (future: area, scatter) — conformance-gated.
5. Agent skill + fixtures (playground/cli tab deferred to a later tooling phase — conformance app is the only demo surface).

**Exit criteria (all green)**

1. Bar and line slices pass full pipeline + Playwright keyboard/pointer/a11y.
2. Chart spec authored and versioned; impossible specs fail L1/L2.

---

### P4 — GeoMap Engine

**Goal.** Geographic reasoning (`where, and why there`).

**Scope (in order)**

1. Author `schemas/geomap-spec.schema.json` (currently missing — TODO) from geomap SPEC.
2. Slice: **region → marker → route** with GeoJSON data binding (DESIGN §9); MVP list per `engines/geomap/SPEC.md` §82.
3. Ground truth rules: no invented boundaries/values; provenance classes enforced (DESIGN §9; SPEC §9).
4. Agent skill + fixtures; L1-L4 conformance.

**Exit criteria (all green)**

1. GeoJSON regions/markers/routes slice green (incl. a11y of map semantics, not raw SVG).
2. Data-fidelity test: invented boundary/value fails validation.

---

### P5 — Timeline Engine

**Goal.** Temporal reasoning (`when, and what unfolds`).

**Scope (in order)**

1. Author `schemas/timeline-spec.schema.json` from thin [`engines/timeline/SPEC.md`](engines/timeline/SPEC.md) (stub used in P2.5 may be upgraded to full renderer).
2. Slice: **events / periods / tracks** end-to-end.
3. Playback (`play-pause`, `step`) via the shared runtime, not an engine-private mechanism (§7.4).
4. Agent skill + fixtures.

**Exit criteria (all green)**

1. Events/periods/tracks slice green with replayable event log.
2. Playback actions route through the standard action set.

---

### P6 — Diagram Engine

**Goal.** Structural reasoning (`how is it connected`).

**Scope (in order)**

1. Author `schemas/diagram-spec.schema.json` from thin [`engines/diagram/SPEC.md`](engines/diagram/SPEC.md).
2. Slice: **nodes / edges / auto-layout** (detect cycles → clean layout; label the layout as illustrative, DESIGN §9).
3. No internal imports of other engines (DESIGN §6).
4. Agent skill + fixtures.

**Exit criteria (all green)**

1. Nodes/edges slice green with deterministic auto-layout and provenance on generated positions.
2. L1-L4 conformance pass.

---

### P7 — OpenEdu Integration

**Goal.** OpenEdu **hosts** engines through `EngineHost` (D6); `{ type: "interactive" }` lesson node; widget compatibility; ADR re-recording. Composition is proven at P2.5 — P7 extends hosting and authoring, not first composition.

**Scope (in order)**

1. **`interactive-react`** — thin React mount that implements `EngineHost` from OpenEdu theme, i18n, a11y, and telemetry session. Core stays framework-independent and MUST NOT import OpenEdu.
2. **OpenEdu consumption proof** — lesson node `{ "type": "interactive", "engine": "…", "spec": {…} }` in `@open-edu/schemas`; learner `CourseRuntime` hosts one engine; composed lessons reuse P2.5 binding model at lesson level.
3. **Wire host services** — `onEvent` → OpenEdu telemetry; tokens → design-system; locale → i18n; assets → `.oep`. No shadow runtime (D6).
4. **Widget compatibility** (§95): keep widgets running; shims or parallel node types (`math.number-line` stays valid). Migration progressive.
5. **Authoring** — extend Course Creator Studio + course-authoring skill to emit engine specs. No `apps/studio` product.
6. **Extended composition** (optional) — Timeline + GeoMap narrative once P4 GeoMap exists; not a gate for first OpenEdu proof.
7. **Governance** — re-record D1–D9 as ADRs per `openedu-way/ADR.md`.

**Exit criteria (all green)**

1. Cross-engine composed lesson runs from an AI-authored spec with no renderer code written — proven in-repo by the host-simulation conformance route (`?engine=lesson`); the real learner-`CourseRuntime` run is an OpenEdu-repo acceptance item (see `docs/p7-acceptance.md`).
2. All engines pass the common conformance suite on the installed packages.
3. ADRs recorded; DESIGN §16 register links to them.

---

### P8 — Production readiness

**Detailed task breakdown:** [`PLAN-P8.md`](PLAN-P8.md). OpenEdu-repo items remain listed in [`p7-acceptance.md`](p7-acceptance.md).

**Goal.** P0–P7 are **in-repo phase gates** (thin slices + host simulation). P8 takes the §5 lifecycle through honest SVG, playground as an acceptance surface, published packages, and the real OpenEdu host proof.

**Scope (in order)** — see PLAN-P8 workstreams:

1. **A — Slice honesty** (this repo): finish contracted MVP render/layout (Diagram T4 edges and graph-order layout first; Visual D9 closed set from PLAN-P2 T7); playground honesty tests; no new libraries.
2. **B — OpenEdu proof** (OpenEdu repo): `p7-acceptance.md` items; first proof is CourseRuntime + schema adoption + real composed lesson.
3. **C — Publish and host-quality:** npm publish of `@knowledgeassemble/*`; token/a11y from a real host.
4. **D — Next SPEC slices** (after A): Chart `area`/`scatter`, GeoMap projections beyond equirectangular, Diagram `label-diagram`, etc. Adapters (D3/ELK) only when a slice names the math.
5. **E — CLI** (PLAN.md §3): after A, when authors need a non-UI workflow.

**Out of scope:** Simulation/Equation/3D; Interactive Studio/scoring/telemetry product in this repo; widening frozen enums to decorate playground.

**Exit:** substages in PLAN-P8 §8. Do not mark P8 DONE until A + B-min (`p7-acceptance` #1, #2, #6) + C1 (packages on npm) are green.

---

## 5. Engine Lifecycle Template

Every engine runs the same exit-gated cycle (DESIGN §14, mapped from `engines/visual/PROJECT.md`):

```text
Spec → Schema → Validator → Scene → Layout → Renderer(SVG) → Interaction
     → Accessibility → Conformance + fixtures → Agent skill → Playground → OpenEdu proof
```

The **Spec** step is where the per-engine normative documents missing today are authored (Chart, Timeline, Diagram) — never skipped before implementation.

---

## 6. Cross-Cutting Workstreams

| Workstream | Home | When |
|------------|------|------|
| Docs backlog: chart/timeline/diagram JSON schemas; geomap schema | engine phases | P3–P6 |
| Composition fixtures + harness | `docs/fixtures/composition/` | P2.5 |
| Composition schema | `schemas/composition.schema.json` | P2.5 |
| Legacy envelope migration (`geomap` wrapper, `schemaVersion`) | DESIGN D1 | Done (P0) |
| Thin normative SPEC.md (chart, timeline, diagram) | `engines/*/SPEC.md` | Done (P0 doc gate) |
| Vision prose expansion | `engines/*/VISION.md` | **Frozen** until P2 number-line green |
| Conformance suite + golden fixtures | `interactive-engine` harness | P1, per engine |
| GitHub Actions CI gate | `.github/workflows/ci.yml` | P1 (delivered as P1 gap-closing follow-up) |
| Theming tokens | DESIGN §12.1 / EngineHost | P1 stub host; OpenEdu design-system is source of truth |
| A11y L4 checks, keyboard, reduced motion | DESIGN §12 / STRUCTURE §37 | per engine; prefs from host |
| CLI (`generate·validate·preview·inspect·components·recipes`) | PROJECT Phase 7 | P8 Workstream E (deferred from P2) |
| Playground app | PLAN-PLAYGROUND | Done as tooling; honesty gate is P8 Workstream A |
| Production readiness (slice honesty, OpenEdu proof, publish) | PLAN-P8 | P8 |
| Interactive Studio | — | **Out** (D6 — Course Creator Studio) |
| Agent skills per engine + examples | DESIGN §10 | per engine |
| Extension engines (Simulation, Equation, 3D) | contract §89 | Deferred (not P0–P8 Workstream A) |

---

## 7. Definition of Done (STRUCTURE §51 mapped)

| Criterion | Where |
|-----------|-------|
| Standalone repo exists under KnowledgeAssemble | Done — pushed |
| pnpm workspace configured | P1 |
| TypeScript strict | P1 |
| Schema package / core runtime / registry / primitives | P1 |
| React integration | P7 (`interactive-react`) |
| Every engine renders a valid JSON spec | P2–P6 slice; **visible MVP SVG** is P8 A |
| All engines pass common conformance suite | P2-P7, gate each |
| Packages independently publishable | P7 smoke; **npm publish** is P8 C |
| OpenEdu can consume the published packages | P7 in-repo simulation; **CourseRuntime** is P8 B / p7-acceptance |
| No engine → OpenEdu dependency | P1 onward (contract boundary) |
| No arbitrary executable JS in specifications | L2/P10 (P1 harness) |
| Accessibility primitives + host a11y prefs | P1 |
| AI-generated JSON validates and renders without custom codegen | P2 slice proof |
| No parallel telemetry / i18n / Studio / scoring products | P1 onward (D6) |

---

## 8. Risks and Dependencies

- **Legacy envelopes must not be copied forward** (D1). Every ported example is restated in the shared envelope.
- **Missing normative specs gate their phases.** Chart/Timeline/Diagram have none today; spec-first prevents drift.
- **Schema technology.** JSON Schema is the canonical public contract; Zod provides runtime validation (STRUCTURE §11). That matches OpenEdu; engines still MUST NOT import `@open-edu/*` (D6).
- **Engine isolation.** Engines never import each other; composition is via the event bus (P2.5+).
- **Provenance and fixtures.** Renderer upgrades can only change output with reviewed fixture changes (DESIGN §11).
- **Duplicate-runtime risk (D6).** If P1 grows a telemetry store, i18n app, or Studio, stop and delete it. OpenEdu already has those.
- **Composition deferred (D8).** If P3 starts before P2.5 is green, stop — isolated engines replicate the widget catalog.
- **Dual assessment (D7).** Do not add scoring logic to engine packages; wire quiz nodes in OpenEdu only.
- **Visual scope creep (D9).** Reject timeline/flowchart/label-diagram in Visual PRs; use Timeline/Diagram engines.
- **Namespace.** Standalone `@knowledgeassemble/*` until host integration; D2 still applies.

---

## 9. Open Items / Decision Gates

1. ~~**P0 → P1 gate:** standalone `@knowledgeassemble/*` now, or plan for immediate monorepo integration (`@open-edu/*`)?~~ **Resolved (2026-09-07):** standalone `@knowledgeassemble/*` now; host integration and any `@open-edu/*` rename happen at P7 (D2 default confirmed).
2. ~~**P6 → P7 gate:** integrate into the OpenEdu monorepo, or publish and consume as external packages?~~ **Resolved (OpenEdu-D2):** publish-and-consume `@knowledgeassemble/*`; npm publish itself is P8 Workstream C.
3. Tooling: playground **app** shipped (PLAN-PLAYGROUND); playground **honesty** and CLI are P8. Interactive Studio is **out** (D6 — extend OpenEdu Course Creator Studio).
4. Extension engines (Simulation/Equation/3D, §89) — deliberately deferred (not P8 Workstream A).
5. **P8 substages:** A (this repo) before D (new kinds); B-min is OpenEdu-repo (`p7-acceptance.md`).

---

## 10. Status Board

| Phase | Status |
|-------|--------|
| P0 — Foundation and consolidation | DONE |
| P1 — Platform skeleton | DONE |
| P2 — Visual Engine | DONE |
| P2.5 — Composition smoke test | DONE |
| P3 — Chart Engine | DONE |
| P4 — GeoMap Engine | DONE |
| P5 — Timeline Engine | DONE |
| P6 — Diagram Engine | DONE |
| P7 — OpenEdu integration | DONE |
| P8 — Production readiness | Proposed |
---

## 11. Change Log

| Date | Change |
|------|--------|
| 2026-10-03 | W-3.13 media slots: `content.nodes[].media: { kind: "figure" }` reserves a host-fillable 220×120 box rendered by a single shared `svg-kit` `mediaSlot` emitter adopted by Diagram and Visual. The label moves **outside** the frame (fixes the host-figure/caption overlap); the engine owns geometry, the host owns assets (DESIGN §9, D9). Opt-in per node — all existing Diagram goldens byte-identical; `data-oedu-bounds` emitted for media nodes only. Visual `illustration` entities now render through the same emitter (preventative: no figure reaches them today). Schema copies (zod + both JSON) agree on `media` and the pre-existing `interactive` drift is restored; parity tests now compare property sets, not just enums. New `di-media-cycle` golden + browser e2e. |
| 2026-09-07 | Initial plan; P0 status captured; phases gated per DESIGN D3. |
| 2026-09-07 | D4: P2 number-line fixture and DESIGN envelope example aligned to schema `purpose` / `interaction`. |
| 2026-09-07 | D1: Visual and GeoMap engine docs migrated off `schemaVersion` / `{ "geomap": {} }` wrappers. |
| 2026-09-07 | D5: single semantic action enum and namespaced events; STRUCTURE pointer events marked renderer-only. |
| 2026-09-07 | D6: OpenEdu host seam; P1 must not rebuild telemetry/i18n/Studio/scoring; P7 hosts via EngineHost. |
| 2026-09-07 | D7–D9: assessment seam, P2.5 composition, Visual closed set; thin chart/timeline/diagram SPEC.md. |
| 2026-09-07 | D5 Visual interaction examples migrated; `composition.schema.json` stub for P2.5 fixtures. |
| 2026-09-07 | P0→P1 gate resolved: standalone `@knowledgeassemble/*`; host integration + `@open-edu/*` rename deferred to P7. |
| 2026-09-07 | P1 DONE: `@knowledgeassemble/interactive-engine` skeleton (envelope+Zod, D5 reducer, EventLog, EngineHost, L1–L4 pipeline, a11y primitives) green via unit tests and browser conformance e2e. |
| 2026-09-07 | P0 marked DONE (exit criteria verified); P1 review fixes: dispatch validates before emitting (no dangling `interaction-started`), emits `interaction-completed`, `teardown` sets `phase: torn-down`, Zod `source.url` enforces URI. |
| 2026-09-07 | P1 CI gate (scope item 1) delivered as a gap-closing follow-up: GitHub Actions workflow runs the full exit gate (`typecheck` + `lint` + `-w test` + `playwright`) on every PR and on pushes to `main` (STRUCTURE §47). |
| 2026-09-07 | P2 DONE: @knowledgeassemble/visual-engine number-line slice → accessible SVG, L1–L4 conformance, closed component set green via full exit gate. |
| 2026-09-07 | P2.5 T0 decision: Gap A — add `illustration` to VISUAL_KINDS (default path, recommended). |
| 2026-09-07 | P2.5 T0 decision: Gap B — timeline stub MUST attach full event record (including `links`) to emitted `timeline.event-selected` payload so `targetIdFrom` resolves. |
| 2026-09-07 | P2.5 DONE: composition runtime (`Lesson` load/start/route/replay) + `@knowledgeassemble/timeline-engine` stub + Visual `illustration` kind, frozen fixtures with golden event log, conformance `?engine=composition` e2e, composition authoring skill — full exit gate green. |
| 2026-09-07 | P3–P7 review patches (docs only, pre-`feat/p3`): core seams now explicit so later phases nominate real hooks/types — `ValidationHooks` keeps an optional extra slot (extra named hooks become deterministic-error cases, not new fields); `EngineInstance.snapshot()` is widened for cross-cutting scene/scene IDs once heading into P3; `tokens`→`LayoutContext` consumption is a Visual responsibility carried by each injected vector (not a shared `format` session); sync `resolveAsset` confirmed against `EngineHost`; decided to add `format(key, vars?)` on `EngineHost` (no message-key/`t()` convention exists yet) in the pre-P3 core patch. P7 exit-1 amended (in-repo host-simulation; real `CourseRuntime` run is `docs/p7-acceptance.md`). `apps/playground`/`apps/cli` claims (P2/P3 scope) deferred to a later tooling phase — conformance app is the only demo surface. |
| 2026-09-07 | Chart-D1: closed `content.kind` at P3 = `["bar","line"]`; area/scatter deferred. |
| 2026-09-07 | Chart-D2: derived scales, fixed baseline (bar y=0, line padded 10%); nice ticks via `1,2,2.5,5×10^k` ladder. |
| 2026-09-07 | Chart-D3: namespaced result events `chart.data-point-selected` / `chart.data-point-focused`; payload = full row. |
| 2026-09-07 | Chart-D4: line requires ≥ 2 data points at L2 (`INVALID_ENTITY`). |
| 2026-09-07 | Chart-D5: `sources[]` required at engine level (stricter than envelope). |
| 2026-09-07 | Chart-D5 reconciliation: `sources[].class` (DESIGN §9 accuracy class, `{authoritative,illustrative,simulated}`) added to the shared envelope `SourceSchema`; chart L2 requires `sources[]` and validates `class`. Envelope `type` stays for broader provenance enumeration. |
| 2026-09-07 | P3 DONE: @knowledgeassemble/chart-engine bar + line slices through full pipeline (scene → layout → SVG → a11y → tabular → validation → e2e), closed kind enum `["bar","line"]`, deterministic scales without d3, namespaced result events, golden fixtures, conformance `?engine=chart`, quantitative-chart authoring skill — full exit gate green. |
| 2026-09-08 | GeoMap-D1 — Closed P4 layer/entity sets: layer type is a closed enum `["region","marker","route","label"]`; entity `type` is a closed enum `["country","state","province","region","city","town","village","river","lake","mountain","landmark","place"]`. `flow`/`heatmap`/`animation`/`timeline`/`areas`/`scenes`/`assessment` are future and OUT. |
| 2026-09-08 | GeoMap-D2 — One deterministic projection: `content.projection.type` is a closed enum `["equirectangular"]` at P4. `viewport.fit` is `"content"` (deterministic bbox + padding) with optional `center`/`zoom`. No d3-geo. |
| 2026-09-08 | GeoMap-D3 — Namespaced result events: `select` → `geomap.entity-selected`; `focus` → `geomap.entity-focused`. Payload carries full resolved entity record (+ `links`). |
| 2026-09-08 | GeoMap-D4 — Geographic ground-truth binding: entity location binds to `{source, featureId}` OR `{coordinates: {lat, lon}}`. Route `path` refs point-like entities. Unresolved ref → `INVALID_REFERENCE`; invalid lat/lon/geometry → `INVALID_ENTITY`. |
| 2026-09-08 | P4 DONE: @knowledgeassemble/geomap-engine region → marker → route slice through full pipeline (scene → layout → SVG → a11y → alternative → validation → e2e), closed entity/layer types per GeoMap-D1, deterministic equirectangular projection (no d3), namespaced result events `geomap.entity-selected`/`geomap.entity-focused` per GeoMap-D3, golden fixtures (region/marker/route/odisha-coastal), conformance `?engine=geomap`, geographic-map authoring skill — full exit gate green. |
| 2026-09-08 | P4 review fixes (PR #9 RCs): viewport `center`/`zoom`/`padding` now honored by layout (region polygons → `path`, routes → `points`, legend/label roles rendered, `layer.visible:false` hides nodes); strict Zod content schema enforced via `validateSemantic` (`INVALID_SPEC` for unknown keys); new L2 geographic tier (`validateGeography`: FeatureCollection/geometry structure, lat/lon ranges, properties sanitization, entity↔featureId resolution, layer-kind compat) and L3 region-overlap check; `GeoMapEngine.validate` never throws (uri sources skip L3/L4); `sources[]` provenance required (DESIGN §9); honest provenance — all invented fixtures/skill-example/conformance geometry is `illustrative`; `$id`/`$schema` pinned to `https://knowledgeassemble.com/schemas/geomap-spec.schema.json` (+ `additionalProperties:false` `sources` required); golden `expected.{scene,svg,a11y,alternative}` outputs per fixture + docs skill-example round-trip; e2e data-fidelity suite (missing featureId → `INVALID_REFERENCE`, out-of-range geometry → `INVALID_ENTITY`, strict unknown-key → `INVALID_SPEC`) decoupled from animations; vitest config cleanup — full exit gate green. |
| 2026-09-08 | Timeline-D1 — Closed temporal model: `content.kind` stays `"events"` (P2.5-frozen literal); P5 adds optional `periods[]` / `tracks[]`. Period bands and track lanes are derived layout; events remain the only selectable entity type. |
| 2026-09-08 | Timeline-D2 — Namespaced result events: preserve `timeline.event-selected` (frozen, full event record + `links` — Gap-B contract). Add `timeline.event-focused` on D5 `focus`, same payload shape. Playback surfaces through core `state-changed` + `EngineState.playback` only — no `timeline.playback-*` invention. |
| 2026-09-08 | Timeline-D3 — Deterministic temporal semantics: closed grammar `^[+-]?\d{1,6}(-\d{2}){0,2}$`; pure integer proleptic-Gregorian day number; no `Date`/`Date.parse`/`Intl`/`toISOString`. Year-tick ladder `1,2,5,10,25,50,100,250,500,1000`. |
| 2026-09-08 | Timeline-D4 — Deterministic playback via core state: `playback`/`step` in `EngineState`; `play-pause` toggles; `step` clamps; `scrub` sets step to event index (replaces P2.5 UNSUPPORTED_ACTION — deliberate documented flip). `reset` clears. No derived `position` field. |
| 2026-09-08 | Scrub-flip note: P2.5 stub treated `scrub` → UNSUPPORTED_ACTION; P5 makes scrub supported — reducer-pure, sets `step` to target event's index via `findIndex`. Documented contract change. |
| 2026-09-08 | P5 DONE: @knowledgeassemble/timeline-engine events/periods/tracks slice through full pipeline (scene → layout → SVG → a11y → linear → validation → e2e), closed kind `"events"` per Timeline-D1, deterministic temporal scale without Date/Intl per Timeline-D3, namespaced result events `timeline.event-selected`/`timeline.event-focused` per Timeline-D2, playback via core `EngineState.playback`+`step` per Timeline-D4, P2.5 golden composition contract preserved (byte-stable golden log), golden fixtures (events/periods/tracks/independence), conformance `?engine=timeline`, temporal-timeline authoring skill — full exit gate green. |
| 2026-09-08 | P5 review fixes (PR #10 RCs): day-number math rewritten to Fliegel–Van Flandern (`prolepticGregorianDayNumber`) with `isValidCalendarDate`/`isLeapYear`/`daysInMonth` helpers — replaces the broken `y-3999` era hack; correct anchor `1947-08-15` = JDN 2432413; negative-year & leap/century probes; `yearOf` inversion verified. Tick axis now draws year labels at year-space positions (`niceYearTicks`) converted to day positions via `prolepticGregorianDayNumber(year,1,1)`; axis domain expands **outward** (`min/max` of content domain and first/last tick day) so content never clips past the last tick. New pre-existing bug found & fixed: `layout/engine.ts` merged marker/period domains with `nodeBounds`→`[0,1]` fallbacks — events-only content collapsed the axis to year ≈ −4713 (labels `-4000…1000`); domain now only includes present node kinds. `scene/build.ts` deduped the broken day-number fn → imports shared `parseDate`. `validate()` is now a real `renderForValidation` (wrap → `INVALID_STATE`/`INVALID_ENTITY` issues) instead of swallow-catch → `valid:true`. Strict `TimelineContentSchema.safeParse` enforced in `validateSemantic` → unknown content keys, duplicate events, unknown `kind` = `INVALID_SPEC`. New L2 tier: node-id namespace collisions (event ↔ `period-*` ↔ `track-*` ↔ default lane), reserved `track-default`, event↔track declarations (`event.trackId` + `tracks[].events`, multi-membership → `INVALID_ENTITY`, unknown refs → `INVALID_REFERENCE`), required `sources[]` (DESIGN §9). Calendar-range validation via `isValidCalendarDate` (month-13, Apr-31, non-leap Feb-29 → `INVALID_ENTITY`, passes grammar first). L4 tier wired through `runPipeline` (`validateAccessibility`: label, node labels, linear non-empty, no literal colors). Minor: `step` on empty seq → `INVALID_STATE` guard; `events.minItems:1` parity between JSON Schema (`docs/schemas/timeline-spec.schema.json`) and Zod; conformance `tryCreate` surfaces the first issue `code` (e2e data-fidelity asserts `INVALID_SPEC`/`INVALID_ENTITY`/`INVALID_REFERENCE`); core composition fixture + conformance lesson spec updated with `sources`/`accessibility`. Timeline suite 7→89 tests; full exit gate green. |
| 2026-09-08 | Diagram-D1 — Closed structural model: `content.kind` is a closed enum `["flow","cycle","hierarchy","concept-map"]`; `content.profile` optional closed enum `["process","system","concept","cause-effect"]`. `label-diagram` (image + anchored labels) is future. |
| 2026-09-08 | Diagram-D2 — Deterministic auto-layout with provenance: `layout.type` at envelope root, closed enum `["radial","hierarchical","grid"]` with fixed default per kind (cycle→radial, flow|hierarchy→hierarchical, concept-map→grid). Every laid-out position stamped `positionSource:'illustrative'`. |
| 2026-09-08 | Diagram-D3 — Cycle semantics per kind: `flow`/`hierarchy` MUST be acyclic (INVALID_ENTITY); `cycle` MUST have ≥1 directed cycle (INVALID_ENTITY); `concept-map` MAY have cycles. |
| 2026-09-08 | Diagram-D4 — Namespaced result events: `select` of node → `diagram.node-selected`; `focus` → `diagram.node-focused`; `follow` of edge → `diagram.relationship-followed`. Full node/edge record in payload. `expand`/`collapse` are baseReducer state ops with no bespoke event. |
| 2026-09-08 | Diagram-D5 — Authored edge ids: `follow` targets resolve to authored-or-derived compound `edge-<from>-<to>`. `relationship` required on every edge (never inferred). `expand`/`collapse` sub-graph tree defined by `relationship ∈ {contains, part-of}`. |
| 2026-09-08 | P6 DONE: @knowledgeassemble/diagram-engine nodes/edges/auto-layout slice through full pipeline (scene → graph analysis → layout → SVG → a11y → relationship-list → validation → e2e), closed kinds `["flow","cycle","hierarchy","concept-map"]` per Diagram-D1, deterministic auto-layout (radial/hierarchical/grid, no d3) with every position stamped `positionSource:'illustrative'` per Diagram-D2, cycle laws enforced per kind per Diagram-D3, namespaced result events `diagram.node-selected`/`diagram.node-focused`/`diagram.relationship-followed` per Diagram-D4, authored-or-derived edge ids for `follow` per Diagram-D5, golden fixtures (flow/cycle/hierarchy/concept-map/water-cycle), conformance `?engine=diagram`, structural-diagram authoring skill — full exit gate green. |
| 2026-09-08 | P6 review fixes (PR #11 RCs): strict `DiagramContentSchema.safeParse` enforced in `validateSemantic` — unknown content/node keys, unknown `kind`, and empty `nodes` → `INVALID_SPEC` (previously unknown content keys passed validation silently); `validate()` mirrors the P5 `renderForValidation` convention (render errors → `INVALID_STATE` issue, no swallow-catch → `valid:true`); golden `expected.{svg,scene,a11y,alternative}.json` per fixture now checked in and asserted byte-stable by `test/fixture.test.ts`, including `positionSource:'illustrative'` provenance on every laid-out node against `expected.scene.json` (exit-criterion-1 evidence), regenerated via `REGEN=1 vitest run test/fixture-gen.test.ts`; fixture README corrected (artifacts asserted by snapshot tests, not produced by conformance); conformance `tryCreate` surfaces the first issue `code`; e2e data-fidelity/rejection now assert shared codes (`INVALID_ENTITY`/`INVALID_SPEC`) and add the previously-missing unknown-content-key case. |
| 2026-09-08 | OpenEdu-D1 — `interactive-react` built here, seam-only, React isolated. `react`/`react-dom` as peerDeps; no `@open-edu/*` import. |
| 2026-09-08 | OpenEdu-D2 — §9.2 resolution: publish-and-consume external packages. Stay standalone `@knowledgeassemble/*`; rename/ monorepo move in consuming OpenEdu repo. |
| 2026-09-08 | OpenEdu-D3 — Lesson-node proposal schema: `{ type:"interactive", engine, spec }` per D1/§94; `additionalProperties:false`; parity test holds it to engine envelope range. |
| 2026-09-08 | OpenEdu-D4 — Widget compatibility is data + mapping, not schema change. Migration is progressive; parallel node types. No engine `kind`/schema edits for compat. |
| 2026-09-08 | OpenEdu-D5 — ADR re-recording: draft ADR-01…09 per `openedu-way/ADR.md` conventions; DESIGN §16 register links to them. Transplant is cross-repo acceptance. |
| 2026-09-08 | P7 DONE: @knowledgeassemble/interactive-react (OpenEduBridge → EngineHost seam, InteractiveNode/InteractiveLesson mounts, jsdom unit tests), package publishability (exports maps, files, prepublishOnly to all 7 packages), lesson-node proposal schema + composed-lesson fixture (reusing frozen P2.5 contract), widget-compat mapping data + round-trip tests, conformance `?engine=lesson` host-simulation route + browser e2e (cross-engine binding, replay, a11y, authoring proof), ADR-01…09 for D1–D9 with DESIGN §16 register links, doc test, `docs/p7-acceptance.md` cross-repo acceptance list — full exit gate green. P0–P7 completed — engine family ships as consumable product. |
| 2026-09-09 | Playground tooling (PLAN-PLAYGROUND Phases 0–7): `packages/dev-harness` shared mount/catalog, `apps/playground` dev UI (port 5174), conformance refactored to delegate engine routes to dev-harness + fixture catalog; `DEVELOPER-GUIDE.md` §9 documents playground usage. |
| 2026-09-09 | Visual-D10: add fraction-circle kind (sector fractions) + practice-mode discovery/guided interactivity (`interactive` prop) across Visual kinds — see practice-mode spec. |
| 2026-09-09 | P8 Workstream D-stub: practice mode workstream opened for Visual engine — V0 schema/VISUAL_KINDS, V1 interactivity behavior (clock/coordinate-grid/geometry/number-line/counting-set/fraction), V2 fraction-circle kind, V3 fixtures/docs. |
| 2026-10-02 | DESIGN D9 corrected: Visual closed set is ten kinds, not eight — eight mathematics components plus `comparison` plus `illustration`. `geometry-shape` was never a runtime kind name (the kind is `geometry`) and `illustration` was missing despite being in Visual SPEC §9 and used by three checked-in fixtures. `illustration` recorded as the `PLAN-P2.5` T0/T3 decision-gated exception: a geometry-less group of labelled `focus`/`select`-able entities whose picture is host-supplied, hence no drawing surface. Doc-truth fix at the highest document; no code change. |
| 2026-10-02 | Diagram skill projection repaired: `structural-diagram/SKILL.md` listed six relationships where SPEC §2 has ten, so an agent following it could author an edge that fails validation. Restored `feeds-on`, `transforms-to`, `produces`, `weathers-into` and the rule to name the actual relationship. SPEC §2 was already correct — only the generated projection was stale, so this is a docs fix with no contract change. Also states the previously-implicit rule that `links` values are opaque host-resolved references, never a URL, path, base64 blob, or coordinates (DESIGN §9). |
| 2026-10-02 | Visual closed-set enumerations aligned to `VISUAL_KINDS` in three documents, not one: DESIGN §82 (claimed eight kinds, and `geometry-shape` was never a runtime kind), PROJECT.md §8 (same two stale names plus a nonexistent `ten-frame`, under a "closed set — DESIGN D9" heading that contradicted the corrected DESIGN line), and Visual SPEC §9 (listed eleven names including `generic` and `interactive-scene`, neither present in the runtime or any fixture; §41/§59 examples using `interactive-scene` would fail `INVALID_SPEC` and are now labelled forward-looking). `VISUAL_KINDS` is named canonical. Doc-truth only; no code change. |
| 2026-10-02 | Closed the Visual closed-set drift loop. `schema-parity.test.ts` now asserts the prose enumerations equal `VISUAL_KINDS` (Visual SPEC §9, PROJECT §8) and that SPEC §82 carries no registry copy of its own — §82 previously listed eleven kinds including `timeline`, `label-diagram`, and `flowchart` as Visual components (the engine-smuggling anti-pattern, DESIGN §15) while omitting `fraction-comparison` and `illustration`; it now points at §9. `PLAN-P2.md` records the P2-scope list as superseded, since its instruction to validate new kinds against that list would have rejected `fraction` and `illustration`. Each guard was mutation-tested: the §82 copy check was initially vacuous because slicing from the heading made the section empty, and now fails when a list is reintroduced. |
