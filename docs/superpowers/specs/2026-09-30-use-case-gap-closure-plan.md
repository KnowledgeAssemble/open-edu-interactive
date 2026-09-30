# Use-Case Gap Closure Plan

**Date:** 2026-09-30
**Authority (top to bottom):** `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → `docs/use-cases/<engine>.md` → per-engine `SPEC.md`
**Audience:** AI coding agents, maintainers, engine implementers
**Branch:** `feat/u-gap-closure`
**Extends:** `docs/superpowers/specs/2026-09-13-interactive-engine-next-phase-implementation-plan.md` (N0–N6). This plan assumes N1 is green (chart/timeline goldens + render honesty) and carries N1.8 and N2–N6 forward where they serve use-case closure.

---

## 0. Snapshot (verified 2026-09-30)

| Engine | `done` rows | pending rows | distinct capability gaps |
|--------|-------------|--------------|--------------------------|
| Visual | 12 | 7 | 5 (2 fixture-only) |
| Chart | 11 | 5 | 3 + line-stroke follow-on (N1.8) |
| Timeline | 17 | 2 | 2 |
| GeoMap | 10 | 38 | ~10 capabilities (catalog is stale — see §0.1) |
| Diagram | 19 | 48 | ~14 capabilities (0 code hits — genuinely unimplemented) |

### 0.1 Verified facts this plan depends on

- **GeoMap catalog is stale.** `docs/engines/geomap/SPEC.md` §8.2 already documents scale bar, `encoding` (attr-encoding), `measure`, `categories`/`adjacentTo`, route-segment interactivity, and legend-link; §66 already documents `geomap.route-step`, `geomap.filter-applied`, `geomap.layer-toggled`, `geomap.legend-linked`, `geomap.entity-selected/focused`. Private fixtures `linear/`, `encoding/`, `route-step/`, `overlay/` carry full goldens. The use-case rows still say `planned`. **W-1 reconciles catalog → SPEC → runtime.**
- **GeoMap golden determinism risk:** `india-coastal` was dropped from the golden suite pending cross-platform centroid determinism (commits b22f408, 61c76f3). Either resolve or document the exclusion before claiming geo coverage.
- **Diagram planned capabilities have zero hits in `src/`** — the 48 `planned` rows map to real, unimplemented contract additions (plus ~20 rows that are fixture-only).
- **Chart `kind: line` has no series stroke** — discrete point markers only (N1.8). This is an *acceptance failure* of `ch-l1-read-trend` ("path visible between points"), not just an aesthetic note.
- **Per-item interactive gating is unimplemented** in chart/diagram/timeline; every node/edge/marker is `interactive: true`. GeoMap/Visual already carry item-level `interactive`, giving a house pattern for the SPEC.
- **Visual `highlightVertices`** is already a named guided-signal prop in `docs/engines/visual/SPEC.md`; `geo-identify-vertex` needs its *discovery* scoping verified/landed (only vertices of the target type are candidates, not all sides).

### 0.2 Operating rules (non-negotiable)

- **Contract-first:** any prop, action, kind, or event lands in the engine SPEC + schema + `docs/schemas/` mirror before code (`AGENTS.md` — namespaced, deliberate, documented).
- **2+ use-case rule:** new props/contract changes require two or more catalogued use cases, **or** one case explicitly promoted to a slice exit gate (`docs/use-cases/README.md`). Promotions are named in §4.
- **Test-first (A4 bar):** a feature is done only when a test that fails on stub output then passes. Golden updates are reviewed fixture changes.
- **Evidence over intent:** a row flips to `done` only when fixture + acceptance + e2e are green — never on the catalog author's say-so.
- **Semantic-first, deterministic, provenance, P6 a11y, P7 D7 boundary** per DESIGN.

---

## 1. Scope and non-goals

**In scope.** Close every `planned` / `ux-debt` row across the five catalogs: (a) fixtures + goldens + e2e for rows already expressible on current mechanics, (b) small per-engine contract additions, (c) the diagram interaction cluster, (d) geomap period-slice + attr-encoding honesty, (e) cross-cutting mechanics (per-item gating, a11y-tree scope, N2–N6), and (f) Workstream-D kind slices as per-family SPEC-gated tasks.

**Deferred (explicit, by direction or by existing policy):**

| Item | Why | Bookkeeping |
|------|-----|-------------|
| GeoMap `construct-mark` (gm-mark-1…3, gm-inq-2, gm-asm-1 marking part, gm-asm-3) | Deferred by direction | Rows stay `planned`; note pending in the row's Status |
| Visual construct `nl-place-value`, `ck-set-time` | Same construct-action family; already `widget-preferred` ($math.number-line$) until a construct slice is gated | Stay `widget-preferred` / `planned` |
| Scoring, i18n, telemetry, Studio | D6/D7 | Out of scope permanently |
| New libraries beyond ADR-10 `d3-geo` | PLAN-P8 §0 | No D3-scale/time, ELK, Recharts, MapLibre, Konva |

---

## 2. Sequencing and dependency graph

```
W-1  Catalog reconciliation + fixtures for already-expressible rows (all engines)
   └─► W-2  Mechanics contract additions (Visual, Chart, Timeline, GeoMap)
           └─► W-3  Diagram interaction extensions (largest cluster; depends on W-2 patterns)
           └─► W-4  GeoMap period-slice + attr-encoding honesty
           └─► W-5  Cross-cutting mechanics + N2–N6 hardening (can overlap W-3/W-4)
           └─► W-6  Workstream-D kind slices — per-family SPEC gate BEFORE ANY CODE (PLAN.md §11)
```

- W-1 is the cheapest and most honest: it flips ~60% of `planned` rows by landing fixtures on mechanics that already exist, and it corrects the stale geomap catalog.
- W-5's per-item gating is the multiplier: every guided-select future row in chart/diagram/timeline consumes it. Land it before the guided rows in W-3 are claimed complete.
- **Workstream D must not start** for an engine family until that family is W-1…W-5 green (PLAN-P8: "Workstream D MUST NOT start until A is green").

---

## 3. W-1 — Catalog reconciliation + fixtures for already-expressible rows

Exit gate per engine: catalog statuses flipped with evidence; new fixtures carry `expected.{scene,svg,a11y[.alternative]}.json` + `validation.json`; e2e asserts the acceptance; full repo gate green.

### 3.1 Visual

| UC | Task |
|----|------|
| `nl-compare-distance` | Fixture `number-line-compare-distance` — `highlight: [3, 7]`, dual emphasis, guided or discovery per fixture; event distinguishes id; no per-step marker blobs. |
| `ck-which-hand` | Fixture `clock-discovery-minute` — `interactive: true`, both hands selectable, `highlightHand` styling only. |
| `geo-identify-vertex` | Verify `highlightVertices` discovery scoping (only target-type vertices are candidates, not all sides; visual/SPEC+validation already name the prop). Land scoping fixture `geometry-discovery-vertex`; if the reducer/render does not scope, treat as W-2 work (add to §4). |

Statuses: three rows `planned → done` on green.

### 3.2 Chart

| UC | Task |
|----|------|
| `ch-l4-time-series` | Fixture with `dimensions[].type: "time"` (ISO-8601). Validation parity already exists in `validation.test.ts`; add golden `scene/svg/a11y` + e2e select on a time point. Silver line stroke from §4.2 covers "line renders with ordered time scale". |
| `ch-x3-guided-narrow` | Derive a guided fixture from `bar/` (host `filter` to one rowId → learner `select` → `clear-filter`/`reset` between steps); e2e scripted dispatch. |

Statuses: two rows `planned → done`.

### 3.3 GeoMap — reconciliation audit (the staleness fix)

1. **Audit table.** For each SPEC §8.2/§66 capability, assert the runtime supports it and map the catalog rows onto the existing private fixtures:

| Capability | SPEC § | Catalog rows it serves | Fixture evidence |
|------------|--------|-------------------------|------------------|
| linear-feature | §8.2 route `interactive` | gm-loc-1, gm-move-2/3 | `linear/` |
| attr-encoding (fill/size) | §8.2 `encoding`/`measure` | gm-dist-1/2/4, gm-cmp-1/2, gm-ovl-1…3, gm-mark-3*, gm-asm-2 | `encoding/` |
| filter-category | §66 `filter-applied` | gm-r4, gm-dist-3, gm-move-3 | `encoding/`+e2e |
| route-step | §66 `route-step` | gm-t2, gm-move-1/4 | `route-step/` |
| layer-visibility/toggle | §66 `layer-toggled` | gm-ovl-1…3, gm-inq-1, gm-asm-3* | `overlay/` |
| legend-link | §66 `legend-linked` | gm-leg-1/2 | — |
| scale-bar | §8.2 `scaleBar` | gm-scale-1/2 | `region/`+e2e |
| adjacency | §8.2 `adjacentTo` | gm-dir-1, gm-nav-2 | see §4.4 |

2. **Flip confirmed rows** `planned → done` with per-row acceptance + e2e. Where the runtime diverges from SPEC, fix the **SPEC** (or the code, with a named W-2 task) — never silently relax.
3. **Golden determinism:** resolve `india-coastal` centroid variance (cross-platform) or document the exclusion in the fixture README. Keep the golden suite byte-stable.
4. **Workflow fixtures:** `gm-x2-guided-composed` and `gm-loc-2-multi-locate` (sequential `select` + `reset`; mechanics exist) — derive a composed fixture from `odisha-coastal` with guided flags; e2e asserts a monotonic select/reset/select log.

### 3.4 Diagram — `nios/` fixture pass (rows with `New capability: —`)

These rows are course variants of the done baseline (`done` mechanics; the catalog's own table names them, e.g. "course variant of di-h2"). Add a `nios/*` fixture + acceptance + goldens each and flip `planned → done`. No contract change.

- `di-proc-1` follow-process, `di-proc-2` input-output (scored variant of di-x4), `di-proc-3` which-step (reverse read), `di-proc-4` branch-flow (fan-out is ordinary DAG)
- `di-cycl-1` water-cycle-course, `di-cycl-2` life-cycle, `di-cycl-4` disaster-cycle, `di-cycl-5` social-cycle
- `di-class-1` classify, `di-class-2` part-whole, `di-class-3` gov-levels, `di-class-4` sector-taxonomy, `di-class-6` parent-locate
- `di-sys-2` drainage-basin (roles = node metadata), `di-sys-3` industrial-linkages
- `di-ord-2` insert-missing (host defines the blank; candidates partially linked)
- `di-inq-1` explain-why, `di-inq-2` open-explore
- `di-asm-1` read-diagram, `di-asm-2` validate-diagram (surface `tryCreate`-style validation as a learnable check), `di-asm-3` evidence-essay

Remaining `planned` rows are carried into W-3 (capability-bearing rows).

---

## 4. W-2 — Mechanics contract additions (per family)

Contract-first. Every row: engineer SPEC §, schema + `docs/schemas/` mirror, reducer + render + goldens + e2e, engine-skills regeneration (`pnpm generate:skills`) if authoring guidance changes.

### 4.1 Visual

| Capability | Use cases | Surface | Rule note |
|------------|-----------|---------|-----------|
| `maxSelection` | `cs-pick-n` | Optional `maxSelection` on counting-set component; validator ranges it (`≥0`, absent = unlimited); reducer rejects over-limit select deterministically | **Promoted slice** (single use case — README rule §0.2) |
| Selection-driven fraction fill | `fr-shade-n-parts` | Reducer/snapshot decision: track selected parts in state; render fills on selection (deterministic). Decide engine-state vs static-emphasis in the visual SPEC before coding | — |

### 4.2 Chart

| Capability | Use cases | Surface |
|-----------|-----------|---------|
| Multi-measure grouped bars | `ch-x2-multi-measure` | `measures[]` length ≥ 2 over one dimension; node ids `{measureId}-bar-{rowId}`; legend distinguishes measures; tabular lists all values; grouped bar render + goldens |
| Line series stroke | `ch-l1…l3` (closes N1.8) | `<polyline>`/`<path>` in dimension order between point markers; note that point markers remain selectable; update `expected.svg` goldens as reviewed change; re-word N1.2 |

### 4.3 Timeline

| Capability | Use cases | Surface |
|-----------|-----------|---------|
| Duration events | `tl-f1-duration-events` | `events[].duration` or `to` (future contract); events render as span bars instead of point markers; alt list exposes duration; SPEC + schema + validation negatives (`from`/`to` guards, ISO grammar reuse) |

### 4.4 GeoMap

| Capability | Use cases | Surface |
|-----------|-----------|---------|
| Adjacency in alternative list | `gm-dir-1`, `gm-nav-2` | Surface `adjacentTo` neighbor sets in the alternative/snapshot (schema field exists at SPEC §8.2); nothing invented — adjacency derives from authored `adjacentTo` plus true region-overlap detection already used in L3 validation |

---

## 5. W-3 — Diagram interaction extensions

Ordered by dependency. All contract-first (SPEC kinds & laws, actions, events; graph laws remain authoritative). Fixtures named in the catalog rows.

| # | Capability | Use cases | Surface | Depends on |
|---|-----------|-----------|---------|-----------|
| W-3.1 | `relation-vocab` | di-cycl-3, di-sys-1, di-lab-4 | Extend closed `relationship` enum (`feeds-on`, `transforms-to`, `produces`, `weathers-into`) | — (schema) |
| W-3.2 | `links` vocabulary | di-hist-1…4, di-cmp-3 | `nodes[].links` beyond `visualEntityId`: add `timelineEventId`, `geomapEntityId`; verify resolution in composition | — |
| W-3.3 | `multi-select` | di-cause-1/2, di-lab-2, di-hist-3 | Cumulative selection set; set-scored dispatch surface (SPEC decides accumulate-on-select vs new action); namespaced `diagram.*` | — |
| W-3.4 | `edge-select` | di-cause-3 | Edges become selectable targets; `diagram.edge-selected` | — |
| W-3.5 | `filter-nodes` | di-proc-5, di-class-5, di-sys-1/4 | D5 `filter` on node `category`; `diagram.filter-applied`; grey-out semantics | — |
| W-3.6 | `relationship-gate` | di-cause-6 | Edge labels hidden until `answer`; reveal then `follow`; deterministic | — |
| W-3.7 | `edge-weight` | di-cause-5 | Semantic `strength` metadata on edges (data, never style) | — |
| W-3.8 | `follow-chain` | di-cause-4 | Per-step emphasis along a multi-edge path (can sit on `follow` + step state) | — |
| W-3.9 | `what-if` | di-inq-3 | Non-destructive node de-emphasis; event log records the choice; spec never mutated | — |
| W-3.10 | `construct-order` | di-ord-1, di-ord-3 | Shuffled candidates + ordered `answer` (construct mode) | W-5 gating pattern |
| W-3.11 | `construct-edge` | di-lab-3, di-ord-3 | Learner-authored edges validated by graph laws | — |

Exit gate: all W-3 fixtures green (fixtures per catalog row under `nios/di-*`), full repo gate.

---

## 6. W-4 — GeoMap mechanics + encoding honesty

| Capability | Use cases | Surface |
|-----------|-----------|---------|
| `period-slice` | gm-hist-1/3 | Region/boundary sets keyed by period; shared `play-pause`/`scrub` (reuse Timeline playback semantics, namespaced `geomap.*` events); snapshot exposes active slice; deterministic transitions |
| Encoding honesty (data-literacy) | gm-asm-2 | Rule in SPEC: encoding is never misleading by construction — explicit `breakpoints`; alternative list is ground truth and must contradict any visual exaggeration |
| Coverage confirmation | gm-move-1/2/3/4, gm-hist-2 | Land e2e for route-step, linear-feature, filter-category over the existing fixtures; flip statuses on green |

Deferred: `gm-mark-*`, `gm-inq-2`, and the marking part of `gm-asm-1`/`gm-asm-3` (construct-mark) — see §1. The non-construct remainder of `gm-asm-1` (loc/identify/trace items) proceeds under W-1/W-4 mechanics.

---

## 7. W-5 — Cross-cutting mechanics + N2–N6 hardening

| Item | Scope | Notes |
|------|-------|-------|
| Per-item `interactive` gating | chart, diagram, timeline | Item-level `interactive` (authoring signal) + reducer enforcement. House pattern already exists in Visual/GeoMap. Qualifies under the 2+ rule (guided-select rows in all three engines). SPEC each engine before code. |
| A11y-tree scope | chart, timeline | Promote axis/tick/period labels into the a11y tree (currently `aria-label`-only). Snapshot contract change — record + implement (serves `ch-b5-read-value`, `tl-e3-read-date` a11y acceptance). |
| N2 — shared instance factory (ADR-11) | core + 5 engines | Evaluate refactor vs documented divergence (recommendation in N2.1: likely (b) unless bugfix pain). Record ADR-11. |
| N3 — L4 a11y parity | chart, timeline | Missing root/component `accessibility.label` → L4 error cases (2 each) through full `validate()` pipeline. |
| N4 — shared conformance suite | all engines | `packages/interactive-engine/test/conformance/` helper + per-engine `conformance.test.ts`. |
| N6 — release verification | repo | `pnpm publish:dry` + `scripts/p7-publish-smoke.mjs` + freshness guard wired into CI. |

---

## 8. W-6 — Workstream-D kind slices (SPEC-gated per family)

Each becomes its own PLAN task with a T0 decision (PLAN.md §11) and a SPEC slice. **No code until the family's W-1…W-5 exit is green.**

| Family | Slice | Catalog rows | Notes |
|--------|-------|--------------|-------|
| Chart | `kind: "area"` | ch-p1 | Filled path; reuses line stroke + W-2 series machinery |
| Chart | `kind: "scatter"` | ch-p2 | Two quantitative dimensions/measures; validation negatives (reject single-series scatter) |
| Diagram | `kind: "label-diagram"` | di-p1, di-lab-1…4 | Node → region-of-interest mapping; first future-kind gate to pull forward |
| Diagram | `compare-layout` / `diff-emphasis` | di-cmp-1…3 | Decide composition vs new layout strategy in the SPEC slice before code |
| Timeline | `eras[]` / parallel timelines | tl-f2 | Synchronized side-by-side axes; composition vs new slice decided in SPEC |

---

## 9. Deferrals summary

| Deferred | Rows | Why |
|----------|------|-----|
| GeoMap `construct-mark` | gm-mark-1…3, gm-inq-2, gm-asm-1 (mark), gm-asm-3 | Direction (this plan); big D5-adjacent construct contract |
| Visual construct | nl-place-value, ck-set-time | Same construct-action family; widget-preferred until a construct slice is gated |

Record the deferral in each row's Status (e.g. `` `planned` (construct-mark deferred) ``) so the catalog self-documents.

---

## 10. Exit gates

Per workstream: `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs`.

| Substage | Green when |
|----------|------------|
| W-1 | Catalog statuses match runtime for every audited row; new fixtures assert acceptance; full repo gate green |
| W-2 | Each contract addition has SPEC + schema + goldens + e2e; promotion notes recorded in the catalogs |
| W-3 | All 48 `planned` diagram rows flipped or carried as explicit deferrals; `diagram.spec.ts`/unit green |
| W-4 | period-slice + encoding-honesty landed; geomap catalog reconciled |
| W-5 | Per-item gating live in chart/diagram/timeline; a11y tree change landed; ADR-11 recorded; conformance suite green; N6 checks pass |
| W-6 | Per-slice PLAN task + SPEC + fixtures; not all of W-6 needs to be done for the gap-closure summary |

**Full gap-closure exit:** every `planned`/`ux-debt` row across the five catalogs is `done` or carries an explicit deferral note; catalogs, SPECs, schemas, and engine-skills are mutually consistent; full repo gate green.

---

## 11. Contract additions ledger (summary)

| # | Engine | Capability | Rows | Surface |
|---|--------|-----------|------|---------|
| 1 | Visual | `maxSelection` | cs-pick-n | counting-set component prop + reducer enforcement (promoted slice) |
| 2 | Visual | fraction fill-on-select | fr-shade-n-parts | selection-driven shading state |
| 3 | Chart | grouped multi-measure | ch-x2-multi-measure | `measures[]` ≥ 2 render + node ids + legend |
| 4 | Chart | line series stroke | ch-l1…l3 (N1.8) | `<polyline>`/`<path>` connector |
| 5 | Timeline | duration events | tl-f1-duration-events | `events[].duration`/`to` + span bars |
| 6 | GeoMap | adjacency alternative | gm-dir-1, gm-nav-2 | `adjacentTo` in alternative list |
| 7 | GeoMap | `period-slice` | gm-hist-1/3 | period-keyed region sets + playback |
| 8 | GeoMap | encoding honesty rule | gm-asm-2 | breakpoints + alternative-as-truth |
| 9 | Diagram | `relation-vocab` | di-cycl-3, di-sys-1, di-lab-4 | extended `relationship` enum |
| 10 | Diagram | `links` vocabulary | di-hist-1…4, di-cmp-3 | `nodes[].links` + `timelineEventId`/`geomapEntityId` |
| 11 | Diagram | `multi-select` | di-cause-1/2, di-lab-2, di-hist-3 | cumulative selection set |
| 12 | Diagram | `edge-select` | di-cause-3 | selectable edges; `diagram.edge-selected` |
| 13 | Diagram | `filter-nodes` | di-proc-5, di-class-5, di-sys-1/4 | D5 `filter` on `category`; `diagram.filter-applied` |
| 14 | Diagram | `relationship-gate` | di-cause-6 | hidden edge labels until answer |
| 15 | Diagram | `edge-weight` | di-cause-5 | `strength` metadata |
| 16 | Diagram | `follow-chain` | di-cause-4 | per-step path emphasis |
| 17 | Diagram | `what-if` | di-inq-3 | non-destructive de-emphasis |
| 18 | Diagram | `construct-order` / `construct-edge` | di-ord-1/3, di-lab-3 | learner-authored structure + graph-law validation |
| 19 | Cross | per-item `interactive` gating | chart/diagram/timeline guided rows | item-level `interactive` + reducer enforcement |

Deferred to W-6 (SPEC-gated kinds): chart `area`/`scatter`, diagram `label-diagram`/`compare-layout`/`diff-emphasis`, timeline `eras[]`/parallel timelines.

---

## 12. Change log

| Date | Change |
|------|--------|
| 2026-09-30 | Initial plan: distills all `planned`/`ux-debt` rows in `docs/use-cases/*.md` into W-1…W-6; reconciles stale geomap catalog; defers construct-mark (direction) and Visual construct rows (widget-preferred). |