# Media Slot Rendering — Implementation Plan

> **Status:** Ready to execute
> **Date:** 2026-10-03
> **Repo:** `openedu-interactive`
> **Spec (authority for design):** `docs/superpowers/specs/2026-10-03-media-slot-rendering-implementation-spec.md`. Where this plan and the spec disagree, the spec wins — stop and report the conflict rather than choosing.
> **Audience:** the implementing agent. Task sizing is tuned for a fast model with limited context retention: every task is small, self-contained, independently verifiable, and ends in one commit.
> **Branch:** `feat/media-slot`
> **Target:** Diagram `content.nodes[].media: { kind: "figure" }` reserves a host-fillable media slot rendered by one shared `svg-kit` emitter.

---

## 0. Operating rules (read before touching anything)

These are not stylistic preferences. Violating any of them breaks a repo gate or a review invariant.

1. **One task, one commit.** Do not batch tasks. Do not start task *n+1* until task *n*'s commit exists.
2. **Test-first, literally.** Write the failing test, run it, **read the failure output**, then write the implementation. A test that has never failed has not been proven.
3. **Never hand-edit a golden.** Goldens are regenerated with `REGEN=1` (see T6). If you edit `expected.*` by hand, the change is unreviewable and will be rejected.
4. **Never widen a schema to make something pass.** `additionalProperties: false` and `.strict()` stay. A new field is added *to* the schema, never a relaxation of it.
5. **Zero churn on existing goldens.** After any regeneration, `git status` must show changes **only** in the new fixture directory. If other fixtures changed, you have a bug — do not commit the regenerated files; revert them and find the cause.
6. **ESM import specifiers** get the `.js` extension (`from '../src/schema.js'`). Extensionless relative imports fail typecheck with TS2835.
7. **Strict TS.** `noUncheckedIndexedAccess` is on: `arr[i]` is `T | undefined`. Assert with `!` deliberately.
8. **No inline comments** unless they explain non-obvious intent. No emojis anywhere.
9. **Stay inside your task's file list.** If you believe a file outside it must change, **stop and report** — do not expand scope unilaterally.
10. **If a gate fails for a reason your task did not cause, stop and report.** Do not work around it, and do not weaken an assertion to make it pass.
11. **No `any`, no `@ts-ignore`, no deleted or skipped tests** to get to green.
12. **Do not commit to `main`.** Branch first (T0).

### Commands

```bash
# from repo root
pnpm typecheck
pnpm lint
pnpm -w test
pnpm playwright
node scripts/check-engine-skills-fresh.mjs

# package-scoped, used throughout
pnpm --filter @knowledgeassemble/svg-kit test
pnpm --filter @knowledgeassemble/diagram-engine test
pnpm --filter @knowledgeassemble/visual-engine test
pnpm --filter @knowledgeassemble/dev-harness test

# golden regeneration (the ONLY way to write expected.*)
REGEN=1 pnpm --filter @knowledgeassemble/diagram-engine exec vitest run test/fixture-gen.test.ts
REGEN=1 pnpm --filter @knowledgeassemble/visual-engine exec vitest run test/fixture-gen.test.ts
```

`pnpm playwright` starts the conformance dev server itself. It is slow; run the package-scoped browser suite at T10 and the repo-level one at T12, not after every task.

## 1. Preconditions — read these before T1

| File | Why you need it |
|---|---|
| `AGENTS.md` | Repo invariants (P1–P12, D2–D9), commit style, test conventions |
| `docs/superpowers/specs/2026-10-03-media-slot-rendering-implementation-spec.md` | The design. §0 verified facts, §1 decisions, §2 non-goals |
| `packages/svg-kit/src/attrs.ts` | `nodeAttrs`, `AttrsNode`, `NodeAttrsOptions`. `opts.bounds` is a **boolean**; `opts.mid` injects extra attributes |
| `packages/svg-kit/src/index.ts` | The export surface you must extend in T1 |
| `packages/visual-engine/src/render/svg.ts` (`case 'entity'`, :83-89) | The reference implementation you are generalising |
| `packages/visual-engine/fixture/illustration/expected.svg` | The exact target markup shape |
| `packages/diagram-engine/src/render/svg.ts` (`nodeToSvg`, :7-50) | Where T6's early-return goes |
| `packages/diagram-engine/src/scene/build.ts` (:36-52) | Where node metadata is built (T4) |
| `packages/diagram-engine/src/layout/{engine,radial,grid,hierarchical}.ts` | T5. `layout(scene, ctx, layoutType)` receives the **whole Scene**, so `nodeChildren` (`:63`) expose `metadata.media` — no new parameter is needed to *detect* media nodes. **`metadata` is `Record<string, unknown>`** (`scene/types.ts:21`), so all media checks need the cast pattern at `render/svg.ts:24` |
| `packages/diagram-engine/src/schema.ts` (:28-37) | `DiagramNodeSchema`, `.strict()` |
| `packages/diagram-engine/test/fixture-gen.test.ts` | How goldens are written; `REGEN=1` gate |
| `packages/dev-harness/test/catalog.test.ts` (:30) | T7's requirement |
| `scripts/build-fixture-catalog.mjs` | T7's regeneration command |

**Baseline to record before you start** (write the numbers down; you will assert against them):

```bash
rg -l 'opacity="0.85"' packages/diagram-engine/fixture | wc -l   # expect 49
rg -n 'rx="6"' packages/*/src | wc -l                          # expect 2
rg -n 'rx="6"' packages/*/src                                    # expect exactly:
#   packages/diagram-engine/src/render/svg.ts:49
#   packages/visual-engine/src/render/svg.ts:86
```

## 2. Task ledger

Gates: **G1** svg-kit · **G2** Diagram contract+layout+render+fixtures · **G3** Visual render + e2e · **G4** docs + full gate. Spec IDs in the last column; this plan is a finer split.

| # | Task | Gate | Spec | Commit message stem |
|---|---|---|---|---|
| T0 | Branch + baseline | — | — | (no commit) |
| T1 | `svg-kit`: `mediaSlot()` + `MEDIA_BOX` + export | G1 | T1 | `svg-kit: add shared mediaSlot emitter` |
| T2 | Diagram schema: zod + both JSON copies + drift fix | G2 | T2 | `diagram: add media node contract to schema copies` |
| T3 | Parity hardening: compare property sets, not just enums | G2 | T2 | `diagram: extend schema parity to property sets` |
| T4 | Scene metadata carries `media` | G2 | T6 | `diagram: carry media marker on scene nodes` |
| T5 | Layout: size media nodes, reserve label room | G2 | T3 | `diagram: size media nodes and reserve label space` |
| T6 | Renderer: media nodes delegate to `mediaSlot()` | G2 | T4 | `diagram: render media nodes as faint-framed slots` |
| T7 | New golden fixture `di-media-cycle` | G2 | T5 | `diagram: add media-cycle golden fixture` |
| T8 | Regenerate fixture catalog | G2 | T5 | `dev-harness: regenerate fixture catalog` |
| T9 | Visual `entity` delegates to `mediaSlot()` | G3 | T7 | `visual: render illustration entities as media slots` |
| T10 | Playwright case for the media fixture | G3 | T5 | `diagram: cover media slots in browser e2e` |
| T11 | Docs: SPEC W-3.13, DESIGN, skill, PLAN, regenerate | G4 | T8 | `docs: document W-3.13 media nodes` |
| T12 | Full exit gate + PR | G4 | T9 | — (no code commit) |
| T13 | Host companion note (**separate repo, non-blocking**) | — | T10 | `open-edu: note Diagram media slots in figure overlay` |

T13 lives in `open-edu`, not here. Do it last, or skip it if the host work is already scheduled elsewhere. It must never block T12.

---

## 3. Tasks

### T0 — Branch and baseline (no commit)

```bash
git checkout -b feat/media-slot
git status --porcelain      # must be clean, except the untracked spec + this plan
```

Run the baseline gate (the browser suite is deferred to T10/T12) and record the results:

```bash
pnpm typecheck && pnpm lint && pnpm -w test && node scripts/check-engine-skills-fresh.mjs
```

**Acceptance:** clean tree (only the two new docs untracked), branch is `feat/media-slot`, baseline gate green.
**If the baseline is red:** stop and report. Do not start T1 on a red baseline — you will not be able to tell your breakage from pre-existing breakage.

---

### T1 — `svg-kit`: the shared emitter

**Files:** `packages/svg-kit/src/media-slot.ts` (new), `packages/svg-kit/src/index.ts`, `packages/svg-kit/test/media-slot.test.ts` (new)

**Step 1 — failing test first.** Create `test/media-slot.test.ts` asserting, for a fixed node (`id`, `role`, `interactive: true`, `label`) and bounds `{ x: 10, y: 20, width: 220, height: 120 }`:

- output contains `data-oedu-media="slot"`
- output contains `data-oedu-bounds="10,20,220,120"`
- output contains `opacity="0.15"` and **not** `opacity="0.85"`
- output contains **not** `fill="white"`
- the `<text` `y` is **greater than** `20 + 120` (the box bottom), and the output contains **no** `dominant-baseline`
- `id`, `data-oedu-role`, `data-oedu-interactive="true"`, `aria-label` are all present and come from `nodeAttrs`
- `data-oedu-media` sits **between** `data-oedu-interactive` and `aria-label` (`mid` ordering, `attrs.ts:27-33`)
- `tail: { title: 'A caption' }` is forwarded: output contains `title="A caption"` **after** `data-oedu-bounds` (`tail` is emitted last)
- `mediaSlot(node, 2)` prefixes the `<g>`, inner lines, and `</g>` with the caller's pad (`'  '.repeat(indent)`), so Visual's golden keeps its byte layout
- when `fontSize` is omitted, the output contains **no** `font-size`; when `fontSize: 11` is passed, it contains `font-size="11"`
- when `value: 99` is on the node, output contains `data-oedu-value="99"` (Visual passes `value: true` today — dropping it would churn a Visual golden if any entity carries a value)

Run it; it must fail with "Cannot find module '../src/media-slot.js'".

**Step 2 — implement `media-slot.ts`.** Compose `nodeAttrs`; do **not** hand-assemble attributes.

```ts
import { escapeXml, fmt } from './base.js';
import { nodeAttrs } from './attrs.js';
import type { AttrsNode } from './attrs.js';

export const MEDIA_BOX = { width: 220, height: 120 } as const;
export const MEDIA_LABEL_GAP = 14;

export interface MediaSlot extends AttrsNode {
  bounds: { x: number; y: number; width: number; height: number };
  fontSize?: number;
  labelGap?: number;
  tail?: Record<string, string>;
}

export function mediaSlot(node: MediaSlot, indent = 0): string {
  const pad = '  '.repeat(indent);
  const gap = node.labelGap ?? MEDIA_LABEL_GAP;
  const b = node.bounds;
  const attrs = nodeAttrs(node, { value: true, bounds: true, tail: node.tail, mid: { 'data-oedu-media': 'slot' } });
  const fontSize = node.fontSize === undefined ? '' : ` font-size="${fmt(node.fontSize)}"`;
  const labelY = b.y + b.height + gap;
  const cx = b.x + b.width / 2;
  const rect = `<rect x="${fmt(b.x)}" y="${fmt(b.y)}" width="${fmt(b.width)}" height="${fmt(b.height)}" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>`;
  const text = node.label
    ? `<text x="${fmt(cx)}" y="${fmt(labelY)}" text-anchor="middle" fill="currentColor"${fontSize}>${escapeXml(node.label)}</text>`
    : '';
  const inner = text === '' ? rect : `${rect}\n${pad}  ${text}`;
  return `${pad}<g ${attrs}>\n${pad}  ${inner}\n${pad}</g>`;
}
```

`fmt` caps every number at two decimals (`base.ts:9-11`), which is what keeps output deterministic; for integer bounds it emits the same digits as raw interpolation, so Visual's existing `<rect>` line stays byte-identical. `value: true` is safe for Diagram too — `SceneNode` has no `value`, so no attribute is emitted.

**Step 3 — export it** from `packages/svg-kit/src/index.ts`, following the existing `export`/`export type` pattern in that file.

**Step 4 — verify.** `pnpm --filter @knowledgeassemble/svg-kit test` and `typecheck` green.

**Acceptance:** the T1 test suite passes and was observed failing first; `mediaSlot` and `MEDIA_BOX`/`MEDIA_LABEL_GAP` exported from `src/index.ts`.
**Do not:** add an `emphasis` field (nothing consumes it); add `dominant-baseline`; hardcode `font-size`; introduce a new dependency.

---

### T2 — Diagram schema, all three copies

**Files:** `packages/diagram-engine/src/schema.ts`, `packages/diagram-engine/src/schemas/diagram-spec.schema.json`, `docs/schemas/diagram-spec.schema.json`

Add to `DiagramNodeSchema` (after `categories`, keeping `.strict()`):

```ts
media: z.object({ kind: z.literal('figure') }).strict().optional(),
```

Add the equivalent to **both** JSON Schema files inside the node `properties` block (both have `additionalProperties: false`, so omitting either breaks P11 validation):

```json
"media": {
  "type": "object",
  "properties": { "kind": { "type": "string", "enum": ["figure"] } },
  "required": ["kind"],
  "additionalProperties": false
}
```

**Also fix the pre-existing drift** (spec §0): `docs/schemas/diagram-spec.schema.json` declares `"interactive"` twice (nodes and edges) and `packages/diagram-engine/src/schemas/diagram-spec.schema.json` declares it **zero** times, while zod defines it on both (`schema.ts:34`, `schema.ts:48`). Add `"interactive": { "type": "boolean" }` to the node and edge property blocks of the **engine** copy so all three agree.

**Tests, written first:**
- positive: a minimal spec with `media: { kind: "figure" }` on a node validates
- negative: `media: { kind: "video" }` fails `INVALID_SPEC`
- negative: `media: { src: "a.png" }` fails `INVALID_SPEC` (unknown key)
- negative: `media: { kind: "figure", src: "a.png" }` fails `INVALID_SPEC` (unknown sibling inside the strict object)

**Acceptance:** all four tests behave as specified; all three schema copies agree; `pnpm --filter @knowledgeassemble/diagram-engine typecheck` green.
**Do not:** relax `additionalProperties` anywhere; accept `figure: true` (the shape is `kind`); touch the relationship/profiles/layout enums.

---

### T3 — Parity hardening (property sets, not just enums)

**Files:** `packages/diagram-engine/test/schema-parity.test.ts`

**Step 1 — write the failing test.** `test/schema-parity.test.ts` currently compares **enums only** (`DIAGRAM_KINDS`, `PROFILES`, `RELATIONSHIPS`, `LAYOUT_TYPES`, `SOURCE_CLASSES`), which is why the `interactive` drift survived. Add a test that compares the **key set** of the zod node shape against `schemaJson.properties.content.properties.nodes.items.properties`.

Derive the zod key set from the runtime shape rather than hardcoding it: `Object.keys(DiagramNodeSchema.shape).sort()`. If `DiagramNodeSchema` is not exported from `src/schema.ts`, export it.

**Step 2 — confirm the ordering.** Run the suite. It must now pass **because T2 already fixed the drift**. If it fails, T2 missed a key — fix T2, do not weaken this test.

**Acceptance:** the new test passes, and it demonstrably fails if you delete one property from either copy (verify by temporarily removing `media` from the engine copy, observing the failure, then restoring).
**Do not:** assert on property *types* — zod-to-JSON-Schema type comparison is a much larger project. Keys only.

---

### T4 — Scene metadata carries `media`

**Files:** `packages/diagram-engine/src/scene/build.ts`, `packages/diagram-engine/test/scene.test.ts`

In the node construction block (`:36-52`, metadata object at `:44-50`), add to the existing `metadata` object:

```ts
media: entry.media,
```

`entry.media` is `undefined` for every existing spec, so every existing golden is unaffected.

**Test first:** instantiate an engine with a media node and assert `snapshot().scene` contains a node whose `metadata.media` is `{ kind: 'figure' }`, and that a node without `media` has `metadata.media` absent or `undefined`.

**Acceptance:** snapshot test green; `git status` shows no fixture changes.

---

### T5 — Layout: media box sizing and label reservation

**Files:** `packages/diagram-engine/src/layout/radial.ts`, `packages/diagram-engine/src/layout/grid.ts`, `packages/diagram-engine/src/layout/hierarchical.ts`, `packages/diagram-engine/src/layout/engine.ts`, `packages/diagram-engine/test/layout.test.ts`

`layout(scene, ctx, layoutType)` already receives the whole `Scene`, so `nodeChildren` (`:63`) are scene nodes and their metadata is readable there. Build a size map after `nodeIds` is computed (`:66`). **`metadata` is `Record<string, unknown>` (`scene/types.ts:21`), so chained `n.metadata?.media?.kind` does not typecheck — cast, the same way `render/svg.ts:24` does:**

```ts
const mediaSizes = new Map<string, { width: number; height: number }>();
for (const n of nodeChildren) {
  const nid = n.metadata?.nodeId as string | undefined;
  const media = n.metadata?.media as { kind?: string } | undefined;
  if (nid && media?.kind === 'figure') {
    mediaSizes.set(nid, { ...MEDIA_BOX });
  }
}
```

Pass `mediaSizes.size > 0 ? mediaSizes : undefined` into `radialLayout` / `gridLayout` as a new **optional** trailing parameter, at **all three call sites in `engine.ts`**: `:83` (`strategy === 'radial'`), `:89` (`strategy === 'grid'`), and **`:104` — the hierarchical no-topo fallback**, which a cyclic spec with `layout.type: "hierarchical"` reaches today (`concept-map` cycles are legal, W-3.12). Missing `:104` leaves a legal spec rendering ~136×45 boxes instead of media slots. When the parameter is `undefined`, both functions must behave **exactly** as today — that is what guarantees zero churn.

**`radial.ts`** — the radius must reserve room for the label drawn *below* the box:

```ts
const hasMedia = sizes !== undefined && sizes.size > 0;
const maxBox = hasMedia
  ? Math.max(...[...sizes!.values()].map((s) => Math.max(s.width, s.height)))
  : nodeSize;
const mediaRadius = Math.min(ctx.width, ctx.height) / 2 - maxBox / 2 - MEDIA_LABEL_GAP - 20;
const radius = hasMedia && mediaRadius > 0
  ? mediaRadius
  : Math.min(ctx.width, ctx.height) / 2 - Math.max(ctx.minTouchTarget, 60);
```

The `mediaRadius > 0` guard is the fallback test 4 requires: on a 200×200 canvas the media reservation computes **−44**, so the radius routes back to today's formula (**40**) instead of going negative.

then per node use `sizes?.get(id) ?? { width: nodeSize, height: nodeSize }` as the box, subtracting `width / 2` and `height / 2` (not `nodeSize / 2`) in the `x`/`y` expressions, keeping the existing `Math.round` calls.

**`grid.ts`** — cells must hold the media box, and rows must leave label room. `cellH` is used in the `y` expression at **`:23`** (not `:22`, which is the `x` expression); `startY` is at `:16`:

```ts
const hasMedia = sizes !== undefined && sizes.size > 0;
const cellW = hasMedia
  ? Math.max(ctx.minTouchTarget, Math.min(ctx.width / cols, 160), MEDIA_BOX.width)
  : Math.max(ctx.minTouchTarget, Math.min(ctx.width / cols, 160));
const cellH = hasMedia
  ? Math.max(ctx.minTouchTarget, 60, MEDIA_BOX.height)
  : Math.max(ctx.minTouchTarget, 60);
const rowPitch = hasMedia ? cellH + MEDIA_LABEL_GAP + 20 : cellH;
```

The `+ 20` matches the radial pad: reserving exactly `height + labelGap` puts the label *baseline* on the next row's top edge, and descenders cross it. Use `rowPitch` at `:23` and in `startY` at `:16`. The node box is `MEDIA_BOX` when the id has a media size, otherwise the existing `cellW * 0.85` / `cellH * 0.75` (`:24-25`).

**`hierarchical.ts` + `engine.ts`** — `hierarchical` is the **default** strategy (`engine.ts:79`) and a legal `layout.type` (`LAYOUT_TYPES`, `schema.ts:15`), so media sizing must cover it or a default-layout media spec renders broken slots:

- in `engine.ts:98-101`, the per-node `sizeMap` becomes `sizeMap.set(id, mediaSizes?.get(id) ?? { width: 100, height: 50 })`, and the `computeHierarchicalBounds` call at `engine.ts:102` passes `mediaSizes.size > 0` as a new **optional trailing `hasMedia` parameter** — `hierarchical.ts` has no `hasMedia` binding of its own, so without this parameter the two bullets below do not compile
- in `hierarchical.ts:44`, `colWidth` becomes `Math.max(ctx.minTouchTarget, 120, hasMedia ? MEDIA_BOX.width : 0)` — a 220px box centred in today's 120px spacing lands at `x = -10`, off-canvas
- in `hierarchical.ts:45`, `layerHeight` becomes `Math.max(ctx.minTouchTarget + 20, 80, hasMedia ? MEDIA_BOX.height + MEDIA_LABEL_GAP + 20 : 0)` — a 120px box in today's 80px layer pitch makes adjacent layers' boxes overlap by 40px
- all three reduce to today's values when no media node is present. Known limitation, accepted and documented: **four or more media nodes in one layer** cannot fit an 800px canvas (`4 × 220 = 880 > 720`) and overlap horizontally — redesigning hierarchical packing is out of scope

**Tests first, and this task's exit condition is numeric.** `radial.ts:21` computes `angle = (2 * Math.PI * i) / n` with **no start offset**, so the lowest node sits at `sin(2 * Math.PI * i / n)` for whichever `i` maximises it — `sin(72°) = 0.9511` at n=5, `sin(60°) = 0.8660` at n=6. Verify these numbers yourself before trusting them; they are what make n=5 clip and n=6 fit.

1. a **5-node** media cycle: every node is 220×120, and the worst label `y` is **522.4** — assert `Math.abs(actual - 522.4) <= 1`, since `radial.ts:25-26` rounds coordinates
2. a **6-node** media cycle: worst label `y` is **509.1** (same tolerance)
   - **Both node counts are mandatory.** At the *current* radius of 240, n=5 puts the label at **602.3** (clips a 600px canvas) while n=6 reaches only **581.8** (fits). A single-count check would pass at 6 and ship a clip at 5. The new radius of 156 fixes both.
3. a **non-media** 5-node cycle: bounds are **byte-identical** to the values captured before you started
4. a **tiny canvas** (the media reservation computes a negative radius — 200×200 gives **−44**) falls back to today's formula (radius **40**) instead of throwing — there is **no warning channel in the engine** (verified: no `warn` match in `diagram-engine/src`) and inventing one is out of scope; assert the run does not throw and every bound is finite
5. a **5-node grid** media spec: every node is 220×120; with `cols=3`, expect `x` values `70/290/510`, row 0 at `y=146`, row 1 at `y=300` — row 1's top is 20px clear of row 0's label baseline (280), so descenders cannot touch the next box
6. a **3-layer hierarchical** media spec with **one node per layer** (a chain; the **default** strategy — do not skip this): boxes are 220×120 at `x=40`, `y` = `57/211/365`; each next layer's top (`211/365`) is 20px clear of the previous layer's label baseline (`191/345`) — today's 120px `colWidth` would put each box at `x = -10` and today's 80px layer pitch would make adjacent boxes overlap by 40px

**Acceptance:** all six pass; `pnpm --filter @knowledgeassemble/diagram-engine test` green; no existing fixture changed.
**Do not:** apply the reservation unconditionally — `hasMedia` must be false for every existing spec, or 49 goldens churn.

---

### T6 — Renderer delegation

**Files:** `packages/diagram-engine/src/render/svg.ts`, `packages/diagram-engine/test/render-svg.test.ts`

At the **top** of `nodeToSvg` (`:7`), **after** the existing `tail` construction (`:9-15`, which stays byte-identical — a media node with a `description` keeps its `title` attr, a deemphasized one keeps `data-oedu-what-if`) and **before** the common `nodeAttrs` call at `:16`:

```ts
const media = node.metadata?.media as { kind?: string } | undefined;
if (media?.kind === 'figure') {
  return mediaSlot(
    {
      ...node,
      fontSize: 11,
      tail,
      bounds: node.bounds ?? { x: 0, y: 0, width: MEDIA_BOX.width, height: MEDIA_BOX.height },
    },
    indent,
  );
}
```

The cast is **required**: `metadata` is `Record<string, unknown>` (`scene/types.ts:21`), so chained `node.metadata?.media?.kind` does not typecheck — the file's own pattern at `:24` casts `edgeGeometry` the same way.

**The `nodeAttrs(node, { tail })` line at `:16` must not change.** It serves non-media nodes. Do not add `{ bounds: true }` to it — that would rewrite all 49 fixture goldens (spec §0).

**Tests first:**
- a media node's SVG contains `data-oedu-media="slot"` and `data-oedu-bounds`, in that relative order (`mid` before `aria-label`/`bounds`, `tail` last — `attrs.ts:27-42`)
- it contains `opacity="0.15"` and not `opacity="0.85"`, and not `fill="white"`
- the `<text` `y` is greater than `bounds.y + bounds.height`
- a media node with a `description` still emits `title="…"` (the tail is forwarded, not dropped)
- a non-media node's SVG is unchanged from before this task (assert the exact string for one known fixture)
- neither variant contains `<image` or `xlink:href` anywhere

**Acceptance:** tests green; `rg -n 'rx="6"' packages/*/src` still returns exactly 2 hits (you have not inlined a frame yet — `mediaSlot` lives in svg-kit, so this stays 2 until T9 removes the Visual one).

---

### T7 — Golden fixture

**Files:** `packages/diagram-engine/fixture/di-media-cycle/` (new directory)

Create `input.diagram.json`: a 5-node `kind: "cycle"` diagram, each node carrying `media: { kind: "figure" }`, with **edges** forming a ring (a `relationship` the enum already allows, e.g. `leads-to`), and every node carrying a `description`. Author **no** `layout.type` — `defaultLayoutType` routes `cycle` → `radial` (`schema.ts:156-163`), so this golden exercises the radial reservation from test 1 (worst label `y` near **522**, never past 600). Keep it content-neutral — do **not** copy the frog demo from `open-edu`.

Also write the sixth file by hand, `validation.json`, with exactly:

```json
{ "valid": true, "issues": [] }
```

`REGEN=1` writes only the four `expected.*` files (`fixture-gen.test.ts:43-46`); every sibling fixture carries `validation.json`, so convention parity requires it even though diagram's `fixture.test.ts` does not read it.

Then generate its goldens:

```bash
REGEN=1 pnpm --filter @knowledgeassemble/diagram-engine exec vitest run test/fixture-gen.test.ts
```

This writes `expected.scene.json`, `expected.a11y.json`, `expected.alternative.json`, `expected.svg` for **every** fixture. **Immediately** check:

```bash
git status --porcelain
```

Expected: changes **only** under `packages/diagram-engine/fixture/di-media-cycle/`. If any other fixture changed, `git checkout -- packages/diagram-engine/fixture` (keeping the new dir), and find the churn source before continuing. Report what caused it.

**Then assert the goldens themselves:**
- `expected.scene.json`: every media node is 220×120 and the label reservation holds (max `y + height + 14 <= 600`)
- `expected.svg`: `data-oedu-media="slot"` present, `opacity="0.15"`, no `fill="white"`, no `<image`, no `xlink:href`
- `expected.a11y.json`: the a11y label equals the authored node `label` — the visible `<text>` moved, the accessible name did not

**Acceptance:** six files exist, assertions hold, zero churn elsewhere, fixture is deterministic (run `REGEN=1` twice; the second run produces no diff).

---

### T8 — Fixture catalog

**Files:** `packages/dev-harness/generated/fixture-catalog.json`, `packages/dev-harness/generated/catalog.generated.ts`

```bash
pnpm build:fixtures        # root script; runs scripts/build-fixture-catalog.mjs
pnpm --filter @knowledgeassemble/dev-harness test
```

`build:fixtures` is the repo's own wrapper for `scripts/build-fixture-catalog.mjs`. The script auto-discovers fixture directories by walking them and classifying on `data.type`, so there is nothing to register by hand. The test at `catalog.test.ts:30` fails if the generated catalog is stale — which it now is.

**Acceptance:** `git status` shows both `packages/dev-harness/generated/fixture-catalog.json` and `catalog.generated.ts` updated and committed, and `dev-harness` tests pass.

---

### T9 — Visual adopts the shared emitter

**Files:** `packages/visual-engine/src/render/svg.ts`, `packages/visual-engine/fixture/illustration/expected.svg`

In `case 'entity'` (`:83-89`), replace the hand-written frame + centred text with `mediaSlot({ ...node, bounds: b }, indent)`. **Pass no `fontSize`** — Visual's entity text has none today, and adding one would change the golden for no reason. **Do pass `indent`** — without it the entire block loses its leading pad and churns far more than the allowed deltas. `mediaSlot` forwards `value: true` internally, so an entity carrying a value keeps `data-oedu-value` (Visual's own call at `:10` passes it today).

```bash
REGEN=1 pnpm --filter @knowledgeassemble/visual-engine exec vitest run test/fixture-gen.test.ts
git status --porcelain   # expect ONLY visual-engine/fixture/illustration/
```

**The allowed deltas in `expected.svg` are exactly three:** the label's `y` (each entity moves from the centred `300` to `240 + 120 + 14 = 374`), the removal of `dominant-baseline="central"`, and the added `data-oedu-media="slot"` (which lands **between** `data-oedu-interactive="true"` and `aria-label`, per `mid` ordering at `attrs.ts:27-33`). Indentation, the `<rect>` line, `rx`, `opacity="0.15"`, `data-oedu-bounds="…,240,220,120"`, and the 220×120 bounds must be **byte-identical**. For the `Sun` entity (`expected.svg:6-9`), expect exactly:

```html
    <g id="illustration-sun" data-oedu-role="selectable" data-oedu-interactive="true" data-oedu-media="slot" aria-label="Sun" data-oedu-bounds="40,240,220,120">
      <rect x="40" y="240" width="220" height="120" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <text x="150" y="374" text-anchor="middle" fill="currentColor">Sun</text>
    </g>
```

Inspect the diff and confirm it matches this shape; if anything else moved, stop and report.

**Context you need:** this change is **preventative**. No figure can reach a Visual illustration entity today, because entities carry no `metadata` at all and the host's `authoredIdOf` therefore finds no id (spec §0). Do **not** add `metadata.entityId` in this task — that would make Visual host-addressable without the companion spec's D6 decision, which is not this repo's call.

**Acceptance:** `rg -n 'rx="6"' packages/*/src` returns exactly **1** hit, in `packages/svg-kit/src/media-slot.ts`. That single grep is the proof the two hand-rolled emitters are gone. Record the number in the commit body.

---

### T10 — Browser coverage

**Files:** `packages/diagram-engine/e2e/diagram.spec.ts` (or a sibling spec in the same directory)

Add a case that mounts a media-slot spec in a real browser and asserts on the **live DOM**.

Follow the two existing specs in that directory (`diagram.spec.ts`, `nios.spec.ts`) exactly. The relevant facts about the harness, so you do not have to rediscover them:

- Diagram e2e uses `window.__diagramHarness`, **not** `window.__harness`. It navigates to `/?engine=diagram` and waits for `__diagramHarness` to exist.
- `__diagramHarness` extends `HarnessRemote`, so it exposes `tryCreate(spec)`, `snapshot()`, `svg()`, and `alternative()`. Mount your media spec through `tryCreate` rather than relying on which fixture the harness happens to default to.
- Assertions elsewhere in this repo use `page.evaluate(() => window.__diagramHarness.svg())` for SVG-string checks; for the new markup prefer real DOM queries.

Assert:
- `document.querySelector('[data-oedu-media="slot"]')` is non-null, and there are 5 of them (one per media node)
- each also carries `data-oedu-bounds`, and the rendered box is wider than 100px — i.e. the media box really is media-sized, not the old 60×60
- the `<text>` for a node sits below its frame in screen coordinates (this is the user-visible half of the collision fix, and it cannot be asserted from a golden string alone)

**Acceptance:** `pnpm --filter @knowledgeassemble/diagram-engine playwright` passes. Run the repo-level `pnpm playwright` at T12.

---

### T11 — Docs and generated skills

**Files:** `docs/engines/diagram/SPEC.md`, `docs/DESIGN.md`, `docs/engines/diagram/skills/structural-diagram/SKILL.md`, `PLAN.md`, plus the regenerated `packages/engine-skills/skills/diagram/*`

1. `docs/engines/diagram/SPEC.md`: add a **W-3.13** bullet to the capability list at `:59-68`, in the same voice as its neighbours. Describe media nodes, the reserved box, and that the host fills it. Do not renumber anything; note that the registry has no `W-3.3` and that gap is pre-existing and out of scope.
2. `docs/DESIGN.md`: document the media-slot convention — faint frame, label outside the box, `data-oedu-bounds`, engine owns geometry, host owns assets — under the existing §9 "Data and Assets" area, consistent with D9.
3. `docs/engines/diagram/skills/structural-diagram/SKILL.md`: **this is the hand-edited source.** Teach `media` here.
4. `PLAN.md`: add a change-log entry under `## 11. Change Log`.
5. Regenerate and commit **both** sides:

```bash
pnpm generate:skills
node scripts/check-engine-skills-fresh.mjs
```

The generator reads `packages/<engine>/src/schemas/<engine>-spec.schema.json` (`packages/engine-skills/scripts/generate-skills.mjs`; the diagram `schemaSrc` is at `:58`), so T2's schema change and this regeneration must land together — a schema edit without regeneration fails the freshness guard. Commit `packages/engine-skills/skills/diagram/*` (including the generated `schema.json`) alongside the docs edits.

**Acceptance:** the freshness guard reports no diff; the skills portability check passes (no `packages/` or `docs/` path fragments in generated output).

---

### T12 — Full exit gate and PR

```bash
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs
```

Then the spec's extra assertions:

```bash
rg -l 'opacity="0.85"' packages/diagram-engine/fixture | wc -l          # expect 49
git diff main --stat -- packages/diagram-engine/fixture                  # only di-media-cycle/
rg -n 'rx="6"' packages/*/src                                             # expect exactly 1, in svg-kit
pnpm build:fixtures && git status --porcelain                        # expect no catalog diff
```

```bash
gh pr create --title "add Diagram media slots rendered by a shared svg-kit emitter" --body "$(cat <<'EOF'
Implements W-3.13: `content.nodes[].media: { kind: "figure" }` reserves a
host-fillable media box, rendered by a single shared `svg-kit` emitter used by
both Diagram and Visual.

- Label renders outside the frame, fixing the host-figure/caption overlap
- Engine owns geometry (220x120); host still owns assets (DESIGN D9)
- Existing Diagram goldens are byte-identical (opt-in per node)

Spec: docs/superpowers/specs/2026-10-03-media-slot-rendering-implementation-spec.md
Plan: docs/superpowers/specs/2026-10-03-media-slot-rendering-implementation-plan.md
EOF
)"
```

Do not merge. A human reviews and lands it.

---

### T13 — Host companion note (separate repo, non-blocking)

In `open-edu`, record that **no host change is required** for Diagram media slots. `collectFigurePlacements` (`figure-overlay.tsx:57-58`) anchors a figure when the node has an authored id **and** bounds; a media node has both (`metadata.nodeId` from `scene/build.ts`, bounds from layout), so it binds with no change.

`media` is an engine-side **render opt-in** (which nodes draw as a 220×120 slot with the label below). Do **not** propose keying the host off `metadata.media`: bounds + authored-id anchoring is already correct, and adding a media branch would only narrow it.

Flag one coordination gap for the host repo: its demo fixture `nodes/diagram-figure.json` anchors a figure to a `cycle` node that has **no `media` field**, so that demo exercises the normal-node path (figure over a 0.85-fill node with a centered label) and will not demonstrate the slot rendering. Adding `media: { kind: 'figure' }` to that node is a host-fixture change; it is **not** this repo's call and **not** a reason to widen the engine contract.

**Do not** touch the `kind === 'event-marker'` case in `authoredIdOf` — `event-marker` is emitted only by `timeline-engine`, and that branch is what lets timeline markers resolve their authored id.

Open it as a separate PR against `open-edu`. It must not block T12.

---

## 4. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| TS2835 on an import | Missing `.js` extension on a relative import | Add `.js` |
| TS error: `'kind' does not exist on type 'unknown'` | `metadata` is `Record<string, unknown>`; chained `node.metadata?.media?.kind` is illegal | Cast first: `const media = node.metadata?.media as { kind?: string } \| undefined` (`render/svg.ts:24` is the in-file pattern) |
| `data-oedu-bounds` missing from media nodes | `nodeAttrs` needs the boolean `bounds: true` **and** `node.bounds` set | `mediaSlot` passes both; confirm `bounds` is not the `undefined` fallback |
| Media node lost its `title` tooltip | `tail` not forwarded to `mediaSlot` | Pass the existing `tail` map through the `MediaSlot.tail` field |
| Visual golden lost its indentation | `mediaSlot` called without `indent` | Pass the caller's `indent`; the pad prefixes `<g>`, inner lines, `</g>` |
| Fixture test fails with `INVALID_SPEC` on `media` | One of the three schema copies lacks `media` | T2 touched zod + 2 JSON files; all three are required |
| Existing goldens changed | `hasMedia`/`sizes` leaked into the non-media path, or `{ bounds: true }` was added at `render/svg.ts:16` | Revert the regenerated files; make the media branch strictly opt-in |
| Catalog test fails after adding a fixture | `fixture-catalog.json` is stale | `pnpm build:fixtures` and commit |
| Freshness guard fails after a schema change | Generated skills not regenerated | `pnpm generate:skills`, commit both sides |
| A media label still clips the canvas | Radius did not reserve `height + labelGap`, or you only tested one node count | Both 5 and 6 node counts are mandatory — they behave differently |
| `figcaption`/label looks wrong in a browser but the golden passes | Baseline handling differs across engines | Label `y` is computed; do not reintroduce `dominant-baseline` |
| A test passes before the implementation exists | Vacuous assertion | Mutate the implementation to break the condition and confirm the test fails |

## 5. Out of scope

Do not implement any of these; they are in the spec's §7:

- `media.aspect` / `media.fit` (box is fixed 220×120)
- `metadata.entityId` for Visual entities (host-contract decision, companion spec D6)
- Media slots in GeoMap, Chart, Timeline
- Host-side SVG inlining or figure authoring guidance
- Unmatched-figure-key validation, unresolved `altKey` handling
- `description` → `svgResult.a11y` (companion spec T6)
- Renumbering or filling the `W-3.3` gap in the Diagram registry