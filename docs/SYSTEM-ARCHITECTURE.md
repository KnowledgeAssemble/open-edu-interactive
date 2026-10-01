# OpenEdu Interactive Engine — System Architecture

This document describes the **system architecture**: the runtime model, the engine contract, the validation pipeline, the composition layer, the host seam, and the packaging topology. For canonical design rationale and decisions (P1–P12, D1–D9) see [`DESIGN.md`](DESIGN.md); for the shared contract see [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md); for how to integrate and extend see [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md).

> This is the **system** architecture. The Visual engine has its own implementation doc, `docs/engines/visual/ARCHITECTURE.md`, which is engine-internal and not the system architecture.

## 1. System overview

Course authors describe **what an interactive should mean**, in declarative, renderer-independent JSON. The engine family decides **how it is rendered and how it behaves**. One contract, five engines (Visual, GeoMap, Chart, Timeline, Diagram), all sharing the same lifecycle, state, eventing, and validation model. OpenEdu never imports the engine; the engine is hosted through a narrow seam (`EngineHost`) and driven by dispatching *semantic* actions. Coordinates, pixels, SVG, and event handlers never appear in a spec.

```
            ┌──────────────────────────────────────────────────────────────┐
            │                        HOST (OpenEdu)                        │
            │      CourseRuntime · Studio · authoring skills               │
            └───────────────────────────────┬──────────────────────────────┘
                                            │ OpenEduBridge (React) / EngineHost (raw)
                                            ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │                       INTERACTIVE ENGINE (core, shared)               │
   │                                                                        │
   │   ┌──────────────┐    ┌───────────────┐    ┌──────────────────────┐    │
   │   │  Registry     │┌─▶│  Engine       │◀───│  Composition          │    │
   │   │ (type→Engine) ││   │  contract     │    │  Lesson · Router      │    │
   │   └──────────────┘┘    └───────┬───────┘    └──────────────────────┘    │
   │                                │ instantiate / dispatch                 │
   │                                ▼                                        │
   │   ┌───────────────────────────────────────────────────────────────┐    │
   │   │   Validation pipeline  L1 → L2 → L3 → L4                      │    │
   │   │   Envelope → Semantic → Layout → Accessibility                │    │
   │   └───────────────────────────────────────────────────────────────┘    │
   │                                │                                        │
   │                                ▼                                        │
   │   ┌───────────────────────────────────────────────────────────────┐    │
   │   │   Runtime instance: reducer + event log + subscribers         │    │
   │   └───────────────────────────────────────────────────────────────┘    │
   └────────────────────────────────┬───────────────────────────────────────┘
                                    │ events (serializable, replayable) / announce / snapshots
                                    ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │                          ENGINE PACKAGES (engines)                    │
   │                    visual · geomap · chart · timeline · diagram        │
   │              each: validate (semantic/layout/a11y hooks) + render      │
   └────────────────────────────────────────────────────────────────────────┘
```

The engine packages are deliberately **separate** from the core: they are published independently, import only the core (never each other, never `@open-edu/*`), and can be tree-shaken per engine (packaging decision D2).

## 2. Governing principles

The architecture exists to enforce a small set of non-negotiable invariants, all defined in [`DESIGN.md`](DESIGN.md). The table restates them in architectural terms; DESIGN is the canonical source.

| Principle | What it means for the architecture |
|-----------|------------------------------------|
| Semantic-first (P1/P2) | Specs describe *meaning* (`focus`, `answer`, `select`), never layout (`x`, `y`, `width`, `color`) or raw artifacts. |
| Strict schemas (P11/P10) | `additionalProperties:false` everywhere; unknown keys are validation errors, never silently ignored. No arbitrary JS, no inline handlers, no `javascript:` URIs. |
| D5 semantics | Specs and `dispatch()` use the closed semantic action enum (`select`, `focus`, `filter`, `play-pause`, `answer`, …). `click`/`pointer.*`/`keyboard` are renderer *input* and never appear in specs. Superseded names (`highlight`, `annotate`, …) are banned. |
| Events only (P4) | State changes happen only by dispatching events; the event log is serializable and replayable. No direct mutation API. |
| Deterministic (P4) | Identical input → identical output. No randomness in layout, styling, or selection. |
| Accessible by default (P6) | Entities get roles, labels, keyboard paths; nothing is conveyed by color alone. |
| Engine isolation (D2/§6) | Engines never import each other or any `@open-edu/*` package. Cross-engine behavior is composition via the event bus, not imports. |
| No second OpenEdu (D6/D7) | No telemetry store, i18n product, Studio, scoring engine, theme source-of-truth, or assessment logic in this repo. Engines emit D5 events + snapshot; OpenEdu owns scoring/workflow/tokens/i18n. |
| Provenance (§9) | Factual/geographic/historical claims carry a source class (`authoritative` \| `illustrative` \| `simulated`). Never invent boundaries/values/facts absent from the data. |
| Shared error codes (§67) | Raise the common codes (`INVALID_SPEC`, `INVALID_ACTION`, `INVALID_REFERENCE`, `UNSUPPORTED_ACTION`, …), never bespoke ones. |

## 3. Runtime model

An **engine instance** is a deterministic state machine exposed as `EngineInstance`. The core `createPlatformInstance` (`packages/interactive-engine/src/runtime/instance.ts`) is the canonical implementation; engines may build a richer instance but must conform to the same contract.

> **Note (2026-09-13 review):** in the current code, all five engines implement their own instance lifecycle (own `EventLog`, listeners, dispatch/emit/teardown/announce) rather than consuming `createPlatformInstance`, which is exercised only by core unit tests. This is an accepted divergence — engines need per-engine hook points (namespaced result events, custom announce copy) — and is documented in `docs/adr/ADR-11.md` as a deliberate decision, not a bug.

### 3.1 Lifecycle

An instance moves through a fixed set of phases:

```
engine-mounted ──▶ engine-ready ──▶ running ──▶ torn-down
```

- `engine-mounted` / `engine-ready` are emitted immediately at instantiation.
- The instance is `running` while it can accept actions.
- `teardown()` flips state to `torn-down` and disconnects subscribers.

### 3.2 The `EngineInstance` contract

From `packages/interactive-engine/src/core/engine.ts`:

```ts
interface EngineInstance {
  readonly id: string;
  readonly engine: EngineType;            // 'visual' | 'geomap' | 'chart' | 'timeline' | 'diagram'
  dispatch(action: EngineAction): void;   // the only way to change state
  snapshot(): Readonly<EngineState>;      // deterministic, serializable
  subscribe(fn: (e: EngineEvent) => void): () => void;
  teardown(): void;
}
```

State changes only happen through `dispatch`. There is no mutation API. Every dispatch produces an ordered, serializable sequence of events written to the instance's `EventLog` and emitted to `host.onEvent` and subscribers.

The canonical `EngineState` (`initialState`/`baseReducer` in `runtime/`) is renderer-independent: `{ instanceId, engine, phase, selection, focus, filter, annotations, expanded, playback, step, lastAction }`. Each engine's `snapshot()` may additionally expose renderer-specific output (e.g. `svgResult` with `svg`/`tabular`/`linear`/`alternative`); that output is engine-internal and consumed by the harness/rendering layer, not part of the shared contract that composition and OpenEdu consume.

### 3.3 Deterministic action/state processing

`dispatch` applies the **base reducer** (`packages/interactive-engine/src/runtime/reducer.ts`) over the closed `ACTION_TYPES` enum. The core sequence (`createPlatformInstance`) is:

1. Reduce the action; an unsupported or malformed action throws `EngineError` here, **before any event is written** (determinism is preserved and the log stays valid).
2. Append and emit `interaction-started`.
3. Write the reduced state.
4. Append and emit `state-changed`.
5. Append and emit `interaction-completed`.
6. If `host.reducedMotion`, issue a live-region `announce`.

Engines may extend this sequence. The Visual engine, for example, reduces **before** `interaction-started` and inserts a **namespaced result event** (`visual.<target>-<suffix>`, e.g. `visual.event-1947-selected`) between `state-changed` and `interaction-completed`. Namespaced result events are what composition bindings match on (§6.1); the core never emits them.

### 3.4 The event log

The `EventLog` (serializable, replayable) records every event with a **monotonic `seq`**. Events carry `{ id, seq, name, instanceId, action?, data? }` (the `data` field carries engine-specific payloads, e.g. the composition router's `event.data`; the canonical engine state is *not* embedded in events — it is derived by replay). The full log for a session is the single source of truth: replay it and you reproduce the exact sequence of states (P4). Golden event logs are asserted byte-for-byte in tests.

## 4. The engine contract

An **engine** is the unit of extensibility. From `core/engine.ts`:

```ts
interface Engine {
  readonly type: EngineType;
  validate(spec: EngineSpec): ValidationResult;
  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance;
}
```

An engine:
- declares its `type` (registered into an `EngineRegistry`);
- implements `validate` by running the L1–L4 pipeline with its own semantic/layout/accessibility hooks;
- implements `instantiate` by building a rich instance (the Visual engine computes its `scene`, `layout`, and an `svgResult` deterministically at instantiation).

The reference implementation for an engine is `packages/visual-engine/src/engine.ts` (Visual), which decomposes into `validation/` (semantic, layout, accessibility), `scene/` (build), `layout/`, and `render/` (SVG).

### 4.1 The host seam

Engines never touch OpenEdu directly. They receive an `EngineHost` (`core/host.ts`):

```ts
interface EngineHost {
  locale: string;
  tokens: Record<string, string>;     // semantic design tokens by name, never literal colors
  reducedMotion: boolean;
  announce(message: string): void;    // a11y live region
  onEvent(event: EngineEvent): void;  // telemetry / eventing
  resolveAsset(id: string): string | Uint8Array;
}
```

In the React integration, an `OpenEduBridge` (with a `t()`/i18n layer and client-shaped `onEvent`) is adapted to an `EngineHost` by `bridgeToHost` (`packages/interactive-react/src/bridge.ts`). The bridge is passed **into** the engine; the direction of dependency is one-way, enforcing D6.

## 5. Validation pipeline (L1–L4)

Every spec passes a layered validation (`validation/pipeline.ts`). Lower levels gate higher ones: a failure at L1 returns immediately with the issue, never running later stages.

```
L1 Envelope      validateEnvelope  → JSON Schema: type/version/id, closed enums
L2 Semantic      engine hook       → meaning: references resolve, kinds valid, no contradictions
L3 Layout        engine hook       → placements/geometry coherent, deterministic constraints
L4 Accessibility engine hook       → roles, labels, focus/keyboard path present
```

`ValidationResult` carries an ordered list of `ValidationIssue` with a shared `ErrorCode` and a `path`, so a consumer can surface precise authoring errors. The pipeline shape is fixed in the core; the engine hooks implement L2–L4 domain rules.

## 6. Composition layer

A **lesson** binds multiple engine instances so that an action on one can drive another — cross-engine behavior via the event bus, not imports.

### 6.1 Lesson structure

`LessonDefinition` (`composition/schema.ts`) is validated by the Zod `LessonSchema` and describes:

- `engines`: a list of `{ instanceId, engine, spec, view? }`, each a full engine spec embedded in the lesson;
- `bindings`: event routing rules, e.g. "when engine A emits `timeline.event-selected`, dispatch `focus` to engine B". The target id comes from the binding's `dispatch.targetIdFrom` (a path read from the source event) or `dispatch.targetId` (static).

The reference composed lesson is `docs/fixtures/p7/composed-lesson.json`, a Timeline → Visual binding where selecting a timeline event routes a `focus` action to the corresponding visual entity (see `composition/router.ts`).

### 6.2 Runtime split: `Lesson.load` vs `Lesson.start`

`Lesson.load(input, registry)` validates the *lesson structure* only: the Zod `LessonSchema`, the L1 envelope of every engine spec, and binding integrity (target instance exists, exactly one of `targetIdFrom`/`targetId`, the dispatched action is declared). Engine **L2–L4** validation runs later, inside `Lesson.start(host)`: `start` calls `engine.instantiate(spec, …)` for each entry, and `instantiate` runs the engine's own `validate()` (which throws `INVALID_SPEC` on failure).

The resulting `LessonRuntime` exposes `instances` (a map of `EngineInstance`), plus `dispatch`, `snapshot`, `events`, and `stop`. Events across instances share one monotonic sequence, which is what makes the composed event log replayable as a whole.

### 6.3 The registry

An `EngineRegistry` maps `EngineType → Engine` and rejects duplicate registration (`INVALID_STATE`). `Lesson`, the React `InteractiveLesson`, and the conformance harness all build a registry and inject the engine implementations; the core is engine-agnostic by design.

## 7. Public API surface

The entire public surface of the core is centralized in `packages/interactive-engine/src/index.ts`:

- **Runtime**: `EngineRegistry`, `Engine`, `EngineInstance`, `EngineType`, `initialState`, `baseReducer`, `EventLog`, `createPlatformInstance`
- **Spec/state**: `EngineSpec`, `EngineState`
- **Actions/events**: `EngineAction`, `EngineEvent`, `ActionType`, `ACTION_TYPES`, `LIFECYCLE_EVENTS`, `EngineError`, `ERROR_CODES`, `ErrorCode`
- **Host**: `EngineHost`
- **Validation**: `runPipeline`, `validateEnvelope`, `ValidationResult`, `ValidationIssue`, `ValidationLevel`, `ValidationHooks`
- **Composition**: `Lesson`, `LessonRuntime`, `Router`, `LessonSchema`, `LessonDefinition`, `EngineEntry`, `Binding`, `BindingAction`, `ENGINE_TYPES`, `NAMESPACED_EVENT_PATTERN`, `COMPOSITION`
- **Accessibility**: `a11yTreeOf`, `A11yNode`

Engine internals stay unexported; the package boundary is the contract.

## 8. Packaging and integration topology

The family is published as seven `@knowledgeassemble/*` packages from `packages/`:

| Package | Role |
|---------|------|
| `interactive-engine` | core: contract, registry, reducer, event log, validation, composition |
| `visual-engine` | Visual engine (spatial/visual objects) |
| `geomap-engine` | GeoMap engine (geographic/where) |
| `chart-engine` | Chart engine (quantitative/how much) |
| `timeline-engine` | Timeline engine (temporal/when) |
| `diagram-engine` | Diagram engine (structural/how connected) |
| `interactive-react` | React mounts (`InteractiveNode`, `InteractiveLesson`) + `OpenEduBridge` adapter |
| `dev-harness` | private workspace package: stub host, fixture catalog, shared mount logic for conformance and playground |

The seven `@knowledgeassemble/*` engine/core packages are published; `dev-harness` is workspace-only. Packaging follows the STRUCTURE §40-41 rules: per-file `tsc` ESM emit into `dist/`, `prepublishOnly` runs build + typecheck + lint + test, and `publishConfig` points `main`/`types`/`exports` at `dist`. This preserves per-engine tree-shaking. Installed-package conformance is proven by `scripts/p7-publish-smoke.mjs` (packs, installs into a temp consumer, drives L1–L4 + a composed lesson from `dist`).

```
                 HOST (OpenEdu CourseRuntime / Studio)
                 installs @knowledgeassemble/*  (one-way; the engine never imports OpenEdu)
                         │
                         ▼
         ┌───────────────────────────────────────────────┐
         │  interactive-react                             │
         │  React mounts + OpenEduBridge → EngineHost     │
         └──────────────────────┬────────────────────────┘
                                │ imports
                                ▼
         ┌───────────────────────────────────────────────┐
         │  interactive-engine  (core contract)           │
         │  registry · reducer · event log · validation   │
         │  composition                                   │
         └──────────────────────▲────────────────────────┘
                                │ implement the Engine contract
                                │
      visual ── geomap ── chart ── timeline ── diagram
```

`interactive-react` imports the core and the engine packages and composes them (via `EngineRegistry`) for consumers; engines implement the core `Engine` contract. OpenEdu sits only on the left edge, installing and hosting.

## 9. Development tooling

Local development and CI use three cooperating pieces: a **shared harness library**, a **Playwright-facing conformance app**, and a **human-facing playground**. They load the same fixture JSON (engine specs under `packages/*/fixture/` and composed lessons under `docs/fixtures/`) and mount engines through a stub `EngineHost` — not OpenEdu's production host.

```
  packages/*/fixture/          docs/fixtures/
           │                          │
           └──────────┬───────────────┘
                      │ build-fixture-catalog.mjs
                      ▼
           packages/dev-harness/
           catalog · loadSpec · createStubHost
           mountEngine · mountLesson · exposeHarness
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
  apps/conformance          apps/playground
  (port 5173)               (port 5174)
  Playwright e2e            React dev UI
  window.__harness          inspector panels
```

### 9.1 `packages/dev-harness`

`@knowledgeassemble/dev-harness` is a **private** workspace package (not published). It centralizes mount logic so conformance and playground stay aligned:

| Export | Role |
|--------|------|
| `createStubHost` | Minimal `EngineHost` for local dev (locale, tokens, `onEvent`, `announce`) |
| `mountEngine` / `mountLesson` | Instantiate an engine or composed lesson into a DOM target |
| `exposeHarness` | Attach `window.__harness` (`dispatch` / `snapshot` / `events` / `tryCreate`) |
| `loadSpec` | Sync lookup of fixture JSON via Vite `import.meta.glob` |
| `catalog` | Generated fixture index (`scripts/build-fixture-catalog.mjs`) |
| `validateSpec` | Run L1–L4 validation and surface shared error codes |
| `engineHarnessExtras` | Engine-specific e2e helpers (`svg`, `tabular`, `linear`, `alternative`) |

The harness may import all engine packages (D2 isolation applies to engines, not dev tooling). Engine packages themselves never import `dev-harness`.

### 9.2 `apps/conformance`

`apps/conformance` is a vanilla-TypeScript Vite app aimed at **automation**. It exposes `window.__harness` for Playwright and routes by `?engine=`:

| Route | Behavior |
|-------|----------|
| `?engine=core` | Core platform instance only (minimal visual spec, no engine renderer) |
| `?engine=lesson` | Real `InteractiveLesson` via React (`lesson.js`) |
| `?engine=composition` | Composed lesson via React (`composition.js`) |
| `?engine=visual\|chart\|geomap\|timeline\|diagram` | Delegates to `dev-harness` (`mountEngine` + `exposeHarness`) with the canonical per-engine fixture |

Playwright e2e asserts exact event sequences (monotonic seq, ordered names), a11y output, and that malformed specs are rejected with shared codes. This is the in-repo proxy for OpenEdu's real `CourseRuntime` run (see `docs/p7-acceptance.md`).

### 9.3 `apps/playground`

`apps/playground` is a React Vite app for **manual** engine and composition testing (`pnpm playground`, port 5174). It uses the same `dev-harness` mount path and fixture catalog as conformance, but adds a developer UI: fixture index, per-fixture story routes that render the mounted interactive beside an input-spec JSON panel, collapsible inspector panels (input spec, events, snapshot, validation, a11y tree, host settings), and a custom-spec route (paste JSON, validate-before-mount, localStorage draft, URL hash sharing). Story routes use an `auto-fit` two-column grid that stacks when the panes get narrow, and the host layer constrains engine SVG output (fixed `width`/`height` attributes) to its column via CSS while `viewBox` preserves the aspect ratio. It implements a stub `EngineHost` and is not the learner app (DESIGN D6).

## 10. Where to go next

- **Integrate or write an engine** → [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md) (host seam, mounts, extension recipes, validation, packaging, tests).
- **Canonical design decisions** → [`DESIGN.md`](DESIGN.md) (P1–P12, D1–D9; ADRs in `docs/adr/`).
- **Shared contract details** (vocabulary, events, spec hierarchy, error codes) → [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md).
- **Repository layout and packaging rules** → [`STRUCTURE.md`](STRUCTURE.md).
- **Phase plan and status** → [`PLAN.md`](PLAN.md).