# Implementation Plan — P8 Workstream A: Slice Honesty (Revised after review)

**Date:** 2026-09-09 (rev. 1)
**Plan source:** `docs/PLAN-P8.md` §3 (Workstream A) + Design review feedback.
**Branch:** fresh `feat/p8-workstream-a` from `main`, carrying the uncommitted P8 planning doc changes.
**Deliverable:** **three** review PRs (see PR split below). Workstream A is marked done only after the real A3 audit.

---

## Scope

- **A1 — Diagram:** edges render as real `<line>`/`<path>` with `marker-end` arrowheads and `data-oedu-relationship`; layout uses the graph (radial by cycle/walk order, grid by content order, hierarchical keeps Kahn/topo layers); edge geometry assigned in layout; goldens + e2e assert edge primitives; no ELK/Dagre/d3.
- **A2 — Visual closed set (D9):** make the existing 7 components honest (layout-first per kind, then fill missing SVG primitives) + golden fixture each, using their **real schema kinds**. `illustration` included (P2.5) not skipped.
- **A3 — Playground/audit honesty:** audit all engine fixtures, fix real bugs in-engine only, map bugs to A vs Workstream D.

**Non-goals:** Workstream B/C/D/E; frozen kind/layout enums; new libraries.

---

## Corrections from review (incorporated)

1. **A1 ordering:** geometry → SVG → graph-order, in **one combined A1 test-first slice** (edge endpoints come from layout first, then render consumes them). No more "geometry comes from" forward-dep.
2. **Visual content.kind names** are the frozen `VISUAL_KINDS`, not PLAN filenames: `fraction` (bar), `fraction-comparison` (circle), `geometry`, `counting-set`, `clock`, `coordinate-grid`, `comparison`, `illustration`. Do **not** add `fraction-bar`/`fraction-circle` as kinds.
3. **"Hollow SVG" narrowed:** most D9 kinds already emit `<line>/<circle>/<rect>/<text>`; wrappers with children as `<g>` is correct. The real gaps are (a) **layout** — only number-line has a strategy, everything else is `rect(startX,20,40,24)` stacked; (b) **missing leaf cases** — `square`, `star`, `shape`, `fraction-circle` wrapper, default `group`.
4. **PR split:** PR1 = P8 docs + A1; PR2 = A2 Visual; PR3 = A3 audit. Three review surfaces, not one.
5. **One ordering policy per layout strategy** (below).
6. **Empty-`<g>` guard narrowed** to leaves-claimed-by-SPEC; do not ban `<g>`.
7. **A1.2 golden regen combined** with geometry+SVG in one regen pass, not three.
8. **Visual `<title>`/`<desc>`** from envelope `accessibility`, not a hardcoded "Interactive number line".
9. **Conformance vs playground:** the A1.4 playground check must cover the diagram catalog routes (all fixtures incl. skill-example if catalogued), not just the one `?engine=diagram` e2e fixture.
10. **Edge assertion strengthened:** per edge → one path/line with `marker-end` **and** `data-oedu-relationship`.
11. **No-d3 guard** scoped to imports (not comments/PLAN.md).

---

## Current State (verified)

### Diagram engine
- `render/svg.ts:29` edges = **empty `<g ...></g>`**.
- `radial.ts:16`, `grid.ts:13` use `.sort()`.
- `hierarchical.ts` keeps topo layers; intra-layer uses `.sort()`.
- `layout/engine.ts` bounds on nodes only — **no edge geometry**.
- Goldens for 5 fixtures; `test/fixture.test.ts` is byte-stable. e2e `?engine=diagram` = one water-cycle fixture.

### Visual engine
- 7 D9 components exist + `illustration`; `VISUAL_KINDS` = `number-line, counting-set, fraction, fraction-comparison, clock, coordinate-grid, geometry, comparison, illustration`.
- `render/svg.ts` switch handles `line/tick/text/circle/rect/group`, defaults to empty `<g>` for `square`, `star`, `shape`, `fraction-circle` wrapper.
- `layout/engine.ts` real strategy only for number-line; all else stacked default.
- `<title>Interactive number line</title>` hardcoded (`render/svg.ts:72`).
- Only number-line has a golden fixture.
- Catalog auto-generated from `<pkg>/fixture/<slug>/input.*.json` + `expected.*` goldens by `scripts/build-fixture-catalog.mjs`.

---

## Tasks

### Task 0 — Branch + docs baseline (PR1)
- Fresh `feat/p8-workstream-a` from `main`; carry P8 planning doc changes (PLAN.md, PLAN-P8.md, p7-acceptance.md, README, AGENTS).
- Commit `P8: add production-readiness planning docs (PLAN-P8 workstream A–E)`.

### Task 1 — A1 combined: edge geometry + SVG + graph order (PR1, test-first)
One test-first slice, golden-regen combined once at the end:
1. **Edge geometry (layout):** `layout/engine.ts` assigns each edge a polyline/path from its from-node center to its to-node center, clamped inside canvas (L3). Assert after `layout()` every edge has endpoints inside canvas.
2. **Edge SVG (render):** `render/svg.ts` emits for each edge a `<path>` (or `<line>` for straight, `<path>` for curved/radial) with `marker-end="url(#arrowhead)"`, `data-oedu-role`, `aria-label`, `data-oedu-relationship`, `interactive`. Remove the empty-`<g>` edge path.
3. **Graph-order layout:** lock **one ordering function per strategy**:
   - **Radial (cycle):** order by following directed edges from the first authored node (`walkOrder`), not `ids.sort()`. Disconnected nodes append in content order.
   - **Grid (concept-map):** plain **content/authorship order**, deterministic, no second graph walk.
   - **Hierarchical (flow/hierarchy):** keep Kahn/topo layers; replace intra-layer `.sort()` with **stable content order** — no second BFS.
   - Implement in `graph.ts` (`walkOrder`) + `radial.ts`/`grid.ts`/`hierarchical.ts`.
4. **Assertions (edge fidelity):** rendered SVG has exactly `edgeChildren.length` path/line edges, each with `marker-end` and `data-oedu-relationship` (PLAN-P6 T4).
5. **Regen goldens once** (5 diagram fixtures: `expected.svg`, `expected.scene.json`, `expected.a11y.json`, `expected.alternative.json`) — reviewed as intended honesty change; keep `validation.json` in sync.
6. **e2e:** extend `e2e/diagram.spec.ts` (water-cycle) + **playground catalog routes** (all diagram fixtures incl. skill-example if catalogued) to assert edge primitives, not just `aria-label` presence.
7. **No-d3 guard:** test scanning `diagram-engine/src` imports for `d3`/`dagre`/`elk` (imports only).

### Task 5 — A2 Visual honesty per D9 kind (PR2, test-first)
For each schema kind `counting-set`, `fraction`, `fraction-comparison`, `clock`, `coordinate-grid`, `geometry`, `comparison`, `illustration` — **layout-first, then primitives**, one golden fixture + byte-stable test each:
1. **Failing test first:** assert each kind's SVG has the expected real primitive at sensible positions (e.g. counting objects as `<circle>`/`<rect>`/star `<path>`; `fraction` parts as `<rect>`; `fraction-comparison` parts as sector `<path>` + wrapper filled; `clock` face `<circle>` + hands `<line>` + numbers `<text>`; `coordinate-grid` axes/gridlines as `<line>` + points `<circle>`; `geometry` polygon as `<polygon>`/`<path>`; `comparison` items + operator `<text>`; `illustration` entities as labeled rows).
2. **Layout per kind** (`layout/engine.ts`): counting-set grid/row/column; fraction parts across width; fraction-comparison sectors around center; clock hands by angle; coordinate-grid mapped axes/points; geometry polygon vertices; comparison items L→R with operator between; illustration labeled entities in a row. All within canvas.
3. **Primitives** (`render/svg.ts`): add `polygon`, `path` (arc sectors), star `<path>`; remove empty-`<g>` default for `square`, `star`, `shape`, `fraction-circle` wrapper.
4. **Envelope a11y:** `<title>`/`<desc>` from spec `accessibility.label`/`description`, not hardcoded.
5. **Golden fixtures** `fixture/<slug>/input.visual.json` + `expected.{svg,scene,a11y}.json` + `validation.json` using the real `content.kind`; extend `fixture.test.ts` byte-stable loop to cover all Visual fixtures.
6. **No dead wrappers:** `fraction-comparison` root wrapper gets real content (sector children) rather than empty `<g>`.

### Task 6 — A3 audit honesty (PR3)
- Re-run all engine fixtures; assert **leaves the SPEC claims are visible are not empty `<g>`** — do **not** ban `<g>` for legitimate groups. Map failures to layout bug vs hollow render vs harness vs a **named Workstream D** slice.
- Font/primitive checks per engine (Chart/GeoMap/Timeline/Visual) as bugs are found; fix layout/hollow in-engine only; no libraries.
- Playground-side test (in `packages/dev-harness` or `apps/playground`): every catalog engine fixture whose SPEC claims content has a non-empty `expected.svg` with the claimed primitives.
- `illustration` explicitly covered (not silently deferred beyond the labeled-row layout in Task 5).

### Task 7 — Gates × 3 PRs
- **PR1 (docs + A1):** `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright` green; diagram goldens regenerated in one pass.
- **PR2 (A2 Visual):** same full gate green; Visual goldens added.
- **PR3 (A3 audit):** same full gate green; only real bugs fixed, each mapped to A-slice or named Workstream D.
- Mark `docs/PLAN.md` §10/§11 + `PLAN-P8.md` change log **A substage done only after PR3 is real** (A3 audit), not after PR1.
- Commit per task in repo style. Open PRs with `gh pr create`; do not merge — user reviews, then the user/we merge via `gh pr merge`.

---

## Verification strategy
- **Test-first (A4):** failing assertion on the stub first, then green after implementation.
- **Goldens:** single regen per area, reviewed as honesty improvements; never to mask a bug.
- **Determinism:** one ordering policy per strategy; no randomness.
- **Full gate** green at each PR.

---

## Explicit non-goals / boundaries
- No new libraries (D3/ELK/Recharts/MapLibre/Konva) for A1–A3.
- No widening of frozen `VISUAL_KINDS` / `DIAGRAM_KINDS` / layout enums.
- No Workstream B/C/D/E work in these PRs.
- If a fixture's honesty genuinely requires a math primitive only expressible via a library, that is **out of A** — report it as naming a Workstream D slice, do not smuggle.
