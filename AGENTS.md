# AGENTS.md — OpenEdu Interactive Engine

Guidance for AI coding agents working in this repository.

## What this is

Shared infrastructure that turns declarative, renderer-independent JSON into interactive, accessible, educational learning experiences. One contract, five engines: **Visual**, **GeoMap**, **Chart**, **Timeline**, **Diagram**. The Interactive Engine never imports OpenEdu; OpenEdu consumes it via published packages.

> Course authors and AI agents describe *what an interactive should mean*. The engine decides *how it is rendered and how it behaves*.

## Reading order (source of truth)

`docs/DESIGN.md` → `docs/use-cases/<engine>.md` (learner scenarios before props) → `docs/INTERACTIVE-ENGINE-SPEC.md` → engine `SPEC.md` / `VISION.md` → (Visual) `engines/visual/ARCHITECTURE.md` is the engine's **implementation** guide. System-level architecture and integration/extending guidance live in `docs/SYSTEM-ARCHITECTURE.md` and `docs/DEVELOPER-GUIDE.md` (after the contract).

- **DESIGN.md** — canonical. System-wide principles (P1–P12), decisions D1–D9 (§16). Every change must trace back to it.
- **use-cases/** — learner scenarios, acceptance criteria, fixture names; derive specs from these, not prop matrices.
- **INTERACTIVE-ENGINE-SPEC.md** — shared contract: vocabulary (§7.1), state/events (§7.2), lifecycle (§7.3), D5 actions (§7.4), error codes (§67), spec hierarchy (§91).
- **SYSTEM-ARCHITECTURE.md** — system-level architecture (system-wide, distinct from an engine's own `engines/<engine>/ARCHITECTURE.md`).
- **DEVELOPER-GUIDE.md** — how to integrate and extend; how-to layer below the contract.
- **PLAN.md** — living, exit-gated phase plan (P0–P7). Sequencing; not design.
- **STRUCTURE.md** — repo layout, tech stack, packaging (§7 naming per D2).
- **Agent-Prompt-Spec.md** (`docs/_archive/review-mandates/`) — the 2026-09-13 architecture-review mandate (proposed, now archived). Source of the ADR-10..12 records and the executable next-phase plan under `docs/superpowers/specs/`. A review prompt, not a design doc; the ADRs + plan are the durable deliverables.

Conflict rule: when docs disagree, fix the **higher** document, never the implementation.

## Non-negotiable invariants

- **Semantic-first (P1/P2):** agents author JSON specs, never SVG/HTML/coordinates/pixels.
- **Strict schemas (P11/P10):** `additionalProperties: false`; unknown keys are a validation error, never silently ignored.
- **No arbitrary JS (P10):** no inline scripts, no `javascript:` URIs, no event handlers in specs.
- **D5 semantics:** specs and `dispatch()` use the closed semantic action enum (`select`, `focus`, `filter`, `play-pause`, `answer`, …). `click`/`pointer.*`/`keyboard` are renderer input and MUST NOT appear in specs. Superseded names (`highlight`, `annotate`, `blur`, `play`, `show`) are banned.
- **Events only (P4):** state changes happen only by dispatching events; the event log is serializable and replayable. No direct mutation API.
- **Shared error codes (§67):** raise the common codes (`INVALID_SPEC`, `INVALID_ACTION`, `INVALID_REFERENCE`, `UNSUPPORTED_ACTION`, …), never bespoke ones.
- **Engine isolation (D2/§6):** engines MUST NOT import each other or any `@open-edu/*` package. Cross-engine behavior is composition via the event bus, not imports.
- **Provenance (§9):** factual/geographic/historical claims carry a source class (`authoritative` | `illustrative` | `simulated`). Never invent boundaries, values, or facts absent from the data.
- **Deterministic (P4):** identical input → identical output. No randomness in layout, styling, or selection.
- **Accessible by default (P6):** interactive entities get roles, labels, keyboard paths; nothing is conveyed by color alone.
- **No second OpenEdu (D6/D7):** no telemetry store, i18n product, Studio app, scoring engine, theme source-of-truth, or assessment logic in this repo. Engines emit D5 events + snapshot; OpenEdu owns scoring/workflow/tokens/i18n.
- **Anti-patterns:** raw-artifact authoring, kind-of-sort-of semantics (`width`, `color`, `x`, `y` in specs), LLM-pleaser properties (`makeItPretty`, `svgMagic`), silent broadening, engine smuggling.

## Repo layout

```text
packages/interactive-engine/   core: engine, registry, state, action, event, host,
                               validation/ (L1–L4 pipeline), runtime/ (reducer, event-log,
                               instance), accessibility/, composition/ (lesson+router+schema,
                               implemented — not a placeholder), schemas/
packages/engine-skills/        published authoring skills: generated/committed projection of
                               docs/engines/*/skills/* + docs/fixtures/*/skill-example.json
packages/dev-harness/          shared mount logic: stub host, fixture catalog, loadSpec (conformance + playground)
apps/conformance/              Playwright e2e harness (port 5173); engine routes delegate to dev-harness
apps/playground/               React dev UI for manual verification (port 5174, pnpm playground)
docs/                          DESIGN, INTERACTIVE-ENGINE-SPEC, STRUCTURE, PLAN, PLAN-P1,
                               PLAN-P8, README, schemas/, fixtures/, engines/<engine>/{VISION,SPEC}.md + skills/
```

Current status: **P0–P7 in-repo gates DONE.** Next: **P8 — Production readiness** (`docs/PLAN-P8.md`). Workstream A is in progress: A1 (diagram edges) and A2 (Visual D9 kinds) are landed in `main`; the remaining A-slice work is chart/timeline golden fixtures + render honesty tests (see `docs/superpowers/specs/2026-09-13-interactive-engine-next-phase-implementation-plan.md` N1). Do not start new engine kinds (Workstream D) or library adapters until A is green. OpenEdu CourseRuntime proof is Workstream B (`docs/p7-acceptance.md`).

## Engine skills package

`packages/engine-skills/` publishes the authoring guidance for content-creator agents. It is a **generated/committed projection**, never hand-edited:

- **Source of truth:** `docs/engines/<engine>/skills/<skill>/SKILL.md` (full authoring guidance, may reference in-repo docs) and `docs/fixtures/<engine>/skill-example.json` (machine-input example). The engine schemas and `docs/schemas/composition.schema.json` complete the inputs.
- **Workflow:** edit the `docs/` sources → `pnpm generate` → commit both sides. The freshness guard (`scripts/check-engine-skills-fresh.mjs`) fails the gate if regeneration produces any diff.
- **Portability rule:** generated `skills/*` must contain **zero** `packages/` or `docs/` path fragments (generator fails loudly, tests and freshness guard enforce). Composition's embedded-spec line points at `validateEnvelope(spec)` from `@knowledgeassemble/interactive-engine` — never at `./schema.json` (that is the lesson schema).
- **Do not** import engine packages in the generator — their dev `exports` map to `src/index.ts`, which plain `node` cannot load. Clause kinds derive from schema JSON `content.kind.enum`. Runtime deps stay minimal (`ajv`, `ajv-formats`).
- **Fixtures split:** `packages/<engine>/fixture/<kind>/` = private pipeline goldens asserted by that engine's own tests (never shipped/catalogued). `docs/fixtures/` = shared contract consumed by dev-harness/conformance/playground, the generator, and the fixture catalog. No fixture file lives in both places; add to the location whose consumers you serve.
- Engine-schema drift (schema file diverges from the engine's zod runtime): fix the schema **file** to match the runtime, then drop any generator workaround — never silently relax `additionalProperties`.

## Tech stack

- pnpm workspaces, TypeScript (strict + `noUncheckedIndexedAccess`), Vite tooling, Vitest (unit), Playwright (browser), ESLint + Prettier, Zod (runtime validation from JSON Schema contract).

## Commands (run from repo root)

| Task | Command |
|------|---------|
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Unit tests | `pnpm -w test` (Vitest) |
| Browser e2e | `pnpm playwright` (starts the conformance dev server itself) |
| Regenerate engine skills | `pnpm generate:skills` (then commit both sides) |
| Freshness guard | `node scripts/check-engine-skills-fresh.mjs` (also runs in CI) |
| Full exit gate | `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs` |

Package-scoped: `pnpm --filter @knowledgeassemble/interactive-engine <script>`.

## Code conventions

- ESM: use `.js` import specifiers for local files (e.g. `import x from './core/action.js'`), matching the existing source. Enforced by `module: "NodeNext"` — extensionless relative imports fail typecheck with TS2835, so the rule cannot drift.
- Publishing is plain per-file `tsc` ESM emit (no bundler) to preserve STRUCTURE §40-41 engine-level tree-shaking; the current `.js` + NodeNext setup is the permanent convention, not a temporary one.
- Strict TS with `noUncheckedIndexedAccess` — expect `arr[i]` to be `T | undefined`; assert via `!` deliberately.
- Public API surface is centralized in `src/index.ts` (types + functions). Keep engine internals unexported.
- No inline comments unless they explain non-obvious intent. No emojis in code or docs.
- Errors carry the shared `ERROR_CODES`; runtime behavior is deterministic and event-logged.
- Do not introduce runtime dependencies beyond `zod` in the core package unless the plan requires it.

## Test conventions

- Unit: `packages/*/test/**/*.test.ts` (Vitest). Schema/parity tests keep Zod and JSON Schema in sync.
- Browser: `packages/*/e2e/*.spec.ts` (Playwright) against `apps/conformance`, exposing `window.__harness` (`dispatch` / `snapshot` / `events` / `tryCreate`).
- Test-first: a feature is "done" only when a test that fails first now passes.
- Golden fixtures are checked in; renderer/layout changes that alter output require reviewed fixture updates. Assert expected event sequences exactly (seq monotonic, names ordered).
- Deterministic assertions only — no flaky timers or layout-order dependence across workers (Playwright runs non-parallel here).

## Git workflow

- `main` is PR-protected. Direct pushes are rejected.
- Work on a feature branch (`feat/<phase>-<work>`), open a PR (`gh pr create`), then land with:
  `gh pr merge <n> --merge --delete-branch`
- Commit per completed task/phase — history is the review trail. Match existing style (e.g. `P1 T4: add base reducer, event log, and platform instance runtime`).
- A phase is only marked DONE in PLAN.md when its full exit gate is green — evidence over assertion.

## Agent-specific rules

- Write/edit engine **specifications (JSON)** and conformance fixtures. Never hand-write renderer markup or coordinates.
- All user-facing strings are localizable; get locale/copy through the host — never hard-code.
- Style through semantic tokens (`emphasis`, `danger`, `focus`), never literal colors.
- Reject Visual-engine scope creep: timeline, flowchart, and label-diagram belong to Timeline/Diagram engines (D9).
- Additions to the action set or envelope MUST be namespaced, documented in the engine spec, and deliberate — they are contract changes.
- For manual verification, use `apps/playground` (`pnpm playground`, port 5174) — browse fixtures, dispatch actions, inspect events/snapshot/a11y panels.