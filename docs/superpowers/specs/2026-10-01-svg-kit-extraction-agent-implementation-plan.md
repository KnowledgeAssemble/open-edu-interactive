# svg-kit Extraction — Agent Implementation Plan (executor: deepseek-4-flash)

**Date:** 2026-10-01
**Executor:** deepseek-4-flash (a "do exactly this, verify, and STOP on any doubt" agent)
**Repository:** openedu-interactive — run every command from the repo root
**Branch (create if absent):** `feat/p8-svg-kit-extract`
**Sources of truth — READ BEFORE EDITING:**
- `AGENTS.md` (repo invariants: byte-identity, no comments, ESM `.js` import specifiers, never touch `interactive-engine`, fit the exit gate below)
- `docs/superpowers/specs/2026-10-01-svg-kit-render-extraction-implementation-plan.md` (the DESIGN plan — §§2–3 hold the contract this plan executes)
- `docs/adr/ADR-13.md` (decision record)
**Gate status:** "Workstream A green" (PLAN-P8 §3 exit) is **met** — `git merge-base --is-ancestor b3b450d HEAD` must print nothing and exit 0. The adapter gate is unblocked.

---

## 0. Scope

Produce `packages/svg-kit/` (`@knowledgeassemble/svg-kit`) with zero runtime deps, then refactor the five engine renderers onto it with **byte-identical output** (engine goldens unchanged). Open NO PR, push NOTHING. Commit only after a green step (message style: `P8 svg-kit: <step>: <summary>`).

**Hard non-negotiables (violating any one = stop and report):**
1. **Byte-identity:** a step that changes any `expected.svg`/`expected.*.json` golden is a FAILED step. Never regenerate/rewrite a golden. If a golden differs, STOP — the extraction is wrong.
2. **Extract verbatim.** Copy function bodies from the cited sources exactly. Do not "improve", reformat, or unify anything except what §3 explicitly says (`centerOf` param name).
3. **No output widening.** Shared helpers emit exactly what each engine emits today (no DFS where the engine was flat, no extra attrs, no extra a11y rows).
4. Add **zero** comments to code. Follow the existing style (`noUncheckedIndexedAccess`, `arr[i]` is `T | undefined`, assert with `!` deliberately).
5. **Never edit** `interactive-engine`, `apps/`, `dev-harness`, `docs/`, `AGENTS.md`, or any golden fixture.
6. In doubt about a spec, behavior, or a failing command: **STOP and report.** Do not guess.

---

## 1. Pre-flight (T0)

1. `git status` (clean) and `git checkout -b feat/p8-svg-kit-extract` (or reuse if present).
2. Read the five renderers end to end: `packages/{visual,chart,timeline,diagram,geomap}-engine/src/render/svg.ts`.
3. Read `packages/visual-engine/test/fixture.test.ts` (the assertion mechanism: `expected.svg` is exact string equality).
4. Baseline gate must be green before any edit:
   `pnpm typecheck && pnpm lint && pnpm -w test`
   Record the exact outputs.

---

## 2. G1 — Create `packages/svg-kit/`

Copy `packages/visual-engine/tsconfig.json` + `tsconfig.build.json` as the base for the new package (adjust `include` to `src` / `src`+`test`). `package.json` mirrors visual-engine's shape but with NO dependencies: name `@knowledgeassemble/svg-kit`, `type: module`, `main`/`types` → `src/index.ts`, `exports`, `publishConfig` (dist paths), scripts `build` (`tsc -p tsconfig.build.json`), `typecheck`, `lint` (`eslint src test`), `test` (`vitest run`), `prepublishOnly` (`pnpm build && pnpm typecheck && pnpm lint && pnpm test`).

### 2.1 `src/base.ts` — extract verbatim
| Function | Copy from | Notes |
|---|---|---|
| `escapeXml(s): string` | `visual-engine/src/render/svg.ts:7-9` | identical in all five; import everywhere you remove a local copy |
| `centerOf(b): {cx, cy}` | `chart-engine/src/render/svg.ts:11-13` | visual's copy names the param `bounds`; use the `b` form — output never contains the param name |
| `fmt(n): string` | `geomap-engine/src/render/svg.ts` (`function fmt`) | `String(Math.round(n*100)/100)` |
| `polygonPoints(cx,cy,r,sides)` | `visual-engine/src/render/svg.ts:160-168` | |
| `starPoints(cx,cy,oR,iR,points)` | `visual-engine/src/render/svg.ts:150-158` | |

`fmt` is geometric rounding only — never apply it globally.

### 2.2 `src/attrs.ts` — `nodeAttrs(node, { value?, bounds?, mid?, tail? }): string`
Emits, in this exact order, only what is present: `id`, `data-oedu-role`, [`data-oedu-value`], [`data-oedu-interactive`], [`mid`], [`aria-label`], [`data-oedu-bounds`], [`tail`].
- Emission conditions: `data-oedu-value` when `node.value !== undefined`; `data-oedu-interactive="true"` when `node.interactive`; `aria-label` when `node.label`; `data-oedu-bounds` when `bounds: true` AND `node.bounds` is present; a `mid`/`tail` record is emitted as given (each key an **attr name**, every entry emitted, object insertion order preserved).
- Escaping: `escapeXml` is applied to the `id`, `role`, and `aria-label` values AND to every `mid`/`tail` **value** (timeline actions, geomap state/encoding/title, diagram what-if/title all go through `escapeXml` in today's output). `data-oedu-value` and `data-oedu-bounds` are emitted **verbatim** (`${node.value}`, `${b.x},...`) — never escape them; that is what the engines do today.

**Unit test `test/attrs.test.ts` — assert these exact strings** (synthetic node `N = { id: 'N1', role: 'spark', value: 7, interactive: true, label: 'Al & Co', bounds: {x:1,y:2,width:3,height:4} }`):

| Call | Expected (exact) |
|---|---|
| `nodeAttrs(N, { value: true, bounds: true })` | `id="N1" data-oedu-role="spark" data-oedu-value="7" data-oedu-interactive="true" aria-label="Al &amp; Co" data-oedu-bounds="1,2,3,4"` |
| `nodeAttrs(N, { value: true, bounds: true, mid: { 'data-oedu-actions': 'select focus' } })` | `id="N1" data-oedu-role="spark" data-oedu-value="7" data-oedu-interactive="true" data-oedu-actions="select focus" aria-label="Al &amp; Co" data-oedu-bounds="1,2,3,4"` |
| `nodeAttrs(N, { mid: { 'data-oedu-state': 'active', 'data-oedu-encoding': 'low' }, tail: { title: 'D' } })` | `id="N1" data-oedu-role="spark" data-oedu-interactive="true" data-oedu-state="active" data-oedu-encoding="low" aria-label="Al &amp; Co" title="D"` |
| `nodeAttrs(N, { tail: { 'data-oedu-what-if': 'deemphasized', title: 'D' } })` | `id="N1" data-oedu-role="spark" data-oedu-interactive="true" aria-label="Al &amp; Co" data-oedu-what-if="deemphasized" title="D"` |

Also assert: no `mid`/`tail`/`value`/`bounds` → only `id` + `data-oedu-role` (+`aria-label` when label present).

### 2.3 `src/shell.ts` — `svgShell({ width, height, rootId?, title, desc?, children }): string`
Outer wrapper exactly like the current engines (parameter order fixed):
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">` + `\n  <title>{escaped title}</title>` + `\n  <desc>{escaped desc}</desc>` + (`rootId` provided ? `\n  <g id="{rootId}">` : `''`) + `\n{children}` + (`rootId` provided ? `\n  </g>` : `''`) + `\n</svg>`.
**Returns WITHOUT trailing newline.** Callers append `'\n'` (visual/geomap/diagram) or nothing (chart/timeline).
- `children` is the engine's fully-composed body (inner `<g>` wrappers and their indentation included) — `svgShell` inserts it verbatim at column 0.
- `rootId` is **optional**. Diagram passes none: its `<defs>` block and `<g id="diagram-root">` live inside `children` (in diagram's real output those bytes precede the body and come **before** the root-level group, so it cannot use the wrapper path). The other four engines always pass a `rootId`.

### 2.4 `src/a11y.ts`
- `a11yButton(node)` → `{ id: node.id, role: 'button', label: node.label ?? node.id, children: [] }` (NOTE: not used by diagram — its label is `node.label ?? nodeId` from metadata).
- `pushInteractiveEntries(list, node)` → if `node.interactive && node.acceptsActions`, push `{ id: node.id, action }` per action. **Does not recurse.** Traversal is the caller's job, exactly as the design plan §2 requires ("a shared traversal is never introduced").

### 2.5 `src/index.ts`
`export { escapeXml, centerOf, fmt, polygonPoints, starPoints, nodeAttrs, svgShell, a11yButton, pushInteractiveEntries }` from `./base.js`, `./attrs.js`, `./shell.js`, `./a11y.js` (ESM `.js` specifiers, matching repo convention).

### 2.6 Unit tests (test-first — write each test, watch it fail, then make it pass)
`base.test.ts` (escapeXml `& < > "`, centerOf, fmt, polygon/star), `shell.test.ts` (assert these **exact** strings:
`svgShell({ width: 100, height: 50, rootId: 'x-root', title: 'T', desc: 'D', children: '  <g/>' })` equals
`'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50" role="img">\n  <title>T</title>\n  <desc>D</desc>\n  <g id="x-root">\n  <g/>\n  </g>\n</svg>'`;
and the no-rootId path `svgShell({ width: 100, height: 50, title: 'T', desc: 'D', children: '  <defs/>\n  <g/>' })` equals
`'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50" role="img">\n  <title>T</title>\n  <desc>D</desc>\n  <defs/>\n  <g/>\n</svg>'`),
`a11y.test.ts` (a11yButton shape; pushInteractiveEntries fans out, ignores non-interactive, does not recurse), `attrs.test.ts` (§2.2).

**G1 gate:** `pnpm --filter @knowledgeassemble/svg-kit build && pnpm --filter @knowledgeassemble/svg-kit typecheck && pnpm --filter @knowledgeassemble/svg-kit lint && pnpm --filter @knowledgeassemble/svg-kit test` green, zero consumers. Commit.

---

## 3. T2 — Visual pilot (reference; prove byte-identity before the rest)

Edit `packages/visual-engine/src/render/svg.ts`:
1. Remove the local `escapeXml`, `centerOf`, `polygonPoints`, `starPoints` definitions; `import { nodeAttrs, svgShell, escapeXml, centerOf, polygonPoints, starPoints, pushInteractiveEntries } from '@knowledgeassemble/svg-kit'` and add `"@knowledgeassemble/svg-kit": "workspace:*"` to `package.json` (+ `pnpm install` for the lockfile).
2. Replace the attr-assembly block (`nodeToSvg`, lines ~15-29) with `const attrs = nodeAttrs(node, { value: true, bounds: true });` — the shape `switch` and its branch attrs (`data-oedu-filled`, `data-oedu-hit-target`) stay **unchanged**.
3. In `svgFrom`, replace the wrapper with:
   `const svg = svgShell({ width, height, rootId: 'visual-root', title, desc: description, children: childrenSvg }) + '\n';` (visual keeps its trailing `\n`).
4. a11y: keep `sceneNodeToA11y` and the recursive `collect` walk exactly as-is; inside `collect`, replace only the fan-out loop with `pushInteractiveEntries(interactive, node)` — the set of visited nodes must not change.

**Gate:** `pnpm --filter @knowledgeassemble/visual-engine test` green AND `git status` shows **zero** changes under `packages/visual-engine/fixture/`; `pnpm typecheck && pnpm lint` green. Commit. This is the template for the remaining four — if this fails, STOP and report, do not proceed.

## 4. T3–T6 — adopt the remaining engines (same pattern, per-engine specifics)

| Step | `nodeAttrs` options | Shell | a11y/interactive | trailing `\n` |
|---|---|---|---|---|
| T3 chart | `{ value: true, bounds: true }` | `rootId: 'chart-root'`; children = `seriesSvg + nodes[...]` (series `<polyline>` stays) | button rows → `a11yButton` + `pushInteractiveEntries`; keep the axis/label/tick text rows and `tabular` | no |
| T4 timeline | `{ value: true, bounds: true, mid: acceptsActions.length ? { 'data-oedu-actions': acceptsActions.join(' ') } : undefined }` | `rootId: 'timeline-root'`; children keep the `timeline-tracks` `<g>` wrapper with its current indentation | button rows → `a11yButton` + `pushInteractiveEntries`; keep period/label/tick text rows and `linear` | no |
| T5 diagram | `{ tail: { 'data-oedu-what-if': 'deemphasized', title: description } }` (both conditional) | **`rootId` omitted** (no-root path). `children` = today's body verbatim: `  <defs>\n    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">\n      <polygon points="0 0, 8 3, 0 6" fill="currentColor"/>\n    </marker>\n  </defs>` + `\n  <g id="diagram-root">` + `\n    <g id="diagram-nodes">` + `\n` + `${childrenSvg}` + `\n    </g>` + `\n  </g>` — `<defs>` must end up **before** the root `<g>`, hence no wrapper. Children keep `indent 2`, `root.children` + `!hidden` | **entire roster loop stays local** (node buttons use `node.label ?? nodeId`; edge `link` + hardcoded `follow`); keep `alternative` (RelRow) | yes |
| T6 geomap | `{ mid: { state?, encoding? }, tail: { title? } }` — state derived from `role` (`route-completed`→`completed`, `route-active`→`active`), encoding from `metadata.encodingBucket` | `rootId: 'map-root'`; children keep the `map-layers` `<g>` wrapper and `nodeToSvg`'s `minTouchTarget` param | recursive `!hidden` walk stays local; button rows → `a11yButton` + `pushInteractiveEntries`; keep `alternative` (EntityRow) + scale-bar/compass rows | yes |

Each step: same gate as T2 (engine fixture dir clean, engine test green, `pnpm typecheck && pnpm lint` green), then commit. **Stop immediately if any engine fixture changes.**

## 5. T7 — publish verification

1. `pnpm -r build` — must include `svg-kit` in `dist`.
2. Edit `PACKAGE_DIRS` in `scripts/p7-publish-smoke.mjs` (array at line ~9) to add `'svg-kit'`. **Do NOT touch the `engineTypes.length === 5` assertion** (svg-kit is not an engine). This edit is part of the svg-kit PR; the smoke itself is the gate.
3. `pnpm publish:dry` (auto-includes via `-r`) then `node scripts/p7-publish-smoke.mjs` — smoke green, svg-kit tarball asserted, five-engine assertion still passes. Note: `publish:dry` may need network; if it fails purely on network/registry, report that (with output) rather than retrying indefinitely. Commit.

## 6. T8 — close-out (no code)

Report (do not edit docs):
- Full exit gate output: `pnpm typecheck && pnpm lint && pnpm -w test` (and `pnpm playwright` if locally runnable; else report it as unrun).
- `node scripts/check-engine-skills-fresh.mjs` (must be clean).
- `git diff --stat` confirming **zero** fixture changes.
- Anything deferred/uncertain.

---

## 7. Stop conditions (STOP, do not continue)

- Any golden diff under any `packages/*/fixture/`.
- Any behavior you cannot reproduce byte-for-byte from §2.2/§2.3 or the cited engine lines.
- A lint/type error you cannot resolve without changing engine output or adding a dependency.
- `pnpm -w test` fails in a package you did not touch.
- ADR-13/design-plan/book in a `docs/superpowers/specs/` file contradicting what you see — report, do not fix.

**Expected churn that is NOT a stop condition:** `pnpm-lock.yaml` changes (new `workspace:*` dep) and the `svg-kit` directory + engine `package.json` edits. Any diff under `packages/*/fixture/` or `packages/*/src/render/svg.ts` beyond the plan's edits IS.

Evidence over assertion: every gate you claim is green must be backed by the command output you paste into your final report.