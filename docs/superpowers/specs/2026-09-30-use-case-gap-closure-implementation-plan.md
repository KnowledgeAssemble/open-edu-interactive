# Use-Case Gap Closure — Implementation Plan (agent-executable)

**Date:** 2026-09-30
**Spec source (the WHAT):** `docs/superpowers/specs/2026-09-30-use-case-gap-closure-plan.md` (the "gap-closure plan", at commit `20310c6`)
**This document (the HOW):** task sequence, exact mechanics, per-task exit gates
**Authority:** `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → gap-closure plan → this plan
**Executing agent:** deepseek-4-flash
**Status:** Not started (T0 onward)
**Rule of precedence:** if this plan ever conflicts with the gap-closure plan or a higher doc, the higher doc wins. STOP and report the conflict; do not improvise a resolution.

---

## 0. Executing-agent profile

Assumptions about deepseek-4-flash (planning assumptions, not verified facts — the protocol below is safe for any agent):

- fast and cheap, but with a shorter effective working memory than a frontier model;
- more likely to fill gaps from memory instead of evidence;
- more likely to batch "similar-looking" work that is actually different;
- less reliable at holding a 100-row ledger in its head.

Design consequences — every one of these is enforced by the protocol in §1–§2:

1. Tasks are small, sequential, and self-contained: every fact a task needs is in the task or in one named file.
2. No task requires repo-wide intuition. Where a pattern must be copied, the task names the template file to copy from.
3. All counts are machine-checked (Appendix A). Never count rows by eye or from memory.
4. Every task has a hard STOP list. On any STOP condition, halt and emit the escalation report (§1.4) instead of working around it.
5. Golden regeneration is scripted (`REGEN=1`), never hand-typed.
6. One task = one branch = one PR, except where a task group is explicitly marked shared-branch.
7. The PR body must contain pasted command output (evidence over assertion).
8. Tasks never edit files outside their **Files** list, except the mechanical registries named in §2.4.

---

## 1. Agent contract

### 1.1 Execution loop (per task)

```
read task -> read its named files -> branch -> implement in listed order -> run task DoD commands
-> phase-gate commands if the task ends a phase -> commit -> PR -> paste evidence -> next task
```

Never start a second task before the previous task's PR is merged.

### 1.2 Non-negotiable rules (from AGENTS.md / DESIGN — violations abort the task)

- **Semantic-first:** author JSON specs; never SVG/HTML/coordinates in specs or catalogs.
- **Strict schemas:** `additionalProperties: false`; unknown keys are validation errors, never silently ignored.
- **D5 is closed on actions:** engines extend the *payload*, never add an action name. The only new D5 action in the whole programme is `bearing` (T14). `diagram.*`/`geomap.*` names are **events**, not actions (geomap `SPEC.md` §30 Trigger column is the pattern).
- **Prop vs action names:** `highlight` is a **legal spec prop** (visual `SPEC.md:3090`) and a **banned action name** (visual `SPEC.md:1070` §39 superseded → `select`/`focus`); same split for `show`/`annotate`/`play`. T1/T8 author props; §13's ban is on actions. A spec that *dispatches* `highlight` is a defect.
- **Events only:** state changes happen only via `dispatch()`; no direct mutation API; no `setInterval`/timers in engines.
- **Provenance (§9):** every historical/geographic claim carries root-level `sources[]` — required and non-empty (`packages/geomap-engine/src/validation/semantic.ts:144-155` raises L2 `INVALID_SPEC` otherwise) — with `class` per source from `SOURCE_CLASSES` (`authoritative` | `illustrative` | `simulated`; `packages/chart-engine/src/schema.ts:6`). There is **no `provenance` key** in any engine schema (0 hits in the package schema and the `docs/schemas/` mirror) and no fixture uses one: do not author it and do not add it. Optional per-source fields are exactly those in `docs/schemas/interactive-engine.schema.json` `$defs.source`. Never invent boundaries, values, or facts.
- **Deterministic:** identical input → identical output. No randomness in layout, styling, or selection.
- **P6 a11y:** nothing conveyed by color alone; interactive entities have roles, labels, keyboard paths.
- **No new runtime deps** beyond `zod` (core) / existing `d3-geo` (geomap, ADR-10 exception). No ELK, Recharts, MapLibre, Konva.
- **Engine isolation:** engines never import each other or any `@open-edu/*` package.
- **ESM:** local imports use `.js` specifiers (NodeNext; extensionless imports fail typecheck).
- **No code comments** unless they explain non-obvious intent. No emojis.

### 1.3 Read-before-write

Before editing any file, read it (or the named section). Before editing any catalog row, re-read that row. Before copying any pattern, read the template file named in the task. Cite `file:line` evidence in the PR body for every factual claim ("fixture X lacks Y" → paste the line).

### 1.4 Escalation report (emit on any STOP condition, then halt)

```
TASK: <id>
STOP CONDITION: <which one>
EVIDENCE: <file:line or command output>
ATTEMPTED: <what you tried, commands + outcomes>
NEEDED DECISION: <one-sentence question for the maintainer>
```

### 1.5 STOP conditions (exhaustive)

1. The gap-closure plan, a SPEC, a schema, or the code contradicts the task's premise.
2. A task's DoD command fails twice for the same reason.
3. A "fixture-only" row's acceptance fails on current mechanics (the row was mis-bucketed — report; never force a flip, never edit acceptance text).
4. A golden diff you cannot explain line-by-line.
5. You need to touch a file not in the task's **Files** list and not in §2.4's registries.
6. Any urge to: add a dependency, add an action name other than `bearing` (T14), add a timer, widen `additionalProperties`, or relax a validation negative.
7. Your row recount differs from Appendix A's script output (your matcher is wrong first; re-run Appendix A verbatim).

---

## 2. Global task protocol (inherited by every task)

### 2.1 Branch / commit / PR

- Branch: `feat/p8-gap-<task-id>` from `main` (e.g. `feat/p8-gap-t3`), except shared-branch groups.
- Commit style: `P8 T<n>: <what>` (matches `P1 T4: …` house style). One commit per task; goldens regenerated in the same commit that changed the renderer.
- PR: `gh pr create`, then `gh pr merge <n> --merge --delete-branch`. Never force-push.

### 2.2 Command gate

Per task (minimum): `pnpm typecheck && pnpm lint` + the task's scoped tests (e.g. `pnpm --filter @knowledgeassemble/chart-engine test`).
Per phase boundary and per render-changing task: full gate —

```
pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs
```

### 2.3 Fixture mechanics (exact anatomy — verified)

A private fixture is `packages/<engine>-engine/fixture/<slug>/` containing:

```
input.<engine>.json        the spec (engine = visual|chart|geomap|timeline|diagram)
expected.scene.json        JSON.stringify(snapshot.scene, null, 2) + '\n'
expected.a11y.json         same serialization of the a11y payload
                           (chart wraps it as { a11y, interactive } — copy the engine's own fixture.test.ts)
expected.alternative.json  same serialization of the alternative (diagram, geomap; where the engine emits one)
expected.svg               the SVG string verbatim
validation.json            { "valid": boolean, "issues": [...] } asserted byte-equal by the engine's golden harness (step 5 — geomap's is `golden.test.ts`, **not** `fixture.test.ts`)
```

Steps for every new fixture:

1. Copy the nearest existing fixture dir in the same engine as a template (task names one).
2. Replace `input.<engine>.json` with the catalog row's authored spec (fixture name and spec hints come from the row's `**Fixture**`/`**Spec**` cells in `docs/use-cases/<engine>.md` — never invent a fixture name).
3. Regenerate goldens: `REGEN=1 pnpm --filter @knowledgeassemble/<engine>-engine test fixture-gen` (T0b installs this for all engines; diagram already has it). Never hand-type a golden.
4. Write `validation.json` from the engine's actual `validate()` output.
5. Register the fixture in that engine's golden harness (table below — the mechanism differs per engine; **do not assume a `FIXTURES` array exists**).
6. `pnpm build:fixtures` and commit the regenerated `packages/dev-harness/generated/` files (§2.4).
7. Add e2e coverage asserting the row's `**Acceptance**` text, in that engine's existing e2e spec: `e2e/<engine>.spec.ts` (chart, diagram, geomap, timeline) or, for visual, extend `packages/visual-engine/e2e/number-line.spec.ts` / add a sibling `e2e/<family>.spec.ts` copying that file's idioms — there is no `e2e/visual.spec.ts`.

**Golden-harness table (verified — the only correct registration mechanism per engine):**

| Engine | Harness | How fixtures are discovered |
|--------|---------|------------------------------|
| visual | `test/fixture.test.ts` | auto via `readdirSync` walk (`:8-21`) — new dirs need no edit and land in the non-baseline bucket; the 9 frozen kinds are a hard-coded `BASELINE_KINDS` set (`:19`) asserted by `toEqual` (`:35-49`) — never widen that set to make a new dir "pass" |
| chart | `test/fixture.test.ts` | `FIXTURES` array — add the slug |
| geomap | `test/golden.test.ts` (**no** `fixture.test.ts` exists) | `FIXTURES` array — add the slug; this harness also asserts `expected.alternative.json` |
| timeline | `test/fixture.test.ts` | `SUITES` array (`:7`), not `FIXTURES` — add the suite name |
| diagram | `test/fixture.test.ts` | auto via `readdirSync` walk (`:12-17`) — new dirs need no edit; goldens via `fixture-gen.test.ts` |

Harness globals (verified): visual uses `window.__harness` at `/?engine=visual`; chart/diagram/geomap/timeline use `window.__chartHarness` / `__diagramHarness` / `__geomapHarness` / `__timelineHarness` at `/?engine=<engine>`. Always read the engine's existing e2e spec first and reuse its idioms.

### 2.4 Mechanical registries (the only files editable outside a task's Files list)

- `packages/dev-harness/generated/fixture-catalog.json` and `catalog.generated.ts` — only via `pnpm build:fixtures`.
- `docs/use-cases/<engine>.md` — only the `**Status**` cell (and promotion note) of rows the task flips.
- Per-engine fixture READMEs (`packages/<engine>-engine/fixture/README.md`) when a task adds a fixture dir there — geomap's is rewritten in T3. W-1 adds **private** fixtures, so no `docs/fixtures/` change is needed, but the generated catalog indexes `packages/*/fixture/*` *and* `docs/fixtures/*` (`scripts/build-fixture-catalog.mjs:44-114`), so `pnpm build:fixtures` output really does change for every W-1 task. There is no `packages/dev-harness/fixture/` directory.

### 2.5 Contract-change mechanics (W-2/W-3/W-4/W-5 tasks)

Order is mandatory: engine SPEC § → package schema JSON → zod validator → `docs/schemas/` mirror → `schema-parity.test.ts` green → reducer/render → fixtures + goldens + `validation.json` (including validation negatives) → e2e → flip catalog Status. If authoring guidance changed: `pnpm generate:skills` and commit both sides.

Mirror caveat: only **chart, diagram, geomap, timeline** have a `docs/schemas/<engine>-spec.schema.json` mirror (plus core + composition). **Visual has none** — its only schema is `packages/visual-engine/src/schemas/visual-spec.schema.json`. For visual tasks (T8, T9) skip the mirror step; never create one, and never edit a mirror to match a runtime that was changed on purpose (drift rule: fix the file that is wrong, and `docs/schemas/` is the published contract).

Core-contract tasks (only T14 `bearing`, and T30 a11y-tree snapshot shape) additionally touch `docs/INTERACTIVE-ENGINE-SPEC.md` and `docs/schemas/interactive-engine.schema.json` + `packages/interactive-engine/src/schemas/` parity.

### 2.6 Golden updates are reviewed changes

Any task that changes renderer output regenerates goldens in the same commit and says "goldens: regenerated (reason)" in the PR body. Never mix a golden regen with an unrelated change.

### 2.7 Status flips

A row flips `planned → done` only when: fixture + goldens + `validation.json` + e2e all assert its `**Acceptance**` text, the phase gate is green, and the promotion note is recorded (gap-closure plan §4 preamble). A `done` row whose acceptance fails is reopened with the reason in its Status — the ch-l1 pattern (T2).

---

## 3. Task graph and index

```
T0  bootstrap + baseline evidence          T0b REGEN enabler (4 engines)
 └─► W-1: T1 visual ─ T2 chart ─ T3/T4 geomap ─ T5–T7 diagram ─ [W-1 phase gate]
      └─► W-2: T8–T14 (T14 bearing = core enum; T13 flips gm-dir-1/gm-nav-2)
           └─► T15 per-item gating (W-5a — MUST land before W-3 guided rows complete)
                └─► W-3: T16–T26   ─┐
                └─► W-4: T27–T29   ─┤ (parallel-safe after T15)
           T30–T33 (W-5b rest — independent of W-2)
      W-6: T34–T38 — per family, gated on that family being W-1…W-5 green
 [T-final full exit audit]
```

| Task | Slice | Rows flipped | Shared branch |
|------|-------|--------------|----------------|
| T0/T0b | bootstrap + REGEN enabler | 0 (doc/test tooling only) | no |
| T1 | W-1 visual | 3 | no |
| T2 | W-1 chart + reopen ch-l1 | 2 (+1 reopen) | no |
| T3 | W-1 geomap audit | 22 | no |
| T4 | W-1 geomap workflow | 4 | shares T3's branch |
| T5–T7 | W-1 diagram nios (24 rows) | 24 | one branch `feat/p8-gap-w1-diagram` |
| T8–T12 | W-2.1–W-2.5 | 5 | no (one PR each) |
| T13 | W-2.6 adjacency | 2 (gm-dir-1, gm-nav-2) | no |
| T14 | W-2.7 bearing (core) | 2 (gm-nav-1, gm-dir-2) | no |
| T15 | W-5a per-item gating | 0 (mechanics; enables W-3) | no |
| T16–T26 | W-3.1–W-3.12 (no W-3.3) | 20 | no (one PR each) |
| T27–T29 | W-4.1–W-4.3 | 3 | no |
| T30–T33 | W-5b a11y-tree, N3.2, N4, N6.1 | 0 | no |
| T34–T38 | W-6 per-family slices | 7 | per slice |
| T-final | exit audit | 0 | no |

Row ownership per bucket is in Appendix B. Any row not in your task's list is not yours to touch. Note the deliberate cross-phase pair: **T13 (W-2.6) flips two W-1-owned rows** (`gm-dir-1`, `gm-nav-2`), so W-1 lands 55 of its 57 and the pending chain is 45 → 37 → 17 → 14 → 7 (Appendix A2).

---

## 4. T0 — Bootstrap (no repo changes)

**Goal:** establish the baseline the whole programme is measured against.

**Steps:**
1. Read, in order: `AGENTS.md`, the gap-closure plan (all of it), `docs/use-cases/README.md`.
2. From `main`: `pnpm typecheck && pnpm lint && pnpm -w test` and record pass/fail counts.
3. Run Appendix A scripts A1 (coverage) and A2 (ledger arithmetic). Record: 100 pending rows (99 `planned` + 1 `widget-preferred`), buckets 57/6/20/3/7/5/2.
4. Record the done-count per engine (69 `done` total, incl. `ch-l1-read-trend` which is false-done).

**DoD:**
- [ ] Baseline gate green; counts recorded and matching Appendix B exactly
- [ ] No file modified

**Stop if:** baseline gate is red on `main`, or A1/A2 outputs differ from Appendix B.

---

## 5. W-1 — Fixture-only rows (57) + reconciliation

### T0b — REGEN enabler (tooling; no contract surface)

**Goal:** one golden-regen command per engine, mirroring `packages/diagram-engine/test/fixture-gen.test.ts` (already exists; do not touch it).

**Files (new, one per engine):** `packages/{chart,timeline,visual,geomap}-engine/test/fixture-gen.test.ts`.

**Steps:**
1. Copy `packages/diagram-engine/test/fixture-gen.test.ts`; adapt the import (`../src/engine.js`), the fixture walker's input filename (`input.chart.json` etc.), and the golden serialization to match that engine's golden harness **exactly** (§2.3 step 5 table — chart/timeline/visual use `fixture.test.ts`, geomap uses `golden.test.ts`; chart serializes `{ a11y, interactive }`; write `expected.alternative.json` only where the engine emits one — diagram and geomap).
2. **GeoMap only:** skip `india-coastal` in the walker (constant skip-list, one line, with the reason: dropped from the golden suite by `61c76f3` pending cross-platform centroid determinism — gap-closure plan §0.1). Regenerating `india-coastal` goldens would commit platform-dependent bytes.
3. Run `REGEN=1 pnpm --filter @knowledgeassemble/<engine>-engine test fixture-gen` for each of the four engines, then `git diff` — the diff must be **empty** (regen reproduces committed goldens byte-for-byte).

**DoD:**
- [ ] Zero diff after REGEN on all four engines
- [ ] Full gate green

**Stop if:** REGEN changes any committed golden byte (that is unexplained drift — STOP condition 4).

---

### T1 — Visual fixtures (3 rows)

**Source:** gap-closure plan §3.1. **Template fixture dirs:** `packages/visual-engine/fixture/{number-line,clock,geometry}`.

**Rows:** `nl-compare-distance`, `ck-which-hand`, `geo-identify-vertex` (conditional).

**Steps:**
1. `nl-compare-distance`: fixture `number-line-compare-distance` — `highlight: [3, 7]` (the **prop**, not an action — §1.2), dual emphasis, event distinguishes id.
2. `ck-which-hand`: fixture `clock-discovery-minute` — both hands `interactive: true`, `highlightHand` only.
3. `geo-identify-vertex`: verify `highlightVertices` discovery scoping (only target-type vertices are candidates). Land `geometry-discovery-vertex`. **If the reducer/render does not scope:** do NOT flip the row — emit the §1.4 escalation report with the `file:line` evidence and **halt**. The gap-closure plan §3.1 prescribes the fallback (the row stays `planned` and a named W-2 entry is added), but the **maintainer** makes that edit: this plan is the HOW doc and §0.8 forbids editing outside your Files list. Silent reclassification breaks the ledger.
4. Per fixture: §2.3 steps 1–7. Registration is automatic (visual's harness walks the fixture dir, §2.3 step 5) — do **not** touch the hard-coded 9-entry `BASELINE_KINDS` assertion to absorb a new dir; a new dir belongs to the non-baseline bucket, which the same harness still asserts for byte-stable goldens.
5. Flip the 2 (or 3) Status cells.

**DoD:**
- [ ] Scoped engine tests + `pnpm build:fixtures` diff committed + full gate green
- [ ] Appendix A: exactly these rows left the pending set; no other row changed

---

### T2 — Chart fixtures (2 rows) + reopen the false-done

**Source:** gap-closure plan §3.2, §0.1. **Template fixture dirs:** `packages/chart-engine/fixture/line` (ch-l4), `.../bar` (ch-x3).

**Steps:**
1. `ch-l4-time-series`: fixture with `dimensions[].type: "time"` and ISO-8601 values. The time-value rule already exists in the engine: `packages/chart-engine/src/validation/semantic.ts:122-126` accepts a finite number or an `isIso8601String` value and otherwise raises `INVALID_ENTITY` (a shared code, `packages/interactive-engine/src/core/errors.ts:4`). Note `validation.test.ts` has **no** dedicated time test and the chart schema declares `type: "time"` with no value pattern, so the task adds the missing test (the row's acceptance demands the rejection be asserted). Goldens + e2e select on a time point. The series stroke itself is T11, not this task.
2. `ch-x3-guided-narrow`: derive a guided fixture from `bar/` (host `filter` → learner `select` → `clear-filter`/`reset` between steps); e2e scripted dispatch via `__chartHarness`.
3. **Reopen `ch-l1-read-trend`:** in `docs/use-cases/chart.md`, set its Status to `planned` with the recorded reason (acceptance "path visible between points" fails: `packages/chart-engine/fixture/line/expected.svg` holds only `<circle>` markers; no `<polyline>`/`<path>` series code exists in `packages/chart-engine/src/`). Do NOT edit its acceptance text. It re-flips in T11 only.
4. `ch-l2`/`ch-l3` stay `done` (their acceptance is peak/trough selection).

**DoD:**
- [ ] Chart engine tests green; full gate green; Appendix A delta = 2 rows out, 1 done-row reopened
- [ ] PR body pastes the `expected.svg` line proving only `<circle>` markers exist

---

### T3 — GeoMap catalog reconciliation audit (22 rows)

**Source:** gap-closure plan §3.3 tasks 1–3 and 5. **Files:** `docs/engines/geomap/SPEC.md` (§66 repoint), `packages/geomap-engine/fixture/README.md`, `packages/geomap-engine/test/golden.test.ts` (india-coastal decision), the 22 rows' Status cells in `docs/use-cases/geomap.md`, e2e in `packages/geomap-engine/e2e/geomap.spec.ts`.

**Rows (22):** `gm-loc-1`, `gm-move-2`, `gm-move-3`, `gm-dist-1`, `gm-dist-2`, `gm-dist-4`, `gm-cmp-1`, `gm-cmp-2`, `gm-cmp-3`, `gm-ovl-1`, `gm-ovl-2`, `gm-ovl-3`, `gm-r4`, `gm-dist-3`, `gm-t2`, `gm-move-1`, `gm-move-4`, `gm-inq-1`, `gm-leg-1`, `gm-leg-2`, `gm-scale-1`, `gm-scale-2`.
**Not yours:** `gm-dir-1`, `gm-nav-2` (flip in T13), the T4 four, `gm-mark-1/2/3`, `gm-inq-2`, `gm-asm-2/3` (deferred/W-4).

**Steps:**
1. For each audit-table capability (gap-closure plan §3.3 task 1), assert the runtime supports it against the existing private fixtures (`linear/`, `encoding/`, `route-step/`, `overlay/`, `region/`): run the engine's tests; where the runtime diverges from SPEC, fix the **SPEC** (never silently relax) or STOP (condition 1).
2. **Repoint §66:** rewrite `docs/engines/geomap/SPEC.md` §66 as the event reference — canonical payload table stays in §30; §66 keeps the renderer-independence rule and one namespaced example (`geomap.entity-selected`, an *event*). Contract-first SPEC edit; no schema change expected.
2b. **Fix §15's drifted example (pre-existing, same file):** §15 documents `provenance: { sources, confidence, notes }` — a shape present in **no** schema (0 `provenance` hits in `packages/geomap-engine/src/schemas/geomap-spec.schema.json` and in the `docs/schemas/` mirror) and in **no** fixture, while the validator reads root-level `spec.sources` (`packages/geomap-engine/src/validation/semantic.ts:144-155`). Correct §15 to the shipped surface: `sources[]` required + non-empty, each entry mirroring `docs/schemas/interactive-engine.schema.json` `$defs.source` (`class` ∈ `authoritative | illustrative | simulated`). **Do not** add a `provenance` field to any schema to make the old example true.
3. **Fixture README:** rewrite `packages/geomap-engine/fixture/README.md` to list all 9 fixture dirs (today it lists 4 and omits `india-coastal`, `encoding`, `overlay`, `route-step`, `linear`).
4. **india-coastal determinism:** either resolve the centroid variance (cross-platform) or document the exclusion in that README + `golden.test.ts`. Keep the golden suite byte-stable; T0b's skip-list stays unless resolved.
5. Land e2e for each row over the existing fixtures; flip the 22 Status cells.

**DoD:**
- [ ] Geomap engine tests + full gate green; Appendix A delta = exactly those 22 rows
- [ ] §66 no longer carries the pre-D5 `entitySelected` example as canonical

---

### T4 — GeoMap workflow fixtures (4 rows; shares T3's branch)

**Source:** gap-closure plan §3.3 task 4. **Template fixture dir:** `packages/geomap-engine/fixture/odisha-coastal`.

**Rows:** `gm-x2-guided-composed`, `gm-loc-2-multi-locate`, `gm-hist-2-place-memory`, `gm-asm-1-board-map-skill` (non-construct remainder only).

**Steps:**
1. `gm-x2`, `gm-loc-2`, `gm-hist-2`: derive composed fixtures from `odisha-coastal` with guided flags; e2e asserts a monotonic select/reset/select log (seq strictly increasing).
2. `gm-hist-2`: authored event metadata surfaced in the selection payload + alternative list, **and** a non-empty root-level `sources[]` with `class` per source. That is enforced today (`packages/geomap-engine/src/validation/semantic.ts:144-155`, L2 `INVALID_SPEC`), so `validation.json` **asserts** the rejection case rather than merely recording a present field. Field shape = the corrected `SPEC.md` §15 from T3 step 2b.
3. `gm-asm-1`: loc/identify/trace half only — multi-layer explore e2e over `overlay/`. The marking half stays deferred; its partial-deferral note goes in the row's Status text (a single Status cell cannot express a split — write it out).

**DoD:**
- [ ] Geomap tests + full gate green; Appendix A delta = 4
- [ ] Bucket bookkeeping: W-1 **owns** 28 geomap rows, but only 26 flip here — `gm-dir-1`/`gm-nav-2` are owned by W-1 and flip in T13 (W-2.6), per the gap-closure plan §10 note that buckets track row *ownership*, not which slice touches a row. W-1's gate arithmetic accounts for this (§5).

---

### T5–T7 — Diagram `nios/` fixtures (24 rows, one shared branch `feat/p8-gap-w1-diagram`)

**Source:** gap-closure plan §3.4 + the three multi-select rows. **Template fixture dirs:** `packages/diagram-engine/fixture/{flow,cycle,hierarchy,concept-map}`. Fixture specs come from each row's `**Spec**`/`**Fixture**` cells.

**T5 (8):** `di-proc-1`, `di-proc-2`, `di-proc-3`, `di-proc-4`, `di-cycl-1`, `di-cycl-2`, `di-cycl-4`, `di-cycl-5`.
**T6 (8):** `di-class-1`, `di-class-2`, `di-class-3`, `di-class-4`, `di-class-6`, `di-sys-2`, `di-sys-3`, `di-ord-2`.
**T7 (8):** `di-inq-1`, `di-inq-2`, `di-asm-1`, `di-asm-2`, `di-asm-3`, `di-cause-1`, `di-cause-2`, `di-lab-2`.

**Steps per row:** §2.3 steps 1–7 (diagram e2e: `__diagramHarness`, `/?engine=diagram`; goldens via `REGEN=1 pnpm --filter @knowledgeassemble/diagram-engine test fixture-gen`). No contract change anywhere in T5–T7. `di-cause-1/2` and `di-lab-2` need only accumulation e2e: dispatch two `select`s → snapshot `selection` contains both ids in order (`appendUnique`, `packages/interactive-engine/src/runtime/reducer.ts:22`); `deselect` removes one.

**DoD (per chunk):** diagram engine tests + full gate; Appendix A delta = 8 rows; combined = 24 (21 course variants + 3 accumulation rows).

**Stop if:** any row's acceptance fails on current mechanics (STOP condition 3 — the row is mis-bucketed, e.g. it secretly needs a W-3 capability).

### W-1 phase gate (after T7)

- [ ] Full gate green; `pnpm build:fixtures` diff committed
- [ ] Appendix A: pending set = **45** rows. W-1 flips **55** of the 57 rows it owns, not 57: `gm-dir-1`/`gm-nav-2` are owned by the W-1 bucket but flip in T13 (W-2.6) — the gap-closure plan §10 is explicit that buckets track row *ownership*, not which slice touches a row. Buckets now `2/6/20/3/7/5/2`.
- [ ] **Conditional row:** if T1 step 3 halted (no scoped `highlightVertices`), `geo-identify-vertex` stays `planned` and the counts are **46** with buckets `3/6/20/3/7/5/2`. Nominal numbers above assume the scoped path; **A1/A4 output is authoritative** — never make the numbers match by force.
- [ ] **Done-row recheck:** all 68 remaining `done` rows (69 minus reopened `ch-l1`) — read each row's `**Acceptance**` text against its fixture/goldens; any that fails is reopened with a recorded reason, exactly like `ch-l1`. Report the recheck count in the PR body.
- [ ] `ch-l1` is `planned` (reopened), everything else done/deferred per Appendix B

---

## 6. W-2 — Mechanics contract additions (6 rows, one new D5 action)

Per-task mechanics: §2.5 order, then the named template pattern. Each of T8–T14 is its own branch/PR.

### T8 — `maxSelection` (W-2.1, visual)

**Source:** §4.1 W-2.1; `cs-pick-n`. **Template fixture dir:** `packages/visual-engine/fixture/counting-set`. **Template prop wiring:** the counting-set's own emphasis props `highlight` / `highlightedParts` (`docs/engines/visual/SPEC.md:3090` — `highlightVertices` is the *geometry* prop, not the counting-set's) + `packages/visual-engine/src/schemas/visual-spec.schema.json` + render. Visual has no `docs/schemas/` mirror (§2.5).
Optional prop on the counting-set component; validator ranges it (`≥ 0`, absent = unlimited); the cap rejects an over-limit **learner `select`** deterministically, scoped to `select`/`deselect` — it must not reject a host `dispatch()` of other D5 actions (`docs/adr/ADR-12.md:22-24`). Validation negative in `validation.json`.

### T9 — Selection-driven fraction fill (W-2.2, visual)

**Source:** §4.1 W-2.2; `fr-shade-n-parts`. Reducer/snapshot decision recorded in the SPEC first (engine-state vs static-emphasis), then fixture + goldens + e2e. Deterministic.

### T10 — Multi-measure grouped bars (W-2.3, chart)

**Source:** §4.2 W-2.3; `ch-x2-multi-measure`. **Template fixture dir:** `packages/chart-engine/fixture/bar`. `measures[]` length ≥ 2 over one dimension; node ids `{measureId}-bar-{rowId}`; legend distinguishes measures; tabular lists all values. Validation negatives (single-measure rejects). The node-id scheme does not exist in the chart SPEC yet — authoring it here is the task's exit gate (the gap-closure plan §4.2 W-2.3 requires "node-id scheme in the chart SPEC"), so write it down, do not leave it implicit in the renderer.

### T11 — Line series stroke (W-2.4, chart; closes N1.8; re-flips `ch-l1`)

**Source:** §4.2 W-2.4. `<polyline>`/`<path>` in dimension order between point markers; markers stay selectable; regenerate `packages/chart-engine/fixture/line/expected.svg` (reviewed golden change, §2.6). N1.2/N1.8 in the archived next-phase plan (`docs/superpowers/specs/2026-09-13-interactive-engine-next-phase-implementation-plan.md`) already record the marker-only state correctly and defer to N1.8 — **do not edit that plan**; if a re-word is ever warranted, report it (STOP condition 5). **Exit gate = `ch-l1`'s acceptance passes** → flip `ch-l1` back to `done` with the promotion note. Only `ch-l1` — `ch-l2`/`ch-l3` untouched.

### T12 — Duration events (W-2.5, timeline)

**Source:** §4.3 W-2.5; `tl-f1-duration-events`. **Template fixture dir:** `packages/timeline-engine/fixture/events`. Today's `events[]` requires only `['id','label','date']` and has no `from`/`to`/`duration` (`docs/schemas/timeline-spec.schema.json`), so a span is a **new** field on events — pick **one** name (`duration`, per the row's Spec cell) and never add both. Span bars instead of point markers; alt list exposes the span. Reuse the **periods** temporal grammar as the model (`periods[].from`/`to`, pattern `^[+-]?\d{1,6}(-\d{2}){0,2}$`, plus the temporal validation behind the `from>to` and out-of-range-calendar tests in `packages/timeline-engine/test/validation.test.ts`) — but do not assume events inherit periods' `from`/`to`; they are separate arrays. Validation negatives: missing span, inverted span, unparsable date. Register the suite in the `SUITES` array (`test/fixture.test.ts:7`), not a `FIXTURES` array (§2.3 step 5).

### T13 — Adjacency in the alternative list (W-2.6, geomap; flips 2 W-1-bucket rows)

**Source:** §4.4 W-2.6; rows `gm-dir-1`, `gm-nav-2` (owned by the W-1 bucket — flip here; see T4's bookkeeping note). **Template fixture dir:** `packages/geomap-engine/fixture/region` (region sets). Surface `adjacentTo` neighbor sets in the alternative/snapshot (schema field exists at `SPEC.md` §8.2 — `docs/schemas/geomap-spec.schema.json`:128 declares `adjacentTo`). Nothing invented: adjacency derives from authored `adjacentTo` plus the region-overlap detection already used in L3 validation (`packages/geomap-engine/src/layout/geometry.ts:40` `overlaps`, consumed by `src/validation/layout.ts:58`). The alternative golden is asserted by geomap's `golden.test.ts` harness (§2.3 step 5), so the adjacency change shows up in `expected.alternative.json`. Fixture + goldens + e2e; flip both Status cells.

### T14 — Bearing / compass (W-2.7, geomap; **the one new D5 action — core contract**)

**Source:** §4.4 W-2.7; rows `gm-nav-1-follow-compass`, `gm-dir-2-north-of`. **Template fixture dir:** `packages/geomap-engine/fixture/odisha-coastal`.
**Files:** `docs/INTERACTIVE-ENGINE-SPEC.md` + `docs/schemas/interactive-engine.schema.json` (`$defs.actionType`) + `packages/interactive-engine/src/schemas/actions.ts` (the zod action enum — the core package ships **no** JSON schema copy; `src/schemas/` holds only `actions.ts`, `envelope.ts`, `envelope.zod.ts`) + `packages/interactive-engine/test/schema-parity.test.ts`; then geomap SPEC §30-style entry + `docs/schemas/geomap-spec.schema.json` + package schema + validator; scene node for the compass rose (D5 target, no pixel picking); computed bearing from an authored reference point exposed in the alternative list.
**Hard rules:** bearing is **derived from authored geometry, never authored as a value**; "north of X" holds only when the bearing falls in the authored axis window (a semantic field, not a tolerance constant); no new library — plain arithmetic on authored coordinates (ADR-10). Validation negatives: reference point required; reference cannot be the candidate itself. Engine emits namespaced `geomap.bearing-*` **events**; the action is `bearing`.
**DoD:** core + geomap parity green, full gate green, both rows flipped, `pnpm generate:skills` committed if authoring guidance changed.

### W-2 phase gate

- [ ] Full gate green; Appendix A: pending = **37**. W-2 flips **8** rows, not 6: its own 6 (T8, T9, T10, T12, T14×2) **plus** T13's 2 held W-1-owned rows → 45 − 8. Buckets 0/0/20/3/7/5/2. T13 is what drains W-1's last 2.
- [ ] Every §11 ledger entry touched carries its `Rule` cell (`2+` or `promoted`) and the promotion is recorded in the flipped row's Status

---

## 7. T15 — Per-item `interactive` gating (W-5a; lands BEFORE W-3 guided rows complete)

**Source:** gap-closure plan §7.2 row 1; template: `docs/schemas/geomap-spec.schema.json:178,215` and visual's `$defs.element.properties.interactive`.
**Engines:** chart, diagram, timeline. **Rows served:** the guided-select rows across all three (2+ rule satisfied).

**Hard rules (ADR-12, `docs/adr/ADR-12.md:22-24`):** `interactive: false` removes the item from **hit-testing, tab order, and the pointer/keyboard dispatch paths** only. It must **not** make the reducer reject a direct host `dispatch()` — the host may legitimately dispatch D5 actions the author did not declare. Opt-in per engine; no core reducer rule. Learner-input-scoped enforcement, exactly like T8's `maxSelection` scoping.

**DoD:** per-engine SPEC + schema + mirror + parity + render/hit-test changes + fixtures (one `interactive: false` marker/edge/node per engine) + e2e (item not tabbable/not hit; host dispatch to it still applies) + full gate green. No row flips.

---

## 8. W-3 — Diagram interaction extensions (20 rows)

Each task = one branch/PR; mechanics per §2.5. **D5 reuse is mandatory** (§1.2): payload + namespaced event, never a new action name. Multi-select (old W-3.3) is already done by `baseReducer` and was landed in T7 — there is no W-3.3 task.

| Task | Source § | Capability | Rows | Surface (summary) |
|------|---------|-----------|------|-------------------|
| T16 | W-3.1 | `relation-vocab` | `di-cycl-3`, `di-sys-1`, `di-lab-4` | extend closed `relationship` enum (`feeds-on`, `transforms-to`, `produces`, `weathers-into`) |
| T17 | W-3.2 | `links` vocabulary | `di-hist-1…4`, `di-cmp-3` | `nodes[].links` += `timelineEventId`, `geomapEntityId`; extend `packages/interactive-engine/test/composition.golden.test.ts` rather than starting N5.1's variant |
| T18 | W-3.4 | `edge-select` | `di-cause-3` | edges addressable under D5 `select` (edge-id target scheme, geomap §30 style); `diagram.edge-selected` **event** |
| T19 | W-3.5 | `filter-nodes` | `di-proc-5`, `di-class-5`, `di-sys-1`, `di-sys-4` | D5 `filter` payload `{ categories }` on node `category`; `clear-filter` releases; `diagram.filter-applied` event |
| T20 | W-3.6 | `relationship-gate` | `di-cause-6` | edge labels hidden until D5 `answer`; then `follow`; deterministic |
| T21 | W-3.7 | `edge-weight` | `di-cause-5` | semantic `strength` metadata on edges (data, never style) |
| T22 | W-3.8 | `follow-chain` | `di-cause-4` | per-step emphasis along a multi-edge path on `follow` + step state |
| T23 | W-3.9 | `what-if` | `di-inq-3` | non-destructive node de-emphasis; spec never mutated (immutability assertion) |
| T24 | W-3.10 | `construct-order` | `di-ord-1`, `di-ord-3` | shuffled candidates + ordered `answer` (construct mode); **depends on T15** |
| T25 | W-3.11 | `construct-edge` | `di-lab-3`, `di-ord-3` | learner-authored edges via D5 `connect`, checked against the graph rules the SPEC states for the kind |
| T26 | W-3.12 | `concept-map-cycle` | `di-m3` | `kind: "concept-map"` (grid) accepts a directed back-edge; deterministic `positionSource: 'illustrative'` or a named cycle-layout strategy in the SPEC. **No graph law is assumed** — any self-loop/cycle-length rule is new SPEC work with its own 2+ case; do not add one here |

**Per-task DoD (all):** SPEC → schema → mirror → parity → reducer/render → fixture + goldens + `validation.json` negatives → e2e asserting the row's acceptance → Status flip → full gate green → Appendix A delta exactly your rows.

**W-3 phase gate:** pending = 17 (37 − 20); buckets 0/0/0/3/7/5/2; `diagram.spec.ts`/unit green; full gate green.

---

## 9. W-4 — GeoMap mechanics + encoding honesty (3 rows)

### T27 — `period-slice` (W-4.1; rows `gm-hist-1`, `gm-hist-3`)

**Source:** gap-closure plan §6 W-4.1; rows `gm-hist-1`, `gm-hist-3`. **Template fixture dir:** `packages/geomap-engine/fixture/region` (region-set template; geomap has no period fixture yet — this task creates one).
Region/boundary sets keyed by period; D5 `step`/`scrub` drive the slice (`scrub` sets the step index, `step` advances it — both deterministic reducer ops, no timers); engine emits namespaced `geomap.*` events (§30 pattern); snapshot exposes the active slice; **host-driven playback only** — no engine timer (PLAN-P5:19,80; PLAN-P8 §6).
**Provenance is mandatory:** every period's region/boundary set carries root-level `sources[]` (non-empty) with `class` per source — the shipped surface, per §1.2 and `packages/geomap-engine/src/validation/semantic.ts:144-155`; the corrected `SPEC.md` §15 (T3 step 2b) is the authoring reference. No boundary, extent, or date may be inferred beyond authored data. **A period slice whose source set is empty or missing is a validation error** — encode it as a `validation.json` negative (the base rule already exists, so this is a fixture-level assertion, not a new contract).

### T28 — Encoding honesty rule (W-4.2; row `gm-asm-2`)

**Source:** gap-closure plan §6 W-4.2; row `gm-asm-2`. **Template fixture dir:** `packages/geomap-engine/fixture/encoding`.
SPEC rule: encoding is never misleading by construction — explicit `breakpoints`; the alternative list is ground truth and must contradict any visual exaggeration. Fixture + encoding-vs-alternative contrast assertion.

### T29 — Coverage confirmation (W-4.3; rows counted in W-1's bucket)

Land e2e for route-step, linear-feature, filter-category over the existing fixtures for `gm-move-1…4`, `gm-hist-2`. No new contract. Flip nothing (already done in T3/T4); this task closes the e2e gap only.

**W-4 phase gate:** pending = 14 (17 − 3); buckets 0/0/0/0/7/5/2; geomap catalog reconciled; full gate green.

---

## 10. W-5b — Cross-cutting (no row flips)

| Task | Source | What | Notes |
|------|--------|------|-------|
| T30 | §7.2 row 2 | a11y-tree scope (chart, timeline) | Promote axis/tick/period labels into the a11y tree as **static text** — never `button`/interactive, never a D5 target. **Core snapshot contract change** (ledger entry 22). Expect golden churn on the done rows `ch-b5`/`tl-e3` — reviewed regen (§2.6), and their acceptance re-checked |
| T31 | §7.2 row 3 | N3.2 L4 a11y parity | chart + timeline: missing root/component `accessibility.label` → L4 error cases (2 each) through the full `validate()` pipeline |
| T32 | §7.2 row 4 | N4 shared conformance suite | `packages/interactive-engine/test/conformance/` helper + per-engine `conformance.test.ts` |
| T33 | §7.2 row 5 + §7.1 | N6.1 publish verification + ADR-11 | `pnpm publish:dry` + `pnpm publish:smoke` (`scripts/p7-publish-smoke.mjs`). N6.2 is already in CI — do not re-add. **Amend/confirm ADR-11; never re-record it** |

**Stop if (T30):** the a11y-tree change would make an axis node interactive or a D5 target — STOP condition 6.

---

## 11. W-6 — Workstream-D kind slices (7 rows, per-family gated)

Each slice: add its row to `docs/PLAN-P8.md` §6 **at open time** (a slice absent from that table is invisible to it) and record the **decision + rationale in that same row** (composition vs a new layout strategy) before writing any code. There is no separate "T0 decision" artifact — `PLAN.md` §11 is the Change Log, not a decision gate; if the choice is ADR-class (a new kind, a new strategy enum, a dependency), STOP and ask for an ADR instead of deciding it in a table cell. **No code until that engine family is W-1…W-5 green.** The gate is per family: the Chart slices do not wait on the Diagram cluster.

| Task | Family / slice | Rows | Notes |
|------|----------------|------|-------|
| T34 | Chart `kind: "area"` | `ch-p1` | filled path; reuses line stroke (T11) + series machinery |
| T35 | Chart `kind: "scatter"` | `ch-p2` | two quantitative dimensions; validation negatives (single-series scatter rejects) |
| T36 | Diagram `kind: "label-diagram"` | `di-p1`, `di-lab-1` | node → region-of-interest mapping; first future-kind gate |
| T37 | Diagram compare-layout / diff-emphasis | `di-cmp-1`, `di-cmp-2` | decide composition vs new layout strategy in the SPEC slice before code; `di-cmp-3` is W-3.2's, not here; a third-party layout dependency is barred by ADR-14 unless the slice produces the measurements PLAN-P8 §8a lacks (PLAN-P6) |
| T38 | Timeline `eras[]` / parallel timelines | `tl-f2` | synchronized side-by-side axes; composition vs new slice decided in SPEC; **must not reintroduce a timer** (PLAN-P5) |
| T39 | Diagram sub-700x520 media ring | — | ring falls back to an 11:6 slot below 700x520 and the arrow ratio regresses to ~2.11; pinned as debt in `test/media-layout.test.ts` and PLAN-P8 §8a. A routing-ring variant (ADR-14) would fix it at the cost of footprint |

---

## 12. T-final — Full gap-closure exit audit (no repo changes unless a defect is found)

1. Full gate: `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs`.
2. Appendix A: pending set = **7** = 5 (construct-mark deferral: `gm-mark-1/2/3`, `gm-inq-2`, `gm-asm-3`) + 2 (visual construct: `nl-place-value`, `ck-set-time`). W-6's 7 rows are **done by this point** — they are not part of the pending set. Every other row `done` or explicitly deferred per Appendix B.
3. Every `done` row's acceptance re-checked (the T2/W-1-phase-gate discipline, repeated).
4. Catalogs, SPECs, schemas, engine-skills mutually consistent (`pnpm generate:skills` produces no diff).
5. Any defect found → reopen/record like `ch-l1`; never paper over it.

---

## 13. Out of scope (do not do, ever, in this programme)

- Scoring, i18n, telemetry, Studio, assessment logic (D6/D7 — OpenEdu owns them).
- New libraries beyond ADR-10 `d3-geo`; ELK/Recharts/MapLibre/Konva.
- New D5 action names besides `bearing` (T14). Engine-namespaced **events** are fine; actions are not.
- Timers/`setInterval` in any engine.
- Widening `additionalProperties` or relaxing a validation negative to make a test pass.
- Editing a catalog row's acceptance text to match broken behavior (fix the behavior or reopen the row).
- Flipping any row outside your task's list (Appendix B is the authority).
- Timeline/flowchart/label-diagram creep into Visual (D9).

---

## Appendix A — Verification scripts (run verbatim; do not retype from memory)

**A1 — Coverage: every non-done catalog row must be mentioned by the plan.** Outputs `UNCOVERED: 0` on a healthy plan.

```bash
python3 - <<'PY'
import re,glob
plan=open('docs/superpowers/specs/2026-09-30-use-case-gap-closure-plan.md').read()
def short(rid):
    o=[]
    for s in rid.split('-'):
        o.append(s)
        if s.isdigit() or re.fullmatch(r'[a-z]\d+',s): break
    return '-'.join(o)
cov=set()
for m in re.finditer(r'([a-z]{2,3}-[a-z]+-(\d+))((?:[/…-]\d+)*)',plan):
    base,pre,first=m.group(1),m.group(1).rsplit('-',1)[0],int(m.group(2))
    cov.add(base); g=m.group(3)
    if '…' in g:
        n=int(re.findall(r'\d+',g)[-1])
        for k in range(min(first,n),max(first,n)+1): cov.add(f"{pre}-{k}")
    else:
        for t in re.findall(r'\d+',g): cov.add(f"{pre}-{int(t)}")
rows=[]
for f in sorted(glob.glob('docs/use-cases/*.md')):
    if f.endswith('README.md'): continue
    for b in re.split(r'\n(?=### )',open(f).read()):
        m=re.match(r'### `([a-z0-9-]+)`',b)
        if not m: continue
        st=re.search(r'\*\*Status\*\* \| `?([a-z-]+)',b)
        if st and st.group(1)!='done': rows.append((m.group(1),short(m.group(1))))
un=[r for r,s in rows if r not in plan and s not in plan and s not in cov]
print("non-done rows:",len(rows),"  UNCOVERED:",len(un),un)
PY
```

The `[a-z]{2,3}` prefix matters: catalog families are not all two letters (`geo-*`), and some segments are letter-digit (`di-m3-*`). A two-letter-only matcher silently drops those rows and still reports "covered" — if you edit this script, re-check it against a 3-letter row.

**A2 — Ledger arithmetic.** Buckets must sum to 100: `57 + 6 + 20 + 3 + 7 + 5 + 2`; per engine `3+2+2=7`, `2+1+2=5`, `1+1=2`, `28+2+3+5=38`, `24+20+4=48`; status mix `99 planned + 1 widget-preferred`. These are **ownership** buckets (gap-closure plan §10), not a flip schedule. The flip schedule is: W-1 flips 55 (holding `gm-dir-1`/`gm-nav-2` for T13) → pending `45`; W-2 flips 8 (its own 6 + T13's 2) → `37`; W-3 −20 → `17`; W-4 −3 → `14`; W-6 −7 → `7` (the 5 construct-mark deferrals + 2 visual constructs, which never flip). Do not derive one from the other.

**A3 — Markdown table integrity** (any plan/catalog file): every row of a table must have the same cell count as its header, ignoring escaped pipes (`\|`, the convention for enum alternatives inside a cell). Note the `python3 - <paths> <<'PY'` invocation — the paths go **after** the `-`, otherwise they never reach the script and it silently checks every `docs/**/*.md`:

```bash
python3 - docs/superpowers/specs/*.md <<'PY'
import re,sys,glob
def cells(line): return line.replace('\\|','').count('|')
bad=0
for f in sys.argv[1:] or glob.glob('docs/**/*.md',recursive=True):
    lines=open(f).read().split('\n'); i=0
    while i<len(lines):
        if lines[i].startswith('|') and i+1<len(lines) and re.match(r'^\|[\s:-]+\|',lines[i+1]):
            n=cells(lines[i]); j=i+2
            while j<len(lines) and lines[j].startswith('|'):
                if cells(lines[j])!=n: print(f'  MISMATCH {f}:{j+1}'); bad+=1
                j+=1
            i=j
        else: i+=1
print('mismatches:',bad)
PY
```

Run with the files you touched. Expect `mismatches: 0` for those. A naive `line.count('|')` reports false positives on any row containing `\|` — do not "fix" such a report by deleting the escape.

Known pre-existing baseline (a repo-wide run reports 9 sites, all unrelated to this programme — report them, do not fix them in your PR): `docs/PLAN.md:452`, `docs/PLAN-P3.md:66`, `docs/PLAN-P4.md:69`, `docs/PLAN-P7.md:70`, `docs/engines/visual/SPEC.md:3102-3105` (4-column header, 3-column rows), `docs/engines/visual/skills/educational-visual/SKILL.md:94`.

**A4 — Task delta (run after each flipping task).** A1's script is hard-wired to the gap-closure plan, so the delta check reads the catalogs directly:

```bash
python3 - <<'PY'
import re,glob
rows={}
for f in sorted(glob.glob('docs/use-cases/*.md')):
    if f.endswith('README.md'): continue
    for b in re.split(r'\n(?=### )',open(f).read()):
        m=re.match(r'### `([a-z0-9-]+)`',b)
        if not m: continue
        s=re.search(r'\*\*Status\*\* \| `?([a-z-]+)',b)
        if s: rows[m.group(1)]=s.group(1)
nd=[r for r,s in rows.items() if s!='done']
print('total',len(rows),' non-done',len(nd))
print('still non-done:',len(nd))
PY
git diff --stat docs/use-cases/ && git diff docs/use-cases/
```

Expect: `total 169` and a `non-done` count equal to the previous phase-gate number minus exactly your rows; `git diff docs/use-cases/` must touch **Status cells only** (paste the diff in the PR body). If the count moved by more or less than your row list, a row was flipped that isn't yours — revert and re-read Appendix B.

---

## Appendix B — The 100-row manifest (bucket → rows → owning task)

**W-1 fixture-only, 57:**

- Visual (3): `nl-compare-distance` (T1), `ck-which-hand` (T1), `geo-identify-vertex` (T1; conditional — falls back to a named W-2 entry if unscoped)
- Chart (2): `ch-l4-time-series` (T2), `ch-x3-guided-narrow` (T2)
- GeoMap (28): T3 (22): `gm-loc-1`, `gm-move-2`, `gm-move-3`, `gm-dist-1`, `gm-dist-2`, `gm-dist-4`, `gm-cmp-1`, `gm-cmp-2`, `gm-cmp-3`, `gm-ovl-1`, `gm-ovl-2`, `gm-ovl-3`, `gm-r4`, `gm-dist-3`, `gm-t2`, `gm-move-1`, `gm-move-4`, `gm-inq-1`, `gm-leg-1`, `gm-leg-2`, `gm-scale-1`, `gm-scale-2` · T4 (4): `gm-x2-guided-composed`, `gm-loc-2-multi-locate`, `gm-hist-2-place-memory`, `gm-asm-1-board-map-skill` · T13 (2): `gm-dir-1`, `gm-nav-2`
- Diagram (24): T5 (8): `di-proc-1`, `di-proc-2`, `di-proc-3`, `di-proc-4`, `di-cycl-1`, `di-cycl-2`, `di-cycl-4`, `di-cycl-5` · T6 (8): `di-class-1`, `di-class-2`, `di-class-3`, `di-class-4`, `di-class-6`, `di-sys-2`, `di-sys-3`, `di-ord-2` · T7 (8): `di-inq-1`, `di-inq-2`, `di-asm-1`, `di-asm-2`, `di-asm-3`, `di-cause-1`, `di-cause-2`, `di-lab-2`

**W-2 contract, 6:** `cs-pick-n` (T8), `fr-shade-n-parts` (T9), `ch-x2-multi-measure` (T10), `tl-f1-duration-events` (T12), `gm-nav-1-follow-compass` + `gm-dir-2-north-of` (T14). Plus reopened-done `ch-l1-read-trend` (T2 reopen → T11 re-flip; not one of the 100).

**W-3 contract, 20:** T16: `di-cycl-3`, `di-sys-1`, `di-lab-4` · T17: `di-hist-1`, `di-hist-2`, `di-hist-3`, `di-hist-4`, `di-cmp-3` · T18: `di-cause-3` · T19: `di-proc-5`, `di-class-5`, `di-sys-4` · T20: `di-cause-6` · T21: `di-cause-5` · T22: `di-cause-4` · T23: `di-inq-3` · T24: `di-ord-1`, `di-ord-3` · T25: `di-lab-3` · T26: `di-m3-cyclic-concept-map` (`di-sys-1` is claimed by T16 and T19; counted once).

**W-4 contract, 3:** `gm-hist-1`, `gm-hist-3` (T27), `gm-asm-2` (T28).

**W-6 future kinds, 7:** `ch-p1` (T34), `ch-p2` (T35), `di-p1` + `di-lab-1` (T36), `di-cmp-1` + `di-cmp-2` (T37), `tl-f2` (T38).

**Explicit deferral, 5 (never flip in this programme):** `gm-mark-1`, `gm-mark-2`, `gm-mark-3`, `gm-inq-2`, `gm-asm-3`.

**Visual deferred construct, 2 (never flip in this programme):** `nl-place-value` (`widget-preferred`), `ck-set-time` (`planned`).

Check: 57 + 6 + 20 + 3 + 7 + 5 + 2 = 100.

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-30 | Initial implementation plan derived from the gap-closure plan at `20310c6`: T0–T38 + T-final, agent contract, global protocol, verification scripts, 100-row manifest. |
