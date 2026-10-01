# ADR-13: Shared SVG rendering utilities — extract to `@knowledgeassemble/svg-kit`, keep scene models per-engine

**Status:** Proposed  
**DESIGN.md reference:** §6 D2 (package isolation), §16 D9 (engine-kind boundaries), P4 (deterministic output)

## Context

All five engines hand-roll the same SVG plumbing in `packages/<engine>/src/render/svg.ts`:

- `escapeXml` — byte-identical copy in all five engines;
- `centerOf` — **semantically** identical in visual, chart, timeline (param name differs: `bounds` vs `b`);
- the `data-oedu-*` attribute assembly block (`id`/`data-oedu-role`/`data-oedu-value`/`data-oedu-interactive`/`aria-label`/`data-oedu-bounds`) — 3–5 near-identical copies that have already drifted once **at different positions**, not just in content: timeline inserts `data-oedu-actions` before `aria-label`; geomap inserts `data-oedu-state`/`data-oedu-encoding` before `aria-label` and `title` after it; diagram inserts `data-oedu-what-if` after `aria-label`. Per-kind **branch** attrs (visual `data-oedu-filled`/`data-oedu-hit-target`, diagram `data-oedu-relationship`/`data-oedu-chain-step`) are appended after `${attrs}` inside the shape `switch`, not in the common block;
- the `<svg xmlns viewBox width height role="img">` + `<title>/<desc>` + `<g id="…-root">` shell — five copies (geomap adds a `map-layers` inner group, diagram adds a `<defs>` arrowhead marker); visual/geomap/diagram end `</svg>\n`, chart/timeline end `</svg>` with no trailing newline;
- the `interactive && acceptsActions` **fan-out** (`{ id, action }` per action + `role: 'button'` a11y row) is shared, but **traversal is not** and must not be unified: visual recurses (a11y tree), chart/timeline iterate top-level `scene.nodes` only, geomap recurses with a `!node.hidden` filter, diagram uses kind rosters whose edge rows carry a **hardcoded `action: 'follow'`** (never `acceptsActions`).

Engine **scene models and node kinds stay engine-specific by design** (D9: `shape`/`wedge`/`fraction-circle` are Visual; `bar`/`point` are Chart; `event-marker`/`period-band` are Timeline; nodes/edges are Diagram), and each engine's domain row output already diverges deliberately (`tabular` / `linear` / `alternative`). Engines already share the contract package `@knowledgeassemble/interactive-engine` (validation types, `ACTION_TYPES`, `EngineError`), so one additional neutral dependency is consistent with D2 — isolation forbids engine↔engine and `@open-edu/*` imports, not contract packages.

## Options considered

1. **Extract the shared plumbing into a small neutral package `@knowledgeassemble/svg-kit`** (`base.ts` escaping/geometry, `attrs.ts`, `shell.ts`, `a11y.ts`). Engines keep their per-kind shape `switch`, their `data-oedu-*` extras, and their domain row extraction. Adoption is byte-identical to current output, so golden fixtures are the acceptance gate with zero churn.
2. **Consolidate into one shared semantic scene model + one renderer.** Rejected: the scene grammar is engine-specific by contract (D9 / `docs/engines/<engine>/SPEC.md`); cross-engine composition is the event bus + lesson router, not a shared scene graph. This is over-normalization of the one thing that must stay per-engine.
3. **Put the helpers in `interactive-engine` core.** Rejected: the core is renderer-free and zod-only by plan; SVG concerns in core would violate its contract role.
4. **Document and leave the duplication.** Rejected as the standing state: the output has already drifted once (the `data-oedu-*` divergence), the extraction is mechanical and zero-risk, and future render targets (HTML/Canvas/PDF) would each multiply the copy count.

## Decision

Option 1, staged per `docs/superpowers/specs/2026-10-01-svg-kit-render-extraction-implementation-plan.md`:

- New workspace package `packages/svg-kit/` (`@knowledgeassemble/svg-kit`), zod-free, publishing setup mirroring the engines (per-package `tsc` ESM emit, `publishConfig`).
- Shared surface: `escapeXml`, `centerOf`, `fmt`, `polygonPoints`, `starPoints`; `nodeAttrs` (position-aware `value`/`bounds`/`mid`/`tail` that reproduces each engine's exact attr bytes — a single appended `extras` bag was rejected because it would reorder timeline/geomap/diagram attrs); `svgShell` (outer shell; `<defs>`/inner `<g>` wrappers passed as composed children to preserve geomap/diagram structure; callers append the trailing `\n` for visual/geomap/diagram); `a11yButton` + `pushInteractiveEntries` (the shared button/`acceptsActions` fan-out only — a shared `collectInteractive` traversal was rejected because chart/timeline are flat and diagram's edge `follow` is hardcoded; traversal stays per-engine).
- Per-engine stays: `SceneNode`/`Scene` types, per-kind shape `switch` (including branch attrs like `data-oedu-filled`/`data-oedu-relationship`), `mid`/`tail` extras, per-engine a11y shaping + traversal (Visual's recursive `button|group|img` tree; chart/timeline flat role-filtered rows; geomap's `!hidden` recursive walk; Diagram's node/edge rosters with edge → `link`), domain rows, trailing `\n` (visual/geomap/diagram).
- No shared scene model, no unified metadata contract (rejected in Option 2).
- **Timing gate:** "Workstream A is green" is defined as the **PLAN-P8 §3 exit** — A1–A4 complete, N1 slice (chart/timeline golden fixtures + render honesty tests) landed in `main` (PR #23, `b3b450d`). That exit is **met**; Stage 0 (this ADR + the plan) is documentation only and is not gated. The N1.8 chart `kind: line` series-stroke follow-on and the `ch-l1-read-trend` reopen are **chart-honesty debt tracked by the gap-closure plan (T11)**, not blockers for the adapter gate — the adapter gate turns green on the Workstream A exit, not on its tagged follow-ons.

## Consequences

+ Zero behavioral churn — extraction is byte-identical and guarded by each engine's golden `fixture.test.ts`; a step is green only when goldens are unchanged.
+ One shared path for future render targets and for output-level validation (the only genuinely missing validation layer).
+ Drift stops at one place instead of five (`data-oedu-*` divergence is the demonstrated cost of the status quo).
- One new published package: packaging + publish surface grows (N6.1 `publish:dry`/`publish:smoke` must cover `svg-kit`), and engines gain a runtime dependency.
- Sequenced onto the (now-met) Workstream A exit per AGENTS.md ("no library adapters until A is green"); Stage 0 — this ADR + the plan — shipped first as documentation. Did not land during Workstream A, so the A golden-work and this extraction cannot conflict.

**Revisit trigger:** a second render target (HTML/Canvas/PDF) materializes → extend the shared shell into a generic per-engine `Renderer` interface (deferred here; §6 of the plan). A second engine adopting the same middleware/hook the first added → promote that hook into `svg-kit`.