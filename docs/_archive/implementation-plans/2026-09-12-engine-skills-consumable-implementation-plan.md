# Implementation Plan — `@knowledgeassemble/engine-skills`

**Date:** 2026-09-12  
**Design spec:** `docs/superpowers/specs/2026-09-12-engine-skills-consumable-design.md`  
**Branch:** `feat/engine-skills-package`, branched from `main` (not from the current `feat/engine-use-case-catalogs` feature branch)  
**Target model:** deepseek-4-flash (agentic implementation; plan is written as bounded, test-first tasks with explicit file paths and verification commands)

> Execute tasks in order. Each task has a "Done when" gate; do not start the next task until the current gate is green. The final gate is the repo's full exit gate.

---

## 0. Pre-flight (read first)

Read, in this order:
1. `docs/superpowers/specs/2026-09-12-engine-skills-consumable-design.md` — this work implements that design.
2. `docs/DESIGN.md` §8, §13, §15 D6/D7, §16 — non-negotiable invariants.
3. `docs/STRUCTURE.md` §7, §40–41 — packaging and publishing conventions.
4. One existing engine package, e.g. `packages/chart-engine/`, as the package-shape template.

Run once to baseline:
```bash
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright
```
If this is not green, stop and report why.

---

## 1. Scaffold `packages/engine-skills/`

Create the package skeleton mirroring engine conventions.

### Files

- `packages/engine-skills/package.json`
- `packages/engine-skills/tsconfig.json`
- `packages/engine-skills/tsconfig.build.json`
- `packages/engine-skills/vitest.config.ts`
- `packages/engine-skills/README.md`
- `packages/engine-skills/.gitignore` (dist, node_modules)
- `packages/engine-skills/src/index.ts` — **minimal stub now** (an empty module with the first import below already in place is fine). Required so `main`/`types`/`exports` targets exist and `tsc` does not fail with "No inputs were found in config file". The real public surface lands in Task 5.

### `package.json` requirements

```json
{
  "name": "@knowledgeassemble/engine-skills",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["manifest.json", "skills/**", "src", "dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "generate": "node scripts/generate-skills.mjs",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint src test",
    "test": "vitest run",
    "prepublishOnly": "pnpm generate && pnpm build && pnpm typecheck && pnpm lint && pnpm test"
  },
  "dependencies": {
    "@knowledgeassemble/interactive-engine": "workspace:*",
    "ajv": "^8.20.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@knowledgeassemble/chart-engine": "workspace:*",
    "@knowledgeassemble/diagram-engine": "workspace:*",
    "@knowledgeassemble/geomap-engine": "workspace:*",
    "@knowledgeassemble/timeline-engine": "workspace:*",
    "@knowledgeassemble/visual-engine": "workspace:*",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

Notes:
- `dependencies` only what runtime consumers need: core contract, ajv, zod.
- `devDependencies` include all five standalone engine packages + composition host (`interactive-engine`) **only for the tests in Task 7**, which run under vitest where TypeScript imports resolve. The generator (Task 6) must **not** import these packages — see Task 6.
- `files` must ship generated `manifest.json` and `skills/**`; do **not** rely on `src` alone.
- `lint` targets `src test` only. The repo's flat ESLint config (`tseslint.configs.recommended`) has no `.mjs` handling and no `.mjs` is linted in-tree today; `scripts/*.mjs` is exempt by convention and the freshness guard is the gate for generators.

### `tsconfig.json` / `tsconfig.build.json`

Copy from `packages/chart-engine/tsconfig.json` and `tsconfig.build.json`, adjust `rootDir`/`outDir` to `./src` and `./dist`. Preserve strict mode + `noUncheckedIndexedAccess` + `module: "NodeNext"` + `.js` import specifiers.

### `vitest.config.ts`

Copy from `packages/chart-engine/vitest.config.ts`.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills typecheck
```
runs green — with the `src/index.ts` stub in place so the otherwise-empty-src `tsc` invocation succeeds.

---

## 2. Create canonical `skill-example.json` sources for visual and chart

Two engines have inline examples but no file fixture. Extract them and check them in as the in-repo source of truth.

### Files

- `docs/fixtures/visual/skill-example.json`
- `docs/fixtures/chart/skill-example.json`

### Content

From `docs/engines/visual/skills/educational-visual/SKILL.md` lines 167–186, extract the `example-nl` envelope spec into `docs/fixtures/visual/skill-example.json`.

From `docs/engines/chart/skills/quantitative-chart/SKILL.md` lines 16–37, extract the `rainfall-monthly` envelope spec into `docs/fixtures/chart/skill-example.json`.

If either extracted example is missing required envelope fields, add the minimal valid values and record the normalization in the commit message.

### Done when

Both files exist, are valid JSON with no BOM, and parse + re-serialize stably:

```bash
node -e "for (const f of ['docs/fixtures/visual/skill-example.json','docs/fixtures/chart/skill-example.json']) { const s=require('fs').readFileSync(f,'utf8'); JSON.parse(s); console.log(f, 'parses OK'); }"
# expect both files to parse
```

Do **not** try to runtime-validate the fixtures from `node` here: engine packages' dev `exports` map to `src/index.ts`, which plain `node` cannot import, and `readFileSync(…, 'utf8')` returns a string, not a parsed object — `*Engine.validate` would reject it. The runtime round-trip is asserted in Task 7's tests (which run under vitest, where the TypeScript entry points resolve).

---

## 3. Implement `src/manifest.ts`

Types and load helpers for `manifest.json`.

### File

`packages/engine-skills/src/manifest.ts`

### Required exports

```ts
export interface ValidationContract {
  package: string;
  symbol: string;
  method: string;
}

export interface EngineSkillEntry {
  type: string;
  skill: string;
  kinds: string[];
  skillDoc: string;
  schema: string;
  example: string;
  validationContract: ValidationContract;
  namespacedEvents: string[];
}

export interface EngineSkillsManifest {
  package: string;
  version: string;
  schemaVersion: number;
  engines: EngineSkillEntry[];
}

export declare const MANIFEST_PATH: string;
export declare const MANIFEST: EngineSkillsManifest;

export declare function getEngineEntry(type: string): EngineSkillEntry | undefined;
export declare function loadSkillDoc(type: string): string;
export declare function loadSchema(type: string): unknown;
export declare function loadSkillExample(type: string): unknown;
```

Implementation notes:
- `MANIFEST_PATH` resolves to `manifest.json` relative to **package root**, not to the emitting module's directory. Emitting modules always sit exactly one level below the root (`src/` in dev, `dist/` in the installed package), so resolve `../manifest.json` from `import.meta.url`. A naive `import.meta.url`-based lookup from `dist/` would point at a nonexistent `dist/manifest.json`; Task 9's installed-tarball smoke asserts the shipped paths resolve.
- Loaders resolve package-relative paths (`./skills/<type>/schema.json`, etc.) the same way, from package root.
- Use `fs.readFileSync` + `JSON.parse`; return `unknown` for schema/example to keep consumers strict.

### Done when

`pnpm --filter @knowledgeassemble/engine-skills typecheck` is green (the file compiles; tests come later).

---

## 4. Implement `src/validate-example.ts`

Ajv round-trip helper.

### File

`packages/engine-skills/src/validate-example.ts`

### Required exports

```ts
export declare function validateSkillExample(type: string): {
  valid: boolean;
  errors: string[];
};

export declare function validateSpec(type: string, spec: unknown): {
  valid: boolean;
  errors: string[];
};
```

Behavior (shared for both exports):
1. Load `loadSchema(type)` (and for `validateSkillExample`, `loadSkillExample(type)`).
2. Compile schema with Ajv (draft-2020-12, strict mode).
3. Validate the target (`type`'s shipped example, or the `spec` argument).
4. Return `{ valid: true, errors: [] }` or `{ valid: false, errors: [...] }`.

- `validateSkillExample` validates that engine's shipped example — this is the portable smoke every consumer and the installed-package smoke runs.
- `validateSpec` validates an **arbitrary candidate spec**; it is the machine-resolvable validator the composition `validationContract` points to (`method: "composition"`) and a convenience so consumers need not recompile schemas with ajv.

### Done when

`pnpm --filter @knowledgeassemble/engine-skills typecheck` is green.

---

## 5. Implement `src/index.ts`

Public surface.

### File

`packages/engine-skills/src/index.ts`

### Required content

```ts
export { MANIFEST, MANIFEST_PATH } from './manifest.js';
export type {
  EngineSkillsManifest,
  EngineSkillEntry,
  ValidationContract,
} from './manifest.js';
export {
  loadSkillDoc,
  loadSchema,
  loadSkillExample,
  getEngineEntry,
} from './manifest.js';
export { validateSkillExample, validateSpec } from './validate-example.js';
export { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
export type { ActionType } from '@knowledgeassemble/interactive-engine';
```

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills build
pnpm --filter @knowledgeassemble/engine-skills typecheck
```
both green and `dist/index.js` + `dist/index.d.ts` exist.

---

## 6. Implement generator `scripts/generate-skills.mjs`

This is the central build artifact. It produces `manifest.json` and the `skills/<engine>/` directory contents.

### File

`packages/engine-skills/scripts/generate-skills.mjs`

### Inputs (read from repo)

| Engine | SKILL.md source | Schema source | Example source |
|--------|-----------------|---------------|----------------|
| `visual` | `docs/engines/visual/skills/educational-visual/SKILL.md` | compose envelope + `packages/visual-engine/src/schemas/visual-spec.schema.json` | `docs/fixtures/visual/skill-example.json` |
| `chart` | `docs/engines/chart/skills/quantitative-chart/SKILL.md` | `packages/chart-engine/src/schemas/chart-spec.schema.json` | `docs/fixtures/chart/skill-example.json` |
| `geomap` | `docs/engines/geomap/skills/geographic-map/SKILL.md` | `packages/geomap-engine/src/schemas/geomap-spec.schema.json` | `docs/fixtures/geomap/skill-example.json` |
| `timeline` | `docs/engines/timeline/skills/temporal-timeline/SKILL.md` | `packages/timeline-engine/src/schemas/timeline-spec.schema.json` | `docs/fixtures/timeline/skill-example.json` |
| `diagram` | `docs/engines/diagram/skills/structural-diagram/SKILL.md` | `packages/diagram-engine/src/schemas/diagram-spec.schema.json` | `docs/fixtures/diagram/skill-example.json` |
| `composition` | `docs/engines/composition/skills/composition/SKILL.md` | `docs/schemas/composition.schema.json` | `docs/fixtures/composition/skill-example.json` |

Envelope schema source: `packages/interactive-engine/src/schemas/interactive-engine.schema.json`.

Kind sources — **derive from the engine JSON Schema files, never by importing engine packages**:

| Engine | Kind source | Expected |
|--------|-------------|----------|
| `visual` | `kind` enum in `packages/visual-engine/src/schemas/visual-spec.schema.json` `content` block | 10 kinds incl. `fraction-circle` |
| `chart` | `kind` enum in `packages/chart-engine/src/schemas/chart-spec.schema.json` | `['bar', 'line']` |
| `diagram` | `kind` enum in `packages/diagram-engine/src/schemas/diagram-spec.schema.json` | 4 kinds incl. `concept-map` |
| `timeline` | `kind` enum in `packages/timeline-engine/src/schemas/timeline-spec.schema.json` | `['events']` |
| `geomap` | no `content.kind` | `[]` |
| `composition` | no content kinds | `[]` |

Rule: if the engine's schema has a closed `content.kind` enum, populate `kinds` from it; otherwise use `[]`. Do not invent kind values.

> **Critical:** the generator runs under plain `node`. Engine packages' `exports` map to `src/index.ts`, which `node` cannot execute — `import('@knowledgeassemble/visual-engine')` throws at runtime. All inputs are read as JSON/text from the repo paths in the table above. The generator has zero package imports; this is what makes it runnable with `node scripts/generate-skills.mjs` before any build. The tests in Task 7 are the place where engine constants are imported for comparison (vitest resolves the TypeScript entries).

### Outputs (written to `packages/engine-skills/`)

- `manifest.json`
- `skills/<engine>/SKILL.md`
- `skills/<engine>/schema.json`
- `skills/<engine>/skill-example.json`

### Generator rules

1. **SKILL.md rewrite** — replace every in-repo reference with a package-relative one. This exact set covers every reference currently present in the six SKILL.md files (verified):

   - `packages/<engine>/src/schemas/<e>-spec.schema.json` → `./schema.json` (chart, diagram, geomap, timeline)
   - `packages/visual-engine/src/schemas/visual-spec.schema.json` → `./schema.json` (visual; the content-only schema is composed — see rule 2)
   - `packages/interactive-engine/src/schemas/interactive-engine.schema.json` → `./schema.json` (envelope reference in chart, diagram; the full spec schema bundles the envelope)
   - `docs/schemas/<name>.schema.json` → `./schema.json` (composition: lesson schema; embedded-spec reference to the envelope)
   - `docs/fixtures/<engine>/skill-example.json` → `./skill-example.json` (geomap, timeline)
   - `<X>Engine.validate(spec)` (any engine: `ChartEngine`, `VisualEngine`, `DiagramEngine`, `GeoMapEngine`, `TimelineEngine`) → "runtime validation is via the manifest `validationContract` (`./manifest.json` → `engines[].validationContract`): install `package`, import `symbol`, call `method(spec)`"
   - Inline verification blocks such as `pnpm --filter @knowledgeassemble/geomap-engine exec tsx -e "…"` → the same `validationContract` note (they are not runnable by consumers)
   - References to in-repo docs in SKILL primer/header blocks (`docs/use-cases/visual.md`, `docs/superpowers/specs/2026-09-09-visual-engine-practice-mode-spec.md`, `docs/superpowers/specs/2026-09-10-visual-use-cases-implementation-plan.md` and any other `docs/superpowers/specs/…` in `educational-visual`) → remove those list items; the files do not ship.

   Keep the prose verbatim apart from these substitutions.

   **Guard:** after rewriting, fail loudly if any generated `SKILL.md` still contains the substrings `packages/` or `docs/`. If a future edit to an in-repo skill introduces a new in-repo path, the generator error names the file so the rewrite table is extended before the change is committed.

2. **schema.json**:
   - For `chart`, `diagram`, `geomap`, `timeline`: copy the existing full-envelope schema as-is.
   - For `composition`: copy `docs/schemas/composition.schema.json` as-is.
   - For `visual`: produce a self-contained full spec schema by composing the envelope schema with the visual content schema. At minimum: take envelope schema, set `properties.content` to the visual content schema, and add `content` to `required`. Also set `properties.type.const = "visual"` if the envelope does not already constrain it.

3. **skill-example.json**: copy from the fixture source.

4. **manifest.json**: build from `package.json` version and kind constants (schema-derived, per the table above); include `validationContract` per engine (see design spec §3.1):
   - `visual` → `{ package: "@knowledgeassemble/visual-engine", symbol: "VisualEngine", method: "validate" }`
   - `chart` → `{ package: "@knowledgeassemble/chart-engine", symbol: "ChartEngine", method: "validate" }`
   - `diagram` → `{ package: "@knowledgeassemble/diagram-engine", symbol: "DiagramEngine", method: "validate" }`
   - `geomap` → `{ package: "@knowledgeassemble/geomap-engine", symbol: "GeoMapEngine", method: "validate" }`
   - `timeline` → `{ package: "@knowledgeassemble/timeline-engine", symbol: "TimelineEngine", method: "validate" }`
   - `composition` → `{ package: "@knowledgeassemble/engine-skills", symbol: "validateSpec", method: "composition" }` — composition has **no** exported single-argument runtime validator (`Lesson.load(input, registry)` is two-argument instantiation), so its contract resolves to this package's portable ajv validator against `schema.json`.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills generate
```
runs green and produces all six `skills/<engine>/` directories plus `manifest.json`.

---

## 7. Add tests

### Files

- `packages/engine-skills/test/manifest.test.ts`
- `packages/engine-skills/test/schema-roundtrip.test.ts`
- `packages/engine-skills/test/full-spec-schema.test.ts`
- `packages/engine-skills/test/portability.test.ts`
- `packages/engine-skills/test/runtime-parity.test.ts`

### `manifest.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { MANIFEST, getEngineEntry } from '../src/manifest.js';
import { VISUAL_KINDS } from '@knowledgeassemble/visual-engine';
import { CHART_KINDS } from '@knowledgeassemble/chart-engine';
import { DIAGRAM_KINDS } from '@knowledgeassemble/diagram-engine';

describe('manifest', () => {
  it('has six engines', () => {
    expect(MANIFEST.engines).toHaveLength(6);
  });

  it('visual kinds match VISUAL_KINDS', () => {
    const entry = getEngineEntry('visual')!;
    expect(entry.kinds.slice().sort()).toEqual([...VISUAL_KINDS].sort());
  });

  it('chart kinds match CHART_KINDS', () => {
    const entry = getEngineEntry('chart')!;
    expect(entry.kinds.slice().sort()).toEqual([...CHART_KINDS].sort());
  });

  it('diagram kinds match DIAGRAM_KINDS', () => {
    const entry = getEngineEntry('diagram')!;
    expect(entry.kinds.slice().sort()).toEqual([...DIAGRAM_KINDS].sort());
  });

  it('timeline kind is [events]', () => {
    const entry = getEngineEntry('timeline')!;
    expect(entry.kinds).toEqual(['events']);
  });

  it('geomap and composition have empty kinds', () => {
    expect(getEngineEntry('geomap')!.kinds).toEqual([]);
    expect(getEngineEntry('composition')!.kinds).toEqual([]);
  });

  it('every entry has a validationContract with package, symbol, method', () => {
    for (const e of MANIFEST.engines) {
      expect(e.validationContract.package).toMatch(/^@knowledgeassemble\//);
      expect(e.validationContract.symbol).toBeTruthy();
      expect(e.validationContract.method).toBeTruthy();
    }
  });

  it('composition validationContract resolves via engine-skills validateSpec', () => {
    const entry = getEngineEntry('composition')!;
    expect(entry.validationContract).toEqual({
      package: '@knowledgeassemble/engine-skills',
      symbol: 'validateSpec',
      method: 'composition',
    });
  });
});
```

### `schema-roundtrip.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { validateSkillExample } from '../src/validate-example.js';
import { loadSkillExample } from '../src/manifest.js';
import { validateEnvelope, type EngineSpec } from '@knowledgeassemble/interactive-engine';

const ENGINES = ['visual', 'chart', 'geomap', 'timeline', 'diagram', 'composition'];

describe('skill-example round-trip', () => {
  for (const type of ENGINES) {
    it(`${type} example validates against its schema`, () => {
      const result = validateSkillExample(type);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});

describe('composition embedded L1 round-trip', () => {
  it('every engines[].spec passes envelope validation', () => {
    const lesson = loadSkillExample('composition') as {
      engines: { spec: unknown }[];
    };
    for (const entry of lesson.engines) {
      const result = validateEnvelope(entry.spec);
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    }
  });
});
```

### `full-spec-schema.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import { loadSchema, loadSkillExample } from '../src/manifest.js';

describe('visual full-spec schema', () => {
  it('validates a full envelope example, not only content', () => {
    const schema = loadSchema('visual') as Record<string, unknown>;
    expect(schema.required).toContain('type');
    expect(schema.required).toContain('version');
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('content');
    const ajv = new Ajv({ strict: true });
    const validate = ajv.compile(schema);
    expect(validate(loadSkillExample('visual'))).toBe(true);
  });
});
```

### `portability.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { MANIFEST, loadSkillDoc } from '../src/manifest.js';

describe('published SKILL.md portability', () => {
  for (const e of MANIFEST.engines) {
    it(`${e.type} SKILL.md contains no in-repo paths`, () => {
      const doc = loadSkillDoc(e.type);
      expect(doc).not.toContain('packages/');
      expect(doc).not.toContain('docs/');
    });
  }
});
```

### `runtime-parity.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import { loadSkillExample } from '../src/manifest.js';

describe('runtime parity for newly extracted fixtures', () => {
  it('visual example passes VisualEngine.validate', () => {
    const example = loadSkillExample('visual');
    const result = VisualEngine.validate(example);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('chart example passes ChartEngine.validate', () => {
    const example = loadSkillExample('chart');
    const result = ChartEngine.validate(example);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
```

Fix the test code above as needed.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills test
```
is green.

---

## 8. Wire generation into build and CI freshness

### Changes

1. Add to root `package.json` scripts (if a root generate script exists) or to the package scripts:
   - `"generate:skills": "pnpm --filter @knowledgeassemble/engine-skills generate"`
   - Ensure `prebuild` or `build` runs `generate` for this package.

2. Add a CI freshness check. Create `scripts/check-engine-skills-fresh.mjs` at repo root that:
   - Runs `pnpm --filter @knowledgeassemble/engine-skills generate` (the generator itself already fails on any generated `SKILL.md` that still contains a `packages/` or `docs/` fragment).
   - Runs `git status --porcelain -- packages/engine-skills/manifest.json packages/engine-skills/skills/` and `git diff --exit-code packages/engine-skills/manifest.json packages/engine-skills/skills/`.
   - Exits non-zero on any output from either command. `--porcelain` (not just `git diff`) is required so that a **newly generated, untracked** file fails the check; `git diff` alone would silently ignore it.

3. Add the freshness check to the full exit gate (see Task 11).

### Done when

```bash
node scripts/check-engine-skills-fresh.mjs
```
returns 0 immediately after a clean generation.

---

## 9. Update installed-package smoke

Extend the existing `scripts/p7-publish-smoke.mjs` to also verify the new package. Build first, because the published tarball contains `dist` (in `files`):

```bash
pnpm --filter @knowledgeassemble/engine-skills build
```

### Changes

Extend the smoke script to:
1. Pack `packages/engine-skills` and install it into the temp consumer.
2. Import `{ MANIFEST, validateSkillExample }` from the installed package.
3. Call `validateSkillExample` for all six engines and assert all are valid.
4. Read `MANIFEST.engines` and assert length === 6.
5. **Assert the shipped paths resolve** — because `dist/` sits one level below the package root, `MANIFEST_PATH`, `loadSchema`, and `loadSkillExample` must resolve `../manifest.json` / `./skills/...` from `import.meta.url` and read the **installed** tarball files, not the workspace sources. A failure here means Task 3's resolution logic is wrong and any consumer install would break.

The smoke runs against the installed tarball (the P7 discipline), never against the workspace symlink.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills build
pnpm publish:dry
pnpm publish:smoke
```
all pass, and the smoke exercises the engine-skills tarball specifically.

---

## 10. Add workspace registration

Ensure the new package is part of the pnpm workspace.

### Done when

```bash
pnpm --filter @knowledgeassemble/engine-skills test
pnpm --filter @knowledgeassemble/engine-skills build
pnpm --filter @knowledgeassemble/engine-skills lint
```
all run from repo root without path errors.

---

## 11. Final verification (full exit gate)

Run the repo's full exit gate plus the new freshness check:

```bash
pnpm --filter @knowledgeassemble/engine-skills generate
node scripts/check-engine-skills-fresh.mjs
pnpm typecheck
pnpm lint
pnpm -w test
pnpm playwright
pnpm build
pnpm publish:dry
```

`pnpm build` must precede `publish:dry`: `files` ships `dist`, so a truthful publish dry-run needs the package built first (root `typecheck` only builds `interactive-engine`).

All must be green.

### Done when

- All commands above pass.
- `git status` shows only intended changes: new `packages/engine-skills/`, new `docs/fixtures/visual/skill-example.json`, new `docs/fixtures/chart/skill-example.json`, updated root/package scripts if any.
- No drift in generated `manifest.json` / `skills/<engine>/` files relative to in-repo sources.

---

## 12. Commit and PR

1. Stage intended files.
2. Inspect `git diff` to ensure no unrelated changes.
3. Commit per task/phase (neutral `skills-consumable` prefix — this is an add-on, not a tracked P8 workstream item):
   - `skills-consumable T1: scaffold @knowledgeassemble/engine-skills package`
   - `skills-consumable T2: add visual and chart skill-example fixtures`
   - `skills-consumable T3-5: manifest, validate-example, index public surface`
   - `skills-consumable T6: generate-skills.mjs generator for all six engines`
   - `skills-consumable T7: manifest, schema round-trip, portability, and full-spec schema tests`
   - `skills-consumable T8-9: CI freshness guard and installed-package smoke`
   - `skills-consumable T11: full exit gate green`
4. Open PR: `gh pr create --title "skills-consumable: publishable @knowledgeassemble/engine-skills package"`.
5. Merge with `gh pr merge <n> --merge --delete-branch` after review.

---

## Agent notes

- Do **not** modify engine runtime code. If a test fails because an engine schema is missing a property, fix the generator or the example, not the engine.
- Engine-schema drift (a schema file diverges from the engine's zod runtime): fix the schema **file** to match the runtime, then drop any generator workaround (no silent `additionalProperties` relaxing).
- Do **not** add `@open-edu/*` imports anywhere.
- Keep all relative imports with `.js` specifiers (`module: "NodeNext"`).
- No emojis in files or commits.
- If a kind enum is not present in an engine's schema, use `[]` (the schema is the single source of truth for `kinds`). Do not import engine packages in the generator — their dev `exports` point at `src/index.ts`, which plain `node` cannot load.
- If the visual full-spec schema composition proves difficult, spike a minimal merge first (envelope + content required), get the test green, then refine.