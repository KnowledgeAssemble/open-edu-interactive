# Media Slot Rendering — Implementation Spec (Figure Slots for Diagram and Visual)

> **Status:** Draft — for review
> **Date:** 2026-10-03
> **Repo:** `openedu-interactive` (packages `@knowledgeassemble/svg-kit`, `diagram-engine`, `visual-engine`)
> **Authority (top to bottom):** `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → `docs/use-cases/<engine>.md` → per-engine `SPEC.md`
> **Audience:** AI coding agents, maintainers
> **Branch:** `feat/media-slot` (proposed; not yet created)
> **Companion (host side, separate repo):** `open-edu` `docs/superpowers/specs/2026-10-02-interactive-host-figure-rendering-implementation-spec.md`. That spec owns asset resolution, packaging, alt text, and failure handling, and lists the engine-side description→`a11y` gap as "T6, out of this slice". **This spec is the engine half of that pairing.** It does not restate the host half.
> **Extends:** nothing. Independent of the svg-kit extraction (`ADR-13`, Workstream A) and of the gap-closure plan (`W-3.1`–`W-3.12`).

---

## 0. Verified facts this spec depends on (2026-10-03)

- **The overlap is total, not partial.** A Diagram node renders as a solid box with the label centred inside it — `packages/diagram-engine/src/render/svg.ts:49` emits `<rect … fill="currentColor" opacity="0.85" …/>` followed by `<text … fill="white">label</text>` at the box centre. The host places each figure at exactly those bounds (`open-edu/packages/interactive-runtime/src/figure-overlay.tsx:58-69` derives `left/top/width/height` from `node.bounds` as percentages of the canvas viewBox). Image and box are the same rectangle, so the image lands on the label.
- **Diagram node boxes are touch-target sized.** `packages/diagram-engine/src/engine.ts:30-32` defaults the canvas to 800×600 with `minTouchTarget: 44`. `cycle` maps to `radial` automatically (`src/schema.ts:156-163`), and `src/layout/radial.ts:14-15` sets `nodeSize = max(minTouchTarget, 60)` and `radius = min(w,h)/2 - max(minTouchTarget, 60)`. Measured on a 5-node cycle: every node is **60×60 at radius 240**, i.e. each figure renders at **7.5% × 10%** of the canvas (~57px on a typical surface).
- **The radial radius reserves no room for anything drawn below a node.** `radial.ts:14-15` sets `radius = min(w,h)/2 - max(minTouchTarget, 60)` (= 240 on the default 800×600 canvas) and `nodeSize = 60`; `radial.ts:21` places node *i* at `angle = 2πi/n`. Computed for a 220×120 media box at the **current** radius of 240, on a 5-node cycle: worst frame bottom edge `y = 588.3` (11.7px margin), worst right edge `x = 750` (50px margin) — **the frame itself does not clip**. The label drawn below the box lands at `588.3 + 14 = 602.3`, past the 600 canvas edge, so **the label clips by ~2px** — and the overflow is node-count dependent (6 nodes gives `567.8 + 14 = 581.8`, which fits). Two consequences: the radius must reserve `height + labelGap` rather than rely on incidental margins, and any layout check must be run for more than one node count, because 5 clips and 6 does not. At the radius proposed in §3.2 (300 − 110 − 14 − 20 = 156) both 5 and 6 nodes fit with 77px+ margin.
- **Visual already implements this pattern, and it is the reference.** `packages/visual-engine/src/render/svg.ts:83-89` (`case 'entity'`) emits a faint frame — `opacity="0.15"` — with the label in `fill="currentColor"` (theme ink), not white. Post-layout, each `illustration` entity receives real bounds of **220×120** (measured: 3 entities at `x` 40/290/540, `y` 240), and the SVG emits `data-oedu-bounds="40,240,220,120"` (`packages/visual-engine/fixture/illustration/expected.svg:6`).
- **`data-oedu-bounds` already exists in svg-kit and is opt-in per call.** `packages/svg-kit/src/attrs.ts:35-37` emits it when the **boolean** flag `nodeAttrs(node, { bounds: true })` is passed *and* `node.bounds` is set. **Visual passes it; Diagram does not** — `diagram-engine/src/render/svg.ts:16` calls `nodeAttrs(node, { tail })` only. `rg data-oedu-bounds packages/*/fixture` matches only `visual-engine` fixtures (`illustration`, `geometry-*`, `clock`) and nothing in `diagram-engine`. Note the consequence for §3.2: the flag must be added **for media nodes only**. `nodeToSvg` (`render/svg.ts:7-50`) renders every Diagram node through one `nodeAttrs` call at `:16`, so turning the flag on unconditionally would rewrite all 49 fixture goldens and violate the no-churn rule.
- **svg-kit has no frame/box helper.** Its exports are `svgShell`, `a11yButton`, `pushInteractiveEntries`, `escapeXml`, `centerOf`, `fmt`, `starPoints`, `polygonPoints`, `nodeAttrs` (`packages/svg-kit/src/*`). Every frame is hand-written per engine, which is why Diagram's 0.85-solid and Visual's 0.15-faint have diverged.
- **`ADR-13` explicitly puts shared plumbing in svg-kit and keeps per-kind shape in engines** (`docs/adr/ADR-13.md:20`). A media-slot emitter is shared plumbing; the per-engine decision of *which* nodes are slots is engine-owned.
- **The host's id resolution covers three keys, but only one engine populates them.** `authoredIdOf` (`figure-overlay.tsx:39-45`) reads `metadata.nodeId ?? metadata.entityId ?? metadata.rowId`, so the *code path* would accept Diagram's `nodeId`, Visual's `entityId`, and a chart `rowId`. Only Diagram actually sets one today — Visual entities have no `metadata` at all (§0, next-but-two fact). So Diagram media nodes bind to host figures with **no host change**, and Visual does not bind at all.
- **Diagram's node schema is `strict()`, so an additive optional field is safe.** `packages/diagram-engine/src/schema.ts:28-37` allows exactly `id`, `label`, `description`, `links`, `interactive`, `categories`. Any new key must be added there or every Diagram spec fails `INVALID_SPEC`.
- **`validateLayout` only enforces a lower bound on box size, and a permissive one.** `packages/diagram-engine/src/validation/layout.ts:22-27` computes `reachable = b.width >= ctx.minTouchTarget || b.height >= ctx.minTouchTarget` and fails only when *neither* dimension reaches the minimum. A 60×60 box passes `minTouchTarget: 44`, and enlarging boxes can only make it more reachable — so this check cannot obstruct a media box. It also means today's layout is under-constrained, not that it is wrong.
- **The Diagram capability registry tops out at `W-3.12`** (`docs/engines/diagram/SPEC.md:59-68`), so `W-3.13` is the next free identifier. Note for reviewers: the registry has **no `W-3.3`** (the sequence runs 1, 2, 4, 5 … 12) — a pre-existing numbering gap, unrelated to this work and deliberately left alone here. Separately, an unrelated earlier claim in review discussion that this repo already had a `W-3.13` was mistaken and was never committed; `rg 'W-3\.1[3-9]'` matches nothing outside this spec. This spec is the reason the identifier is warranted.
- **The frog lifecycle fixture is a valid worked example.** `open-edu/examples/interactive-demo/nodes/diagram-frog-lifecycle.json` validates clean (`validateDiagramContent` → `valid: true`, zero issues), all 5 SVGs are discovered into `pkg.assetPaths`, and all 5 `altKey`s resolve in the `runtime` i18n namespace.
- **Platform fact, corroborated in-repo:** an SVG referenced by `<img src>` is an isolated document — host CSS does not cascade in and `currentColor` resolves to the SVG document's own initial colour. **All six** figures in the demo (`water-cycle.svg` plus all five frog stages) author their strokes with `currentColor`, so every one of them renders black regardless of app theme and is illegible on any dark surface. This is a demo-wide authoring pattern, not a single bad asset, and no renderer change here can fix it: it needs figure-authoring guidance and/or host-side SVG inlining (tracked in §7, owned by the companion spec).
- **The companion host spec's D6 states a false reason, and reaches a conclusion that happens to hold.** D6 excludes Visual `kind: "illustration"` from v1 on the grounds that illustration is "geometry-less by contract", citing `visual-engine/src/scene/build.ts:95-105`. Geometry exists: `buildScene` leaves `bounds` undefined, but the illustration layout pass assigns **220×120** before render and the emitted SVG carries `data-oedu-bounds` (verified by instantiating the engine and reading `snapshot().scene`, plus `packages/visual-engine/fixture/illustration/expected.svg:6`). So the stated reason is wrong.
- **But no figure is placed on a Visual illustration entity today, for a different reason: there is no authored id to match.** Visual entity children carry **no `metadata` at all** — `build.ts:84-92` sets only `id/role/kind/label/interactive/acceptsActions/children`; `rg entityId packages/visual-engine/src` returns nothing; and `packages/visual-engine/fixture/illustration/expected.scene.json` shows `metadata: None` on every entity. The host's `authoredIdOf` (`figure-overlay.tsx:39-45`) therefore returns `undefined`, so `collectFigurePlacements` skips the node (`figure-overlay.tsx:58`). **Consequence: the Visual label collision this spec fixes is latent, not active.** Two follow-ons: the Visual rendering change is *preventative* (§1), and making Visual addressable is a host-contract decision the companion spec owns — so `metadata.entityId` is deferred (§7), not assumed here.
- **No `data-oedu-*` attribute has a runtime consumer.** Searching the host repo for any read of these attributes returns nothing; the only data-attribute selectors in `open-edu` are `data-testid`. They are debug, e2e, and CSS hooks, not a runtime contract. Two implications: the host locates slots through **snapshot metadata**, never the DOM (§3.1, T10), and "the host needs this attribute" is not a valid justification for adding one.
- **The two Diagram JSON Schema copies already disagree with each other and with zod.** `docs/schemas/diagram-spec.schema.json` declares `"interactive"` twice (nodes and edges); `packages/diagram-engine/src/schemas/diagram-spec.schema.json` declares it **zero** times, while the engine's zod defines it on both (`schema.ts:34`, `schema.ts:48`). This is exactly the drift AGENTS.md tells you to fix in the schema file, and `test/schema-parity.test.ts` missed it because it compares **enums only** (`DIAGRAM_KINDS`, `PROFILES`, `RELATIONSHIPS`, `LAYOUT_TYPES`, `SOURCE_CLASSES`) — never property sets. The engine copy is the one the skills generator reads (`packages/engine-skills/scripts/generate-skills.mjs:15-47`). T2 must add `media` to **both** copies and restore the missing `interactive`.

## 1. Decisions taken (2026-10-03)

| Decision | Choice | Rationale |
|---|---|---|
| Shape of the fix | One shared **media-slot** rendering convention in `svg-kit`, adopted by Diagram *and* Visual | Two hand-written frame emitters is how 0.85-solid and 0.15-faint diverged in the first place. One emitter is the only version that cannot drift again |
| Label placement | **Outside** the media rect (below it), not centred inside | This is the actual collision fix. Centring the label in the frame means *any* host figure covers it — the latent bug Visual's `illustration` carries (§0) |
| Contract surface | Optional `content.nodes[].media: { kind: "figure" }` in Diagram only | The object shape stays forward-compatible for `aspect`/`fit` later, while an inner `kind` enum avoids `z.literal(true)` — where the only legal value is `true` and a reader rightly asks why the key is not simply omitted. Visual needs **no** contract change |
| Visual scope | **Rendering only.** `metadata.entityId` is deliberately **not** added | Visual entities are slot-*shaped* but not host-*addressable* (§0). Adding the id would make them addressable — a host-contract decision the companion spec owns (its D6). Shipping addressability without that decision presumes it (AGENTS.md, no silent broadening) |
| Opt-in or all nodes | **Opt-in, per node** | Enlarging every Diagram node would churn every Diagram golden. Opt-in keeps existing goldens byte-identical, which is the acceptance bar |
| Who sizes the box | The **engine**, from a media-box constant; the host never rescales | `bounds` is engine layout output (`positionSource: 'illustrative'`). A host-side scale factor would fork the layout model and re-introduce the geometry duplication this project forbids |
| Frame fill | Faint (`opacity 0.15`), matching Visual | A solid fill makes any figure placed on it illegible. Visual is already correct here and is the model |
| Label colour | `currentColor` (theme ink), not `fill="white"` | White-on-faint is a contrast regression against today's Diagram node and against Visual |
| Discovered on the way | Visual `illustration`'s label is centred in its frame, so the collision fixed here is **latent** in Visual, not active (§0) | It is fixed in the same slice anyway: leaving one hand-rolled frame emitter behind re-creates the exact drift this spec exists to remove. Honest cost — the Visual golden changes for no user-visible gain *today*, and §3.3 says so rather than dressing it up as a bug fix |

## 2. Non-goals (fixed, do not drift)

- **No engine learns about assets.** No `src`, `href`, `ref`, path, or URL field in any spec. The engine learns only that a node reserves a media box (DESIGN §9, host-spec D9). The asset stays host-side in the `figures` map.
- **No change to `figures`, `altKey`, `decorative`, or asset packaging.** Those belong to the companion host spec and are not restated here.
- **No host-side scale/zoom/offset control.** Box size is engine layout output; a host multiplier would fork geometry.
- **No new D5 action.** A media slot is presentational geometry. Selection, focus, and filter are unchanged.
- **No change to `svgResult.a11y` labels.** The visible `<text>` moves; `aria-label` does not. Nothing new is announced, so the host spec's "two a11y channels" analysis is unaffected.
- **No figure authoring guidance in this spec.** The `currentColor` constraint (§0, `currentColor` fact) is a documentation and asset-pipeline concern for the host spec's slice.
- **No `illustration` contract change in Visual, and no `metadata.entityId`.** Rendering only (§1, §7).
- **No composed-lesson support.** `open-edu/packages/runtime/src/renderers/InteractiveRenderer.tsx:240-246` gates `FigureOverlay` on `!isComposedLesson(node)`, so composed lessons get no overlay today. The companion host spec does not discuss this at all. Media slots do not change it.
- **No second OpenEdu** (DESIGN D6/D7 — distinct from the companion spec's own `D6` decision, which §0 corrects): no asset store, no theme source-of-truth, no scoring.

## 3. Package contract

### 3.1 `@knowledgeassemble/svg-kit` — new shared emitter

```text
packages/svg-kit/src/media-slot.ts          (new)
  // Composes nodeAttrs; deliberately NOT a second attribute assembler.
  export interface MediaSlot extends AttrsNode {
    bounds: { x: number; y: number; width: number; height: number }
    fontSize?: number   // omitted from output when undefined, so each caller's
                        // existing markup is preserved byte-for-byte
    labelGap?: number   // default 14 — a chosen constant, not derived from anything
    tail?: Record<string, string>
                        // forwarded to nodeAttrs — Diagram's call site builds a tail
                        // today (whatIf, description title); dropping it would lose
                        // the authored description tooltip on media nodes
  }
  export const MEDIA_BOX = { width: 220, height: 120 }   // chosen to match Visual's measured box
  export function mediaSlot(node: MediaSlot, indent = 0): string
                        // indent reproduces each caller's leading pad — required for
                        // the Visual golden's byte layout (illustration/expected.svg:6-9)
```

`AttrsNode` and `NodeAttrsOptions` are already exported from `packages/svg-kit/src/attrs.ts` and re-exported from `src/index.ts`, and `nodeAttrs` supports `opts.mid` for extra attributes — so `id`, `role`, `data-oedu-interactive`, `aria-label`, and `data-oedu-bounds` all come from the existing helper, and `data-oedu-media` is passed through `mid`. `mediaSlot` forwards `{ value: true, bounds: true, tail, mid }` so Visual's `data-oedu-value` and Diagram's `title` survive unchanged. Assembling those attributes by hand here would plant the same drift this spec exists to remove, one level down.

Emitted shape — a **faint frame with the label below it**:

```html
<g id="…" data-oedu-role="selectable" data-oedu-interactive="true"
   data-oedu-media="slot" aria-label="Froglet" data-oedu-bounds="…,240,220,120" title="…">
  <rect x="…" y="…" width="220" height="120" rx="6"
        fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
  <text x="…" y="…" text-anchor="middle" fill="currentColor" font-size="11">Froglet</text>
</g>
```

Attribute order is `nodeAttrs`'s, not chosen here: `mid` entries land between `data-oedu-interactive` and `aria-label` (`attrs.ts:27-33`), and `tail` entries land last. Indentation shown per caller via `indent` (zero in this example).

Three properties are load-bearing and each has a reason:

1. **`data-oedu-media="slot"`** — a **debug, e2e, and CSS hook only**, matching every other `data-oedu-*` attribute in the repo. §0 records that no runtime code anywhere reads those attributes, so this must not be justified as a host lookup mechanism. The host does **not** look for slots at all: it anchors figures by authored id + bounds (§0, verified against `figure-overlay.tsx:39-45,58`), so a media node binds with no host change. It is kept because the new fixture and e2e case assert on it directly, which is cheaper and more precise than asserting on geometry.
2. **`data-oedu-bounds`** — reused from `attrs.ts:35-37` rather than invented, so any existing tooling that reads it keeps working.
3. **Label outside the frame** — the collision fix. The label `y` is `bounds.y + bounds.height + labelGap` on the **default** baseline, with no `dominant-baseline`: values other than `central`/`middle` have inconsistent browser support, and P4 requires identical rendering everywhere, so baseline interpretation is computed rather than delegated to the renderer. The slot's *total* vertical footprint is `height + labelGap`, and that is what layout must reserve (§0's radial fact).

### 3.2 `diagram-engine` — opt-in media nodes

```text
packages/diagram-engine/src/schema.ts
  - DiagramNodeSchema: add `media: z.object({ kind: z.literal('figure') }).strict().optional()`
    (optional + namespaced; the inner strict() keeps unknown keys a validation
    error per P11 — `media: { src: "…" }` must fail INVALID_SPEC)
  - RELATIONSHIPS / content schema unchanged otherwise

packages/diagram-engine/src/layout/engine.ts
  - size media nodes from MEDIA_BOX (220×120); non-media nodes keep today's sizes exactly:
      radial        -> max(minTouchTarget, 60)                    (layout/radial.ts:15)
      grid          -> cellW = max(mt, min(width/cols, 160)),
                       cellH = max(mt, 60)                        (layout/grid.ts:11-12)
      hierarchical  -> { width: 100, height: 50 }                 (layout/engine.ts:100)
    Zero churn for existing specs.
  - hierarchical: the sizeMap at layout/engine.ts:98-101 must use MEDIA_BOX for media
    nodes; `colWidth` (layout/hierarchical.ts:44) becomes
    max(mt, 120, 220 when media) — a 220px box centred in today's 120px spacing
    lands at x = -10, off-canvas; and `layerHeight` (:45) becomes size-aware —
    max(mt+20, 80, 120 + labelGap + 20) — because a 120px box in an 80px layer pitch
    makes adjacent layers' boxes overlap by 40px. Known limitation, accepted:
    four or more media nodes in **one** layer cannot fit an 800px canvas
    (4 × 220 = 880 > 720) and overlap horizontally; redesigning hierarchical
    packing is out of scope. All three values reduce to today's when no media
    node is present
  - grid: cellW ≥ 220, cellH ≥ 120, and the row pitch becomes
    cellH + labelGap + 20 when media is present (the +20 matches the radial pad —
    reserving exactly height + labelGap puts the label baseline on the next row's
    top edge). startY is computed from the row pitch. Reduces to today's pitch
    when no media node is present
  - note: `hierarchical` silently degrades to grid when `topoSort` is absent
    (layout/engine.ts:103-104); a `cycle` never takes that path because
    `defaultLayoutType` routes it to radial (schema.ts:156-163)
  - carry the media flag from scene metadata into the layout context

packages/diagram-engine/src/layout/radial.ts
  - subtract HALF the largest box size plus padding from the radius, not a fixed 60:
      radius = min(w,h)/2 - maxBoxSize/2 - labelGap - pad
    On the default canvas that is 300 - 110 - 14 - 20 = 156 for a media cycle.
    §0 shows why the reservation must include `labelGap`: at the current radius the
    frame still fits (588.3 of 600) but the below-box label lands at 602.3 and clips.
  - the reservation must be size-aware, not a constant, so non-media nodes keep the
    exact radius they have today (their maxBoxSize is 60, so the new formula must
    reduce to the old one whenever no media node is present)
  - guard: if radius < 0, fall back to today's formula. No warning channel exists
    in the engine (verified: no `warn` match in diagram-engine/src) and inventing
    one is out of scope — the fallback itself is the acceptance, plus a test that
    the tiny-canvas run does not throw

packages/diagram-engine/src/scene/build.ts
  - copy `node.media` onto scene-node metadata as `metadata.media = { kind: 'figure' }`
    so the renderer reads it from the snapshot (the host's `authoredIdOf` already
    matches Diagram nodes via `metadata.nodeId`, so no host change is needed to bind)

packages/diagram-engine/src/render/svg.ts
  - `nodeToSvg` (:7-50): keep the existing `tail` construction (:9-15) unchanged —
    a media node with a `description` keeps its `title` attr, a deemphasized one
    keeps `data-oedu-what-if`. Then early-return before the common
    `nodeAttrs(node, { tail })` call at :16:
      const media = node.metadata?.media as { kind?: string } | undefined
      if (media?.kind === 'figure') {
        return mediaSlot(
          { ...node, fontSize: 11, tail,
            bounds: node.bounds ?? { x: 0, y: 0, width: MEDIA_BOX.width, height: MEDIA_BOX.height } },
          indent,
        )
      }
    The cast is required: `metadata` is `Record<string, unknown>`
    (`scene/types.ts:21`), so chained `node.metadata?.media?.kind` does not
    typecheck (the file's existing pattern at :24 casts too)
  - non-media nodes keep the `nodeAttrs(node, { tail })` line at :16 byte-identical
    — this is what guarantees zero golden churn, so do NOT add `{ bounds: true }`
    to it (§0)
  - `fontSize: 11` keeps today's Diagram label size
```

**Why the shared box constant lives in a render kit.** `MEDIA_BOX` is consumed by engine *layout*, which is not a rendering concern. It is placed in svg-kit anyway because D2/§6 forbids engines from importing each other, so svg-kit is the only location two engines may share. If a neutral home for layout constants ever appears, this constant should move there — noted rather than silently ignored.

### 3.3 `visual-engine` — rendering only

```text
packages/visual-engine/src/render/svg.ts
  - case 'entity': delegate to `mediaSlot()` — identical frame, label below the box,
    NO fontSize (Visual's entity text carries none today, and adding one would churn
    the golden for no reason)
  - bounds and `data-oedu-bounds` output are already correct; must not change
```

Honest framing: this is a **preventative** change. §0 establishes that no figure can reach a Visual illustration entity today, because entities expose no authored id. The change is made anyway so that one emitter owns every frame in the repo — but it buys no user-visible improvement in this slice, and if a reviewer judges the golden churn not worth it, the correct cut is to drop this subsection entirely and adopt `mediaSlot` in Visual later. Do **not** instead add `metadata.entityId` here: that would make Visual addressable without the companion spec's D6 decision, which is a host-contract call, not an engine one. The call site passes `indent` and **no** `fontSize`; `mediaSlot` forwards `value: true`, so any entity carrying a value keeps `data-oedu-value`.

## 4. Sequencing and gates

| Gate | Contents | Blocked by |
|---|---|---|
| G0 | This spec | none (documentation) |
| G1 | `svg-kit` `mediaSlot()` + unit tests | G0 |
| G2 | Diagram schema + layout + renderer for `media` nodes, with a new fixture | G1 |
| G3 | Visual renderer delegates to `mediaSlot()` | G1 |
| G4 | Docs (`Diagram SPEC` W-3.13, `DESIGN`, skills, `PLAN`) + full gate | G2, G3 |

Hard rules:

- **Existing goldens must not churn.** Baseline measured 2026-10-03: `rg -l 'opacity="0.85"' packages/diagram-engine/fixture` returns **49 files**. That file set must be identical before and after, and `git diff --stat` on `packages/diagram-engine/fixture` must show changes **only** in the new `di-media-cycle/` directory. A stronger guard than the `rg` alone: no existing `expected.*` file may differ by a single byte.
- **The new fixture is the only golden delta, and it is six files.** `diagram-engine/fixture/di-media-cycle/` follows the `di-<capability>-<slug>` convention the other 40+ private goldens use (e.g. `di-cycl-life-cycle`), and must contain the full set every sibling fixture has — `input.diagram.json`, `expected.svg`, `expected.scene.json`, `expected.a11y.json`, `expected.alternative.json`, `validation.json`. Bounds assertions belong in `expected.scene.json` (220×120 per media node), not only in the SVG string. Assert: `data-oedu-media="slot"` present, `data-oedu-bounds` present, label baseline **below** `y + height`, no `fill="white"`, and no `<image` or `xlink:href` anywhere in engine output (host-spec D9 — the engine never renders a picture). Keep it content-neutral; the frog demo lives in `open-edu`, so coupling the engine golden to it would import demo content into the engine repo.
- **Regenerate the fixture catalog.** `packages/dev-harness/test/catalog.test.ts:30` requires every fixture directory containing `input.*.json` to appear in the catalog. `scripts/build-fixture-catalog.mjs` auto-discovers by walking fixture dirs and classifying on `data.type`, so no manual registration is needed — but the script must be re-run and `packages/dev-harness/generated/fixture-catalog.json` (and `catalog.generated.ts`) committed, or the unit suite fails on a stale catalog. This is a gate dependency, not bookkeeping.
- **Playwright coverage for the new fixture.** The exit gate runs `pnpm playwright`, and existing specs assert raw SVG text (`packages/diagram-engine/e2e/diagram.spec.ts:17`). Changing node markup from a bare `<rect>` to a `<g>` wrapper is exactly the kind of change an e2e assertion should pin, so the new fixture gets a case asserting the slot attributes survive to the live DOM.
- **Test-first, and mutation-tested.** Each guard must be shown to fail when its condition is violated. A vacuous assertion is a failed step — the §82 doc guard shipped vacuous once already and was caught only by deliberately breaking it.
- **`bounds` is the contract, not the SVG string.** Assert on `snapshot().scene` bounds; the SVG is a rendering of that.
- **No literal colours.** Frame and label use `currentColor` / `opacity` only.
- **`aria-label` unchanged.** A test asserts the a11y roster label equals the authored node label for a media node.
- **Determinism.** Two layout runs of the same spec produce identical bounds.

## 5. Work items ledger

| # | Work | Gate | Done when |
|---|---|---|---|
| T1 | `svg-kit`: `mediaSlot()` composed on `nodeAttrs` + `MEDIA_BOX`, unit-tested for frame opacity, `data-oedu-media` passthrough, `data-oedu-bounds`, `fontSize` present/absent, and label `y` **below** `y + height` | G1 | Tests fail before the file exists; `pnpm --filter @knowledgeassemble/svg-kit typecheck` green; `media-slot.ts` exported from `src/index.ts` |
| T2 | Diagram `media: { kind: 'figure' }` on `DiagramNodeSchema`, applied to **three** places: zod (`schema.ts`), `packages/diagram-engine/src/schemas/diagram-spec.schema.json`, and `docs/schemas/diagram-spec.schema.json` (both carry `additionalProperties: false`, so omitting either fails P11 validation). **Also** restore the pre-existing `interactive` drift in the engine copy (§0). **Also** extend `schema-parity.test.ts` beyond enums to compare node/edge property sets, so this drift class cannot recur. Plus a negative test that `media: { src: "…" }` fails `INVALID_SPEC` | G2 | All three schema copies agree with zod; parity test fails if a property is added to one and not the others; unknown-key negative test green |
| T3 | Diagram layout: media nodes sized from `MEDIA_BOX`; `radial.ts` radius reserves `maxBoxSize/2 + labelGap + pad`, reducing to today's formula when no media node is present; negative-radius fallback | G2 | Media cycle lays out with no clipping **at two different node counts** (5 and 6 — §0 shows 5 clips and 6 does not at the old radius); non-media cycle bounds **byte-identical** to today |
| T4 | Diagram renderer: media nodes delegate to `mediaSlot()` with `fontSize: 11`; `mediaSlot` passes `{ bounds: true }` for media nodes only | G2 | New fixture golden shows frame + label below + `data-oedu-bounds`; existing Diagram goldens unchanged |
| T5 | New private fixture `diagram-engine/fixture/di-media-cycle/` with all six files, then regenerate the catalog (`node scripts/build-fixture-catalog.mjs`) and commit `packages/dev-harness/generated/*`, then add a Playwright case | G2 | `catalog.test.ts:30` green; `pnpm playwright` green; every §4 assertion holds |
| T6 | Diagram `scene/build.ts` carries `metadata.media = { kind: 'figure' }`; a test asserts it survives to `snapshot().scene` | G2 | Snapshot test green |
| T7 | Visual `case 'entity'` delegates to `mediaSlot()` with **no** `fontSize`, passing `indent`; update `visual-engine/fixture/illustration/` golden | G3 | The **only** deltas in that golden: the label's `y`, the dropped `dominant-baseline="central"`, and the added `data-oedu-media="slot"` (between `data-oedu-interactive` and `aria-label` — `mid` ordering, `attrs.ts:27-33`). Indentation, the `<rect>` line, `rx`, opacity, `data-oedu-bounds`, and 220×120 bounds byte-identical. See §3.3 — this is preventative, not a fix |
| T8 | Docs: `docs/engines/diagram/SPEC.md` gains **W-3.13** (media nodes) in the capability list at `:59-68`; `docs/DESIGN.md` gains the media-slot convention; hand-edit the **source** `docs/engines/diagram/skills/structural-diagram/SKILL.md` to teach `media`, then run `pnpm generate:skills` and commit **both** sides (`packages/engine-skills/skills/diagram/*`, including the generated `schema.json` projection); `PLAN.md` §11 change-log entry | G4 | `node scripts/check-engine-skills-fresh.mjs` reports no diff; skills portability check passes (no `packages/` or `docs/` fragments). T2's schema change must land with T8 — the generator reads the engine schema copy, so a schema edit without regeneration fails the freshness guard |
| T9 | Full exit gate | G4 | `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs` green |
| T10 | Companion note to the host repo: **no host change is required** — a media node is an ordinary Diagram node to the host (it carries `metadata.nodeId` and bounds), so the host's existing bounds + authored-id anchoring binds it already. `media` is an engine-side **render opt-in only** and must not be proposed as a host selector. Explicitly **not** touching the `kind === 'event-marker'` case, which serves Timeline (`event-marker` is emitted only by `timeline-engine`) | G4 | Recorded in the host repo as a follow-up doc note; **not** a blocker for this spec |

## 6. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| The below-box label clips the canvas | **High if unaddressed, and node-count dependent** | §0 measures it: at today's radius the 5-node frame still fits (588.3 of 600) but the label lands at 602.3 and clips, while 6 nodes fit (581.8). T3 reserves `height + labelGap` in the radius and T3's exit condition requires checking **two** node counts, because a single-count check would pass at 6 and ship a clip at 5 |
| The new radius formula changes today's layout for non-media nodes | Medium | T3's exit condition requires non-media bounds to be byte-identical; the formula is size-aware precisely so it reduces to the current value at `maxBoxSize = 60` |
| Two conventions re-emerge (one engine on `mediaSlot`, one hand-rolled) | Medium | Measured baseline: `rg -n 'rx="6"' packages/*/src` returns exactly **2** hits (`diagram-engine/src/render/svg.ts:49`, `visual-engine/src/render/svg.ts:86`). After G3 it must return exactly **2** — `packages/svg-kit/src/media-slot.ts` (the one slot emitter) and `packages/diagram-engine/src/render/svg.ts` (the non-media filled box, deliberately left hand-rolled so its markup stays byte-identical) — and `rg -n 'rx="6"' packages/visual-engine/src` must return **0**. The count never reaches 1: the emitter itself contains `rx="6"` |
| `mediaSlot` grows its own attribute assembler and drifts from `nodeAttrs` | Medium | §3.1 composes `nodeAttrs` and routes `data-oedu-media` through `opts.mid`; T1 asserts `id`/`role`/`interactive`/`aria-label` come from the helper |
| `media` weakens into an asset channel | Low | T2's negative test rejects `media.src`; §2 forbids URL fields; host-spec D9 unchanged |
| Golden churn from the Visual label move is mistaken for a regression — or the Visual change is mistaken for a user-facing fix | Medium | T7 pins the exact allowed deltas (label `y`, dropped `dominant-baseline`, added `data-oedu-media`, nothing else — `indent` keeps the byte layout); §3.3 states the change is preventative and that no figure can reach a Visual entity today |
| The host re-places figures against stale bounds after a layout change | Medium | Both overlay layers are re-derived from `handle.snapshot()` on each T0-driven host re-render, and T0 is the `onEvent` plumbing from `InteractiveRenderer` into the view components (companion spec D0/T0). A media box changes the *first* snapshot, so no extra refresh is needed — but T10's note must say so explicitly, and must confirm the host re-anchors on every T0 event rather than once at mount |
| A media node is authored with no matching host `figures` key | **High, and pre-existing** | Unmatched figure keys are dropped silently today (`figure-overlay.tsx:58`). Out of scope to fix here (the host spec owns it), but T8's skill text must say the two are authored together, and the frog fixture is the worked counter-example of getting it right |
| The host anchors a figure to a Diagram node that has **no** `media` field, so the collision this spec fixes is still visible in the shipped demo | **High, and known** | The host repo's demo fixture `nodes/diagram-figure.json` anchors a figure to a plain `cycle` node, because the host anchors by authored id + bounds (`figure-overlay.tsx:57-58`) and never consults `metadata.media`. Nothing here prevents that, and it is a host-fixture authoring choice, not an engine defect — T13 reports it. The engine's `media` field is the opt-in that makes slot rendering *possible*; it cannot be inferred by the host from bounds alone |
| Figures authored with `currentColor` stay illegible on a faint, not-white frame | Medium | §0 `currentColor` fact: **all six** demo figures author strokes with `currentColor`, so this is a demo-wide pattern, not one bad asset. Not fixable by any renderer change here — needs figure-authoring guidance and/or host-side SVG inlining, owned by the companion spec, referenced from §2 rather than dropped |
| A stale fixture catalog or skills projection fails the gate after a schema change | Medium | §4 makes catalog regeneration a gate dependency; T8 couples T2's schema edit to `pnpm generate:skills` because the generator reads the engine schema copy |

## 7. Deferred (explicitly not this spec)

1. **Aspect-ratio and fit control** (`media.aspect`, `media.fit`). `MEDIA_BOX` is a fixed 220×120 for now; the host already letterboxes via `object-contain`.
2. **Making Visual illustration host-addressable** (`metadata.entityId` on entity children). §0 records that Visual entities expose no authored id, so no figure reaches them today, and the companion spec's D6 deliberately excluded Visual from v1. Exposing the id is a host-contract decision, not an engine detail — it belongs with whoever revisits D6. Until then Visual's label move is preventative (§3.3).
3. **Media slots in GeoMap, Chart, and Timeline.** Chart rows and timeline event spans have their own geometry and the same latent collision. The convention is shared, so each is an adoption task, not a redesign.
4. **Figure inlining for theme-aware figure colours.** Host-side; belongs to the companion spec.
5. **Silent unmatched-figure-key and unresolved-`altKey` failures.** Host-side validation; noted in §6 because a media slot makes an unmatched key more visible, not less.
6. **`description` → `svgResult.a11y`.** The host spec's T6. Independent of this change: `description` already reaches `alternative` rows, and this spec does not touch either channel.

## 8. Exit gate

`pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs`, plus:

- No existing `packages/diagram-engine/fixture/**/expected.*` file differs by a byte. Baseline for the cheap proxy: `rg -l 'opacity="0.85"' packages/diagram-engine/fixture` returns the same **49** files.
- `rg -n 'rx="6"' packages/*/src` returns exactly **2** hits — `packages/svg-kit/src/media-slot.ts` (the shared slot emitter) and `packages/diagram-engine/src/render/svg.ts` (the non-media filled box, left hand-rolled on purpose so its markup stays byte-identical) — and `rg -n 'rx="6"' packages/visual-engine/src` returns **0**. Baseline today is two (`diagram-engine/src/render/svg.ts:49`, `visual-engine/src/render/svg.ts:86`); §6 records this so the assertion is checkable rather than aspirational.
- `packages/dev-harness/generated/fixture-catalog.json` is current with respect to the fixture tree (`node scripts/build-fixture-catalog.mjs` produces no diff).
- The new media fixture asserts no `<image` and no `xlink:href` in engine SVG output, and its `expected.scene.json` shows 220×120 bounds with the label outside the box.