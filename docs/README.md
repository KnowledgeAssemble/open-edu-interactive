# OpenEdu Interactive Engine — Documentation

Shared infrastructure for turning declarative JSON into interactive, accessible, educational learning experiences. Five engines, one contract.

**Start here:** [`DESIGN.md`](DESIGN.md) — the overall design, principles, and system-wide decisions (D1–D9).

Orientation: [`SYSTEM-ARCHITECTURE.md`](SYSTEM-ARCHITECTURE.md) (high-level system architecture) and [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md) (how to integrate the engines and how to extend/write them).  Engine-specific implementation lives in [`engines/visual/ARCHITECTURE.md`](engines/visual/ARCHITECTURE.md) — that is the Visual engine's implementation guide, not the system architecture.

## Document map

| Tier | Document | Content |
|------|----------|---------|
| Design | [`DESIGN.md`](DESIGN.md) | System-wide decisions, principles, contract of contracts. Canonical for new work. |
| Architecture | [`SYSTEM-ARCHITECTURE.md`](SYSTEM-ARCHITECTURE.md) | High-level system architecture (system-level, not the Visual engine's `engines/visual/ARCHITECTURE.md`): runtime model, engine contract, validation pipeline, composition, host seam, packaging. |
| Developer guide | [`DEVELOPER-GUIDE.md`](DEVELOPER-GUIDE.md) | How to integrate (host/mount/author specs) and how to extend (write a new engine, validation, packaging, tests). |
| Contract | [`INTERACTIVE-ENGINE-SPEC.md`](INTERACTIVE-ENGINE-SPEC.md) | Shared architecture & semantic contract: vocabulary, actions, events, state, error model, spec hierarchy (top of §91 hierarchy). |
| Structure | [`STRUCTURE.md`](STRUCTURE.md) | Repository layout, package separation, tech stack, platform phases. Package naming per DESIGN D2. |
| Plan | [`PLAN.md`](PLAN.md) | Living implementation plan: exit-gated phases P0–P8, working model, status board. P8: [`PLAN-P8.md`](PLAN-P8.md). |
| Schema | [`schemas/interactive-engine.schema.json`](schemas/interactive-engine.schema.json) | Machine-readable envelope (`type`/`version`/`id`). |
| Composition | [`schemas/composition.schema.json`](schemas/composition.schema.json) | Lesson-level `{ engines[], bindings[] }` (P2.5). |

## Engines

| Engine | Reasoning space | Vision | Spec | Implementation |
|--------|-----------------|--------|------|----------------|
| Visual | Spatial / visual objects | — | [`engines/visual/SPEC.md`](engines/visual/SPEC.md) | [`ARCHITECTURE.md`](engines/visual/ARCHITECTURE.md) · [`COMPONENTS.md`](engines/visual/COMPONENTS.md) · [`PROJECT.md`](engines/visual/PROJECT.md) |
| GeoMap | Geographic / where | [`engines/geomap/VISION.md`](engines/geomap/VISION.md) | [`engines/geomap/SPEC.md`](engines/geomap/SPEC.md) | — |
| Chart | Quantitative / how much | [`engines/chart/VISION.md`](engines/chart/VISION.md) | [`engines/chart/SPEC.md`](engines/chart/SPEC.md) (thin) | — |
| Timeline | Temporal / when | [`engines/timeline/VISION.md`](engines/timeline/VISION.md) | [`engines/timeline/SPEC.md`](engines/timeline/SPEC.md) (thin) | — |
| Diagram | Structural / how connected | [`engines/diagram/VISION.md`](engines/diagram/VISION.md) | [`engines/diagram/SPEC.md`](engines/diagram/SPEC.md) (thin) | — |

Status key: **thin** = normative envelope + MVP slice only (gates P3–P6 code); expand in schemas/code, not unbounded vision prose. Every engine now ships a machine-readable schema (`packages/<engine>/src/schemas/`) and an authoring skill (`docs/engines/<engine>/skills/`), projected into `@knowledgeassemble/engine-skills`.

## Status matrix

| Document | Status | Canonical? |
|----------|--------|-----------|
| DESIGN.md | Proposed | Yes — supersedes conflicting envelope/repo/phase/`purpose`/action/runtime/composition/visual-scope forms (see D1–D9) |
| CONTRACT → INTERACTIVE-ENGINE-SPEC.md | Draft | Yes for shared contract |
| STRUCTURE.md | Proposed | Yes for packaging/platform |
| engines/visual/SPEC.md | Proposed v1.0 | Yes (envelope per D1) |
| engines/visual/ARCHITECTURE.md | Proposed v0.1 | Architecture only; packaging per D2 |
| engines/visual/COMPONENTS.md | Proposed v1.0 | Yes |
| engines/visual/PROJECT.md | Proposed | Process/phases per D3 |
| engines/geomap/SPEC.md | v1.0.0 | Envelope per D1 |
| engines/geomap/VISION.md | Foundational | Context |
| engines/chart/SPEC.md | Proposed thin | Yes (envelope + P3 MVP) |
| engines/timeline/SPEC.md | Proposed thin | Yes (envelope + P5 MVP; P2.5 stub) |
| engines/diagram/SPEC.md | Proposed thin | Yes (envelope + P6 MVP) |
| engines/chart, timeline, diagram/VISION.md | Draft | Context only — non-normative |

## Conventions

- Specifications are declarative, renderer-independent JSON. Agents write specs, never SVG/HTML/pixels.
- Validation is layered: Schema → Semantic → Layout → Accessibility (see DESIGN §11).
- Engines are embedded in lessons as `{ "type": "interactive", "engine": "<type>", "spec": {…} }` (DESIGN §4 / shared contract §94); package structure per shared contract §90 and DESIGN D2.
- OpenEdu widgets remain as lightweight presentation primitives; engines are the semantic layer above them (shared contract §95-96).

For repo layout, phases, and tooling: [`STRUCTURE.md`](STRUCTURE.md). For the living implementation plan: [`PLAN.md`](PLAN.md).

## Consuming from OpenEdu (P7)

The engine family ships as published npm packages. Install the core + the engines you need, plus the React mount:

```sh
pnpm add @knowledgeassemble/interactive-engine \
  @knowledgeassemble/visual-engine @knowledgeassemble/chart-engine \
  @knowledgeassemble/geomap-engine @knowledgeassemble/timeline-engine \
  @knowledgeassemble/diagram-engine \
  @knowledgeassemble/interactive-react
```

`@knowledgeassemble/svg-kit` and `@knowledgeassemble/engine-skills` are also published: `svg-kit` is the shared SVG render kit the engines depend on (installed transitively), and `engine-skills` ships the authoring guidance for content-creator agents.

Mount a single interactive node, or a composed lesson, through the React package:

```tsx
import { createElement } from 'react';
import { InteractiveLesson } from '@knowledgeassemble/interactive-react';
import type { OpenEduBridge } from '@knowledgeassemble/interactive-react';

const bridge: OpenEduBridge = {
  locale: 'en',
  tokens: /* your design-system tokens */,
  reducedMotion: false,
  t: (key, vars) => /* your i18n lookup */,
  announce: (message) => /* your a11y live region */,
  onEvent: (event) => /* your telemetry */,
  resolveAsset: (id) => /* your .oep asset resolver */,
};

createElement(InteractiveLesson, { lesson, host: bridge });
```

The `OpenEduBridge` is passed **in** — the engine packages never import `@open-edu/*` (D6/D2 boundary). Your host supplies `locale`/`tokens`/`reducedMotion`/`announce`/`onEvent`/`resolveAsset`; the bridge adapts them to the internal `EngineHost`.

- **Lesson-node schema** (proposal for `@open-edu/schemas`): [`schemas/interactive-lesson-node.schema.json`](schemas/interactive-lesson-node.schema.json).
- **Composed-lesson fixture** (reuses the frozen P2.5 contract): [`fixtures/p7/composed-lesson.json`](fixtures/p7/composed-lesson.json).
- **Widget-compat mapping**: [`fixtures/p7/widget-compat/`](fixtures/p7/widget-compat/).
- **Cross-repo acceptance items** (work that must happen in the OpenEdu monorepo to complete the integration): [`p7-acceptance.md`](p7-acceptance.md).

### Publish workflow (T1/T7)

Nine public packages publish under the `@knowledgeassemble` scope: `interactive-engine`, `svg-kit`, the five engines (`visual`, `chart`, `geomap`, `timeline`, `diagram`), `interactive-react`, and `engine-skills`. `dev-harness` and both apps are `private` and never publish.

All packages publish as per-file `tsc` ESM emit (STRUCTURE §40-41) into `dist/`; `prepublishOnly` runs `build && typecheck && lint && test`. Vitest gates for publishability live at `packages/interactive-engine/test/p7/` and `packages/interactive-react/test/`; the installed-package suite is a script:

```sh
pnpm publish:dry     # pnpm -r publish --dry-run (runs prepublishOnly, no registry push)
pnpm publish:smoke   # scripts/p7-publish-smoke.mjs — packs, installs into a temp consumer,
                     # imports every public symbol, drives L1–L4 + a composed lesson from dist, typechecks
```

The smoke script is the in-repo evidence for PLAN criterion 2 (all engines pass the common conformance suite on the installed packages, not just workspace paths).

To release to npm (registry `https://registry.npmjs.org/`):

```sh
# 1. Bump the version in every publishable package.json (bump them together).
# 2. Validate: dry-run + installed-package smoke.
pnpm publish:dry && pnpm publish:smoke
# 3. Publish. pnpm publishes in dependency order and rewrites workspace:* deps to the
#    local version; --access public is required for first publishes of scoped packages.
pnpm -r publish --access public --no-git-checks
```

A newly published package or version may briefly show a `0.0.0-stage` placeholder in the registry before the real version goes live.
