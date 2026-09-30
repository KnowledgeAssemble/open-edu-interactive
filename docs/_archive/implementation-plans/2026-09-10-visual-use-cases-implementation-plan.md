# Implementation Plan — Visual Engine Use Cases

**Date:** 2026-09-10  
**Spec source:** `docs/use-cases/visual.md` (canonical UX)  
**Contract reference:** `docs/superpowers/specs/2026-09-09-visual-engine-practice-mode-spec.md` (events, discovery/guided mechanics — update §4.1 when this plan changes number-line behavior)  
**Target agent:** Cursor agent on **`deepseek-4-flash`** (or equivalent fast model)  
**Branch:** `feat/visual-use-cases` from current `main` (or continue `feat/visual-practice-mode` if open)  
**Deliverable:** 3 PRs — **PR1** (U1 number-line UX), **PR2** (U2 coordinate-grid + docs), **PR3** (U3 planned fixtures, optional)

---

## Agent briefing (read before coding)

You are implementing **learner-facing use cases** from the catalog. Each task maps to a use-case ID (e.g. `nl-identify-marked`). Follow these rules:

1. **One task at a time.** Finish tests before the next task. Run the verification command at the end of each task.
2. **Test-first.** Add a failing Vitest test, confirm it fails, implement, confirm it passes.
3. **Do not break baseline fixtures.** The nine slugs in `fixture.test.ts` `BASELINE_KINDS` must keep `input.visual.json` byte-stable unless a task explicitly updates a baseline golden with reviewed justification (U1 does **not** change baseline `number-line` input).
4. **Acceptance beats prop matrices.** If a test passes but the SVG still shows 11 filled circles on a number line, the task is **not** done — read the use-case **Acceptance** row in `docs/use-cases/visual.md`.
5. **No new npm dependencies.** No scoring in engine (D7). No new D5 actions in U1–U2.
6. **ESM imports use `.js` extensions** on relative paths.
7. **Commit after each phase** with messages like `Visual UC U1-2: number-line discovery uses label targets`.

### Use-case status (do not re-implement `done`)

| Status | Use cases | Agent action |
|--------|-----------|--------------|
| `done` | `nl-locate-guided`, `cs-count-highlighted`, `fr-identify-shaded`, `fc-identify-sectors`, `fx-which-larger`, `ck-read-hour-hand`, `cg-read-coordinates`, `geo-identify-side`, `cmp-which-taller`, `ill-explore-labels` | Verify only; no code unless regression |
| `ux-debt` | `nl-identify-marked`, `cg-plot-point` | **PR1–PR2** |
| `planned` | `nl-compare-distance`, `cs-pick-n`, `fr-shade-n`, `ck-which-hand`, `geo-identify-vertex` | **PR3** (optional batch) |
| `widget-preferred` | `nl-place-value`, `ck-set-time` | **Do not implement** — document only |

### Repo commands (workspace root)

```bash
pnpm typecheck
pnpm lint
pnpm -w test
pnpm playwright

pnpm --filter @knowledgeassemble/visual-engine test
pnpm --filter @knowledgeassemble/visual-engine build
node packages/visual-engine/scripts/regen-fixtures.mjs
pnpm build:fixtures
```

Regen a single fixture slug:

```bash
node packages/visual-engine/scripts/regen-fixtures.mjs number-line-identify-marked
```

(If the script only supports full regen, regen all **new/changed** fixture dirs and commit only those goldens.)

---

## PR split

| PR | Phases | Review focus |
|----|--------|--------------|
| **PR1** | U0 + U1 | Number-line discovery UX; retire `number-line-practice` |
| **PR2** | U2 + U4 | Coordinate-grid guided fixture; spec/skill/catalog updates |
| **PR3** | U3 | Planned discovery fixtures (only if scheduled) |

---

## Phase U0 — Align docs (no behavior change)

**Exit gate:** `pnpm typecheck && pnpm lint` green.

### Task U0-1 — Link plan in use-cases README

**File:** `docs/use-cases/README.md`

Add under **Supersedes** or new **Implementation** section:

```markdown
**Implementation plan:** `docs/superpowers/specs/2026-09-10-visual-use-cases-implementation-plan.md`
```

### Task U0-2 — PLAN-P8 note

**File:** `docs/PLAN-P8.md` (Workstream A section)

Add one bullet: Visual use-case catalog drives slice honesty; first slice = `nl-identify-marked` + `cg-plot-point`.

**Verify:** `git diff` shows doc-only changes.

**Commit:** `Visual UC U0: link use-case implementation plan`

---

## Phase U1 — `nl-identify-marked` + `nl-locate-guided` polish

**Use cases:** `nl-identify-marked` (primary), `nl-locate-guided` (regression guard)  
**Exit gate:** Full repo gate green. Baseline `number-line` golden byte-stable. `number-line-practice` removed or replaced.

### Problem (current wrong behavior)

`packages/visual-engine/src/components/number-line.ts` discovery mode (`interactive: true`) creates `{id}-marker-{v}` for **every** step. `packages/visual-engine/src/render/svg.ts` fills interactive circles with `currentColor` → **11 black blobs**.

**Target behavior (from catalog):**

| Mode | Selectable nodes | Visual |
|------|------------------|--------|
| **Guided** (`interactive` omitted/false) | `{parentId}-marker-{v}` only for `highlight` values | Single marker at target(s); ticks + labels inert |
| **Discovery** (`interactive: true`) | `{parentId}-label-{v}` (or `{parentId}-tick-{v}` if `showLabels: false`) | Ticks + labels only; **no marker circles**; `highlight` → `metadata.emphasized: true` on label/tick |

Events remain `visual.{sceneNodeId}-selected` (e.g. `visual.nl-label-7-selected` in discovery).

---

### Task U1-1 — Update practice-interactivity tests (test-first)

**File:** `packages/visual-engine/test/practice-interactivity.test.ts`

**Replace** the discovery number-line test:

```typescript
it('discovery: label targets interactive, not marker circles', () => {
  const nodes = createNumberLine(
    { min: 0, max: 3, step: 1, interactive: true, highlight: [2] },
    'nl',
  );
  expect(interactiveIds(nodes)).toEqual([
    'nl-label-0', 'nl-label-1', 'nl-label-2', 'nl-label-3',
  ]);
  const markers = nodes.filter((n) => n.role === 'marker');
  expect(markers).toHaveLength(0);
});

it('discovery: emphasized highlight metadata on labels', () => {
  const nodes = createNumberLine(
    { min: 0, max: 3, step: 1, interactive: true, highlight: [2] },
    'nl',
  );
  const label2 = nodes.find((n) => n.id === 'nl-label-2');
  expect(label2?.metadata?.emphasized).toBe(true);
  const label0 = nodes.find((n) => n.id === 'nl-label-0');
  expect(label0?.metadata?.emphasized).toBeFalsy();
});

it('discovery without labels: tick targets interactive', () => {
  const nodes = createNumberLine(
    { min: 0, max: 2, step: 1, interactive: true, showLabels: false },
    'nl',
  );
  expect(interactiveIds(nodes)).toEqual(['nl-tick-0', 'nl-tick-1', 'nl-tick-2']);
});
```

**Keep** guided test unchanged:

```typescript
it('guided: only highlight markers are interactive', () => {
  const nodes = createNumberLine({ min: 0, max: 3, step: 1, highlight: [2] }, 'nl');
  expect(interactiveIds(nodes)).toEqual(['nl-marker-2']);
});
```

**Verify:** tests fail before implementation.

---

### Task U1-2 — Scene: `number-line.ts`

**File:** `packages/visual-engine/src/components/number-line.ts`

**Implementation:**

1. Split logic by `discovery`:
   - **Guided:** keep existing marker loop (markers only for `highlight` values).
   - **Discovery:** do **not** push marker nodes. For each step `v`:
     - If `showLabels !== false`: set `interactive: true`, `acceptsActions: ['select', 'focus']` on `{parentId}-label-{v}`.
     - Else: same on `{parentId}-tick-{v}`.
2. When `highlightSet?.has(v)` in discovery, set `metadata: { emphasized: true }` on the label/tick node.
3. Ticks stay non-interactive in discovery when labels are shown (labels are the hit target).

**Do not** change axis/tick/label id conventions.

---

### Task U1-3 — Layout: touch targets for interactive labels

**File:** `packages/visual-engine/src/layout/engine.ts` — `layoutNumberLine`

For `role === 'number'` (labels) with `interactive: true`:

- Expand bounds to at least `ctx.minTouchTarget` (same as markers), centered on label position.

---

### Task U1-4 — Render: emphasis + interactive text

**File:** `packages/visual-engine/src/render/svg.ts`

1. **`case 'text'`:** When `node.interactive`, emit `data-oedu-interactive="true"`. Optionally render a transparent `<rect>` under the text using `node.bounds` for hit area (min touch target).
2. **Emphasis:** When `node.metadata?.emphasized === true`, add `font-weight="bold"` on `<text>` or `stroke="currentColor" stroke-width="0.5"` (pick one; stay deterministic).
3. **`case 'circle'` (markers):** Unchanged for guided markers. Discovery should not emit interactive circles — if any slip through, prefer `fill="transparent"` unless `metadata.emphasized`.

**New test** (`packages/visual-engine/test/render-svg.test.ts`):

```typescript
it('discovery number-line SVG has no filled marker circles at every step', () => {
  // Build scene via engine.instantiate or minimal scene with 4 interactive labels, 0 markers
  // expect count of fill="currentColor" on circles === 0 (or only guided marker)
});
```

Prefer testing via `VisualEngine` instantiate on a small discovery spec for realism.

---

### Task U1-5 — Use-case acceptance test module

**New file:** `packages/visual-engine/test/use-cases.test.ts`

```typescript
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VisualEngine } from '../src/engine.js';

const engine = new VisualEngine();
const host = { locale: 'en' as const, tokens: {}, reducedMotion: false, announce: () => {}, onEvent: () => {}, resolveAsset: (id: string) => id };

describe('use case nl-identify-marked', () => {
  it('acceptance: no marker circle per integer in SVG', () => {
    const spec = JSON.parse(readFileSync('packages/visual-engine/fixture/number-line-identify-marked/input.visual.json', 'utf-8'));
    const inst = engine.instantiate(spec, host, 'uc-nl-identify');
    const svg = (inst.snapshot() as { svgResult: { svg: string } }).svgResult.svg;
    const markerCircles = (svg.match(/data-oedu-role="marker"/g) ?? []).length;
    expect(markerCircles).toBe(0);
    const interactiveLabels = (svg.match(/data-oedu-role="number"[^>]*data-oedu-interactive="true"/g) ?? []).length;
    expect(interactiveLabels).toBeGreaterThan(1);
  });
});

describe('use case nl-locate-guided (regression)', () => {
  it('baseline number-line fixture still validates', () => {
    const spec = JSON.parse(readFileSync('packages/visual-engine/fixture/number-line/input.visual.json', 'utf-8'));
    expect(engine.validate(spec).valid).toBe(true);
  });
});
```

Adjust path to use `import.meta.url` relative paths like other tests.

---

### Task U1-6 — Replace fixture `number-line-practice` → `number-line-identify-marked`

1. **Delete** `packages/visual-engine/fixture/number-line-practice/` (entire directory).
2. **Create** `packages/visual-engine/fixture/number-line-identify-marked/input.visual.json`:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-identify-marked",
  "purpose": {
    "learningObjective": "Identify a marked value on a number line",
    "interactionGoal": "Select the number that is emphasized",
    "reasoningMode": "identify"
  },
  "content": {
    "kind": "number-line",
    "components": [{
      "id": "nl",
      "type": "number-line",
      "props": { "min": 0, "max": 10, "step": 1, "interactive": true, "highlight": [7] }
    }]
  },
  "accessibility": {
    "label": "Number line from zero to ten",
    "description": "Select the emphasized number."
  },
  "interaction": { "mode": "identify", "actions": ["select", "focus", "deselect", "reset"] }
}
```

3. **Regen** goldens: `validation.json`, `expected.scene.json`, `expected.svg`, `expected.a11y.json`.
4. **Instance test** (`instance.test.ts`): dispatch `select` on `nl-label-7` → `visual.nl-label-7-selected` (update if still using `nl-marker-7`).

**Verify:** `pnpm --filter @knowledgeassemble/visual-engine test`

---

### Task U1-7 — Update practice-mode spec §4.1

**File:** `docs/superpowers/specs/2026-09-09-visual-engine-practice-mode-spec.md`

Replace discovery candidates line for number-line:

```markdown
**Candidates when `interactive: true`:** For each integer `v` in range, `{parentId}-label-{v}` (or `{parentId}-tick-{v}` when `showLabels: false`) with `interactive: true`. Do **not** emit `{parentId}-marker-{v}` in discovery. `highlight` sets `metadata.emphasized` only.
```

**File:** `docs/engines/visual/SPEC.md` — add 5-line cross-link to use case `nl-identify-marked`.

**PR1 final gate:**

```bash
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

**Commit:** `Visual UC U1: number-line discovery uses label targets (nl-identify-marked)`

---

## Phase U2 — `cg-plot-point` (guided fixture fix)

**Use case:** `cg-plot-point`  
**Problem:** `coordinate-grid-practice` has `interactive: true` (discovery) but catalog says **guided** — only target point selectable.

### Task U2-1 — Fix practice fixture (test-first)

**File:** `packages/visual-engine/fixture/coordinate-grid-practice/input.visual.json`

Change props:

```json
"props": {
  "x": { "min": -5, "max": 5, "step": 1 },
  "y": { "min": -5, "max": 5, "step": 1 },
  "points": [
    { "x": 1, "y": 2, "id": "target" },
    { "x": -3, "y": 4, "id": "distractor-a" },
    { "x": 0, "y": -2, "id": "distractor-b" }
  ],
  "highlightPoints": ["target"]
}
```

Remove `"interactive": true`.

Update `purpose` / `accessibility.description` to guided wording.

**Add test** in `use-cases.test.ts`:

```typescript
describe('use case cg-plot-point', () => {
  it('only highlightPoints are interactive', () => {
    const spec = JSON.parse(readFileSync(...'coordinate-grid-practice/input.visual.json'...));
    const inst = engine.instantiate(spec, host, 'uc-cg-plot');
    const snap = inst.snapshot() as { svgResult: { interactive: Array<{ id: string }> } };
    expect(snap.svgResult.interactive.map((i) => i.id).sort()).toEqual(['cg-point-target']);
  });
});
```

**Regen** `coordinate-grid-practice` goldens.

**Verify:** guided test in `practice-interactivity.test.ts` still passes; discovery tests unchanged.

**Commit:** `Visual UC U2: coordinate-grid-practice guided (cg-plot-point)`

---

## Phase U4 — Catalog, skill, playground (with PR2)

### Task U4-1 — Playground catalog

```bash
pnpm build:fixtures
```

Confirm `number-line-identify-marked` appears; `number-line-practice` removed.

### Task U4-2 — Agent skill

**File:** `docs/engines/visual/skills/educational-visual/SKILL.md`

Add:

1. Link to `docs/use-cases/visual.md`
2. Number-line rule: **never** `interactive: true` with expectation of marker-per-step; discovery = label targets
3. Example JSON for `nl-locate-guided` vs `nl-identify-marked`

### Task U4-3 — `use-cases/visual.md` status update

Mark `nl-identify-marked` and `cg-plot-point` as `done` after PR1–PR2 merge.

**PR2 final gate:** full repo gate green.

---

## Phase U3 — Planned fixtures (optional PR3)

Only implement when explicitly scheduled. One task per use case; same test-first pattern.

| Task | Use case ID | Fixture slug | Spec summary |
|------|-------------|--------------|--------------|
| U3-1 | `nl-compare-distance` | `number-line-compare-distance` | `highlight: [3, 7]`, guided |
| U3-2 | `cs-pick-n` | `counting-set-pick-n` | `interactive: true`, `count: 6` (host checks selection length) |
| U3-3 | `fr-shade-n` | `fraction-shade-n` | `interactive: true`, `denominator: 5` |
| U3-4 | `ck-which-hand` | `clock-discovery-minute` | `interactive: true`, `highlightHand: 'minute'` (style only) |
| U3-5 | `geo-identify-vertex` | `geometry-discovery-vertex` | `interactive: true`, `highlightVertices: true`, `showVertices: true` |

Each task: input.visual.json → regen goldens → row in `use-cases.test.ts` → update catalog status.

**Do not implement** `cs-pick-n` `maxSelection` prop unless product asks — host can enforce count.

---

## Task checklist (agent copy-paste)

```
PR1 — Number line
[ ] U0-1 README link
[ ] U0-2 PLAN-P8 bullet
[ ] U1-1 practice-interactivity tests (discovery labels)
[ ] U1-2 number-line.ts scene
[ ] U1-3 layout touch targets for labels
[ ] U1-4 svg render emphasis + interactive text
[ ] U1-5 use-cases.test.ts
[ ] U1-6 fixture number-line-identify-marked; delete number-line-practice
[ ] U1-7 practice-mode spec §4.1 + SPEC cross-link
[ ] PR1 gate green

PR2 — Grid + docs
[ ] U2-1 coordinate-grid-practice guided fixture + test
[ ] U4-1 build:fixtures
[ ] U4-2 educational-visual SKILL.md
[ ] U4-3 visual.md status updates
[ ] PR2 gate green

PR3 — Optional planned
[ ] U3-1 nl-compare-distance
[ ] U3-2 cs-pick-n
[ ] U3-3 fr-shade-n
[ ] U3-4 ck-which-hand
[ ] U3-5 geo-identify-vertex
```

---

## Explicit non-goals

- `nl-place-value`, `ck-set-time` (construct) — widget-preferred
- Engine-side scoring or `questions[]` wiring
- New D5 actions (U1–U2)
- Changing counting-set / fraction discovery (already correct UX)
- Modifying non-Visual engines
- Playground-only CSS hacks without scene/render fix

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Baseline `number-line` golden fails | Changed guided path | U1 must only change `discovery` branch |
| `use-cases.test.ts` path error | Wrong relative path | Use `new URL('../fixture/...', import.meta.url)` |
| 11 circles still in SVG | Markers still created in discovery | U1-2: skip marker loop when `discovery` |
| Events `nl-marker-7-selected` in discovery | Old target ids | Dispatch `nl-label-7`; update instance test |
| `coordinate-grid-practice` 3 interactive points | `interactive: true` left on | U2-1 remove flag |
| Playwright catalog missing fixture | Catalog not rebuilt | `pnpm build:fixtures` |
| `practice-interactivity` discovery test fails | Expected markers | Update to label ids per U1-1 |

---

## Success criteria

1. **`nl-identify-marked`:** Fixture exists; SVG has no per-integer marker blobs; labels (or ticks) are interactive; emphasis visible on highlight value.
2. **`nl-locate-guided`:** Baseline `number-line` fixture goldens byte-stable.
3. **`cg-plot-point`:** `coordinate-grid-practice` guided only; single interactive point.
4. **`number-line-practice`:** Removed from repo and catalog.
5. Docs: practice-mode spec §4.1, SKILL.md, and catalog statuses updated.
6. Full gate green.

---

## References

- Use-case catalog: `docs/use-cases/visual.md`
- Use-case methodology: `docs/use-cases/README.md`
- Practice-mode contract: `docs/superpowers/specs/2026-09-09-visual-engine-practice-mode-spec.md`
- Number-line component: `packages/visual-engine/src/components/number-line.ts`
- SVG render: `packages/visual-engine/src/render/svg.ts`
- AGENTS.md — D7, P4, P6, P11
