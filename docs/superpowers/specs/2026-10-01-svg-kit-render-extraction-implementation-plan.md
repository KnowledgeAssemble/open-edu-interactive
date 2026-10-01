# SVG Renderer Extraction Implementation Plan (Workstream A follow-on)

**Date:** 2026-10-01
**Authority (top to bottom):** `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → `docs/use-cases/<engine>.md` → per-engine `SPEC.md`
**Audience:** AI coding agents, maintainers, engine implementers
**Branch:** `feat/p8-svg-kit-extract`
**Decision record:** `docs/adr/ADR-13.md` (Proposed → Accepted at the adapter gate)
**Extends:** nothing; serializes after `docs/PLAN-P8.md` Workstream A. **"Workstream A is green" is the PLAN-P8 §3 exit** — A1–A4 complete, the N1 slice landed in `main` (PR #23, `b3b450d`) — which is **met**. The N1.8 `ch-l1-read-trend` line-stroke follow-on is chart-honesty debt tracked by the gap-closure plan T11 and is **not** a gate for this plan. This plan changes **no engine output**, so it never conflicts with that golden work.
**A-green evidence (2026-10-01):** chart `bar`/`line` and timeline `events`/`independence`/`periods`/`tracks` goldens + `render.test.ts` are in `main`; `git merge-base --is-ancestor b3b450d HEAD` is true.

---

## 0. Verified facts this plan depends on (2026-10-01)

- `escapeXml` is a byte-identical copy in all five `packages/<engine>/src/render/svg.ts` files (verified by checksum).
- `centerOf` is **semantically** identical in visual, chart, timeline — the only difference is the param name (`bounds` vs `b`); unify it safely, output never contains the param name.
- The attribute-assembly blocks share the base order `id`, `data-oedu-role`, [`data-oedu-value`], [`data-oedu-interactive`], [`aria-label`], [`data-oedu-bounds`] but have **already drifted once, at different positions**, not just in content: timeline inserts `data-oedu-actions` **before** `aria-label`; geomap inserts `data-oedu-state`/`data-oedu-encoding` **before** `aria-label` and `title` **after** it; diagram inserts `data-oedu-what-if` **after** `aria-label` and `title` after it; chart/timeline/visual emit `value`/`bounds`, geomap/diagram emit neither. Per-kind **branch** attrs (visual `data-oedu-filled`/`data-oedu-hit-target`, diagram `data-oedu-relationship`/`data-oedu-chain-step`) are appended after `${attrs}` inside the shape `switch`, not in the common block.
- Every `SvgResult` shares `{ svg, a11y, interactive }`; domain rows extend it per engine: chart `tabular`, timeline `linear`, geomap `alternative: EntityRow[]`, diagram `alternative: RelRow[]`. `a11y` is the same inline `{ id, role, label, children: unknown[] }` shape everywhere (visual adds optional `description`).
- The `interactive && acceptsActions` **fan-out** is the only shared piece of the a11y/interactive loops; the **traversal differs per engine and must not be unified**: visual recurses (recursive a11y tree + interactive collect); chart/timeline iterate **top-level `scene.nodes` only** (a nested interactive node is *not* collected today — a shared DFS would change output); geomap recurses with a `!node.hidden` filter; diagram uses **kind rosters** — node rows with `label: node.label ?? nodeId` (metadata id, not `node.id`) and edge rows with `role: 'link'` and a **hardcoded `action: 'follow'`** that never reads `acceptsActions`. Four engines label buttons `node.label ?? node.id`; diagram does not.
- Shell divergence is confined to: geomap's inner `<g id="map-layers">`, diagram's `<defs>`+`<marker id="arrowhead">` and `<g id="diagram-nodes">`; children are composed at indent 1 in four engines and indent 2 in diagram. Trailing whitespace: visual/geomap/diagram end `</svg>\n`; only chart/timeline end `</svg>` with no trailing newline.
- Golden fixtures (`packages/<engine>/test/fixture.test.ts`, private `packages/<engine>/fixture/<kind>/expected.svg`) assert the SVG with **exact string equality** against `expected.svg` (scene/a11y/interactive are JSON-serialized) — the byte-identity acceptance gate.
- `dev-harness`/`conformance`/`playground`/`interactive-react` consume engines through their public APIs (`VisualEngine` etc., dev-harness `mountEngine`/`loadSpec`); **no cross-package import of `render/*` internals exists**, so this plan is a no-op for them.

## 1. Non-goals (fixed, do not drift)

- **No shared `SceneNode`/scene grammar.** Kinds are engine-specific by D9. Cross-engine composition is the event bus + lesson router.
- **No unified metadata contract.** `SceneNode.metadata` stays a per-engine, documented field; tightening it is out of scope.
- **No builder-function rewrite** of per-kind shapes. The `switch(node.kind)` blocks move untouched.
- **No new validation layers.** semantic/layout/accessibility validation already exists per engine (§6 carries the only gap).
- **No second render target** (HTML/Canvas/PDF) and no generic `Renderer` interface yet (§6).

## 2. Package contract — `packages/svg-kit/` (`@knowledgeassemble/svg-kit`)

zod-free, zero runtime deps, publishing setup mirroring engines (per-file `tsc` ESM emit, `exports`/`publishConfig`). New package == library adapter → **gated on Workstream A green** (definition + status in §4).

```text
packages/svg-kit/
  src/
    base.ts    escapeXml, centerOf, fmt, polygonPoints, starPoints
    attrs.ts   nodeAttrs(node, opts?) -> string
    shell.ts   svgShell(opts) -> string
    a11y.ts    a11yButton(node), pushInteractiveEntries(list, node)
    index.ts
  test/        base.test.ts, attrs.test.ts, shell.test.ts, a11y.test.ts
```

Signatures (each reproduced **byte-for-byte** from the engine it currently lives in):

| Export | Source (moved verbatim) | Notes |
|---|---|---|
| `escapeXml(s)` | any of the five | identical everywhere |
| `centerOf(b)` | visual/chart/timeline | identical semantics (`bounds` vs `b` param name); unify the name — output never contains it |
| `fmt(n)` | geomap | `String(Math.round(n*100)/100)` — used only where the engine already rounds; global formatting is NOT applied |
| `polygonPoints(cx,cy,r,sides)` | visual | |
| `starPoints(cx,cy,oR,iR,points)` | visual | |
| `nodeAttrs(node, { value?, bounds?, mid?, tail? })` | all five attr blocks | emits, in this exact order: `id`, `data-oedu-role`, [`data-oedu-value`], [`data-oedu-interactive`], [`mid`], [`aria-label`], [`data-oedu-bounds`], [`tail`]. `value`/`bounds` reproduce chart/timeline/visual. `mid` = extras inserted **before** `aria-label` (timeline `data-oedu-actions`; geomap `data-oedu-state`, `data-oedu-encoding`, in that order). `tail` = extras appended at the end of the block (geomap `title`; diagram `data-oedu-what-if`, `title`, in that order). Per-kind **branch** attrs (visual `data-oedu-filled`/`data-oedu-hit-target`, diagram `data-oedu-relationship`/`data-oedu-chain-step`) are **not** `nodeAttrs` — they stay in the engine's shape `switch` |
| `svgShell({ width, height, rootId, title, desc?, children })` | all five shells | outer `<svg … viewBox width height role="img">` + `<title>`/`<desc>` + `<g id=rootId>{children}</g>`; the engine composes `children` verbatim including inner `<g>` wrappers (timeline `timeline-tracks`, geomap `map-layers`, diagram `<defs>`/`diagram-nodes`) so byte-identity holds; **returns without trailing newline** — visual/geomap/diagram append `'\n'` locally, chart/timeline append nothing |
| `a11yButton(node)` | visual/chart/timeline/geomap | `{ id, role: 'button', label: node.label ?? node.id, children: [] }`. **Not** used by diagram (its button label is `node.label ?? nodeId`, from metadata) |
| `pushInteractiveEntries(list, node)` | the five fan-outs | `interactive && acceptsActions` → push `{ id, action }` per action. Call sites keep each engine's current traversal (visual recursive; chart/timeline flat top-level; geomap recursive + `!hidden`); diagram's roster loops and its hardcoded edge `action: 'follow'` stay fully local. A shared traversal is **never** introduced here |

## 3. Adoption matrix

Each row is a separate PR; acceptance = `pnpm --filter <engine> test` with **zero golden churn** + `pnpm typecheck` + `pnpm lint`. Trailing `\n`: visual/geomap/diagram append `'\n'` to the shell output locally; chart/timeline append nothing.

| Step | Engine | `nodeAttrs` opts | Shell + per-kind branches stay | a11y/interactive stays | Domain output stays |
|---|---|---|---|---|---|
| 2 | visual-engine | `value`, `bounds` (no `mid`/`tail`; `data-oedu-filled`/`hit-target` stay in the `rect`/`tick`/`text` branches) | children at indent 1; per-kind shape `switch` unchanged | recursive a11y tree + recursive interactive collect | — |
| 3a | chart-engine | `value`, `bounds` | series `<polyline>` (from scene points) composed locally + children at indent 1 | flat top-level + axis/label/tick rows | `tabular` |
| 3b | timeline-engine | `value`, `bounds`, `mid: { actions? }` | children at indent 1, wrapped in `timeline-tracks` `<g>` | flat top-level + period/label/tick rows | `linear` |
| 3c | diagram-engine | `tail: { whatIf?, title? }` (`relationship`/`chain-step` stay in the edge branch) | `<defs>` arrowhead + `diagram-nodes` `<g>`; children at indent 2, selected via `root.children` (+ `!hidden`) | kind rosters: node `button` rows, edge `link` rows + hardcoded `follow` | `alternative` (RelRow) |
| 3d | geomap-engine | `mid: { state?, encoding? }`, `tail: { title? }` | children at indent 1, wrapped in `map-layers` `<g>` (`nodeToSvg` keeps its `minTouchTarget` param) | recursive `!hidden` walk | `alternative` (EntityRow) |

Engines add `"@knowledgeassemble/svg-kit": "workspace:*"`; `pnpm install` updates the lockfile (existing precedent: `05d0b51`).

## 4. Sequencing and gates

| Gate | Contents | Blocked by |
|---|---|---|
| G0 | This plan + `ADR-13` (Proposed) | none (documentation) |
| G1 | `svg-kit` package + unit tests, **no engine adapter yet** | Workstream A green (PLAN-P8 §3 exit — **met** as of `b3b450d`; unblocked) |
| G2–G3d | adoption matrix steps 2…3d, one PR each | G1 |
| G4 | Mark ADR-13 Accepted in the gate review | G2–G3d green |

Hard rules:

- **Byte-identity is non-negotiable** — a step that changes any golden is a failed step; regenerate-and-review only with an explicit output-drift justification, never silently.
- **No traversal widening** — shared a11y/interactive helpers emit exactly what each engine's loop emits today (visual recursive, chart/timeline flat top-level, geomap `!hidden` recursive). Introducing a shared DFS an engine didn't have would add `interactive`/'a11y' rows → golden churn; the acceptance bar for every adoption step is the **same set** of rows.
- **`nodeAttrs` emits in the base order** — `mid`/`tail` (never a single appended `extras` bag) is what preserves each engine's byte order (§2); a position error is a golden failure, so unit tests assert each engine's exact attr byte-sequence.
- **Contract-first** — new `svg-kit` exports land in this plan + index before use; nothing engine-specific migrates out (shape `switch`, per-kind branch attrs, `mid`/`tail` extras, domain rows stay per-engine).
- **Test-first (A4 bar)** — each `svg-kit` unit test must fail against the engine copy before it exists as the shared export path (the `nodeAttrs` unit test asserts the visual/chart/timeline/geomap/diagram attr orders verbatim).
- **No core changes** — `interactive-engine` is untouched (renderer-free, zod-only).

## 5. Work items ledger

| # | Work | Gate | Done when |
|---|---|---|---|
| T1 | Create `packages/svg-kit/` — `src/` (base/attrs/shell/a11y/index), `test/`, `tsconfig.json` + `tsconfig.build.json`, `package.json` (name, `exports`, `publishConfig`, scripts `build`/`typecheck`/`lint`/`test`/`prepublishOnly` mirroring engines; no deps) | G1 | `pnpm --filter svg-kit typecheck lint test` green; zero consumers |
| T2 | Adopt in visual-engine (Step 2 reference) | G2 | visual goldens byte-identical; render-svg.test.ts green |
| T3 | Adopt in chart-engine (Step 3a) | G3a | chart goldens unchanged; `tabular` intact |
| T4 | Adopt in timeline-engine (Step 3b) | G3b | timeline goldens unchanged; `linear` intact |
| T5 | Adopt in diagram-engine (Step 3c) | G3c | diagram goldens unchanged; `alternative` (RelRow) intact |
| T6 | Adopt in geomap-engine (Step 3d) | G3d | geomap goldens unchanged; `alternative` (EntityRow) intact |
| T7 | Publish verification | G3d | `pnpm publish:dry` auto-covers svg-kit (`-r`); add `'svg-kit'` to `PACKAGE_DIRS` in `scripts/p7-publish-smoke.mjs` (hardcoded list, line ~9) **keeping the five-engine type assertion intact** (svg-kit is not an engine); `publish:smoke` asserts its tarball |
| T8 | ADR-13 → Accepted + close plan | G4 | gate review sign-off |

## 6. Deferred (explicitly not this plan)

1. Generic per-engine `Renderer<Scene, LayoutContext, SvgResult>` interface — revisit trigger in ADR-13 is a second render target.
2. One shared **svg-output well-formedness** validation step (escaping + structural integrity) — the only missing validation layer; semantic/layout/a11y validation already exists per engine.

## 7. Exit gate

`pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs` — plus byte-identical engine goldens at every adoption step and `@knowledgeassemble/svg-kit` covered by publish verification.