# Implementation Plan — Interactive React Learner Surface (SVG clicks)

**Date:** 2026-09-10  
**Repo:** `openedu-interactive`  
**Spec / context:** P8 Workstream B — OpenEdu CourseRuntime integration (`docs/p7-acceptance.md` #1)  
**Companion plan:** `open-edu/docs/superpowers/plans/2026-09-10-interactive-learner-chrome-implementation-plan.md` (host chrome — run **after** this plan)  
**Target agent:** Cursor agent on **`deepseek-4-flash`**  
**Branch:** `feat/interactive-learner-surface` from current `main` (or continue `feat/visual-practice-mode`)  
**Deliverable:** 1 PR — learner-mode SVG interaction in `@knowledgeassemble/interactive-react`; dev-harness DRY refactor optional in same PR

---

## Agent briefing (read before coding)

You are fixing **why learners cannot click engine SVGs** in OpenEdu CourseRuntime. The engine and `InteractiveNode` mount SVG correctly, but clicks only work in `dev-harness` because `mount-engine.ts` binds pointer events. CourseRuntime uses `InteractiveNode`, which injects static HTML and shows **dev button strips** (`nl-label-7 (select)`).

### Rules

1. **One task at a time.** Run the verification command at the end of each task.
2. **Test-first** where specified. Confirm fail → implement → pass.
3. **Do not break** composed-lesson replay tests or widget-compat tests.
4. **ESM `.js` extensions** on relative imports.
5. **No scoring in engine** (D7). Pointer → `dispatch({ type: 'select', target: { id } })` only.
6. **Default mode is `learner`** — no dev button strip unless explicitly requested.

### Problem summary

| Symptom | Cause | Fix owner |
|---------|-------|-----------|
| Can't click number line | `dangerouslySetInnerHTML` without listeners | This plan |
| `nl-label-7 (select)` buttons visible | `InteractiveNode` dev control map | This plan (`controlsMode`) |
| No selection highlight after click | No re-render from `snapshot()` after dispatch | This plan |

### Repo commands (workspace root)

```bash
pnpm typecheck
pnpm lint
pnpm -w test
pnpm --filter @knowledgeassemble/interactive-react test
pnpm playwright   # if e2e touched
```

---

## Architecture target

```text
InteractiveNode / InteractiveLesson
  ├── svg-surface.ts     ← NEW: bind clicks, apply selection, inject styles
  ├── useSvgSurface()    ← NEW: React hook (mount, dispatch, refresh)
  └── controlsMode: 'learner' | 'dev'   ← default 'learner'
```

`packages/dev-harness/src/mount-engine.ts` SHOULD import from `@knowledgeassemble/interactive-react` subpath (Task IR-6) so playground and CourseRuntime share one implementation.

---

## Phase IR-0 — Scaffold `svg-surface` module

**Exit gate:** Unit tests for svg-surface pass; no behavior change to InteractiveNode yet.

### Task IR-0-1 — Create `svg-surface.ts`

**New file:** `packages/interactive-react/src/svg-surface.ts`

Extract and generalize from `packages/dev-harness/src/mount-engine.ts`:

| Export | Behavior |
|--------|----------|
| `INTERACTIVE_POINTER_STYLE_ID` | constant `'oedu-interactive-pointer-style'` |
| `ensureInteractivePointerStyle(root: HTMLElement)` | Inject cursor/selection CSS once |
| `applySelectionState(container, selection, focus)` | Patch `data-oedu-selected` / `data-oedu-focused` on SVG ids |
| `renderSvgInto(container, svg: string)` | `container.innerHTML = svg ?? ''` |
| `bindSvgInteraction(root, dispatch)` | Delegated click on `[data-oedu-interactive="true"]` → `dispatch({ type: 'select', target: { id } })`; returns `unbind` |
| `syncSvgSurface(container, snapshot)` | Read `svgResult.svg`, `selection`, `focus` from snapshot; render + apply selection |

**Snapshot shape** (match engine instance):

```typescript
interface SvgSurfaceSnapshot {
  svgResult?: { svg?: string };
  selection?: string[];
  focus?: string | null;
}
```

**CSS** (copy from dev-harness — keep in sync):

```css
[data-oedu-interactive="true"] { cursor: pointer; }
[data-oedu-selected="true"] { stroke: #1d4ed8 !important; stroke-width: 4 !important; }
[data-oedu-selected="true"] text { fill: #1d4ed8; font-weight: 700; }
[data-oedu-selected="true"] > rect[data-oedu-hit-target="true"] { fill: rgba(29, 78, 216, 0.12); stroke: #1d4ed8; stroke-width: 2; }
[data-oedu-focused="true"] { outline: 2px solid #1d4ed8; outline-offset: 2px; }
```

### Task IR-0-2 — Unit tests (test-first)

**New file:** `packages/interactive-react/test/svg-surface.test.ts`

Use jsdom (already in package devDeps).

```typescript
it('bindSvgInteraction dispatches select when interactive element clicked', () => {
  const root = document.createElement('div');
  root.innerHTML = `<svg><g id="nl-label-7" data-oedu-interactive="true"><text>7</text></g></svg>`;
  const dispatched: EngineAction[] = [];
  const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
  root.querySelector('text')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(dispatched).toEqual([{ type: 'select', target: { id: 'nl-label-7' } }]);
  unbind();
});

it('applySelectionState sets data-oedu-selected on target id', () => { ... });

it('syncSvgSurface renders svg and applies selection from snapshot', () => { ... });
```

**Verify:** `pnpm --filter @knowledgeassemble/interactive-react test svg-surface`

---

## Phase IR-1 — Refactor `InteractiveNode`

**Exit gate:** `mount.test.tsx` passes; new click test passes; no dev buttons by default.

### Task IR-1-1 — Add `controlsMode` prop

**File:** `packages/interactive-react/src/InteractiveNode.tsx`

```typescript
export interface InteractiveNodeProps {
  spec: unknown;
  engineType: string;
  host: OpenEduBridge;
  id?: string;
  /** 'learner' = SVG clicks only; 'dev' = SVG + labeled button strip for conformance */
  controlsMode?: 'learner' | 'dev';
}
```

Default: `'learner'`.

### Task IR-1-2 — Replace static SVG mount with `useSvgSurface` pattern

Refactor `useEffect` to:

1. Instantiate engine (unchanged validation/instantiate).
2. Store `instanceRef`.
3. On mount:
   - Create wrapper structure:

```text
<div data-interactive-node>
  <div data-oedu-svg-root ref={svgRootRef}>
    <div data-oedu-svg-content ref={svgContentRef} />
  </div>
  <!-- dev controls only if controlsMode === 'dev' -->
  <!-- screen-reader a11y tree (keep existing hidden region) -->
</div>
```

4. Call `ensureInteractivePointerStyle(svgRootRef.current)`.
5. `syncSvgSurface(svgContentRef.current, instance.snapshot())`.
6. `unbind = bindSvgInteraction(svgRootRef.current, (action) => { instance.dispatch(action); refresh(); })`.
7. `refresh()` = `syncSvgSurface(svgContentRef, instance.snapshot())`.

8. Cleanup: `instance.teardown()`, `unbind()`.

**Remove** `dangerouslySetInnerHTML` on a bare div without listeners.

**Remove** dev button block when `controlsMode !== 'dev'`.

### Task IR-1-3 — Test: SVG click dispatches select

**File:** `packages/interactive-react/test/mount.test.tsx`

Add test using guided number-line spec (marker at 7):

```typescript
it('learner mode: clicking SVG interactive target dispatches select', async () => {
  const spec = {
    type: 'visual', version: '1.0.0', id: 'nl-click-test',
    content: { kind: 'number-line', components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }] },
    accessibility: { label: 'Number line', description: 'Select 7' },
    interaction: { mode: 'identify', actions: ['select'] },
  };
  const emitted: string[] = [];
  // render InteractiveNode with controlsMode default
  // find #nl-marker-7 or #nl-label-7 in container (guided = marker)
  // dispatch click on element
  // expect emitted to contain 'visual.nl-marker-7-selected'
  // expect ref.current?.snapshot() selection to contain 'nl-marker-7'
});
```

Use discovery spec (`interactive: true`) in a second test for `nl-label-7` if local engine supports it.

### Task IR-1-4 — Test: dev mode still shows buttons

```typescript
it('dev mode: renders control map buttons', () => {
  // controlsMode="dev"
  // expect button text matching /\(select\)$/
});
```

**Verify:** `pnpm --filter @knowledgeassemble/interactive-react test`

---

## Phase IR-2 — Refactor `InteractiveLesson`

**Exit gate:** Composed lesson mount test still passes; SVG click on timeline instance works.

### Task IR-2-1 — Per-instance SVG surfaces

**File:** `packages/interactive-react/src/InteractiveLesson.tsx`

Current code: one `dangerouslySetInnerHTML` per instance — **no clicks**.

Replace with:

- For each `instanceId` in `runtime.instances`, render:

```text
<div data-instance-id={instanceId} data-oedu-root={instanceId}>
  <div data-oedu-svg-content />
</div>
```

- On mount: `bindSvgInteraction` per root; dispatch via `runtime.dispatch(instanceId, action)`.
- On any dispatch (including bindings): refresh that instance's `syncSvgSurface`.
- Subscribe to `host.onEvent` wrapper to call refresh for emitting instance (parse `event.instanceId`).

**controlsMode** prop on `InteractiveLessonProps` (default `'learner'`).

### Task IR-2-2 — Extend mount test

In `mount.test.tsx`, after existing composed lesson test, optionally simulate click on timeline event element if SVG exposes `data-oedu-interactive` on timeline nodes (or skip if timeline uses linear list only in harness — document limitation).

Minimum: existing test must still pass without regression.

---

## Phase IR-3 — Package exports and dev-harness DRY

### Task IR-3-1 — Export subpath

**File:** `packages/interactive-react/package.json`

Add exports:

```json
"./svg-surface": {
  "types": "./src/svg-surface.ts",
  "default": "./src/svg-surface.ts"
}
```

**File:** `packages/interactive-react/src/index.ts` — optional re-export:

```typescript
export { bindSvgInteraction, syncSvgSurface, applySelectionState } from './svg-surface.js';
```

### Task IR-3-2 — Refactor dev-harness (optional but recommended)

**File:** `packages/dev-harness/src/mount-engine.ts`

- Import `bindSvgInteraction`, `syncSvgSurface`, `ensureInteractivePointerStyle`, `renderSvgInto` from `@knowledgeassemble/interactive-react/svg-surface`.
- Delete duplicated local functions (keep chart/timeline table renderers in harness).
- **Verify:** `pnpm --filter @knowledgeassemble/dev-harness test` and `pnpm playwright`.

### Task IR-3-3 — Playground / conformance

**Verify:** `pnpm playground` — click number-line-identify-marked label in browser; event panel updates.

---

## Phase IR-4 — Docs and version

### Task IR-4-1 — `packages/interactive-react/README.md` (create if missing)

Document:

- `controlsMode: 'learner' | 'dev'`
- OpenEdu MUST use default `learner`
- SVG click contract (`data-oedu-interactive`)

### Task IR-4-2 — Bump patch version

**File:** `packages/interactive-react/package.json` — bump `version` to `0.1.1` if not already published at that version; coordinate with open-edu overrides.

**PR final gate:**

```bash
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

**Commit message:** `IR: learner SVG surface — bind clicks, hide dev controls by default`

---

## Task checklist (agent copy-paste)

```
[ ] IR-0-1 svg-surface.ts
[ ] IR-0-2 svg-surface.test.ts
[ ] IR-1-1 controlsMode prop
[ ] IR-1-2 InteractiveNode refactor
[ ] IR-1-3 learner click mount test
[ ] IR-1-4 dev mode mount test
[ ] IR-2-1 InteractiveLesson SVG surfaces
[ ] IR-2-2 composed lesson regression
[ ] IR-3-1 package exports
[ ] IR-3-2 dev-harness DRY (optional)
[ ] IR-3-3 playground manual check
[ ] IR-4-1 README
[ ] PR gate green
```

---

## Explicit non-goals

- Prompt / question UI (open-edu plan)
- Scoring / feedback (D7 — OpenEdu host)
- New D5 actions
- Changing engine SVG output
- Keyboard roving tabindex (defer to open-edu P2)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Click does nothing | Listener on wrong root | Bind on `data-oedu-svg-root`, bubble from content |
| `#id` not found | SVG ids with special chars | Use `CSS.escape` if needed; engine ids are alphanumeric |
| Selection not visible | No refresh after dispatch | Call `syncSvgSurface` in dispatch callback |
| Tests find no interactive element | Guided uses marker not label | Use correct id for spec mode |
| dev-harness import fails | Missing export subpath | IR-3-1 |
| Duplicate style tags | ensureInteractivePointerStyle id check | Guard with `querySelector(#id)` |

---

## Success criteria

1. `InteractiveNode` default: SVG targets clickable; no `(select)` button strip.
2. `dispatch(select)` updates `snapshot().selection` and visible `data-oedu-selected`.
3. `controlsMode="dev"` restores button strip for conformance agents.
4. `InteractiveLesson` composed fixture still passes mount + binding test.
5. dev-harness uses shared svg-surface (or documented duplicate removed).
6. Full repo gate green.

---

## References

- Source to port: `packages/dev-harness/src/mount-engine.ts` (`bindSvgInteraction`, `applySelectionState`)
- Consumer: `packages/interactive-react/src/InteractiveNode.tsx`
- OpenEdu bridge: `packages/interactive-react/src/bridge.ts`
- p7 acceptance: `docs/p7-acceptance.md`
