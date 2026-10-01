# Selection Toggle + Accessible Selection State Implementation Plan

**Date:** 2026-10-01
**Authority (top to bottom):** `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → `docs/use-cases/<engine>.md` → per-engine `SPEC.md`
**Audience:** AI coding agents, maintainers
**Branch:** `feat/selection-toggle` (proposed; not yet created)
**Extends:** nothing. Independent of the svg-kit extraction (`ADR-13`, Workstream A) and of the gap-closure plan. Touches **no engine renderer output**, so it cannot conflict with golden work.

---

## 0. Verified facts this plan depends on (2026-10-01)

- **`select` is deliberately idempotent, not a toggle.** `packages/interactive-engine/src/runtime/reducer.ts:20-23` uses `appendUnique` (`:14-16`), so a repeat `select` returns the identical array. `deselect` is a first-class sibling in the closed enum (`packages/interactive-engine/src/schemas/actions.ts:2-3`; `docs/DESIGN.md:246` "| Selection | `select`, `deselect`, `focus`, `unfocus` |"). This is load-bearing: `selection` is `string[]` (`core/state.ts:8`), multi-select accumulation is specified (`docs/use-cases/visual.md:105` "selection accumulates"), the counting-set `maxSelection` cap (`visual-engine/src/engine.ts:130-136`) and fraction fill re-derivation (visual SPEC A.2.2) both depend on additive semantics. **This plan does not touch the reducer.**
- **The toggle belongs in the renderer-input translation layer.** `docs/DESIGN.md:240`: "Renderer input (`click`, `pointer.enter`, `keyboard`) MUST be translated into a semantic action before it enters the engine reducer." `packages/interactive-react/src/svg-surface.ts:58-74` currently translates *every* click on `[data-oedu-interactive="true"]` into `{ type: 'select' }` unconditionally.
- **No plumbing is needed at any call site, and the DOM is a safe source of truth at click time.** `applySelectionState` (`svg-surface.ts:27-52`) sets `data-oedu-selected="true"` on `container.querySelector('#' + id)` — the same element that carries `id` + `data-oedu-interactive`. `syncSvgSurface` (`:113-117`) calls `renderSvgInto` then `applySelectionState` synchronously, so both writes land in one JS task. Clicks are queued tasks and cannot interleave. All three call sites (`InteractiveLesson.tsx:151`, `InteractiveNode.tsx:131`, `dev-harness/src/mount-engine.ts:236`) therefore work unchanged, and none closes over a selection array at bind time (verified).
- **Delegated listeners survive re-render; per-element attributes do not.** `renderSvgInto` (`:54`) does `container.innerHTML = svg`, so every dispatch wipes all attributes on the SVG elements. `data-oedu-selected` survives only because `applySelectionState` re-applies it inside `syncSvgSurface`; the `<style>` node survives because `ensureInteractivePointerStyle` appends to `root`, which is never replaced. **`bindSvgInteraction` is called exactly once** in `mount-engine.ts:236` (outside `renderDom`) and once per effect in `InteractiveNode.tsx:131` / `InteractiveLesson.tsx:151` (deps `[spec, engineType, id]` / `[instanceIds, refreshInstance]` — never on selection change). Therefore **any per-element state applied at bind time is lost after the first dispatch.** This governs T3's placement (see §3).
- **Nesting confirms one element per id.** `svgContent` is a child of `svgRoot` (`mount-engine.ts:171-175`), so `applySelectionState(svgContent, …)` writes to the same elements the `closest()` lookup in the delegated handler finds. No a11y tree is rendered as DOM in any of the three surfaces (`InteractiveNode` flattens it to text at `:141`), so no duplicate-id collision can steal the selection attribute.
- **Zero golden churn.** `rg -l "oedu-selected|aria-selected" packages/*/fixture/ docs/fixtures/` returns **nothing** — no `expected.svg` bakes selection state. It is applied at runtime only. **This plan must keep it that way**: no `tabindex`/`aria-pressed` is ever emitted by a renderer.
- **`aria-selected` on `role="button"` is invalid ARIA, and `aria-pressed` is used nowhere.** Interactive nodes are emitted as `role: 'button'` by visual (`visual-engine/src/render/svg.ts:134`) and diagram (`diagram-engine/src/render/svg.ts:82`). `aria-selected` is written/read only at `svg-surface.ts:34,43` and asserted in `interactive-react/test/svg-surface.test.ts:41` and `dev-harness/test/mount-engine.test.ts:86`. No code validates ARIA role/attribute pairing, and **no e2e, conformance, or `honesty-audit` test references `aria-selected`** — so the ARIA swap has no assertion surface beyond those two unit tests.
- **No keyboard path to selection exists.** `svg-surface.ts` binds `click` only; the sole `onKeyDown` (`InteractiveNode.tsx:219`) drives the dev-mode inspector button strip, not the SVG surface. `svg-kit/src/shell.ts` emits no `tabindex`.
- **Test surface is small.** Exactly 4 synthetic click dispatches exist repo-wide (`svg-surface.test.ts:18,28`; `mount-engine.test.ts:73,83`), **none clicks twice**. No test asserts a repeated-`select` event sequence; `replay.test.ts` and the engine e2e specs dispatch `select`/`deselect` explicitly and are unaffected.
- **`interaction.actions` is validated for membership only, never enforced at dispatch.** Each engine's `validation/semantic.ts` checks membership in `ACTION_TYPES` (e.g. `geomap-engine/src/validation/semantic.ts:133-140`) — so `deselect` is always a legal declaration. `interactive-engine/src/composition/lesson.ts:66-73` checks it only for *composition bindings*. ADR-12: the declared set is an authoring declaration, not a runtime ACL.
- **76 fixture/spec files declare `select` without `deselect`** — verified by enumeration: diagram 45, geomap 9, visual 7, chart 6, timeline 5, `docs/fixtures/` 4. The 7 visual ones are `counting-set`, `number-line`, `clock-practice`, `comparison`, `fraction`, `geometry-practice`, `fraction-comparison`.

## 1. Decisions taken (2026-10-01, maintainer)

| Decision | Choice | Rationale |
|---|---|---|
| Where the toggle lives | `bindSvgInteraction` click/keydown translation, DOM-attribute read | DESIGN.md §7.4 assigns renderer-input translation to this layer; reducer stays pure and additive |
| `interaction.actions` gate | **Uniform toggle + backfill `deselect`** into every fixture/spec declaring `select` | Gating per-fixture would make identical-looking nodes behave differently with nothing on screen explaining why. Backfilling stops the declaration from lying about UI behavior. Membership validation makes the backfill always legal. |
| Accessibility scope | **Toggle + `aria-pressed` + keyboard parity**, bundled | A mouse-only toggle with an invalid ARIA state is not shippable under P6; keyboard reachability is a pre-existing gap this change would otherwise widen |
| `tabindex` placement | Runtime only, in `interactive-react` — **never** in renderer output | Preserves byte-identical goldens (fact #4). `renderTimelineLinear` (`mount-engine.ts:126-147`) is precedent for runtime-only focusability. |
| Multi-select preserved | Toggle does **not** clear siblings | Accumulation is specified; `deselect` removes exactly the clicked id |

## 2. Non-goals (fixed, do not drift)

- **No reducer, `core/state`, or event-log change.** `select` stays idempotent; `appendUnique` stays.
- **No new D5 action.** `deselect` already exists; adding `toggle` would duplicate it and violate the closed enum.
- **No engine renderer / `svg-kit` change.** No `tabindex`, no `aria-pressed`, no role change in engine output. Byte-identity is the acceptance bar.
- **No `maxSelection` / `acceptsActions` / guided-mode interaction.** The cap keeps rejecting over-limit `select` exactly as today.
- **No `reset`-to-deselect-all, no Escape-to-clear.** Out of scope; `reset` already exists.
- **No change to the dev-mode inspector button strip** (`InteractiveNode.tsx:207-231`) — those buttons dispatch their declared action verbatim and must not start toggling.
- **No second OpenEdu** (D6/D7): no scoring, no telemetry, no theme source-of-truth. `aria-pressed` is engine-surface semantics, not host theming.

## 3. Package contract — `packages/interactive-react`

```text
packages/interactive-react/src/svg-surface.ts
  - POINTER_STYLE_CSS: add a `:focus-visible` ring on
      [data-oedu-interactive="true"]  (NOT a [tabindex] selector — see rule below)
  - applySelectionState(container, selection, focus):
      set/remove `data-oedu-selected`   (unchanged — CSS + dev hooks)
      set/remove `aria-pressed="true"`  (REPLACES aria-selected; same unguarded
                                         querySelector('#'+id) as today)
  - applyInteractiveFocusability(container): runtime-only tabindex="0" on
      [data-oedu-interactive="true"]; idempotent. **Called from syncSvgSurface,
      NOT from bindSvgInteraction** (fact: bind-time attributes are wiped)
  - bindSvgInteraction(root, dispatch):   [delegated on root — survives re-render]
      click   -> select | deselect, chosen by el.hasAttribute('data-oedu-selected')
      keydown -> Enter/Space, same translation (preventDefault on Space)
  - syncSvgSurface(container, snapshot):
      renderSvgInto(); applySelectionState(); applyInteractiveFocusability()
  - exported surface is UNCHANGED: bindSvgInteraction, syncSvgSurface,
      applySelectionState, ensureInteractivePointerStyle, renderSvgInto
```

`bindSvgInteraction`'s **signature does not change** — that is what keeps all three call sites untouched (fact #3). Neither does `syncSvgSurface`'s.

Two placement rules that the facts above force:

- **Focusability goes in `syncSvgSurface`, not `bindSvgInteraction`.** The SVG subtree is replaced by `innerHTML` on every dispatch while the bind-time effect does not re-run; a `tabindex` applied at bind time disappears after the first click, silently removing keyboard access mid-lesson. The delegated `keydown` listener is on `root` and is unaffected.
- **The focus ring must key off `:focus-visible`, not `[tabindex]`.** `tabindex="0"` makes an element focusable, so a *mouse* click focuses it — a `[tabindex]`-selected ring would paint a blue outline on every node the learner clicks, which is a visual regression on the primary interaction path. `:focus-visible` shows the ring for keyboard only.

`aria-pressed` keeps today's **unguarded** placement (any element whose id is in `selection`), not an interactivity-gated one — the current code has no such gate and the existing test at `svg-surface.test.ts:36-42` asserts selection attributes on a non-interactive `<g>`. Gating would be a behavior change beyond this plan's scope; see §6.

## 4. Sequencing and gates

| Gate | Contents | Blocked by |
|---|---|---|
| G0 | This plan | none (documentation) |
| G1 | `svg-surface.ts` toggle + `aria-pressed` + focusability/keyboard, unit tests | G0 |
| G2 | `interaction.actions` backfill (`deselect`) + docs | G1 |
| G3 | Full exit gate green; plan closed | G2 |

Hard rules:

- **Byte-identity is non-negotiable** — `rg -l "oedu-selected|aria-selected|aria-pressed|tabindex" packages/*/fixture/*/expected.svg` must return nothing before and after. Any hit is a failed step.
- **No reducer touch** — a diff in `packages/interactive-engine/src/runtime/` or `core/` other than comments is a failed step; this is a renderer-input change only.
- **Test-first** — each behavior gets a test that fails before the change. Specifically the second-click `deselect` test must fail against current `svg-surface.ts`.
- **Accessibility is not deferrable** — G1 is not "done" with only the click toggle; `aria-pressed` and the keydown path ship in the same gate.
- **No runtime enforcement of `interaction.actions`** — do not add a gate check while backfilling (would contradict ADR-12).
- **Keyboard state must survive re-render** — any per-element attribute must be applied from `syncSvgSurface` (the only per-dispatch path), and T3's test must dispatch, then re-query the DOM *after* the re-render, before asserting `tabindex`. Asserting on the pre-dispatch DOM passes even when the feature is broken in use.
- **Focus ring is `:focus-visible`, never `[tabindex]`** — a `[tabindex]` ring paints on mouse click and regresses the primary interaction path.
- **No literal colors in new CSS** — `POINTER_STYLE_CSS` already carries pre-existing literal hex (`#1d4ed8`); this plan must not add more (AGENTS.md: semantic tokens only). Reuse the existing `[data-oedu-focused="true"]` outline or `currentColor`.
- **Guard against double-dispatch** — Enter on a *native* focusable element synthesizes a `click`, which would dispatch twice. All current roles are `role="button"` on `<g>` (non-native, no synthesis), so this is latent, not active; if a renderer ever emits `<a>`/`<button>`, the keydown path must skip or the click path must.

## 5. Work items ledger

| # | Work | Gate | Done when |
|---|---|---|---|
| T1 | `svg-surface.ts`: second click on a `data-oedu-selected` element dispatches `{type:'deselect', target:{id}}`; first click still `select`; a click on a *different* interactive element is unaffected (no sibling clearing) | G1 | New unit tests in `svg-surface.test.ts` fail-before/pass-after |
| T1b | **Full-stack double-click through `mountEngine`** — click `#nl-marker-7` twice in `dev-harness/test/mount-engine.test.ts` and assert the action sequence is exactly `[select, deselect]` and `selection` is empty. This is the only test that exercises click → `innerHTML` replacement → selection re-application together, and it is the regression net for the fact in §0 that bind-time DOM state is wiped | G1 | Test fails before T1 (today it yields `[select, select]`) and passes after |
| T2 | `applySelectionState`: replace `aria-selected` with `aria-pressed`, keeping the **same unguarded** `querySelector('#'+id)` placement; keep `data-oedu-selected` for CSS. Update the two assertions at `svg-surface.test.ts:41` and `mount-engine.test.ts:86` | G1 | Both updated tests green; `rg "aria-selected" packages/ apps/` returns nothing outside `_archive` |
| T3 | Keyboard parity: `applyInteractiveFocusability(container)` sets runtime `tabindex="0"` on interactive nodes (idempotent) and is called from **`syncSvgSurface` after `renderSvgInto`**, not from `bindSvgInteraction`; `keydown` on Enter/Space performs the identical select/deselect translation; Space calls `preventDefault()` to stop page scroll; add a `:focus-visible` ring to `POINTER_STYLE_CSS` (no new literal hex) | G1 | Unit tests: (a) `tabindex` present after a **dispatch-triggered re-render**, not just on first bind; (b) Enter and Space each dispatch the expected action on a focused node, and Enter-after-select emits `deselect`; (c) no `tabindex`/`aria-pressed` in any `expected.svg` |
| T4 | Export/README: `packages/interactive-react/README.md:46` §"SVG click contract" currently reads "`[data-oedu-interactive=\"true\"]` elements dispatch `select` via delegated click listener." — replace with the toggle + `aria-pressed` + keyboard description | G1 | README matches behavior; `pnpm --filter @knowledgeassemble/interactive-react typecheck` green |
| T5 | Backfill `"deselect"` into `interaction.actions` for all 76 fixtures/specs that declare `select` without it (§0 fact #8), preserving each file's existing key order and formatting | G2 | `pnpm -w test` green (each engine's L2 membership validation accepts `deselect`); fixture-catalog rebuild produces no new fixture count (105); **zero golden churn** |
| T6 | Docs: `docs/engines/visual/SPEC.md` interaction section (§39 "Interaction Actions", plus A.2.1/A.2.2 which describe `select`/`deselect` pairs) — document toggle semantics and that "a selection-capable interactive declares both `select` and `deselect`". `docs/INTERACTIVE-ENGINE-SPEC.md` §15 (`:645-650`, action list) and §16 (`:692-700`, select-by-id example) need no semantic change but should gain a note that renderer input maps repeat activation to `deselect`. `docs/DEVELOPER-GUIDE.md:139` shows a host-side `dispatch({type:'select'})` example — host dispatch stays non-toggling, so that line is correct as-is. **`docs/DESIGN.md` needs no change** — §7.4 (`:246`) already lists both actions | G2 | Docs match shipped behavior; no doc claims unconditional-`select` click semantics |
| T7 | Full exit gate + close plan | G3 | `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs` green; golden-churn grep clean; PR opened |

## 6. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `tabindex` leaks into renderer output via a well-meaning "fix" | Low | T3 explicitly scopes it to `interactive-react`; golden-churn grep is a G3 gate |
| Runtime `tabindex` silently disappears after the first interaction (bind-time application wiped by `innerHTML`) | **Was High — now mitigated by design** | Moved to `syncSvgSurface` (§0 fact, §3 rule); T3's test asserts *after* a dispatch-triggered re-render; T1b covers the same class of bug end-to-end |
| Focus ring regresses mouse clicks (a `[tabindex]` selector shows on click-focus) | **Was Medium — now mitigated by design** | Hard rule: `:focus-visible` only; T3 asserts the CSS selector |
| Enter double-dispatches if a renderer ever emits a native `<a>`/`<button>` | Low (latent) | Hard rule records the guard; all current roles are `role="button"` on non-native `<g>` |
| Backfill touches a fixture whose `actions` array is order-sensitive or snapshot-asserted | Low | Each engine's validation only checks membership; T5 preserves existing order/format; `pnpm -w test` is the gate |
| A learner relies on repeat-click being a no-op (e.g. guided `identify` mode where a wrong pick should stay visible) | Medium | Guided-mode fixtures with `mode: "identify"` that already declare `deselect` (clock-discovery-minute, geometry-discovery-vertex, counting-set-pick-n) — the toggle makes their declared behavior actually reachable. Wrong-pick visibility is a renderer concern, not blocked by this plan; note it in the PR description rather than gating on it. |
| Toggle weakens the `maxSelection` cap as a "you must pick N" affordance | Low | Only `counting-set-pick-n` sets `maxSelection: 3`, and it **already declares `deselect`** (`fixture/counting-set-pick-n/input.visual.json:15,22`) — so a learner could already deselect via a second `deselect`; the cap is unchanged and still rejects an over-limit `select`. `counting-set` (no cap) is unaffected. |
| `aria-pressed` lands on a non-interactive element when a **host** dispatches `select` for an arbitrary id (legal per `DEVELOPER-GUIDE.md:139`) | Low | Pre-existing shape: today's `aria-selected` has the same unguarded placement and the existing test asserts it on a non-interactive `<g>`. Gating on interactivity is a separate, larger behavior change — deferred, not silently taken here |
| `aria-pressed` swap is a breaking change for a downstream consumer reading `aria-selected` | Low | `interactive-react` is 0.1.x, unpublished for learner use; recorded in the PR body |

## 7. Deferred (explicitly not this plan)

1. **Roving tabindex / arrow-key navigation.** `tabindex="0"` on every interactive node puts up to 12 tab stops in the largest fixture (`diagram-engine/fixture/di-sys-city-system`, 12 interactive nodes; typical is 4–11), which is acceptable but not ideal. Revisit if a scene ever exceeds ~20 interactive nodes.
2. **Gating selection attributes on interactivity** (the `aria-pressed`-on-a-decorative-node case in §6) — a behavior change to `applySelectionState`, not an ARIA rename.
3. **Literal-hex cleanup of `POINTER_STYLE_CSS`.** Pre-existing debt; this plan adds none but does not fix it.

## 8. Exit gate

`pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs`, plus: `rg -l "oedu-selected|aria-selected|aria-pressed|tabindex" packages/*/fixture/*/expected.svg` empty, and `git diff --stat packages/interactive-engine/src/runtime packages/interactive-engine/src/core` empty.
