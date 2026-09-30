# Implementation Plan — Visual Engine Practice Mode

**Date:** 2026-09-09  
**Spec source:** `docs/superpowers/specs/2026-09-09-visual-engine-practice-mode-spec.md`  
**Target agent:** Cursor agent on **`deepseek-4-flash`** (or equivalent fast model)  
**Branch:** `feat/visual-practice-mode` from current `main` (or from `feat/p8-workstream-a` if merged)  
**Deliverable:** 2 PRs — **PR1** (V0 + V1 interactivity), **PR2** (V2 fraction-circle + V3 fixtures/docs)

---

## Agent briefing (read before coding)

You are implementing **select-only practice mode** for the Visual engine. Follow these rules strictly:

1. **One task at a time.** Finish the task's tests before moving on. Run the verification command at the end of each task.
2. **Test-first.** Add a failing Vitest test, confirm it fails, implement, confirm it passes.
3. **Do not break existing fixtures.** Nine baseline fixtures under `packages/visual-engine/fixture/` must remain byte-stable unless the task explicitly says to add a new fixture slug. Never add `interactive: true` to existing `input.visual.json` files.
4. **No new npm dependencies.** No D3, no scoring logic, no new D5 actions.
5. **ESM imports use `.js` extensions** on relative paths (`import x from './foo.js'`).
6. **Use shared error codes** from `@knowledgeassemble/interactive-engine` (`INVALID_SPEC`, `INVALID_ENTITY`, `INVALID_REFERENCE`).
7. **Commit after each phase** with messages like `Visual practice V1-1: discovery interactivity for number-line`.

### Critical naming traps

| Name | What it is | What it is NOT |
|------|------------|----------------|
| `fraction-circle` | **New** `content.kind` for sector wedges | The comparison component |
| `fraction-circle.ts` | Existing file implementing **`fraction-comparison`** | Do not delete or repurpose |
| `fraction-circle-sectors.ts` | **New file** for `fraction-circle` kind | — |
| Scene kind `wedge` | New leaf for sector arcs | Not `fraction-circle` (that kind is used by comparison partial fills) |
| `hex-shape` | Geometry shape node id (`{parentId}-shape`) | Not `hex` (that is the component wrapper id) |

### Repo commands (from workspace root)

```bash
pnpm typecheck
pnpm lint
pnpm -w test
pnpm playwright

# Visual package only
pnpm --filter @knowledgeassemble/visual-engine test

# Regenerate visual goldens (after `tsc` build)
pnpm --filter @knowledgeassemble/visual-engine build
node packages/visual-engine/scripts/regen-fixtures.mjs

# Refresh playground catalog
pnpm build:fixtures
```

---

## Current state (verified baseline)

| Area | State |
|------|-------|
| `VISUAL_KINDS` | 9 kinds — no `fraction-circle` |
| Guided interactivity | `number-line`, `counting-set`, `fraction` gate on `highlight*` |
| Read-only in practice | `clock`, `coordinate-grid`, `geometry` (no interactive nodes) |
| Already interactive | `comparison`, `fraction-comparison`, `illustration` |
| Dead props | `majorStep`, `rangeHighlight` (number-line); `orientation` (fraction); `size` (geometry) |
| L2 validation | `packages/visual-engine/src/validation/semantic.ts` — minimal per-kind rules |
| Events | `visual.{sceneNodeId}-selected` with payload `{ selection }` — see `instance.test.ts` |
| Fixtures | 9 slugs; `fixture.test.ts` asserts all nine kinds covered |

---

## Shared implementation pattern

Every component that gains discovery mode follows this logic in `create()`:

```typescript
const discovery = (props.interactive as boolean | undefined) ?? false;

// For each candidate node:
const isHighlighted = /* highlight prop check */;
const isSelectable = discovery ? /* all candidates rule */ : isHighlighted;

// Apply to scene node:
...(isSelectable ? { interactive: true, acceptsActions: ['select', 'focus'] as const } : {}),
```

**Visual emphasis (optional):** When `discovery === true`, keep using `highlight*` / `highlightedParts` only in `metadata` (e.g. `metadata: { emphasized: true }`) for future styling. v1 may omit distinct SVG styling if tests only assert `interactive` flags — do not block on CSS.

---

## PR split

| PR | Phases | Review focus |
|----|--------|--------------|
| **PR1** | V0 + V1 | Schema, dead props, `interactive` on 3 kinds + clock/grid/geometry |
| **PR2** | V2 + V3 | New `fraction-circle` kind, practice fixtures, skill doc delta |

---

## Phase V0 — Schema and governance

**Exit gate:** `pnpm typecheck && pnpm lint && pnpm --filter @knowledgeassemble/visual-engine test` green. No behavior change to existing fixtures yet (schema-only + doc).

### Task V0-1 — PLAN.md changelog

**Files:** `docs/PLAN.md`

Add to §11 (Visual engine changelog):

```text
- Visual-D10: add `fraction-circle` kind (sector fractions) + practice-mode discovery/guided interactivity (`interactive` prop) across Visual kinds — see practice-mode spec.
```

Add one line to the main status/changelog section referencing practice-mode workstream.

**Verify:** `git diff docs/PLAN.md` shows only doc lines.

---

### Task V0-2 — Add `fraction-circle` to schema (enum only)

**Files:**
- `packages/visual-engine/src/schema.ts` — add `'fraction-circle'` after `'fraction'` in `VISUAL_KINDS`
- `packages/visual-engine/src/schemas/visual-spec.schema.json` — add to `kind` enum
- `packages/interactive-engine/test/schema-parity.test.ts` — update if it asserts kind count/list

**Test first** (`packages/visual-engine/test/schema-parity.test.ts` or new test):

```typescript
it('includes fraction-circle in VISUAL_KINDS', () => {
  expect(VISUAL_KINDS).toContain('fraction-circle');
});
```

**Do NOT** register the component in `build.ts` yet — validation will accept the kind string but instantiate will fail until V2. That is OK for V0 if tests don't instantiate `fraction-circle` specs.

**Verify:** parity test green.

---

### Task V0-3 — Remove dead props

**Files:**

| File | Change |
|------|--------|
| `packages/visual-engine/src/components/number-line.ts` | Remove `majorStep`, `rangeHighlight` from `NumberLineProps` interface |
| `packages/visual-engine/src/components/fraction-bar.ts` | Remove `orientation` from `FractionBarProps` |
| `packages/visual-engine/src/components/geometry-shape.ts` | Remove `size` from `GeometryShapeProps` |
| `packages/visual-engine/src/schemas/visual-spec.schema.json` | Remove dead keys from component `$defs` if present |

**Test:** Existing `components.test.ts` and `fixture.test.ts` must still pass unchanged.

**Verify:** `pnpm --filter @knowledgeassemble/visual-engine test`

---

### Task V0-4 — Engine spec delta

**Files:** `docs/engines/visual/SPEC.md`

Add a short § (or appendix) documenting:
- Discovery vs guided (copy table from practice-mode spec §3.2)
- `interactive` prop semantics (§3.4)
- Scene node id conventions (`{id}-shape`, `{id}-marker-{v}`, etc.)

Keep it under 40 lines — link to full spec for examples.

**Commit PR1 prep:** `Visual practice V0: schema governance and dead prop removal`

---

## Phase V1 — Interactivity behavior

**Exit gate:** Full repo gate green. New unit tests for discovery/guided pairs. New practice fixtures for clock, coordinate-grid, geometry. **Existing 9 fixture goldens byte-stable.**

### Task V1-0 — Add practice interactivity test module

**New file:** `packages/visual-engine/test/practice-interactivity.test.ts`

This file holds all V1 discovery/guided tests. Import `create*` functions directly (same pattern as `components.test.ts`).

Shared assertion helpers (inline in file, not exported):

```typescript
function interactiveIds(nodes: SceneNode[]): string[] {
  return nodes.flatMap(collectInteractive).sort();
}
function collectInteractive(n: SceneNode): string[] {
  const self = n.interactive ? [n.id] : [];
  return [...self, ...n.children.flatMap(collectInteractive)];
}
```

---

### Task V1-1 — `number-line` discovery mode

**File:** `packages/visual-engine/src/components/number-line.ts`

**Test first** (`practice-interactivity.test.ts`):

```typescript
describe('number-line practice', () => {
  it('guided: only highlight markers are interactive', () => {
    const nodes = createNumberLine({ min: 0, max: 3, step: 1, highlight: [2] }, 'nl');
    expect(interactiveIds(nodes)).toEqual(['nl-marker-2']);
  });

  it('discovery: all step markers interactive when interactive true', () => {
    const nodes = createNumberLine(
      { min: 0, max: 3, step: 1, interactive: true, highlight: [2] },
      'nl',
    );
    expect(interactiveIds(nodes)).toEqual([
      'nl-marker-0', 'nl-marker-1', 'nl-marker-2', 'nl-marker-3',
    ]);
  });
});
```

**Implementation steps:**

1. Read `interactive` from props.
2. When `interactive === true`: for each `v` from `min` to `max` step `step`, emit `{parentId}-marker-{v}` with `interactive: true` (even if not in `highlight`).
3. When `interactive === false`: keep current behavior (markers only for `highlight` values).
4. Avoid duplicate marker ids if both paths would create the same marker — use one loop.

**Instance test** (optional, `instance.test.ts`):

```typescript
it('discovery number-line emits select for any marker', () => {
  // spec with interactive: true, dispatch select nl-marker-3, expect visual.nl-marker-3-selected
});
```

**Verify:** `pnpm --filter @knowledgeassemble/visual-engine test practice-interactivity`

---

### Task V1-2 — `counting-set` discovery mode

**File:** `packages/visual-engine/src/components/counting-set.ts`

**Tests:**

```typescript
it('guided: only highlighted objects interactive', () => {
  const nodes = createCountingSet({ count: 5, object: 'star', arrangement: 'row', highlight: [1, 3] }, 'cs');
  expect(interactiveIds(nodes)).toEqual(['cs-object-1', 'cs-object-3']);
});

it('discovery: all objects interactive', () => {
  const nodes = createCountingSet({ count: 5, object: 'star', arrangement: 'row', interactive: true }, 'cs');
  expect(interactiveIds(nodes)).toEqual([
    'cs-object-0', 'cs-object-1', 'cs-object-2', 'cs-object-3', 'cs-object-4',
  ]);
});
```

**Implementation:** `isSelectable = discovery || isHighlighted`.

---

### Task V1-3 — `fraction` bar discovery mode

**File:** `packages/visual-engine/src/components/fraction-bar.ts`

**Tests:**

```typescript
it('guided: only highlightedParts interactive', () => {
  const nodes = createFractionBar({ numerator: 3, denominator: 4, highlightedParts: [0, 2] }, 'fb');
  expect(interactiveIds(nodes)).toEqual(['fb-part-0', 'fb-part-2']);
});

it('discovery: all parts interactive', () => {
  const nodes = createFractionBar(
    { numerator: 3, denominator: 4, interactive: true, highlightedParts: [0, 2] },
    'fb',
  );
  expect(interactiveIds(nodes)).toEqual(['fb-part-0', 'fb-part-1', 'fb-part-2', 'fb-part-3']);
});
```

**Implementation:** Same `discovery || isHighlighted` on each part in `barChildren`.

---

### Task V1-4 — `clock` + `highlightHand`

**File:** `packages/visual-engine/src/components/clock.ts`

**Extend `ClockProps`:**

```typescript
highlightHand?: 'hour' | 'minute' | 'both';
interactive?: boolean;
```

**Interactivity rules:**

| Mode | Condition | Interactive nodes |
|------|-----------|-------------------|
| Guided | `highlightHand` set, `interactive` false | `hour` → `ck-hour-hand`; `minute` → `ck-minute-hand`; `both` → both hands |
| Discovery | `interactive: true` | All rendered hands (`ck-hour-hand`, `ck-minute-hand` if `showHands`) |
| None | neither | no interactive hands |

Face (`ck-face`) and numbers (`ck-number-*`) stay inert.

**Tests:**

```typescript
it('guided: highlightHand hour only', () => {
  const nodes = createClock({ hour: 3, minute: 30, highlightHand: 'hour' }, 'ck');
  expect(interactiveIds(nodes)).toEqual(['ck-hour-hand']);
});

it('discovery: both hands interactive', () => {
  const nodes = createClock({ hour: 3, minute: 30, interactive: true, highlightHand: 'hour' }, 'ck');
  expect(interactiveIds(nodes)).toEqual(['ck-hour-hand', 'ck-minute-hand']);
});

it('rejects invalid highlightHand', () => {
  expect(() => createClock({ hour: 3, minute: 0, highlightHand: 'second' }, 'ck')).toThrow(EngineError);
});
```

**L2** (`validation/semantic.ts`): add clock component prop checks when `content.kind === 'clock'` — scan `content.components` for `highlightHand` enum.

**Fixture:** Create `packages/visual-engine/fixture/clock-practice/input.visual.json`:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "clock-practice-hour-hand",
  "purpose": {
    "learningObjective": "Identify the hour hand",
    "interactionGoal": "Select the hour hand",
    "reasoningMode": "identify"
  },
  "content": {
    "kind": "clock",
    "components": [{
      "id": "ck",
      "type": "clock",
      "props": { "hour": 3, "minute": 30, "highlightHand": "hour" }
    }]
  },
  "accessibility": {
    "label": "Clock showing 3:30",
    "description": "Select the hour hand."
  },
  "interaction": { "mode": "identify", "actions": ["select", "focus", "reset"] }
}
```

Run regen for **only** `clock-practice` (add dir first) or full regen — update `fixture.test.ts` kind list to include `clock-practice` OR keep separate test file `practice-fixtures.test.ts` that only checks new slugs.

**Preferred:** Add `practice-fixtures.test.ts` that validates new slugs without changing the "nine frozen kinds" test (that test stays about baseline kinds).

**Verify:** dispatch `select` on `ck-hour-hand` → event `visual.ck-hour-hand-selected`.

---

### Task V1-5 — `coordinate-grid` + `highlightPoints`

**File:** `packages/visual-engine/src/components/coordinate-grid.ts`

**Extend props:**

```typescript
highlightPoints?: string[];
interactive?: boolean;
```

**Rules:**

- Point id: `{parentId}-point-{pointId}` (already uses `pt.id ?? String(i)` — when interactive/highlightPoints, require `pt.id`).
- Guided: only points whose `id` is in `highlightPoints`.
- Discovery: all points with `id` interactive.
- Throw `EngineError('INVALID_SPEC', ...)` at create time if `interactive` or non-empty `highlightPoints` and any point lacks `id`.

**Tests:** guided single point; discovery all three; missing id throws.

**L2** (`semantic.ts`):
- `highlightPoints` refs must exist in `points[].id`
- points must have `id` when `interactive` or `highlightPoints` length > 0

**Fixture:** `fixture/coordinate-grid-practice/input.visual.json` — discovery spec with 3 id'd points (copy from practice-mode spec §4.7).

**Instance test:** `visual.cg-point-target-selected` on dispatch.

---

### Task V1-6 — `geometry` highlight props

**File:** `packages/visual-engine/src/components/geometry-shape.ts`

**Extend props:**

```typescript
highlight?: boolean;
highlightVertices?: boolean;
highlightSides?: boolean;
interactive?: boolean;
```

**Validation at create (throw EngineError):**
- At most one of `highlight`, `highlightVertices`, `highlightSides` true
- `highlightVertices` requires `showVertices: true`

**Interactivity:**

| Flag | Guided target | Discovery (`interactive: true`) |
|------|---------------|--------------------------------|
| `highlight` | `{parentId}-shape` | `{parentId}-shape` |
| `highlightVertices` | each `{parentId}-vertex-{i}` | all vertices |
| `highlightSides` | each `{parentId}-side-{i}` | all sides |

Note: vertex/side ids use `shapeGroupId` (`hex-shape-vertex-0`), not `hex-vertex-0`. **OpenEdu events use actual scene ids** — document in fixture:

- Component id: `hex`
- Shape node: `hex-shape`
- Vertex: `hex-shape-vertex-0`

**Tests:**

```typescript
it('guided: highlight whole shape', () => {
  const nodes = geometryShapeComponent.create({ shape: 'hexagon', highlight: true }, 'hex');
  expect(interactiveIds(nodes)).toEqual(['hex-shape']);
});

it('discovery: multi-shape all highlighted shapes selectable', () => {
  // three components — test via buildScene in scene.test.ts if easier
});
```

**L2** in `semantic.ts` for geometry flags.

**Fixture:** `fixture/geometry-practice/input.visual.json` — three geometry components (triangle, hexagon, square), each `{ "interactive": true, "highlight": true }`.

**Verify:** `visual.hex-shape-selected` on dispatch.

---

### Task V1-7 — Validation tests

**File:** `packages/visual-engine/test/validation.test.ts`

Add cases for each new L2 rule (invalid `highlightHand`, bad `highlightPoints` ref, geometry flag conflicts, coordinate-grid missing ids).

**PR1 final gate:**

```bash
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

**Commit:** `Visual practice V1: discovery/guided interactivity for clock, grid, geometry, nl, cs, fraction`

Open **PR1** with body referencing practice-mode spec §3–§4.

---

## Phase V2 — `fraction-circle` kind

**Exit gate:** New kind registered, layout + wedge render, golden fixture, e2e optional.

### Task V2-1 — Component `fraction-circle-sectors.ts`

**New file:** `packages/visual-engine/src/components/fraction-circle-sectors.ts`

Mirror `fraction-bar.ts` structure:

```typescript
export interface FractionCircleSectorsProps {
  numerator: number;
  denominator: number;
  highlightedParts?: number[];
  showFraction?: boolean;
  allowImproper?: boolean;
  interactive?: boolean;
}

export function createFractionCircleSectors(props: Record<string, unknown>, parentId: string): SceneNode[] {
  // Same validation as fraction-bar (denominator, numerator, allowImproper)
  // Root group: id parentId, kind 'fraction-circle', role 'group'
  // Children: parentId-sector-{i}, kind 'wedge', role 'fraction-part', value: i
  // Label: parentId-label if showFraction !== false
  // interactivity: discovery ? all sectors : highlightedParts only
}

export const fractionCircleSectorsComponent = {
  kind: 'fraction-circle' as const,
  create(props, parentId) { return createFractionCircleSectors(props, parentId); },
};
```

**Register** in `packages/visual-engine/src/scene/build.ts`:

```typescript
import { fractionCircleSectorsComponent } from '../components/fraction-circle-sectors.js';
registry.register(fractionCircleSectorsComponent);
```

**Test first** (`components.test.ts` or `practice-interactivity.test.ts`):

```typescript
it('creates denominator sectors', () => {
  const nodes = createFractionCircleSectors({ numerator: 3, denominator: 4 }, 'fc');
  const sectors = nodes.flatMap(n => n.children).filter(c => c.kind === 'wedge');
  expect(sectors).toHaveLength(4);
  expect(sectors.map(s => s.id)).toEqual(['fc-sector-0', 'fc-sector-1', 'fc-sector-2', 'fc-sector-3']);
});
```

---

### Task V2-2 — Layout `layoutFractionCircle`

**File:** `packages/visual-engine/src/layout/engine.ts`

1. Add `case 'fraction-circle':` in the `layout()` switch (on the **component group** node — same pattern as `fraction`; the group's `kind` is `fraction-circle` from `buildScene`).

   **Note:** `buildScene` sets component wrapper `kind: comp.type`. Children include the sector group or sectors directly — match `layoutFraction` pattern: find sector children, place on circle.

2. Implement `layoutFractionCircle(node, ctx)`:
   - Center `(cx, cy)` = canvas center
   - Radius `r` = `min(width, height) * 0.35`
   - For sector `i` of `n`: angular span `360/n`, start angle `-90 + i * span`
   - Set each wedge `bounds` to a square enclosing the sector (use `rect(cx - r, cy - r, 2*r, 2*r)` for all wedges OR tighter per-sector bounds)
   - Store `metadata: { startAngle, endAngle, cx, cy, r }` on each wedge for render

**Test** (`layout.test.ts`):

```typescript
it('fraction-circle assigns bounds to all sectors', () => {
  // buildScene + layout, assert every wedge has bounds
});
```

---

### Task V2-3 — Render `wedge` kind

**File:** `packages/visual-engine/src/render/svg.ts`

Add `case 'wedge':` **before** `case 'fraction-circle':` (comparison partial fill).

Wedge path from node `metadata` angles:

```typescript
case 'wedge': {
  const { cx, cy, r, startAngle, endAngle } = node.metadata ?? {};
  // Convert degrees to radians; SVG arc from startAngle to endAngle
  // d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
  // Fill: emphasized if metadata.emphasized or interactive
}
```

**Test** (`render-svg.test.ts`):

```typescript
it('renders wedge as path', () => {
  // minimal scene node with wedge kind → SVG contains '<path'
});
```

Do **not** change `case 'fraction-circle':` (comparison item circles).

---

### Task V2-4 — L2 validation for fraction-circle

**File:** `packages/visual-engine/src/validation/semantic.ts`

When `kind === 'fraction-circle'`, validate each component's props (denominator >= 2, highlightedParts indices, numerator rules). Mirror fraction-bar messages with `fraction-circle:` prefix.

**Test:** `validation.test.ts` invalid denominator.

---

### Task V2-5 — Golden fixture

**Directory:** `packages/visual-engine/fixture/fraction-circle/`

`input.visual.json`:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "fraction-circle-practice",
  "purpose": {
    "learningObjective": "Identify three quarters on a circle",
    "interactionGoal": "Select three of four sectors",
    "reasoningMode": "identify"
  },
  "content": {
    "kind": "fraction-circle",
    "components": [{
      "id": "fc",
      "type": "fraction-circle",
      "props": {
        "numerator": 3,
        "denominator": 4,
        "interactive": true,
        "highlightedParts": [0, 1, 2]
      }
    }]
  },
  "accessibility": {
    "label": "Circle divided into four equal parts",
    "description": "Select three sectors that show three quarters."
  },
  "interaction": { "mode": "identify", "actions": ["select", "focus", "deselect", "reset"] }
}
```

**Regen:**

```bash
pnpm --filter @knowledgeassemble/visual-engine build
node packages/visual-engine/scripts/regen-fixtures.mjs
```

Review `expected.svg` — must show 4 wedge paths, not empty `<g>`.

**Update** `fixture.test.ts` "covers all nine frozen kinds" — **keep that test as-is** (nine baseline). Add separate test:

```typescript
it('fraction-circle practice fixture validates and renders wedges', () => { ... });
```

---

## Phase V3 — Fixtures, catalog, docs

### Task V3-1 — Remaining practice fixtures

Create if not done in V1:

| Slug | File | Notes |
|------|------|-------|
| `number-line-practice` | `fixture/number-line-practice/input.visual.json` | `interactive: true`, highlight [7] |
| `clock-practice` | (V1-4) | guided |
| `coordinate-grid-practice` | (V1-5) | discovery |
| `geometry-practice` | (V1-6) | multi-shape discovery |
| `fraction-circle` | (V2-5) | discovery |

**New test file:** `packages/visual-engine/test/practice-fixtures.test.ts`

For each practice slug:
1. `engine.validate(spec).valid === true`
2. Snapshot scene has ≥1 `interactive` node
3. Golden SVG byte-stable
4. For discovery fixtures: count interactive nodes > 1

**Regen goldens** only for new directories.

---

### Task V3-2 — Playground catalog

```bash
pnpm build:fixtures
```

Confirm `packages/dev-harness/generated/catalog.generated.ts` lists new fixture slugs.

Manual check (human or browser MCP): `pnpm playground` → open each `*-practice` fixture → click distractor node → event fires.

---

### Task V3-3 — Agent skill update

**File:** `docs/engines/visual/skills/educational-visual/SKILL.md`

Add:
1. Row for `fraction-circle` in kinds table
2. § "Practice mode" — discovery (`interactive: true`) vs guided (`highlight*` only)
3. One discovery example (number-line) and one guided example (clock)
4. Event id convention: `visual.{sceneNodeId}-selected`

---

### Task V3-4 — COMPONENTS.md delta (optional, 20 lines)

**File:** `docs/engines/visual/COMPONENTS.md`

Document new props per kind if that file lists props per component.

---

**PR2 final gate:**

```bash
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```

**Commit:** `Visual practice V2-V3: fraction-circle kind and practice fixtures`

Open **PR2**.

---

## Task checklist (agent copy-paste)

```
[ ] V0-1 PLAN.md
[ ] V0-2 fraction-circle in VISUAL_KINDS + schema enum
[ ] V0-3 Remove dead props
[ ] V0-4 SPEC.md delta
[ ] V1-0 practice-interactivity.test.ts scaffold
[ ] V1-1 number-line interactive
[ ] V1-2 counting-set interactive
[ ] V1-3 fraction bar interactive
[ ] V1-4 clock highlightHand + fixture
[ ] V1-5 coordinate-grid highlightPoints + fixture
[ ] V1-6 geometry highlight* + fixture
[ ] V1-7 validation.test.ts cases
[ ] PR1 gate green
[ ] V2-1 fraction-circle-sectors component
[ ] V2-2 layoutFractionCircle
[ ] V2-3 wedge SVG render
[ ] V2-4 L2 validation
[ ] V2-5 fraction-circle fixture
[ ] V3-1 practice-fixtures.test.ts
[ ] V3-2 build:fixtures
[ ] V3-3 educational-visual SKILL.md
[ ] PR2 gate green
```

---

## Explicit non-goals

- Wire `content.selectable` in `buildScene`
- Engine-side scoring or reading `questions[].targets`
- Construct/drag interactions
- New D5 actions
- Rename `fraction-circle.ts` (comparison file)
- Change event payload shape
- Add npm dependencies
- Modify diagram/chart/other engines

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `fixture.test.ts` fails on golden bytes | Regen changed baseline fixture | Never add `interactive: true` to baseline `input.visual.json`; regen only new slugs |
| Duplicate marker ids on number-line | Both highlight loop and discovery loop create same id | Single loop: create marker for every step when discovery; subset when guided |
| `unknown component type "fraction-circle"` | Not registered in `build.ts` | V2-1 register component |
| Wedge renders as empty `<g>` | Missing `case 'wedge'` in svg.ts | V2-3 |
| Geometry event `visual.hex-selected` not fired | Wrong target id | Dispatch `hex-shape`, not `hex` |
| Comparison tests fail | Touched `fraction-circle.ts` | That file is **fraction-comparison** only |
| `pnpm regen-fixtures` fails | Package not built | Run `pnpm --filter @knowledgeassemble/visual-engine build` first |
| Playwright fails | Unrelated engine | Run `pnpm --filter @knowledgeassemble/visual-engine test` first to isolate |

---

## Success criteria (from spec §10)

1. Every kind has discovery and/or guided configuration with documented scene node ids.
2. `fraction-circle` renders wedge SVG and emits select events.
3. Dead props removed; schema parity green.
4. L2 rules enforced with shared error codes.
5. Practice fixture per newly interactive kind (`clock`, `coordinate-grid`, `geometry`, `fraction-circle`) + optional `number-line-practice`.
6. **Regression:** original 9 fixture `input.visual.json` files unchanged; their goldens byte-stable.
7. Full gate green.

---

## References

- Practice-mode spec: `docs/superpowers/specs/2026-09-09-visual-engine-practice-mode-spec.md`
- Visual architecture: `docs/engines/visual/ARCHITECTURE.md`
- AGENTS.md invariants (D5, D7, D9, P4, P11)
- Example instance/event test: `packages/visual-engine/test/instance.test.ts`
- Example component tests: `packages/visual-engine/test/components.test.ts`
