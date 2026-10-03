# OpenEdu Interactive Engine — Overall Design

**File:** `docs/DESIGN.md`
**Status:** Proposed (canonical for new work)
**Version:** 1.0.0
**Audience:** AI coding agents and engineers building the engines
**Scope:** The single source of truth for system-wide design decisions. Engine-specific detail lives in the engine documents referenced below.

---

## 1. Purpose

OpenEdu's Interactive Engine turns declarative, renderer-independent JSON specifications into interactive, accessible, educational learning experiences. It is shared infrastructure: OpenEdu consumes it through published packages; it never imports OpenEdu.

The design serves one goal above all:

> **Help the learner think, not merely display data.**

A chart must teach quantitative reasoning. A timeline must teach how things unfold. A diagram must teach how things connect. A map must teach where and why. Rendering is a means, comprehension is the contract.

This document fixes the system-wide decisions. Every new feature, package, or AI-agent task MUST be traceable to a section below. When an implementation cannot be traced back, the design is wrong — fix the design, not the implementation.

---

## 2. Design Principles

These principles are normative. Every engine and every change MUST satisfy them.

| # | Principle | Meaning |
|---|-----------|---------|
| P1 | **Semantic-first** | Specifications describe *meaning* (entities, relationships, intent), never pixels. Rendering is derived. |
| P2 | **Declarative, no code** | An engine's input is JSON data. No inline scripts, no HTML, no SVG fragments, no imperative behavior. |
| P3 | **Renderer-independent** | The same specification renders correctly on SVG today and WebGL tomorrow. No engine couples to one renderer. |
| P4 | **Deterministic** | Identical input MUST produce identical output and identical runtime behavior. No randomness in layout, styling, or selection. |
| P5 | **AI-first authoring** | Agents write specifications, not renderer code. Schemas are strict enough to prevent hallucinations. |
| P6 | **Accessible by default** | Semantics carry the structure, roles, and labels needed for a11y. Accessibility is produced, not patched on. |
| P7 | **Localizable** | All user-facing strings are selectable and localizable. No engine hard-codes natural language. |
| P8 | **Composable** | Engines are composable within a lesson. A timeline can drive a map; a chart can annotate a diagram. |
| P9 | **Educational intent** | Every artifact declares a purpose and may carry optional `questions` / `completion` hints (D7); OpenEdu owns scoring and feedback. |
| P10 | **Secure by construction** | Unknown properties are rejected, not ignored. No scripting surfaces reach learners. |
| P11 | **Validation over trust** | Input passes through layered validation (schema → semantic → layout → accessibility) before rendering. |
| P12 | **Library-first, service-optional** | Engines are npm/type packages usable offline. Remote services MAY exist but are never required. |

---

## 3. One Contract, Five Engines

The Interactive Engine is a single runtime with five semantic engines. Each engine owns one reasoning space.

| Engine | Reasoning space | Question it teaches | `type` value | Docs |
|--------|-----------------|---------------------|--------------|------|
| **Visual** | Spatial manipulation and visual objects | What should the learner *see and interact with*? | `visual` | `docs/engines/visual/` |
| **GeoMap** | Geographic and spatial relationships | Where are things, and why there? | `geomap` | `docs/engines/geomap/` |
| **Chart** | Quantitative relationships | How much, and how does it compare? | `chart` | `docs/engines/chart/` |
| **Timeline** | Temporal relationships and change | When did things happen, and what unfolds through time? | `timeline` | `docs/engines/timeline/` |
| **Diagram** | Structural and conceptual relationships | How are things connected? | `diagram` | `docs/engines/diagram/` |

All five engines share:

- one specification envelope (Section 4),
- one runtime contract for state, events, interactions, and semantics (`docs/INTERACTIVE-ENGINE-SPEC.md`),
- one validation and conformance model (Section 11),
- one AI-authoring contract (Section 10).

**Maturity.** Engines are not equally specified. This is intentional — the platform contract is built before the visualization surface. Current maturity:

| Engine | Vision | Normative spec | JSON Schema |
|--------|--------|----------------|-------------|
| Visual | — | `SPEC.md` (v1.0) | inline in spec |
| GeoMap | `VISION.md` | `SPEC.md` (v1.0.0) | `docs/schemas/geomap-spec.schema.json` |
| Chart | `VISION.md` | `SPEC.md` (thin) | `docs/schemas/chart-spec.schema.json` (canonical source: `packages/chart-engine/src/schemas/`) |
| Timeline | `VISION.md` | `SPEC.md` (thin) | `docs/schemas/timeline-spec.schema.json` |
| Diagram | `VISION.md` | `SPEC.md` (thin) | `docs/schemas/diagram-spec.schema.json` |

**Relationship to OpenEdu widgets.** OpenEdu already ships a widget system (`core.multiple-choice`, `social.map`, `math.number-line`, …) — UI components answering *"How do I display this UI?"*. Engines are a separate, richer layer: semantic interactive systems answering *"What does this interactive educational object mean, and how can the learner reason through it?"* (shared contract §96).

- Widgets REMAIN as lightweight presentation primitives (§95).
- Engines are embedded in lessons by the OpenEdu Course Specification, not registered as widgets (§94).
- Existing widgets SHOULD progressively migrate toward engines where appropriate: `core.timeline` → Timeline Engine; `science.label-diagram` → Diagram Engine; `core.hotspot`, `core.image-compare` → Visual Engine (§95).
- The five engines are complementary reasoning spaces — "not five unrelated widgets" (§99).

**Visual closed component set (D9).** Visual has ten kinds: eight mathematics components (`number-line`, `counting-set`, `fraction`, `fraction-circle`, `fraction-comparison`, `clock`, `coordinate-grid`, `geometry`) plus `comparison` and `illustration`. `illustration` is a deliberate, decision-gated exception (`PLAN-P2.5` T0/T3): a geometry-less group of labelled, `focus`/`select`-able entities whose picture is supplied by the host, so it adds no drawing surface of its own. Timeline, flowchart, and label-diagram are **not** Visual components — use Timeline or Diagram engines. See `engines/visual/PROJECT.md` §8 and `engines/visual/SPEC.md` §9.

---

## 4. Specification Envelope

### D1 — Single envelope (supersedes split forms)

Older documents proposed conflicting top-level shapes:

- `interactive-engine.schema.json` requires top-level `type` / `version` / `id`.
- The GeoMap spec wrapped everything in `{ "geomap": { ... } }` (`engines/geomap/SPEC.md` circa §7).
- The Visual spec used a `schemaVersion` field (`engines/visual/SPEC.md` §7).

**Decision: there is exactly one envelope at the engine-specification level.** All engines adhere to the base schema at `docs/schemas/interactive-engine.schema.json`. The `geomap` wrapper and `schemaVersion` forms are superseded and MUST NOT be used in new specifications. Existing examples in the GeoMap and Visual specs are migrated to the shared envelope, not copied forward.

An engine is a **component of a course/lesson**, not a standalone artifact (shared contract §94): Course → Lesson → Content + Activity + Interactive Engine. The lesson embeds the engine instance; the exact embedding contract is defined by the OpenEdu Course Specification:

```json
{
  "type": "interactive",
  "engine": "timeline",
  "spec": { }
}
```

Here `type` is the lesson node kind (`interactive`), `engine` names the semantic engine, and `spec` carries that engine's specification — the envelope below. The `engine` field must match the engine's `type` value (`visual`, `geomap`, `chart`, `timeline`, `diagram`).

Canonical engine-specification shape:

```json
{
  "type": "visual",
  "version": "2.1.0",
  "id": "number-line-02",
  "metadata": { "author": "openedu-agent" },
  "purpose": {
    "learningObjective": "Estimate where fractions sit between 0 and 1",
    "interactionGoal": "Place or select a value on the number line",
    "reasoningMode": "estimate"
  },
  "content": { },
  "layout": { },
  "interaction": { },
  "questions": [ ]
}
```

Envelope rules (from `docs/schemas/interactive-engine.schema.json`):

- `type` — REQUIRED. Engine type, pattern `^[a-z][a-z0-9-]*$`. Each engine schema constrains the exact value.
- `version` — REQUIRED. Semver of the *engine specification*, not of the document.
- `id` — REQUIRED. Stable identifier within the lesson, pattern `^[a-zA-Z][a-zA-Z0-9._-]*$`, ≤ 128 chars.
- `metadata`, `purpose`, `content`, `layout`, `interaction`, `questions` — OPTIONAL (per engine requirements). `content` is engine-specific semantic content.
- `purpose` — when present, MUST match schema `$defs.purpose` (D4): `learningObjective` REQUIRED; `interactionGoal` and `reasoningMode` OPTIONAL. `skill` and `statement` are invalid.
- `interaction` — when present, MUST match schema `$defs.interaction` (`mode`, `actions`, `guided`, `allowReset`, `allowUndo`, `allowRedo`). Engine-specific targets (what is selectable) live in `content`, not here.
- `additionalProperties: false` at the envelope level. Unknown keys are a validation error (P11).

Each engine's `content`, `interaction`, and layout semantics are the exclusive concern of that engine's spec — the envelope only guarantees that every engine speaks the same interface.

---

## 5. Pipeline and Architecture

Every engine implements the same pipeline. Engines differ only in the middle (scene model and layout); the ends are shared.

```text
   Interactivity                                  JSON Specification
   Engine v JSON  ▼
DECLARATIVE SPEC ──> SCHEMA VALIDATION ──> SEMANTIC MODEL/SCENE ──> LAYOUT ──> RENDERER ──> LEARNING EXPERIENCE
   (ai agent)         (rejects ill-formed)     (resolves references,     (geometry)     (SVG now,
                      4 validation levels)      selects roles, styles)                  WebGL later)
                                                         │
                                                         ▼
                                             STATE + EVENTS + INTERACTION (runtime)
                                                         │
                                                         ▼
                                   accessibility tree · questions · feedback · completion
```

The pipeline is **compiler-oriented** (`engines/visual/ARCHITECTURE.md` §15): a specification is compiled forward through stages, and each stage is testable in isolation. No stage reaches back.

Shared stages, all engines:

| Stage | Produces | Failure mode |
|-------|----------|--------------|
| 1. Schema validation | validated JSON | `INVALID_SPEC`, `INVALID_VERSION`, `INVALID_REFERENCE` |
| 2. Semantic build | concrete scene/entity graph | `INVALID_ENTITY`, `INVALID_ACTION`, `INVALID_STATE` |
| 3. Layout | positioned, measured geometry | layout constraint violation |
| 4. Render | renderer output + a11y tree + event wiring | `RESOURCE_ERROR` |
| 5. Runtime | interactive learning experience | `UNSUPPORTED_ACTION`, `ACCESSIBILITY_ERROR` |

Error codes are defined in `docs/INTERACTIVE-ENGINE-SPEC.md` §67 (Common Error Model): `INVALID_SPEC`, `INVALID_VERSION`, `INVALID_ENTITY`, `INVALID_REFERENCE`, `INVALID_ACTION`, `INVALID_STATE`, `UNSUPPORTED_ACTION`, `RESOURCE_ERROR`, `ACCESSIBILITY_ERROR`. Engines MUST raise these codes, never bespoke ones.

---

## 6. Repository and Packages

### D2 — Package structure follows the shared contract (supersedes standalone Visual repo)

Older Visual documents declared their own repository (`knowledgeassemble/visual-engine`) and package graph (`@knowledgeassemble/visual-schema`, `visual-core`, `visual-renderer-svg`, `visual-validator`). They are superseded for packaging; use them for *architecture* only.

**Decision: the engine packages follow the structure recommended by the shared contract §90.** A shared `interactive-engine` core plus one package per engine, each with its own `schemas/<engine>-spec.schema.json`:

```text
packages/
  interactive-engine/        core: engine.ts, state, action, event, registry, validation;
                             accessibility/ · composition/ · runtime/ · schemas/
  visual-engine/             src/ + schemas/visual-spec.schema.json
  geomap-engine/             src/ + schemas/geomap-spec.schema.json
  chart-engine/              src/ + schemas/chart-spec.schema.json
  timeline-engine/           src/ + schemas/timeline-spec.schema.json
  diagram-engine/            src/ + schemas/diagram-spec.schema.json
```

Rules:

- The exact repository location may differ (§90); the conceptual separation MUST remain.
- **Namespace follows the host repository.** Standalone, packages are `@knowledgeassemble/interactive-*` (`docs/STRUCTURE.md` §7). When integrated into the OpenEdu monorepo, they adopt that workspace's `@open-edu/*` convention.
- Engine packages depend on `interactive-engine` core + schema; they MUST NOT depend on each other. Cross-engine behavior is achieved through composition (Section 13), not internal imports.
- Engines are consumed via lesson embedding (Section 4) and as libraries by the OpenEdu runtime.

---

## 7. Shared Runtime Model

Source of truth: `docs/INTERACTIVE-ENGINE-SPEC.md`. The runtime is the same for every engine.

### 7.1 Shared vocabulary

These terms have identical meaning in every engine:

- **entity** — a thing in the scene (a point, a bar, a node, a place, an event) with semantic roles.
- **relationship** — a semantic link between entities (compare, contains, causes, connects).
- **action** — an operation invoked by the learner or the engine from the D5 set (`select`, `focus`, `filter`, `play-pause`, `answer`, …).
- **event** — an immutable, timestamped record of something that happened. Events are the only way state changes.
- **state** — the current, derived observable condition of the scene (selection, focus, phase, playback).
- **annotation** — explanatory text bound to an entity with a role (hint, fact, question, feedback).
- **question / answer / feedback** — the assessment triples any engine may emit.
- **source** — provenance for a claim (authoritative, illustrative, simulated), see Section 9.
- **activity** — a discrete learner task with a completion condition.

### 7.2 State and events

- State changes are reached ONLY by dispatching events. There is no direct mutation API for consumers (determinism, P4).
- The event log is serializable and replayable — a lesson can be replayed, stepped through, or time-traveled.
- The runtime exposes a read-only scene snapshot plus an action surface.

### 7.3 Engine lifecycle

1. **Register** — the engine type is registered with the registry (`core`).
2. **Validate** — envelope + engine schema (Section 4, 11).
3. **Instantiate** — build the semantic scene.
4. **Run** — render, wire events, begin state.
5. **Teardown** — release, preserve final state snapshot.

### 7.4 Actions and events (D5)

JSON specifications and `dispatch()` use **semantic actions** only. Renderer input (`click`, `pointer.enter`, `keyboard`) MUST be translated into a semantic action before it enters the engine reducer. Renderer input MUST NOT appear in specifications.

Standard action set (closed enum; schema `$defs.actionType`):

| Group | Actions |
|---|---|
| Selection | `select`, `deselect`, `focus`, `unfocus` |
| Filter | `filter`, `clear-filter` |
| Annotation | `open-annotation`, `close-annotation` |
| Assessment | `answer`, `compare` |
| Disclosure | `toggle`, `expand`, `collapse` |
| View | `zoom`, `pan`, `scrub`, `jump-to` |
| Playback | `play-pause`, `step` |
| Manipulation | `drag`, `drop`, `place`, `move`, `connect`, `disconnect`, `follow` |
| Session | `reset` |

Not every engine supports every action. Engines declare the subset they accept in `interaction.actions`. Additional actions MUST be namespaced (`geomap.focus-place`) and documented in that engine’s spec.

Superseded names (MUST NOT appear in new specs): `highlight` (use `select` or `focus`), `annotate` (use `open-annotation` / `close-annotation`), `blur` (use `unfocus`), `play` (use `play-pause`), `show` (use `open-annotation`).

Semantic **events** are the only way state changes (§7.2). Naming:

- Lifecycle (unqualified): `engine-mounted`, `engine-ready`, `engine-reset`, `state-changed`, `interaction-started`, `interaction-completed`.
- Action results: `<engine>.<entity>-<result>` (e.g. `timeline.event-selected`, `geomap.region-focused`).

Composition binds an emitted event to another instance’s semantic action (Section 13). Pointer coordinates and DOM ids MUST NOT appear on events.

---

## 8. Rendering Model

- **Initial renderer: SVG.** All engines render to semantic SVG first (`engines/visual/ARCHITECTURE.md`). Canvas/WebGL are deferred implementation details and MUST NOT change the specification surface.
- Every engine has a scene graph between semantics and geometry. Layout engines position entities; renderers draw the result. No renderer reads the raw specification and draws directly.
- Rendering output includes, alongside visual output: an **accessibility tree**, **event wiring**, and **metadata** (roles, labels, provenance).
- Styling is **tokenized** and themeable (shared tokens → engine tokens). Specifications use semantic style tokens (`emphasis`, `danger`, `focus`), never raw colors.

---

## 9. Data and Assets

- Data is first-class: datasets, sources, and geo/temporal data are declared in the specification and bound to entities.
- **Provenance** — every factual claim SHOULD carry a source with an accuracy class:
  - `authoritative` — from a canon source for the lesson.
  - `illustrative` — simplified for teaching; may compress reality.
  - `simulated` — hypothetical; clearly labeled, never presented as fact.
- Engines MUST NOT invent facts, boundaries, or values that are not present in the data (GeoMap rule, `engines/geomap/SPEC.md` §9; anti-pattern, Section 15).
- Assets (images, files) are referenced by ID and resolved by the runtime's asset layer. Specifications never embed heavy binary payloads.
- **Media slots** — a node MAY declare `media: { kind: "figure" }` to reserve a host-fillable box. The engine owns the geometry: a fixed 220×120 box with the label drawn below it on the default baseline, the reservation carried as `data-oedu-bounds`. The host owns the asset: it anchors a figure at the node's bounds by authored id and never rescales the box (D9). The engine never embeds, resolves, or styles a picture. Nothing is conveyed by the frame fill alone — the label sits outside the box, so a placed figure cannot cover it (P6).
- Everything MUST work fully offline (P12).

---

## 10. AI Authoring Contract

AI agents are first-class authors. They produce specifications — never renderer code, never raw SVG.

### 10.1 Agent MUST

- output valid JSON matching this design, the envelope (Section 4), and the target engine schema;
- model all content **semantically** (entities and relationships resolve to real concepts);
- apply styling through **semantic tokens**, not literal colors;
- provide **accessible labels** for every interactive and meaningful entity;
- carry **provenance** for factual/historical/geographic claims (Section 9);
- bound interactions to documented actions (7.4) and events.

### 10.2 Agent MUST NOT

- emit raw SVG, HTML fragments, coordinates, or pixel values (P2);
- emit event handlers, inline scripts, embedded `<script>`, or `javascript:` URIs (P10);
- rely on color alone to convey meaning (P6);
- invent geographic boundaries, historical events, numeric values, or structural facts absent from the data;
- use vague directives as schema properties (banned: `makeItPretty`, `drawNicely`, `svgMagic` and analogues — see `engines/visual/SPEC.md` §14).

### 10.3 Tool surface

Agents SHOULD be given engine tooling mirrors of `geomap.*` pattern — e.g. `<engine>.create`, `<engine>.validate`, `<engine>.preview`, `<engine>.resolve-entity`. Tool surface detail lives per engine (`engines/geomap/SPEC.md` §"AI tools").

---

## 11. Validation and Conformance

All engines validate in four accumulating layers. An input fails the pipeline if it fails any lower layer.

| Layer | Checks | Representative error |
|-------|--------|----------------------|
| **L1 Schema** | envelope + engine schema, `additionalProperties:false` | `INVALID_SPEC` |
| **L2 Semantic** | references resolve, entities valid, relationships typed, actions/state legal, provenance complete | `INVALID_REFERENCE`, `INVALID_ENTITY` |
| **L3 Layout** | geometry feasible, no unconstrained/overlapping required regions | layout error |
| **L4 Accessibility** | labels present, contrast/roles valid, no color-only encoding | `ACCESSIBILITY_ERROR` |

### Conformance suite

- A shared conformance suite (`docs/STRUCTURE.md` §36) is the machine-readable source of truth for "done". Every engine MUST pass:
  - schema + semantic conformance tests,
  - unit tests on scene/layout stages,
  - golden-fixture rendering tests,
  - Playwright interaction + accessibility tests on the real installed package.
- Golden fixtures are checked into the repo. Renderer upgrades invalidate fixtures and require review — silently changing output is a conformance failure.

---

## 12. Accessibility, Theming, Localization

- **Accessibility** — the a11y tree is a first-class pipeline output (Section 8). Interactive entities get roles, labels, keyboard reachability, and focus management. Nothing is conveyed by color alone; screen-reader and keyboard paths are tested in conformance (L4). Host accessibility preferences (`reducedMotion`, contrast, language) are consumed, not re-owned (D6).
- **Theming** — engines consume a **host token set**. They MAY add engine-local tokens that alias host tokens. They MUST NOT ship a second design-system source of truth. OpenEdu’s design-system / learner theme is the host when running in OpenEdu.
- **Localization** — all strings separate from semantics. The host supplies locale and resolved catalogs (OpenEdu `@open-edu/i18n` when embedded). Engines MUST NOT ship a parallel i18n product.

### 12.1 OpenEdu host seam (D6)

OpenEdu already owns course packages, Zod schemas, XState workflow, quiz/reflection nodes, widget catalog, sandboxed community widgets, Course Creator Studio, Pipili, telemetry, tokens, i18n, PWA, and `.oep` distribution.

Interactive Engine SHALL NOT rebuild those as a parallel runtime. P1–P6 implement **engine capabilities**; they do not reimplement the learner application.

| Concern | Owner | Engine role |
|---|---|---|
| Course, lesson, workflow, mastery | OpenEdu (`@open-edu/workflow`) | None |
| Quiz scoring, rewards, Knowledge Cards | OpenEdu | Emit D5 events and a serializable snapshot; do not score |
| Hints and tutoring | OpenEdu Pipili | Snapshot + events are context; engines do not hint |
| Telemetry persistence | OpenEdu (`@open-edu/telemetry`) | Emit events only; no store, no JSONL, no RxJS product |
| Theme tokens | OpenEdu design-system | Consume `EngineHost.tokens` |
| Locale and copy | OpenEdu (`@open-edu/i18n`) | Consume `EngineHost.locale` / resolved strings |
| Authoring | OpenEdu Course Creator Studio | Playground/CLI for engine developers only |
| Widgets | OpenEdu catalog | New lesson node `interactive`; widgets remain until migrated |
| PWA, auth, `.oep`, storage | OpenEdu | None |
| Spec validation, scene, layout, SVG, D5 reducer | Interactive Engine | Exclusive |

Envelope `questions` and `completion` are **optional authoring hints** (D7). OpenEdu quiz nodes, workflow, and Pipili evaluate and tutor; engines emit D5 events and expose snapshot state. Engines MUST remain correct with empty `questions` and without envelope `completion`.

Host adapter (framework-independent; engines MUST NOT import OpenEdu packages):

```text
EngineHost
├── locale
├── tokens
├── reducedMotion
├── announce(message)
├── onEvent(semanticEvent)
└── resolveAsset(id) → URL | bytes
```

Standalone playground implements a stub host. The learner app implements the real host.

---

## 13. Cross-Engine Composition

Multiple engines MAY coexist in a single lesson, composed through the shared runtime, not through engine-to-engine imports (Section 6).

- Each engine instance owns its state and events; the runtime routes **domain events** between instances through a shared event bus.
- Composition is explicit: an event emitted by one instance (`timeline.event-selected`, `geomap.region-focused`) is bound by the lesson to another's action (`focus`). Namespaced engine actions (`geomap.focus-place`) are allowed when documented.
- **P2.5 (D8)** proves composition immediately after the Visual slice — before the Chart/GeoMap fleet. Canonical fixture: `docs/fixtures/composition/narrative-timeline-visual.json` (timeline stub spec + visual spec + lesson bindings). Waiting until P7 risks building five isolated widgets.
- Canonical composition patterns (to be developed as conformance-tested examples):
  - *Narrative*: Timeline drives GeoMap and Visual (event on timeline → place highlighted on map → figure comes alive).
  - *Explanatory*: Diagram → Chart - a node's detail chart opens beside it.
  - *Comparative*: Chart ↔ Visual - selecting a bar annotates the diagram.
- Composition MUST NOT couple engines' internal IDs or packages; only public events and actions cross interfaces.

---

## 14. Implementation Phases

### D3 — Platform first, then engines

Two older documents defined competing phase plans:

- `docs/STRUCTURE.md` §49: Phase 1 platform (schema, core runtime, registry, state, events, interaction DSL, accessibility, primitives) → Phase 2 Visual → Phase 3 Chart → Phase 4 GeoMap → Phase 5 Timeline → Phase 6 Diagram.
- `engines/visual/PROJECT.md` §"Phases 1-10": Visual-internal sequence (Foundation → SVG Renderer → Layout → Educational Components → Validator → Themes → CLI → Agent Skill → Playground → OpenEdu Integration).

**Decision: adopt the STRUCTURE sequence at the program level; adopt the Visual sequence as the shape of the per-engine cycle.** The platform contract comes first ("establish the platform contract rather than maximize visualization types").

Program phases and exit criteria:

| Phase | Scope | Exit criteria (all MUST be green) |
|-------|-------|------------------------------------|
| P0 | This design + ADR-equivalent decisions (D1–D6) + one envelope | DESIGN.md stable; envelope enforced in schema package |
| P1 | Thin platform: schema, core, D5 DSL, host adapter stub, conformance | envelope + events/state through Playwright; **no** telemetry/i18n/Studio/scoring products; no engine yet |
| P2 | Visual Engine | number-line vertical slice: spec → scene → layout → accessible SVG → fixtures + agent skill |
| P2.5 | Composition smoke test | harness routes `timeline.event-selected` → Visual `focus` using composition fixture; no full Timeline renderer required |
| P3 | Chart Engine | bar + line slices through full pipeline |
| P4 | GeoMap Engine | GeoJSON regions/markers/routes — MVP list (`engines/geomap/SPEC.md` §82) |
| P5 | Timeline Engine | events/periods/tracks slice |
| P6 | Diagram Engine | nodes/edges/auto-layout slice |
| P7 | OpenEdu integration | `EngineHost` in learner app, `{ type: "interactive" }` node, widget compatibility, ADRs |

Every engine runs the same lifecycle, mapped from `engines/visual/PROJECT.md`:

```
Spec → Schema → Validator → Scene → Layout → Renderer(SVG) → Interaction
     → Accessibility → Conformance+fixtures → Agent skill → Playground → OpenEdu proof
```

Phase planning is maintained in a living document (`docs/PLAN.md`), not in this design. This design fixes *what and why*; the plan sequences *when and who*.

---

## 15. Non-Goals and Anti-Patterns

### Non-goals

- NOT a generic charting library. Charts are for teaching, not dashboards.
- NOT a game engine. Animation is a teaching aid, not the product.
- NOT a geographic information system. Maps are for learning, not analysis.
- NOT a code editor. Learners interact with rendered experiences, never with JSON.
- NOT a rendering framework. Engines compose *experiences*, not widgets.
- NOT a second OpenEdu: not Course Creator Studio, not Pipili, not telemetry storage, not workflow/scoring, not PWA (D6).
- No server is required to render a lesson. Services are optional.

### Anti-patterns (prohibited)

- **Raw-artifact authoring** — hand-writing SVG, HTML, or coordinates as the canonical artifact. Semantic spec is the artifact.
- **Kind-of-sort-of semantics** — properties whose names sound semantic but carry renderer trivia (`width`, `color`, `x`, `y` at the spec surface).
- **LLM pleaser properties** — vague directives that let a model "do its best" (`makeItPretty`, `svgMagic`, `drawNicely`). Strictness prevents hallucination (P5).
- **Silent broadening** — treating an unknown key by ignoring it. `additionalProperties:false`; typos must fail loudly.
- **Color-only meaning** — any meaning encoded only as hue.
- **Engine smuggling** — one engine importing another engine's package to add behavior. Compose instead.

---

## 16. Decision Register

This repository is starting fresh (no prior production code), so decisions are recorded here rather than as separate ADR files. Future decisions that change behavior SHOULD be appended here with a date and supersede note.

| ID | Decision | Status | ADR |
|----|----------|--------|-----|
| D1 | Engine-specification envelope (`type`/`version`/`id`, base schema) embedded in lessons as `{ "type": "interactive", "engine", "spec" }` per shared contract §94; `geomap` wrapper and `schemaVersion` superseded | Supersedes GeoMap §7, Visual §7 envelope forms | [ADR-01](adr/ADR-01.md) |
| D2 | Package structure per shared contract §90; namespace follows the host repository; standalone `@knowledgeassemble/visual-*` packaging superseded | Supersedes Visual ARCHITECTURE §41-42, Visual PROJECT §18, and STRUCTURE §7 naming when integrated | [ADR-02](adr/ADR-02.md) |
| D3 | Platform-first program sequence (STRUCTURE §49) with per-engine lifecycle (Visual PROJECT phases) mapped as an exit-gated cycle | Reconciles STRUCTURE §49 and Visual PROJECT §Phases | [ADR-03](adr/ADR-03.md) |
| D4 | `purpose` is `$defs.purpose` in `interactive-engine.schema.json`: `learningObjective` (required), `interactionGoal`, `reasoningMode`. `skill` / `statement` superseded | Aligns DESIGN/PLAN examples with the envelope schema and shared contract §10 | [ADR-04](adr/ADR-04.md) |
| D5 | One semantic action enum (`$defs.actionType`) and namespaced result events. Pointer/click/keyboard are renderer input, not spec vocabulary. `highlight` / `annotate` / `blur` / `play` / `show` superseded | Aligns DESIGN §7.4, shared contract §15/§82, STRUCTURE §25–26, envelope schema | [ADR-05](adr/ADR-05.md) |
| D6 | OpenEdu host seam: engines emit D5 events + snapshot and consume `EngineHost`. OpenEdu owns workflow, scoring, Pipili, telemetry store, tokens, i18n, Studio, PWA. No second Interactive Studio or assessment engine | Supersedes PLAN P7 "then reuse OpenEdu runtime" as a late surprise | [ADR-06](adr/ADR-06.md) |
| D7 | Assessment seam: envelope `questions` / `completion` are hints for authoring and AI; **OpenEdu owns scoring, feedback, hints, and progression**. Engines MUST NOT require envelope questions to function | Prevents dual quiz systems (F6) | [ADR-07](adr/ADR-07.md) |
| D8 | Composition proof at **P2.5** (after Visual), not P7-only. Fixture: `docs/fixtures/composition/narrative-timeline-visual.json` | Product proof before engine fleet (F5) | [ADR-08](adr/ADR-08.md) |
| D9 | Visual **closed component set** (7 math/general kinds). Timeline, flowchart, and label-diagram belong to Timeline/Diagram engines — not Visual (F8) | Supersedes Visual PROJECT §8 items 8–11 | [ADR-09](adr/ADR-09.md) |

**Governance.** This register is the decision record for the standalone project, sitting below the shared contract per its spec hierarchy (§91). At P7 (OpenEdu integration) each D-row was re-recorded as an ADR following `openedu-way/ADR.md` conventions (sequential numbering, lifecycle, supersede rules) in `docs/adr/`. The ADR column links to the per-decision file. Transplant into `openedu-way` is a cross-repo acceptance item (P7).

---

## 17. Glossary

Terms are normative. Engine specs may extend, never redefine.

- **Engine** — one of five semantic reasoners (visual, geomap, chart, timeline, diagram).
- **Specification** — a JSON document validated by the envelope + engine schema (`type`/`version`/`id` + content/interaction/layout/questions).
- **Scene / semantic model** — the resolved in-memory graph of entities and relationships produced from a specification.
- **Entity / relationship / state / annotation / source / activity** — see §7.1.
- **Action** — a D5 semantic operation (`select`, `play-pause`, …). Not a pointer event.
- **Event** — an immutable record of a state change; action results are namespaced `<engine>.<entity>-<result>`.
- **Provenance class** — `authoritative` | `illustrative` | `simulated` (§9).
- **Conformance** — the shared automated suite defining "done" for an engine (§11).
- **Lesson** — one or more composed engine instances plus routing, questions, and completion, presented to a learner.
- **Widget** — an OpenEdu UI component answering "how do I display this UI?"; remains a lightweight presentation primitive, distinct from engines (§3, shared contract §96).
- **Host / EngineHost** — the embedding application (OpenEdu learner, or a playground stub) that supplies tokens, locale, assets, and receives events (D6).
- **OpenEdu** — the consumer application; owns workflow, scoring, Studio, and persistence; embeds engines and MUST never be imported by engine packages (D6).

---

## 18. Document Map

| Document | Role |
|----------|------|
| **DESIGN.md** (this file) | System-wide decisions, principles, contract of contracts |
| `docs/INTERACTIVE-ENGINE-SPEC.md` | Shared architecture & semantic contract (§1-101): vocabulary, actions, events, state, error model, spec hierarchy |
| `docs/SYSTEM-ARCHITECTURE.md` | High-level system architecture: runtime model, engine contract, validation pipeline, composition, host seam, packaging |
| `docs/DEVELOPER-GUIDE.md` | How to integrate and how to extend the engines |
| `docs/STRUCTURE.md` | Repository layout, package names, tech stack, platform phases (§7 naming per D2) |
| `docs/schemas/interactive-engine.schema.json` | Machine-readable envelope |
| `docs/engines/<engine>/VISION.md` | Why — learning philosophy and educational roles |
| `docs/engines/<engine>/SPEC.md` | What — normative declaration and examples |
| `docs/engines/<engine>/ARCHITECTURE.md`, `COMPONENTS.md`, `PROJECT.md` | How — implementation guidance for a specific engine (Visual only today) |

**Reading order for agents:** DESIGN.md → INTERACTIVE-ENGINE-SPEC.md → SYSTEM-ARCHITECTURE.md → (DEVELOPER-GUIDE.md) → target engine's SPEC.md/VISION.md → (Visual) `engines/visual/ARCHITECTURE.md` (engine implementation only, not the system architecture).