# OpenEdu Interactive Engine — Developer Guide

A practical guide for two audiences:

1. **Integrators** — teams hosting these engines: wiring the host seam, mounting nodes and lessons, consuming events, adopting the schema, authoring specs.
2. **Extenders** — engine authors: implementing the `Engine` contract, adding validation hooks, rendering, packaging, and testing a new engine.

The page covers three things: **how to integrate**, **how to extend**, and the **reference/troubleshooting** material in §4–§10. It is the how-to counterpart to the architecture and contract. For the model, see [`SYSTEM-ARCHITECTURE.md`](SYSTEM-ARCHITECTURE.md); for the canonical decisions and contract, [`DESIGN.md`](DESIGN.md) and [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md); for repo layout and packaging rules, [`STRUCTURE.md`](STRUCTURE.md).

## 1. Before you start

### 1.1 Repo layout

```text
packages/interactive-engine/   core: engine, registry, state, action, event, host,
                               validation/ (L1–L4), runtime/ (reducer, event-log, instance),
                               accessibility/, composition/, schemas/
packages/{visual,geomap,chart,timeline,diagram}-engine/   the five engines
packages/interactive-react/    React mounts + OpenEduBridge adapter
packages/dev-harness/          shared mount logic: stub host, fixture catalog, loadSpec,
                               mountEngine/mountLesson, exposeHarness (used by both apps below)
apps/conformance/              Playwright e2e harness (port 5173); engine routes delegate to dev-harness
apps/playground/               React dev UI for manual verification (port 5174); see §9
docs/                          DESIGN, SYSTEM-ARCHITECTURE, DEVELOPER-GUIDE,
                               INTERACTIVE-ENGINE-SPEC, STRUCTURE, PLAN, schemas/,
                               fixtures/, engines/, adr/ (ADR-01…09)
```

### 1.2 The core loop

```text
spec (JSON) ──▶ Engine.validate  (L1–L4) ──▶ EngineInstance (dispatch ─▶ events/snapshot)
                                                                       ▲
lesson (composed) ──▶ Lesson.load ── start(host) ── mounts each instance + router
```

- Engine authors implement `validate` + `instantiate`.
- Hosts build an `EngineHost` (or `OpenEduBridge`), `dispatch` semantic actions, and consume `events`/`snapshot`.
- Composers (authors) write lesson JSON that binds engines together.

### 1.3 Enforced conventions

- **ESM** — local imports use `.js` specifiers (`import { x } from './core/action.js'`). Extensionless relative imports fail typecheck (TS2835), enforced by `module: "NodeNext"` (publishing is per-file `tsc` ESM emit).
- **Strict TS** — `noUncheckedIndexedAccess` is on; `arr[i]` is `T | undefined`. Assert deliberately with `!`.
- **Closed action enum (D5)** — dispatch uses the semantic `ACTION_TYPES`. Renderer input (`click`, `pointer.*`, `keyboard`) never appears in specs; translate at the renderer boundary.
- **No arbitrary JS (P10)** — no inline scripts, no `javascript:` URIs, no event handlers in specs.
- **Shared errors** — raise the common `ERROR_CODES` (`INVALID_SPEC`, `INVALID_ACTION`, `INVALID_REFERENCE`, `UNSUPPORTED_ACTION`, …), never bespoke codes.
- **Deterministic (P4)** — no randomness in layout, styling, or selection. Golden event logs are asserted byte-for-byte.
- **Engine isolation (D2)** — engines never import each other or any `@open-edu/*` package.

## 2. Hosting an engine (Integrators)

### 2.1 Install the packages

```sh
pnpm add @knowledgeassemble/interactive-engine \
  @knowledgeassemble/visual-engine @knowledgeassemble/timeline-engine \
  @knowledgeassemble/interactive-react
```

Add whichever engines you need. `interactive-react` provides React components; if your host does not render through React, use the core (`interactive-engine`) and its engines directly.

### 2.2 Implement the host seam

Raw (non-React) hosts implement `EngineHost`:

```ts
import type { EngineHost } from '@knowledgeassemble/interactive-engine';
```

```ts
const host: EngineHost = {
  locale: 'en',
  // Keys are semantic names the spec/engine reference; values are your
  // design system's strings. Engines never see literal colors in specs.
  tokens: { emphasis: designTokens.emphasis, danger: designTokens.danger },
  reducedMotion: false,
  announce(message: string) { liveRegion.textContent = message; },
  onEvent(event) { telemetry.push(event); },          // D5 event stream
  resolveAsset(id) { return assetStore.get(id); },    // .oep resources
};
```

React hosts implement `OpenEduBridge` (note the client-shaped `onEvent` and an i18n `t()`):

```tsx
import type { OpenEduBridge } from '@knowledgeassemble/interactive-react';

const bridge: OpenEduBridge = {
  locale: 'en',
  tokens: designTokens,
  reducedMotion: false,
  t: (key, vars) => i18n.format(key, vars),   // your i18n; never hard-code user-facing strings
  announce: (msg) => announceLive(msg),
  onEvent: (event) => telemetry.send(event),
  resolveAsset: (id) => assetResolver.load(id),
};
```

The bridge is passed **into** the engine via `bridgeToHost`. The direction of dependency is one-way — the engine never imports your code (D6).

### 2.3 Mount a single interactive node

`InteractiveNode` mounts one engine spec for a given `engineType` (it registers all five engines internally). A `forwardRef` handle exposes `dispatch` / `snapshot` / `events`:

```tsx
import { createElement, createRef } from 'react';
import { InteractiveNode } from '@knowledgeassemble/interactive-react';
import type { InteractiveNodeHandle } from '@knowledgeassemble/interactive-react';

const nodeRef = createRef<InteractiveNodeHandle>();
const el = createElement(InteractiveNode, {
  spec: visualSpec,      // the engine spec JSON
  engineType: 'visual',  // 'visual' | 'geomap' | 'chart' | 'timeline' | 'diagram'
  host: bridge,
  id: 'demo',
  ref: nodeRef,
});

// later:
nodeRef.current?.dispatch({ type: 'focus', target: { id: 'marker-7' } });
nodeRef.current?.snapshot();
nodeRef.current?.events();
```

### 2.4 Mount a composed lesson

`InteractiveLesson` registers all five engines, validates, and mounts every instance plus the router. A `forwardRef` handle exposes the runtime:

```tsx
import { createElement, createRef } from 'react';
import { InteractiveLesson } from '@knowledgeassemble/interactive-react';
import type { InteractiveLessonHandle } from '@knowledgeassemble/interactive-react';

const handle = createRef<InteractiveLessonHandle>();
const el = createElement(InteractiveLesson, { lesson, host: bridge, ref: handle });

// later:
handle.current?.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } });
const snapshot = handle.current?.snapshot('visual-independence');
const events = handle.current?.events();       // monotonic-seq, replayable
```

### 2.5 Drive it

All interaction is **dispatching semantic actions** and **consuming events/snapshots**:

```ts
instance.dispatch({ type: 'focus', target: { id: 'marker-7' } });
instance.dispatch({ type: 'play-pause' });
instance.dispatch({ type: 'answer', payload: { value: '42' } }); // payload is engine-specific
```

Consume the emitted event sequence (`seq` monotonic across all instances in a lesson) for telemetry, scoring, workflow — all OpenEdu-side concerns (D6/D7). Never reach in and mutate state.

### 2.6 Validate an authored spec

Use the engine (or `runPipeline`) directly to give authors precise errors:

```ts
const engine = new VisualEngine();
const result = engine.validate(spec);
if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.code}] at ${issue.path}: ${issue.message}`);
  }
}
```

Malformed specs raise `EngineError` with a shared `code` (e.g. `INVALID_SPEC`, `INVALID_REFERENCE`). Authoring skills live under `docs/engines/*/skills/` and are the in-repo evidence that AI agents can produce valid specs.

### 2.7 Adopt the lesson-node schema

The proposal schema for `@open-edu/schemas` is `docs/schemas/interactive-lesson-node.schema.json`. It prescribes the `{ type:"interactive", engine, spec }` node form plus the composed-lesson form, with `additionalProperties:false`. Keep that strictness when adopting (see `docs/p7-acceptance.md`).

## 3. Writing a new engine (Extenders)

### 3.1 The `Engine` contract

Everything an engine must provide (from the core `packages/interactive-engine/src/core/engine.ts`):

```ts
interface Engine {
  readonly type: EngineType;               // must be a member of the closed union
  validate(spec: EngineSpec): ValidationResult;
  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance;
}
```

The `EngineInstance` you return must expose `id`, `engine`, `dispatch`, `snapshot`, `subscribe`, `teardown`. The core `createPlatformInstance` returns a conformant instance you can use directly; engines that need richer output (the Visual engine exposes its deterministic `scene`/`svgResult`) build their own but keep the same contract.

### 3.2 Skeleton of a new engine

There is no single default engine shape. Model a new engine on an existing one per domain (`packages/visual-engine/src/engine.ts` is the richest reference), and note that a brand-new engine type requires extending the closed `EngineType` union in the core, plus the schema `type`/`class` enums. That is a **contract change**: deliberate and documented (§3.7). Until you make it, a new type will not typecheck against `Engine`.

Imports you will need from the core (plus your own `schema.js`/validation modules):

```ts
import {
  EngineError, initialState, baseReducer, EventLog, runPipeline,
  type Engine, type EngineInstance, type EngineType, type EngineSpec,
  type EngineHost, type EngineAction, type EngineEvent,
  type ValidationResult,
} from '@knowledgeassemble/interactive-engine';
import type { MySpec } from './schema.js';
```

Implement `validate` by wiring your L2–L4 hooks into the core pipeline:

```ts
validate(spec: EngineSpec): ValidationResult {
  return runPipeline(spec, {
    semantic: (s) => validateSemantic(s as unknown as MySpec),
    layout: (s) => validateLayout(s as unknown as MySpec),
    accessibility: (s) => validateAccessibility(s as unknown as MySpec),
  });
}
```

Implement `instantiate` to emit the lifecycle events and build a conformant `EngineInstance`. A new engine **must emit a namespaced result event** for at least its interactive actions: composition bindings route on names like `timeline.event-selected`, so without them no other engine can bind to yours.

```ts
instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
  const result = this.validate(spec);
  if (!result.valid) {
    throw new EngineError('INVALID_SPEC',
      `validation failed: ${result.issues.map((i) => i.message).join('; ')}`);
  }
  const instanceId = id ?? spec.id;
  let state = { ...initialState(instanceId, this.type), phase: 'running' };
  const log = new EventLog();
  const listeners = new Set<(e: EngineEvent) => void>();
  const emit = (e: EngineEvent): void => {
    host.onEvent(e);
    for (const l of listeners) l(e);
  };
  emit(log.append('engine-mounted', instanceId));
  emit(log.append('engine-ready', instanceId));
  // deterministic setup: build your model, render once (see §3.5)

  return {
    id: instanceId,
    engine: this.type,
    dispatch(action: EngineAction) {
      state = baseReducer(state, action);
      // lifecycle + namespaced result event, e.g. `my-engine.<target>-selected`:
      emit(log.append('interaction-started', instanceId, undefined, action));
      emit(log.append('state-changed', instanceId, undefined, action));
      emit(log.append(`my-engine.${action.target?.id ?? 'node'}-selected`,
        instanceId, { selection: state.selection }, action));
      emit(log.append('interaction-completed', instanceId, undefined, action));
    },
    snapshot() { return { ...state /*, your model */ }; },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    teardown() { listeners.clear(); state = { ...state, phase: 'torn-down' }; },
  };
}
```

Use `emit`/`EventLog` exactly as the Visual engine does (see `packages/visual-engine/src/engine.ts`): events go to `host.onEvent`, then to subscribers, in order, with a shared `EventLog` giving each a monotonic `seq`.

### 3.3 Structure your engine (recommended layering)

Follow the Visual engine's decomposition:

```text
src/
  schema.ts            TypeScript types for your spec (mirrors the JSON Schema)
  schemas/             JSON Schema for L1 + your L2–L4 additions
  engine.ts            the Engine class
  validation/
    semantic.ts        L2 — references resolve, kinds valid, no contradictions
    layout.ts          L3 — geometry/placement coherent, deterministic
    accessibility.ts   L4 — roles/labels/keyboard path present
  scene/               build your semantic model (e.g. visual scene graph)
  layout/              deterministic placement
  render/              produce renderable output (e.g. SVG) + result types
  index.ts             export the Engine class + public types only
```

### 3.4 Validation hooks (L2–L4)

- **L2 Semantic** is where most authoring errors live: entity references must resolve, `kind`s must be valid, provenance (`authoritative`/`illustrative`/`simulated`) classes must be present for factual claims, values must be in range.
- **L3 Layout** enforces deterministic geometry — no un-pinned positions, no ambiguous layout.
- **L4 Accessibility** enforces that every interactive entity has a `role`, a non-empty `label`, and a keyboard path; nothing is conveyed by color alone.

Each returns a `ValidationResult` (`{ valid, issues: [{ level, code, message, path }] }`). Use `INVALID_REFERENCE` for dangling refs, `INVALID_SPEC` for shape/domain violations, `INVALID_ENTITY` for missing/unknown entities.

### 3.5 Rendering

Rendering is deterministic and computed once (or on discrete state changes), never per-frame from live pointer state. The Visual engine builds `scene → layout → SVG` in `instantiate` and exposes the result on `snapshot().svgResult`. Renderers never embed author-controlled inline scripts or `javascript:` URIs (P10).

### 3.6 Register and test

1. Add your engine package under `packages/<name>-engine/`.
2. Add fixtures under `packages/<name>-engine/fixture/` (the catalog script at `scripts/build-fixture-catalog.mjs` picks them up on `dev-harness` build).
3. Register the engine in `packages/dev-harness/src/engine-registry.ts` and in `InteractiveLesson` so compositions, conformance, and playground can mount it.
4. Extend the closed `EngineType` union (and the schema `type`/`class` enums) as a deliberate, documented contract change (§3.7), keeping the copies in parity — the parity guardrail (`packages/interactive-engine/test/schema-parity.test.ts`) enforces this.
5. Verify manually in `apps/playground` (§9) and in Playwright e2e against `apps/conformance` (§7).

### 3.7 Action/content additions are contract changes

Any addition to `ACTION_TYPES`, `EngineType`, or the shared envelope schema is a **contract change** that must be:

1. Namespaced and documented in the engine spec,
2. Reflected in `packages/interactive-engine/src/schemas/actions.ts`, the engine schema, and the runtime Zod `LessonSchema`,
3. Kept in parity across the schema copies (`docs/schemas/` vs `packages/*/src/schemas/`),
4. Deliberate — this is the vendor-facing surface OpenEdu builds against.

## 4. Semantic actions cheat-sheet

From `packages/interactive-engine/src/schemas/actions.ts`:

| Action | Purpose (semantic) |
|--------|--------------------|
| `select` / `deselect` | toggle selection membership |
| `focus` / `unfocus` | move focus to/from an entity |
| `filter` / `clear-filter` | set/clear a filter set |
| `open-annotation` / `close-annotation` | reveal/hide annotation |
| `toggle` / `expand` / `collapse` | disclosure/expansion |
| `play-pause` / `step` / `scrub` | playback + stepping |
| `zoom` / `pan` / `jump-to` | viewport/locus navigation (semantic) |
| `answer` / `compare` | assessment input (OpenEdu scores it) |
| `drag` / `drop` / `place` / `move` / `connect` / `disconnect` / `follow` | manipulation |
| `reset` | restore initial state |

Superseded/banned names (`highlight`, `annotate`, `blur`, `play`, `show`) and renderer input (`click`, `pointer.*`, `keyboard`) cannot appear in specs.

## 5. Composition — binding engines

A lesson routes events between instances. The binding array below is abridged from `docs/fixtures/p7/composed-lesson.json` (the full `engines` array carries each engine's complete spec; ids match the fixture):

```json
{
  "bindings": [
    {
      "on": "timeline.event-selected",
      "from": "timeline-independence",
      "dispatch": {
        "to": "visual-independence",
        "action": "focus",
        "targetIdFrom": "links.visualEntityId"
      }
    }
  ]
}
```

A binding's `dispatch` must define **exactly one** of `targetIdFrom` (dynamic, a path read from the source event) or `targetId` (static). The `Router` matches the emitted namespaced event on the source instance and dispatches the mapped action to the target instance, preserving a single monotonic `seq` across the whole lesson.

## 6. Packaging and publishing

Packaging rules (STRUCTURE §40-41) are already wired into all seven packages; keep them intact:

- Per-file `tsc` ESM emit into `dist/` (there is no bundler); local imports use `.js` specifiers.
- `prepublishOnly` = `build && typecheck && lint && test`.
- `publishConfig.main`/`types`/`exports` point at `dist`; `files` ships `["src","dist"]`.
- `tsconfig.build.json` sets `noEmit:false`, `outDir:dist`, `declaration:true`, `include:["src"]`.

Validate before publishing:

```sh
pnpm publish:dry     # pnpm -r publish --dry-run (no registry push)
pnpm publish:smoke   # scripts/p7-publish-smoke.mjs: pack → install into temp consumer →
                     #   import public symbols → tsc --noEmit → drive L1–L4 + a composed lesson from dist
```

The smoke script is the in-repo proof that the installed package works, not just the workspace path.

## 7. Testing

- **Unit (Vitest)** — `packages/*/test/**/*.test.ts`. Cover the lifecycle (monotonic seq, ordered names), validation negatives (each `ErrorCode`), determinism (two runs identical), and schema/Zod parity. Write the test **first** (test-driven; a feature is "done" only when a red test turns green).
- **Golden fixtures** — checked in; expected event sequences asserted exactly. If a renderer/layout change alters output, update fixtures via a reviewed change.
- **Schema/parity** — keep the Zod `LessonSchema`, JSON Schema copies, and the closed enums in sync. There is a dedicated parity guardrail (`packages/interactive-engine/test/schema-parity.test.ts`) — run it whenever you touch a schema.
- **Browser e2e (Playwright)** — against `apps/conformance` (`window.__harness`, `?engine=lesson` mounts the real `InteractiveLesson`; per-engine routes delegate to `dev-harness`). Deterministic only — no flaky timers/layout-order dependence (non-parallel here).
- **Manual verification** — `pnpm playground` (§9): browse fixtures, dispatch actions, inspect events/snapshot/validation/a11y.
- **Installed-package** — `pnpm publish:smoke` (see §6).

Run the full gate from the repo root:

```sh
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

## 8. Checklist before you call an engine done

- [ ] Implements `Engine` (`type`, `validate`, `instantiate`) and returns a conformant `EngineInstance`.
- [ ] L2–L4 validation hooks real, returning shared `ErrorCode`s with precise `path`s.
- [ ] Deterministic: identical input → identical output, no randomness.
- [ ] Accessible: roles, non-empty labels, keyboard paths; nothing color-only.
- [ ] No inline scripts / `javascript:` URIs / author-supplied handlers in output.
- [ ] Renders once (or on discrete state change) — no `pointer.*` in specs.
- [ ] Provenance (`source.class`) on any factual/geographic/historical claim.
- [ ] Emits namespaced result events so composition bindings can route on them.
- [ ] Tests written first; golden event log byte-stable; schema parity green.
- [ ] `EngineType`/`ACTION_TYPES`/schema enum changes are documented, deliberate contract changes.
- [ ] `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright` green; `pnpm publish:dry` + `publish:smoke` green for packaging changes.
- [ ] Public API centralized in the package `index.ts`; internals unexported.

## 9. Local development: dev-harness, playground, and conformance

### 9.1 Shared harness (`packages/dev-harness`)

Both `apps/conformance` and `apps/playground` mount engines through `@knowledgeassemble/dev-harness`. The harness provides a stub `EngineHost`, sync fixture loading (`loadSpec`), a generated fixture catalog (`pnpm --filter @knowledgeassemble/dev-harness build` runs `scripts/build-fixture-catalog.mjs`), and `mountEngine` / `mountLesson` / `exposeHarness`. Engine packages never import the harness; only the apps and build scripts do.

Fixture paths are repo-relative strings (e.g. `packages/visual-engine/fixture/number-line/input.visual.json`). The catalog indexes every mountable engine spec under `packages/*/fixture/` and composed lesson under `docs/fixtures/`.

### 9.2 Playground (manual verification)

`apps/playground` is the human-facing dev UI.

```bash
pnpm playground          # serves on port 5174
```

Routes: `/` (fixture index), `/engine/:engine/:slug`, `/lesson/:slug`, `/custom` (paste JSON).
Story routes render two columns: the mounted interactive beside an **Input Spec** panel showing the raw spec JSON that produced it. The layout is an `auto-fit` grid that stacks the columns below two readable widths. Collapsible panels in the right column show Input Spec, Events, Snapshot, Validation, and the A11y tree; Host settings sit above the grid.

Because engines emit fixed `width`/`height` SVG attributes, the host layer constrains `[data-oedu-root] svg { max-width: 100%; height: auto }` so a render never overflows its column; the `viewBox` keeps the aspect ratio. The catalog sidebar is a fixed 240px that stacks above the main pane below 720px. Both behaviours are asserted in `apps/playground/e2e/layout.spec.ts` (`pnpm --filter @knowledgeassemble/playground playwright`).
Actions are dispatched via buttons generated from `spec.interaction.actions`; a prompt asks for `target.id` when needed.
The Custom Spec page validates before mount, supports localStorage draft persistence (`playground:custom-spec`), and share via URL hash (`#spec=base64`).

### 9.3 Conformance (automation)

`apps/conformance` (port 5173) is the Playwright target. Per-engine routes (`?engine=visual`, etc.) delegate to the same `dev-harness` mount path as the playground. The `?engine=core` route exercises the core platform instance only; `?engine=lesson` and `?engine=composition` mount composed lessons via React. See [`SYSTEM-ARCHITECTURE.md`](SYSTEM-ARCHITECTURE.md) §9 for the full route table.

**Non-goals (hard):** no scoring, telemetry, course authoring, or i18n product (D6). JSON in, render out — no SVG/coordinate editors.

## 10. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `TS2835` on a relative import | Missing `.js` specifier. Use `./core/action.js` (NodeNext). |
| `arr[i]` is `T \| undefined` | `noUncheckedIndexedAccess` — assert with `!` deliberately. |
| `UNSUPPORTED_ACTION` at dispatch | Action not in the closed semantic enum (D5). Re-map renderer input at the boundary. |
| Extensionless import fails build | Same as TS2835 — NodeNext requires the explicit `.js`. |
| A binding never fires | The source engine does not emit the namespaced event named in `on`. Bindings match on namespace names, so the engine must emit one (see §3.2). |
| Unknown key silently accepted | A schema copy drifted or `additionalProperties` is not `false`. Run the parity guardrail; fix the higher schema (see §10). |
| Golden log differs | Non-deterministic render or layout. No randomness (P4). |
| Engine can't see another engine | Correct — engines are isolated (D2). Compose via the event bus in a lesson. |
| `INVALID_REFERENCE` | A spec references an entity id that isn't declared. |
| Package won't resolve installed | Check `publishConfig` points at `dist` and `prepublishOnly` built it; run `pnpm publish:smoke`. |

## 11. Where the source of truth lives

When docs disagree **with each other**, fix the **higher** document, never the implementation: change the higher doc to reflect the decision, and do not change code just to match a lower doc. Reading order: `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → `docs/SYSTEM-ARCHITECTURE.md` → `docs/DEVELOPER-GUIDE.md` → engine `SPEC.md` / `VISION.md` → (Visual) `docs/engines/visual/ARCHITECTURE.md` (engine implementation, not system architecture). This guide is a how-to layer on top of those; if it ever conflicts with them, the higher docs win.