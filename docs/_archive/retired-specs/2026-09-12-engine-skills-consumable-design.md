# Engine Skills → OpenEdu-Consumable — Design

**Date:** 2026-09-12
**Status:** Approved design (req. explore + approve)
**Scope:** Make the six engine authoring skills consumable by OpenEdu — both the external `openedu-course-authoring` agent skill and the Studio dev-server companion runtime — via one canonical published artifact.
**Plan home:** new implementation plan; record as Workstream follow-up in `docs/PLAN.md` §11 when scheduled.

> **Normative inputs.** `docs/DESIGN.md` (§8, §13, §15 D6/D7, §16), `docs/STRUCTURE.md` (§7, §40–41), `open-edu ADR-0009` (derivation model, schemaVersion, committed-generated-artifacts discipline), `packages/interactive-engine/src/index.ts` (public surface), each `docs/engines/*/skills/*/SKILL.md`.

---

## 1. Problem

Six agent authoring skills exist in this repo — one per engine — as in-repo Markdown:

| Engine | Skill | Canonical example |
|--------|-------|-------------------|
| `visual` | `educational-visual` | inline in SKILL.md (no `skill-example.json`) |
| `chart` | `quantitative-chart` | inline in SKILL.md (no `skill-example.json`) |
| `geomap` | `geographic-map` | `docs/fixtures/geomap/skill-example.json` |
| `timeline` | `temporal-timeline` | `docs/fixtures/timeline/skill-example.json` |
| `diagram` | `structural-diagram` | `docs/fixtures/diagram/skill-example.json` |
| `composition` | `composition` | `docs/fixtures/composition/skill-example.json` |

They are **not consumable by OpenEdu** today:

1. **Not published.** `@knowledgeassemble/*` packages ship `files: ["src","dist"]` only; the SKILL.md files, examples, and schema JSONs never leave this repo. OpenEdu has no path to load them.
2. **Not discovered.** There is no manifest saying "these skills exist, what each covers, and how to validate against it." OpenEdu cannot enumerate engines/kinds without reading this repo.
3. **Not portable.** Each SKILL.md's validation steps reference in-repo paths (`packages/chart-engine/src/schemas/chart-spec.schema.json`, `ChartEngine.validate`) that fail in any consumer context. Schema JSONs ship inside `src/schemas/` but are **not addressable** — no subpath export — so a consumer hits `ERR_PACKAGE_PATH_NOT_EXPORTED`.
4. **Not versioned as content.** Engine packages version the *code*; the skill guidance and examples version with no explicit relationship to `schemaVersion` of the artifacts they author.

OpenEdu wants to consume them **symmetrically** (ADR-0009: external skill + companion runtime derive from one canonical source). Without a published, portable, manifest-driven artifact, OpenEdu would either re-author the guidance (duplication ADR-0009 exists to kill) or re-render it from this repo's internals (coupling that violates D2 publish-and-consume).

## 2. Goals

| Goal | Detail |
|------|--------|
| One canonical artifact | A published npm package bundling all six skills + per-engine schema + example + machine-readable manifest |
| Portable validation | Skills validate their example via paths that work in any consumer (local `schema.json` + ajv, runtime via manifest `validationContract`) |
| Symmetric consumption | External `openedu-course-authoring` skill AND Studio companion both consume the same artifact, symmetrically with ADR-0009 |
| No second source of truth | The package is the authoritative view for *authoring guidance*; OpenEdu's `domain-guidance` derives structured views from it, never re-declares |
| Engine isolation kept | No `@open-edu/*` import anywhere in this repo (D6/D7); OpenEdu installs the package |
| Deterministic, gated | Manifest content is tested in-repo and in an installed-package smoke; examples round-trip validation |

**Non-goals:** a Studio app (D6); new engine kinds; scoring/hints/assessment logic (D7); changing the frozen kind/enum contracts; forcing OpenEdu's `domain-guidance` implementation (OpenEdu-side item).

## 3. Canonical artifact design

New package **`@knowledgeassemble/engine-skills`** at `packages/engine-skills/`.

```
packages/engine-skills/
  package.json
  manifest.json                # generated/committed catalog (§3.2)
  README.md                    # consumer orientation: discovery, APIs, validation contract
  src/
    index.ts                   # public surface (§3.3)
    manifest.ts                # manifest types + load helpers
    validate-example.ts        # ajv round-trip of skill-example.json against schema.json
  skills/<engine>/
    SKILL.md                   # generated/committed portable rewrite
    schema.json                # generated/committed full spec schema (envelope + content)
    skill-example.json         # generated/committed canonical example fixture
```

- Per-engine skill content is **self-contained** (`SKILL.md` + `schema.json` + `skill-example.json`) so a consumer can load a single engine without walking the repo.
- `package.json` follows engine conventions: ESM (`type: module`), per-file `tsc` emit, `.js` import specifiers, `zod` allowed, no bundler, engine isolation (no `@open-edu/*`).
- `files` must include the generated skill content (`manifest.json`, `skills/**`), compiled code (`dist`), and source (`src`). The package is not publishable if `skills/` or `manifest.json` are omitted.

### 3.1 `manifest.json` (canonical discovery view)

```jsonc
{
  "package": "@knowledgeassemble/engine-skills",
  "version": "0.1.0",
  "schemaVersion": 1,
  "engines": [
    {
      "type": "visual",
      "skill": "educational-visual",
      "kinds": ["number-line", "counting-set", "fraction", "fraction-comparison",
                "clock", "coordinate-grid", "geometry", "comparison",
                "illustration", "fraction-circle"],
      "skillDoc": "./skills/visual/SKILL.md",
      "schema": "./skills/visual/schema.json",
      "example": "./skills/visual/skill-example.json",
      "validationContract": {
        "package": "@knowledgeassemble/visual-engine",
        "symbol": "VisualEngine",
        "method": "validate"
      },
      "namespacedEvents": ["visual.*-selected", "visual.*-focused"]
    }
    // … chart, geomap, timeline, diagram, composition
  ]
}
```

- `manifest.json` is a **generated/committed artifact**. A build script reads `package.json` version and each engine's JSON Schema `content.kind` enum (from `packages/<engine>/src/schemas/<e>-spec.schema.json`, and `docs/schemas/composition.schema.json` for composition) to produce the `engines[]` array. The generator **must not import engine packages**: their dev `exports` map to `src/index.ts`, which plain `node` cannot load. It is checked in so the package remains a stable shipping artifact with no runtime build dependency. CI freshness guard: regeneration produces no diff.
- Field semantics mirror the OpenEdu `widget-catalog-data.json` discovery pattern: agents/companions enumerate `engines[]`, never hardcode engine lists.
- `validationContract` is machine-resolvable: install `package`, import `symbol`, call `method(spec)`. For `composition` — which has no exported single-argument runtime validator (`Lesson.load(input, registry)` is two-argument instantiation) — the contract points to this package's `validateSpec` (ajv against `schema.json`) with `method: "composition"`; `validateSkillExample('composition')` is the example-level equivalent. Consumers may also ajv-compile `skills/composition/schema.json` directly.
- Paths are package-relative (from the installed package root). `index.ts` exposes resolved helpers so consumers do not hardcode path math.

### 3.2 Full-spec schema generation

Each `skills/<engine>/schema.json` is a **generated/committed, self-contained full spec schema** that validates the entire envelope (`type`, `version`, `id`, …) plus engine content.

- For engines whose existing JSON Schema is already full-envelope (`chart`, `diagram`, `geomap`, `timeline`), the generator copies it as-is.
- For `composition` — whose runtime host lives in `@knowledgeassemble/interactive-engine` — `schema.json` is the lesson-level `composition.schema.json`. There is no exported single-argument runtime validator (`Lesson.load(input, registry)` is two-argument instantiation), so the manifest's `validationContract` points to this package's `validateSpec` (ajv against `schema.json`) with `method: "composition"`.
- For `visual` — whose published schema (`visual-spec.schema.json`) describes the `content` block only — the generator composes `interactive-engine.schema.json` (envelope) with the visual content schema and emits a single self-contained `schema.json`.
- The generator is a build script in `packages/engine-skills/scripts/generate-skills.mjs`. It is the single place where envelope + content are combined; consumers see only the resulting full schema.

This closes the gap that would otherwise make `visual` example validation fail against a content-only schema.

### 3.3 Public surface (`src/index.ts`)

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
// Re-export authoritative D5 action enum from the core contract
export { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
export type { ActionType } from '@knowledgeassemble/interactive-engine';
```

- `validateSkillExample(type)` validates that engine's shipped `skill-example.json` against its `schema.json` (ajv).
- `validateSpec(type, spec)` validates an arbitrary candidate spec against that engine's `schema.json` (ajv). It is the portable validator the composition `validationContract` resolves to, and a convenience for consumers that would otherwise recompile schemas with ajv.
- No D5 action enum is re-declared in this package; `ACTION_TYPES` is imported from `@knowledgeassemble/interactive-engine` to avoid drift.

## 4. Portability rewrites (the SKILL.md delta)

Each published SKILL.md's validate/cite steps are rewritten from in-repo paths to **package-relative paths**:

| Today (in-repo) | Published (consumer) |
|------------------|------------------------|
| `packages/<engine>/src/schemas/<e>-spec.schema.json` | `./schema.json` — generated full spec schema (envelope + content), validate with ajv |
| `packages/interactive-engine/src/schemas/interactive-engine.schema.json` (envelope reference in `chart` / `diagram`) | `./schema.json` — the full spec schema already bundles the envelope |
| `docs/schemas/composition.schema.json` | `./schema.json` for `composition` — the full lesson spec |
| `docs/schemas/interactive-engine.schema.json` (embedded-spec reference in `composition`) | a `validateEnvelope(spec)` call from `@knowledgeassemble/interactive-engine` — `./schema.json` is the lesson schema, not the envelope |
| `<X>Engine.validate(spec)` (any engine) | `validationContract` from manifest: install `package`, import `symbol`, call `method(spec)` |
| Inline `pnpm --filter @knowledgeassemble/<engine> exec tsx -e "…"` verification snippets | a portable note pointing at the manifest `validationContract` |
| `docs/fixtures/<engine>/skill-example.json` | `./skill-example.json` |
| Header references to in-repo specs (`docs/use-cases/visual.md`, `docs/superpowers/specs/…`) | removed; those files do not ship |
| Inline full-envelope examples in `educational-visual` / `quantitative-chart` SKILL.md | `./skill-example.json` extracted and checked in |

Rules:
- `skills/<engine>/SKILL.md`, `schema.json`, and `skill-example.json` are **generated/committed artifacts** produced by `scripts/generate-skills.mjs` from the in-repo source. The in-repo docs stay the authoring source; the package copies are the stable shipping view. CI freshness guard: regeneration produces no diff for any of the three files.
- After rewriting, the generator **fails loudly** if any generated `SKILL.md` still contains a `packages/` or `docs/` path fragment. The freshness guard and the test suite assert the same condition, so a new in-repo reference cannot silently leak into a published skill.
- SKILL.md remains **prose-first**; consumers load it into agent context verbatim.
- Every published `skill-example.json` must round-trip ajv against its `schema.json` in the **installed** package (consumers validate with the tarball, not the workspace — mirrors P7 `publish:smoke` discipline).
- `visual` and `chart` get a first canonical `skill-example.json` extracted from their SKILL.md full-envelope examples (`example-nl` in educational-visual; `rainfall-monthly` in quantitative-chart) and checked in — closing the gap that these two currently lack a file fixture. If an extracted example is not yet valid, the generator normalizes it (e.g. adding required envelope fields) and the change is reviewed; the canonical example must round-trip validation exactly like the four existing fixtures.

## 5. Symmetric consumption on the OpenEdu side

### 5.1 External `openedu-course-authoring` skill

- New script `scripts/engine-skill-catalog.mjs` (mirrors `widget-catalog.mjs`, reads `openedu-adapter.mjs`): resolves `node_modules/@knowledgeassemble/engine-skills/manifest.json` from the detected repo, exposes `engines[]`, and loads a chosen engine's `SKILL.md` + `skill-example.json` + `schema.json` into context.
- Repository-adapter discovery gains a capability flag `engineSkillsCatalog: boolean` (like `widgetCatalog`); when false, portable mode instructs the agent to `pnpm add @knowledgeassemble/engine-skills`.
- New `references/interactive-authoring.md` — "when to emit `{type:"interactive", engine, spec}` vs a legacy `widget` activity; load the engine's skill, follow its rules, round-trip against its schema, then hand the spec to the lesson node". Authoring rules stay in the engine skill; the reference only routes to it.

### 5.2 Studio companion (dev-server agent loop)

- The published manifest is read at server start; the dev-server registers one `@open-edu/companion` `CompanionSkill` per engine (or a single `interactive-authoring` skill), translating:
  - `skillDoc` → `instructions` (markdown loaded verbatim),
  - `schema` → draft-validation input (ajv against the full `schema.json`; optional runtime check via `validationContract`),
  - `example` → few-shot exemplar in the prompt layer.
- Registered via the existing `InMemorySkillRegistry` + `createSkillResolver` (`apps/dev-server/src/studio/ai/`); no companion contract change needed.

### 5.3 `@open-edu/domain-guidance` (ADR-0009 block)

- Add an "engine skills" block whose **authoritative owner is `@knowledgeassemble/engine-skills`**. `domain-guidance` derives a structured authoring view (engine→kind matrix, schema refs, validation contract, example refs) from the published `manifest.json`; it never re-declares engine knowledge.
- Prose (SKILL.md) is loaded from the package, not re-derived.
- CI freshness guard: regeneration against the installed `engine-skills` version yields no diff; version pinned to the workspace dependency.

## 6. Testing & gates

| Gate | Where | Assertion |
|------|-------|-----------|
| Example ↔ schema round-trip | `packages/engine-skills/test/` | every `skills/*/skill-example.json` validates ajv against its `schema.json`; composition example additionally round-trips embedded-L1 |
| Full-spec schema generation | `packages/engine-skills/test/` | `skills/visual/schema.json` validates the full envelope (not only the content block); no unresolved `$ref` |
| Manifest ↔ engine enums | `packages/engine-skills/test/` | `manifest.engines[*].kinds` equals the kind constants from each engine package (imported in tests, where TS resolves). The generator derives kinds from the engine JSON Schema, not by importing packages. |
| Published SKILL.md portability | `packages/engine-skills/test/` (also enforced by the generator and freshness guard) | no generated `skills/*/SKILL.md` contains a `packages/` or `docs/` path fragment |
| Skill content freshness | CI script | regenerating `skills/<engine>/SKILL.md`, `schema.json`, and `skill-example.json` from in-repo sources produces no diff, including no new untracked files |
| Installed-package smoke | `scripts/` + `publish:smoke` | a temp consumer installs the tarball, ajv-validates each `skill-example.json` against the **installed** `schema.json`, reads `manifest.json` via exports |
| Cross-repo shared fixtures | OpenEdu (open item) | `openedu-course-authoring`'s `engine-skill-catalog.mjs` and companion resolver run the same manifest fixtures and agree |

Full exit gate (in-repo): `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright`, plus `pnpm publish:dry`.

## 7. Open questions carried to OpenEdu (not in-repo work)

1. Exact measure of `domain-guidance` ingestion (structured view vs. pointer to manifest) — decide in OpenEdu, ADR-0009 sequencing.
2. Whether the Studio companion registers six `CompanionSkill`s or one — OpenEdu product call.
3. How the course spec models interactive activities today vs `{type:"interactive"}` lesson nodes — depends on p7-acceptance item #2 (schema adoption), not on this package.
4. Optional: whether `@knowledgeassemble/engine-skills` should also ship `interactive-lesson-node.schema.json` as a convenience for OpenEdu lesson-node authoring. Out of scope for the first slice.

## 8. Alternatives considered

- **Ship schemas + examples only** (per-engine subpath exports) — prose still duplicated in OpenEdu; rejected.
- **Data-only catalog, no prose** — loses the substance of a skill; rejected as primary.
- **Git submodule / workspace reference** — couples monorepos, violates D2; rejected.
- **Companion-only, no external skill** — misses the broader authoring surface; rejected.