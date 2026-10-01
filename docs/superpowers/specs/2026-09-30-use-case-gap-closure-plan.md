# Use-Case Gap Closure Plan

**Date:** 2026-09-30
**Authority (top to bottom):** `docs/DESIGN.md` → `docs/INTERACTIVE-ENGINE-SPEC.md` → `docs/use-cases/<engine>.md` → per-engine `SPEC.md`
**Audience:** AI coding agents, maintainers, engine implementers
**Branch:** `feat/u-gap-closure`
**Extends:** `docs/superpowers/specs/2026-09-13-interactive-engine-next-phase-implementation-plan.md` (N0–N6). This plan assumes N1 is green (chart/timeline goldens + render honesty) and carries N1.8 and the still-open N2–N6 items forward where they serve use-case closure. N2.1, N3.1, N5.1, and N6.2 are already delivered upstream — see the W-5 status reconciliation in §7 before scheduling that work.

---

## 0. Snapshot (verified 2026-09-30)

| Engine | `done` rows | pending rows | distinct capability gaps |
|--------|-------------|--------------|--------------------------|
| Visual | 12 | 7 | 5 (2 fixture-only) |
| Chart | 11 | 5 | 3 + line-stroke follow-on (N1.8) |
| Timeline | 17 | 2 | 2 |
| GeoMap | 10 | 38 | ~10 capabilities (catalog is stale — see §0.1) |
| Diagram | 19 | 48 | ~14 capabilities (0 code hits — genuinely unimplemented) |

`done`/`pending` are the `**Status**` cell counts per catalog (visual 6 `planned` + 1 `widget-preferred` = 7 pending; 100 pending rows total). Two things the counts do not show:

- **No `ux-debt` row is open anywhere.** Visual's three `ux-debt` entries (`nl-identify-marked`, `number-line-practice`, `cg-plot-point`) are all marked *Done*, so the "close every `ux-debt` row" clause in §1 is currently vacuous — the real work is the 100 pending rows (99 `planned` + 1 `widget-preferred`).
- **At least one `done` row is false.** `ch-l1-read-trend` is `done` but its acceptance ("path visible between points") fails against the current renderer — see §0.1 and §10. Pending-row counts alone cannot surface this class of defect.

### 0.1 Verified facts this plan depends on

- **GeoMap catalog is stale.** `docs/engines/geomap/SPEC.md` §8.2 already documents scale bar, `encoding` (attr-encoding), `measure`, `categories`/`adjacentTo`, route-segment interactivity, and legend-link. §30 dispatches the **D5 actions** `select`/`focus`/`toggle`/`step`/`scrub`/`filter`/`clear-filter` and emits the namespaced **events** `geomap.layer-toggled`, `geomap.route-step`, `geomap.filter-applied`, `geomap.legend-linked`, `geomap.entity-selected`/`entity-focused` (each row's Trigger column names the causing D5 action) — **not** §66, which is a stub carrying a single pre-D5 `entitySelected` example and no `geomap.*` names. Private fixtures `linear/`, `encoding/`, `route-step/`, `overlay/` carry full goldens. The use-case rows still say `planned`. **W-1 reconciles catalog → SPEC → runtime, and repoints §66 at §30** (§3.3 task 5).
- **GeoMap golden determinism risk:** `india-coastal` was dropped from the golden suite by `61c76f3` pending cross-platform centroid determinism. The adjacent undefined-key equality variance was already fixed by `b22f408` (goldens now compared by serialized form), so the residual question is centroid arithmetic only. Either resolve it or document the exclusion before claiming geo coverage.
- **Diagram planned capabilities have zero hits in `src/`** — the 48 `planned` rows map to real, unimplemented contract additions (plus ~20 rows that are fixture-only).
- **Chart `kind: line` has no series stroke** — discrete point markers only (N1.8). This is an *acceptance failure* of `ch-l1-read-trend` ("path visible between points"), not just an aesthetic note: the row is currently `done`. `packages/chart-engine/fixture/line/expected.svg` holds only `<circle>` markers plus gridlines, and no `<polyline>`/`<path>` series code exists in `packages/chart-engine/src/`. Note only `ch-l1`'s acceptance requires the path — `ch-l2`/`ch-l3` acceptance is peak/trough identification and does not. See §10 for the reopen.
- **Per-item interactive gating is unimplemented** in chart/diagram/timeline; every node/edge/marker is `interactive: true`. GeoMap/Visual already carry item-level `interactive` (e.g. `docs/schemas/geomap-spec.schema.json:178,215`), giving a house pattern for the SPEC.
- **Visual `highlightVertices`** is already a named guided-signal prop in `docs/engines/visual/SPEC.md`; `geo-identify-vertex` needs its *discovery* scoping verified/landed (only vertices of the target type are candidates, not all sides).
- **Five pending rows had no home in the first draft** — `di-m3-cyclic-concept-map`, `gm-nav-1-follow-compass`, `gm-dir-2-north-of`, `gm-cmp-3-relief-order`, `gm-hist-2-place-memory`. All five are now assigned: `di-m3` → W-3.12, `gm-nav-1`/`gm-dir-2` → W-2.7 (§4.4), and `gm-cmp-3`/`gm-hist-2` → W-1 §3.3 (both are expressible on current mechanics). §10 carries a row-disjoint assignment ledger summing to 100 so no row can fall through silently.

### 0.2 Operating rules (non-negotiable)

- **Contract-first:** any prop, action, kind, or event lands in the engine SPEC + schema + `docs/schemas/` mirror before code (`AGENTS.md` — namespaced, deliberate, documented).
- **D5 is closed on actions; engine-namespaced on events.** `interaction.actions` is the D5 enum and is never widened by an engine to express a capability D5 already names — an engine **extends the payload**, it does not add an action name. So `select`, `focus`, `filter`, `clear-filter`, `toggle`, `step`, `scrub`, `answer`, `follow`, `expand`, `connect`, `deselect` cover "select an edge", "filter by node category", "step a route", "reveal a gated edge" and so on; each engine SPEC documents the engine-specific payload and the **namespaced event** it emits (`geomap.route-step`, `diagram.*`), following the geomap §30 pattern (Trigger column names the causing D5 action). A new *action* name is a core `INTERACTIVE-ENGINE-SPEC` change requiring a deliberate enum addition, and this plan proposes exactly one: `bearing` (W-2.7). Adding a `geomap.*`/`diagram.*` **action** to dodge a payload extension is the engine-smuggling anti-pattern and is out of bounds here.
- **2+ use-case rule** (`docs/use-cases/README.md`): new props/contract changes require two or more catalogued use cases, **or** one use case explicitly promoted to a slice exit gate. Every §11 ledger entry therefore carries a `Rule` cell (`2+` or `promoted`); single-use-case capabilities are promotions and their slice exit gates are named in §4/§5.
- **Test-first (A4 bar):** a feature is done only when a test that fails on stub output then passes. Golden updates are reviewed fixture changes.
- **Evidence over intent, in both directions:** a row flips to `done` only when fixture + acceptance + e2e are green — never on the catalog author's say-so. The converse also holds: a `done` row whose acceptance does not hold is **reopened**, not left standing. `ch-l1-read-trend` is the known instance (§0.1, §10).
- **Semantic-first, deterministic, provenance, P6 a11y, P7 D7 boundary** per DESIGN.

---

## 1. Scope and non-goals

**In scope.** Close every `planned` / `widget-preferred` row across the five catalogs (100 rows; no `ux-debt` row is open — §0): (a) fixtures + goldens + e2e for rows already expressible on current mechanics, (b) small per-engine contract additions, (c) the diagram interaction cluster, (d) geomap period-slice + attr-encoding honesty + bearing, (e) cross-cutting mechanics (per-item gating, a11y-tree scope, N2–N6), and (f) Workstream-D kind slices as per-family SPEC-gated tasks. Also in scope: **reopening `done` rows whose acceptance does not hold** (known: `ch-l1-read-trend`).

**Deferred (explicit, by direction or by existing policy):**

| Item | Why | Bookkeeping |
|------|-----|-------------|
| GeoMap `construct-mark` (gm-mark-1…3, gm-inq-2, gm-asm-1 marking part, gm-asm-3) | Deferred by direction | Rows stay `planned`; note pending in the row's Status |
| Visual construct `nl-place-value` (`widget-preferred`), `ck-set-time` (`planned`) | Same construct-action family; `nl-place-value` is already `widget-preferred` ($math.number-line$) until a construct slice is gated | `nl-place-value` stays `widget-preferred`; `ck-set-time` stays `planned` — neither counts as a `done` row until a construct slice lands |
| Scoring, i18n, telemetry, Studio | D6/D7 | Out of scope permanently |
| New libraries beyond ADR-10 `d3-geo` | PLAN-P8 §0 | No D3-scale/time, ELK, Recharts, MapLibre, Konva |

---

## 2. Sequencing and dependency graph

```
W-1  Catalog reconciliation + fixtures for already-expressible rows (all engines)

W-2  Mechanics contract additions (Visual, Chart, Timeline, GeoMap)
     └─► W-3  Diagram interaction extensions (largest cluster; consumes the W-2 patterns)
     └─► W-4  GeoMap period-slice + attr-encoding honesty

W-5  Cross-cutting mechanics + N2–N6 hardening   (independent of W-2; overlaps W-3/W-4)

W-6  Workstream-D kind slices — per-family SPEC gate BEFORE ANY CODE (PLAN.md §11)
     └─ gated on that engine family being W-1…W-5 green, not on the whole programme
```

- W-1 is the cheapest and most honest: it flips **57 of the 100** pending rows by landing fixtures on mechanics that already exist (Visual 3, Chart 2, GeoMap 28, Diagram 24), and it corrects the stale geomap catalog. The remaining 43 are W-2…W-6 contract work, future kinds, or explicit deferrals — the row-disjoint assignment ledger in §10 sums to 100.
- W-1 gates nothing except honesty: it is a floor every engine family needs, not a blocker for W-5, and W-3/W-4 may start once their own prerequisites are green.
- W-5's per-item gating is the multiplier: every guided-select future row in chart/diagram/timeline consumes it. Land it before the guided rows in W-3 are claimed complete.
- **Workstream D must not start** for an engine family until **that family** is W-1…W-5 green (PLAN-P8: "Workstream D MUST NOT start until A is green for that engine family"). The gate is per-family, not programme-wide: the Chart `area` slice does not wait on the Diagram interaction cluster.

---

## 3. W-1 — Catalog reconciliation + fixtures for already-expressible rows

Exit gate per engine: catalog statuses flipped with evidence; new fixtures carry `expected.{scene,svg,a11y[.alternative]}.json` + `validation.json`; e2e asserts the acceptance; full repo gate green.

### 3.1 Visual

| UC | Task |
|----|------|
| `nl-compare-distance` | Fixture `number-line-compare-distance` — `highlight: [3, 7]`, dual emphasis, guided or discovery per fixture; event distinguishes id; no per-step marker blobs. |
| `ck-which-hand` | Fixture `clock-discovery-minute` — `interactive: true`, both hands selectable, `highlightHand` styling only. |
| `geo-identify-vertex` | Verify `highlightVertices` discovery scoping (only target-type vertices are candidates, not all sides; visual/SPEC+validation already name the prop). Land scoping fixture `geometry-discovery-vertex`. **Resolution is a W-1 deliverable:** if the reducer/render does not scope, the row is *not* flipped — W-1 records it as a named W-2 entry in this plan (with `Rule` + exit gate) and leaves the row `planned`. Silent reclassification out of the W-1 bucket would break the row-disjoint ledger in §10. |

Statuses: three rows `planned → done` on green.

### 3.2 Chart

| UC | Task |
|----|------|
| `ch-l4-time-series` | Fixture with `dimensions[].type: "time"` (ISO-8601). Validation parity already exists in `validation.test.ts`; add golden `scene/svg/a11y` + e2e select on a time point. Silver line stroke from §4.2 covers "line renders with ordered time scale". |
| `ch-x3-guided-narrow` | Derive a guided fixture from `bar/` (host `filter` to one rowId → learner `select` → `clear-filter`/`reset` between steps); e2e scripted dispatch. |

Statuses: two rows `planned → done`.

**Also in W-1:** reopen `ch-l1-read-trend` from `done` to `planned` with the reason recorded in its Status, since its acceptance ("path visible between points") does not hold against the current renderer (§0.1). It re-flips to `done` only when W-2.4 lands. `ch-l2`/`ch-l3` stay `done` — their acceptance is peak/trough selection and does not mention the path. This is the only false-`done` found; the W-1 exit gate re-checks the other **68** `done` rows' acceptance text against their fixtures rather than assuming the rest are sound.

### 3.3 GeoMap — reconciliation audit (the staleness fix)

1. **Audit table.** For each documented capability, assert the runtime supports it and map the catalog rows onto the existing private fixtures. SPEC § = `docs/engines/geomap/SPEC.md`. Rows deferred in §1 are **excluded** from this table so no audit pass can flip them to `done`:

| Capability | SPEC § | Catalog rows it serves | Fixture evidence |
|------------|--------|-------------------------|------------------|
| linear-feature | §8.2 route `interactive` | gm-loc-1, gm-move-2/3 | `linear/` |
| attr-encoding (fill/size) | §8.2 `encoding`/`measure` | gm-dist-1/2/4, gm-cmp-1/2/3, gm-ovl-1…3 | `encoding/` |
| filter-category | §30 `geomap.filter-applied` | gm-r4, gm-dist-3, gm-move-3 | `encoding/`+e2e |
| route-step | §30 `geomap.route-step` | gm-t2, gm-move-1/4 | `route-step/` |
| layer-visibility/toggle | §30 `geomap.layer-toggled` | gm-ovl-1…3, gm-inq-1 | `overlay/` |
| legend-link | §30 `geomap.legend-linked` | gm-leg-1/2 | — |
| scale-bar | §8.2 `scaleBar` | gm-scale-1/2 | `region/`+e2e |
| adjacency | §8.2 `adjacentTo` | gm-dir-1, gm-nav-2 | see §4.4 |
| bearing/compass | **not in SPEC** | gm-nav-1, gm-dir-2 | none — new contract, §4.4 (W-2.7) |

The last row is a genuine gap, not a stale catalog: `SPEC.md` has no compass/bearing surface, and both rows' acceptance requires bearing data ("alternative lists each feature with its bearing from the reference point"). It is a W-2 contract addition (W-2.7), so those two rows cannot flip in W-1.

Three rows are deliberately **absent** from this table: `gm-asm-2` rides on attr-encoding mechanically, but its acceptance is a *rule* (the alternative must contradict any visual exaggeration) needing a new SPEC clause plus a validation negative — that is W-4.2, not W-1. `gm-mark-3` and `gm-asm-3` are deferred (§1).

2. **Flip confirmed rows** `planned → done` with per-row acceptance + e2e. Where the runtime diverges from SPEC, fix the **SPEC** (or the code, with a named W-2 task) — never silently relax.
3. **Golden determinism:** `b22f408` already removed the undefined-key equality class of variance, so the remaining question is centroid arithmetic alone. Resolve `india-coastal` centroid variance (cross-platform) or document the exclusion in `packages/geomap-engine/fixture/README.md` — which is also stale today: it lists 4 of the 9 fixture dirs and omits `india-coastal`, `encoding`, `overlay`, `route-step`, and `linear`. Keep the golden suite byte-stable.
4. **Workflow fixtures:** `gm-x2-guided-composed`, `gm-loc-2-multi-locate`, and `gm-hist-2-place-memory` (sequential `select` + `reset`; mechanics exist) — derive a composed fixture from `odisha-coastal` with guided flags; e2e asserts a monotonic select/reset/select log. `gm-hist-2` additionally needs its authored event metadata surfaced in the selection payload and the alternative list, and its historical claims provenanced via a **non-empty root-level `sources[]`** with a `class` per source (`authoritative` | `illustrative` | `simulated`) — that is the shipped surface (`packages/geomap-engine/src/validation/semantic.ts:144-155` raises L2 `INVALID_SPEC` when `sources` is empty), and it is checked by validation, not merely present. GeoMap `SPEC.md` §15's `provenance: { sources, confidence, notes }` example matches no schema and no fixture; correcting it is an implementation-plan task (T3), and **no `provenance` field is added to any schema**.
   `gm-cmp-3-relief-order` is also expressible today: the engine emits ordered `select` events and the **host** scores the ranking (its own acceptance says so), so no engine-side ranking is needed. Its "relief hint per region" rides on the `measure`/attr-encoding surface as authored data — e2e asserts the hint appears in the alternative.
5. **Repoint §66.** `docs/engines/geomap/SPEC.md` §66 "GeoMap Events" is a stub: one pre-D5 `entitySelected` example, no `geomap.*` names, and it contradicts the authoritative namespaced table in §30. Rewrite §66 as the event *reference* — canonical payload table lives in §30; §66 keeps the renderer-independence rule and one namespaced example (`geomap.entity-selected`). This is a SPEC edit, so it is contract-first work inside W-1, gated by the normal SPEC + schema review, not a silent doc touch-up.

`gm-asm-1-board-map-skill` is a split row: its marking half is deferred (§1) and its loc/identify/trace half is a plain multi-layer explore case. W-1 owns the non-construct remainder (multi-layer explore e2e over `overlay/`); §9 records the partial deferral in the row's Status text since the single `**Status**` cell cannot express a split.

### 3.4 Diagram — `nios/` fixture pass (rows with `New capability: —`)

These rows are course variants of the done baseline (`done` mechanics; the catalog's own table names them, e.g. "course variant of di-h2"). Add a `nios/*` fixture + acceptance + goldens each and flip `planned → done`. No contract change. This list is exactly the 21 rows whose `**New capability**` cell is `—` (10 bare, 11 annotated with a parenthetical justification):

- `di-proc-1` follow-process, `di-proc-2` input-output (scored variant of di-x4), `di-proc-3` which-step (reverse read), `di-proc-4` branch-flow (fan-out is ordinary DAG)
- `di-cycl-1` water-cycle-course, `di-cycl-2` life-cycle, `di-cycl-4` disaster-cycle, `di-cycl-5` social-cycle
- `di-class-1` classify, `di-class-2` part-whole, `di-class-3` gov-levels, `di-class-4` sector-taxonomy, `di-class-6` parent-locate
- `di-sys-2` drainage-basin (roles = node metadata), `di-sys-3` industrial-linkages
- `di-ord-2` insert-missing (host defines the blank; candidates partially linked)
- `di-inq-1` explain-why, `di-inq-2` open-explore
- `di-asm-1` read-diagram, `di-asm-2` validate-diagram (surface `tryCreate`-style validation as a learnable check), `di-asm-3` evidence-essay

The other 27 `planned` diagram rows are capability-bearing and route to W-3 (§5, which owns **20** as contract work) or W-6 (§8, 4 future-kind rows: `di-p1`, `di-lab-1`, `di-cmp-1`, `di-cmp-2`). `di-m3-cyclic-concept-map` sits in the W-3 set but is *not* a course variant: `kind: "concept-map"` uses grid layout and must accept a directed back-edge, so it needs a SPEC change like the rest of W-3 (W-3.12). Three more rows here (`di-cause-1`, `di-cause-2`, `di-lab-2`) were originally assigned to W-3.3 for multi-select, but `baseReducer` already accumulates selection, so they move to W-1 as fixture-only: 21 here + 3 from W-3.3 = 24 in W-1, + 20 in §5, + 4 in §8 = 48.

---

## 4. W-2 — Mechanics contract additions (per family)

Contract-first. Every row: engineer SPEC §, schema + `docs/schemas/` mirror, reducer + render + goldens + e2e, engine-skills regeneration (`pnpm generate:skills`) if authoring guidance changes. The `Rule` cell is mandatory — `2+` means two or more catalogued rows consume the capability; `promoted` means a single row was promoted to this slice's exit gate under `docs/use-cases/README.md` ("2+ use-case rule"), and the promotion is recorded in the catalog row's Status when the row flips.

### 4.1 Visual

| Capability | Use cases | Surface | Rule |
|------------|-----------|---------|------|
| W-2.1 `maxSelection` | `cs-pick-n` | Optional `maxSelection` on counting-set component; validator ranges it (`≥0`, absent = unlimited); reducer rejects over-limit select deterministically | `promoted` — slice exit gate: `cs-pick-n` fixture + unit + e2e green, `maxSelection` documented in the component prop table |
| W-2.2 Selection-driven fraction fill | `fr-shade-n-parts` | Reducer/snapshot decision: track selected parts in state; render fills on selection (deterministic). Decide engine-state vs static-emphasis in the visual SPEC before coding | `promoted` — slice exit gate: SPEC decision recorded, `fr-shade-n-parts` fixture + goldens + e2e green |

### 4.2 Chart

| Capability | Use cases | Surface | Rule |
|-----------|-----------|---------|------|
| W-2.3 Multi-measure grouped bars | `ch-x2-multi-measure` | `measures[]` length ≥ 2 over one dimension; node ids `{measureId}-bar-{rowId}`; legend distinguishes measures; tabular lists all values; grouped bar render + goldens | `promoted` — slice exit gate: `ch-x2` fixture + unit + e2e green, node-id scheme in the chart SPEC |
| W-2.4 Line series stroke | `ch-l1-read-trend` (closes N1.8) | `<polyline>`/`<path>` in dimension order between point markers; point markers remain selectable; update `expected.svg` goldens as a reviewed change; re-word N1.2. Attribution: only `ch-l1`'s acceptance requires the path — `ch-l2`/`ch-l3` are peak/trough selection and stay `done` untouched | `promoted` — slice exit gate: `ch-l1` acceptance passes against the regenerated `line/expected.svg` |

### 4.3 Timeline

| Capability | Use cases | Surface | Rule |
|-----------|-----------|---------|------|
| W-2.5 Duration events | `tl-f1-duration-events` | `events[].duration` or `to` (future contract); events render as span bars instead of point markers; alt list exposes duration; SPEC + schema + validation negatives (`from`/`to` guards, ISO grammar reuse) | `promoted` — slice exit gate: `tl-f1` fixture + validation negatives + e2e green |

### 4.4 GeoMap

| Capability | Use cases | Surface | Rule |
|-----------|-----------|---------|------|
| W-2.6 Adjacency in alternative list | `gm-dir-1`, `gm-nav-2` | Surface `adjacentTo` neighbor sets in the alternative/snapshot (schema field exists at SPEC §8.2); nothing invented — adjacency derives from authored `adjacentTo` plus true region-overlap detection already used in L3 validation | `2+` |
| W-2.7 Bearing / compass | `gm-nav-1-follow-compass`, `gm-dir-2-north-of` | New contract — no compass or bearing surface exists in `SPEC.md` today. Scene node for the compass rose (D5, no pixel picking) + computed bearing from an authored reference point exposed in the alternative list. Bearing is **derived from authored geometry, never authored as a value**; a candidate is "north of X" only when its bearing falls in the authored axis window, and the window is a semantic field, not a tolerance constant. SPEC §, schema, validation negatives (reference point required; reference cannot be the candidate itself) | `2+` |

---

## 5. W-3 — Diagram interaction extensions

Ordered by dependency. All contract-first (SPEC kinds, payloads, events). Per §0.2, capabilities reuse the D5 actions they need and only the **payload** and the **namespaced event** are new — `diagram.filter-applied` is the *event* for D5 `filter`, not a new action. The `Rule` cell follows §4: `2+` or `promoted` (single-row capabilities are promotions, with this slice's exit gate named).

| # | Capability | Use cases | Surface | Rule | Depends on |
|---|-----------|-----------|---------|------|-----------|
| W-3.1 | `relation-vocab` | di-cycl-3, di-sys-1, di-lab-4 | Extend closed `relationship` enum (`feeds-on`, `transforms-to`, `produces`, `weathers-into`) | `2+` | — (schema) |
| W-3.2 | `links` vocabulary | di-hist-1…4, di-cmp-3 | `nodes[].links` beyond `visualEntityId`: add `timelineEventId`, `geomapEntityId`; verify resolution in composition (composed-lesson coverage exists via `packages/interactive-engine/test/composition.golden.test.ts`; extend it rather than starting N5.1's P7 variant) | `2+` | — |
| W-3.3 | `multi-select` **already exists** | di-cause-1/2, di-lab-2, di-hist-3 | **No contract change.** `baseReducer` already accumulates: `select` → `appendUnique(state.selection, id)` (`packages/interactive-engine/src/runtime/reducer.ts:22`) and `deselect` removes, with `state.selection: string[]` (`core/state.ts:8`). These four rows close as **W-1 fixtures + e2e** asserting the accumulated snapshot, not as a W-3 slice. Kept here only to record the verification; the exit gate is the W-1 fixture, so the rows are counted in W-1's bucket (§10) | `2+` (no new contract) | — |
| W-3.4 | `edge-select` | di-cause-3 | Edges become addressable targets under the existing D5 `select` — the payload/target scheme distinguishes an edge id from a node id (as geomap §30 does for `geom-<layerId>-<routeId>`). Engine emits a namespaced `diagram.edge-selected` **event**. No new action | `promoted` — exit gate: `di-cause-3` fixture + e2e + alt list green | — |
| W-3.5 | `filter-nodes` | di-proc-5, di-class-5, di-sys-1, di-sys-4 | D5 `filter` on node `category`, payload `{ categories: string[] }` mirroring geomap §30; `clear-filter` to release; grey-out semantics is presentational. Engine emits `diagram.filter-applied` **event** | `2+` | — |
| W-3.6 | `relationship-gate` | di-cause-6 | Edge labels hidden until D5 `answer`; reveal then `follow`; deterministic | `promoted` — exit gate: `di-cause-6` fixture + event-order assertion green | — |
| W-3.7 | `edge-weight` | di-cause-5 | Semantic `strength` metadata on edges (data, never style) | `promoted` — exit gate: `di-cause-5` fixture + `strength` in snapshot/alt list green | — |
| W-3.8 | `follow-chain` | di-cause-4 | Per-step emphasis along a multi-edge path (can sit on `follow` + step state) | `promoted` — exit gate: `di-cause-4` fixture + monotonic per-step event log green | — |
| W-3.9 | `what-if` | di-inq-3 | Non-destructive node de-emphasis; event log records the choice; spec never mutated | `promoted` — exit gate: `di-inq-3` fixture + spec-immutability assertion green | — |
| W-3.10 | `construct-order` | di-ord-1, di-ord-3 | Shuffled candidates + ordered `answer` (construct mode) | `2+` | W-5 gating pattern |
| W-3.11 | `construct-edge` | di-lab-3, di-ord-3 | Learner-authored edges via D5 `connect`, validated against the graph rules the SPEC states for the kind | `2+` | — |
| W-3.12 | `concept-map-cycle` | di-m3 | `kind: "concept-map"` (grid layout) accepts a directed cycle: the back-edge renders with a deterministic position source (`positionSource: 'illustrative'`) or a named cycle layout strategy added in the SPEC. `di-m3`'s *action* ("select nodes along a cyclic path") already works via W-3.3's accumulation — the gap is the kind's acceptance of a back-edge, not selection. **No graph law is asserted here:** cycle length, self-loops and cycle detection are *not* defined anywhere in the repo today, so if the SPEC wants to constrain them (a self-loop is a legitimate concept-map construct, e.g. a feedback loop) that is a new rule with its own `2+` justification and a named validation negative — recorded in the SPEC, never assumed | `promoted` — exit gate: `di-m3` fixture + goldens + e2e green | W-2 patterns |

Exit gate: all W-3 fixtures green (fixtures per catalog row under `nios/di-*`), full repo gate. As **contract work** this table owns **20 of the 48** `planned` diagram rows (the cells double-claim `di-sys-1` (W-3.1 + W-3.5), `di-hist-3` (W-3.2 + W-3.3) and `di-ord-3` (W-3.10 + W-3.11), so the distinct count is below the sum of the cells). W-3.3 adds no contract: its three exclusive rows (`di-cause-1`, `di-cause-2`, `di-lab-2`) are counted in **W-1's** bucket. W-6 owns 4 (`di-p1`, `di-lab-1`, `di-cmp-1`, `di-cmp-2`) and §3.4 owns 21. Diagram therefore reconciles as 24 (W-1: 21 + 3) + 20 (§5) + 4 (§8) = 48. `di-cmp-3` stays here (W-3.2) and is **not** in W-6 — the compare-layout slice covers `di-cmp-1`/`di-cmp-2` only.

---

## 6. W-4 — GeoMap mechanics + encoding honesty

| Capability | Use cases | Surface | Rule |
|-----------|-----------|---------|------|
| W-4.1 `period-slice` | gm-hist-1/3 | Region/boundary sets keyed by period; the D5 actions `step`/`scrub` drive the slice and the engine emits namespaced `geomap.*` events per the §30 pattern; snapshot exposes the active slice; deterministic transitions. Playback is **host-driven only** — a host dispatches, the engine steps; never an engine-side timer (`PLAN-P8` §6 bars engine `setInterval` playback for Timeline, and the same rule applies here). **Provenance is mandatory, not optional:** `gm-hist-1` (boundary change) and `gm-hist-3` (route over time) are historical-geography claims, so every period's region/boundary set carries a **non-empty root-level `sources[]`** with a `class` per source (`authoritative` \| `illustrative` \| `simulated`) plus any optional per-source field the envelope's `$defs.source` declares, per DESIGN §9 / AGENTS.md §9 and the shipped validator (`packages/geomap-engine/src/validation/semantic.ts:144-155`) — GeoMap `SPEC.md` §15 states the intent ("Historical geography frequently contains uncertainty. GeoMap MUST support provenance") but its `provenance: { sources, confidence, notes }` example is drifted from every schema and fixture; the implementation plan corrects the example (T3) and adds no `provenance` field — no boundary, extent or date may be inferred beyond the authored data, and a period slice with no source is a validation error, not a rendering choice | `2+` |
| W-4.2 Encoding honesty (data-literacy) | gm-asm-2 | Rule in SPEC: encoding is never misleading by construction — explicit `breakpoints`; alternative list is ground truth and must contradict any visual exaggeration | `promoted` — exit gate: `gm-asm-2` fixture + encoding-vs-alternative contrast assertion green |
| W-4.3 Coverage confirmation | gm-move-1/2/3/4, gm-hist-2 | Land e2e for route-step, linear-feature, filter-category over the existing fixtures; flip statuses on green | `2+` (no new contract — coverage only) |

Deferred: `gm-mark-*`, `gm-inq-2`, and the marking part of `gm-asm-1`/`gm-asm-3` (construct-mark) — see §1. The non-construct remainder of `gm-asm-1` (loc/identify/trace items — a multi-layer explore case) is **W-1 work**: reuse the `overlay/` fixture and add the multi-layer explore e2e, then flip the row with a partial-deferral note in its Status (§3.3, §9). It is not W-4 work and has no new contract.

---

## 7. W-5 — Cross-cutting mechanics + N2–N6 hardening

### 7.1 Upstream N-status reconciliation (read before scheduling)

`docs/superpowers/specs/2026-09-13-interactive-engine-next-phase-implementation-plan.md` is not all-open. Verified 2026-09-30:

| Upstream task | State | Evidence | Action here |
|---------------|-------|----------|-------------|
| N2.1 shared instance factory | **DONE** | `docs/adr/ADR-11.md` — `Accepted`, "document divergence, do not refactor now" (option (b)) | **Amend/confirm ADR-11**, never re-record it. Re-open only if W-2/W-3/W-5 surface real five-way bugfix pain, in which case supersede with a new ADR. |
| N2.2 snapshot renderer-independence | open | — | Carry as documentation-only. |
| N3.1 `interaction.actions` semantics | **DONE** | `docs/adr/ADR-12.md` — `Accepted` | None. |
| N3.2 L4 a11y parity | open | chart/timeline L4 error cases absent | See §7.2. |
| N4.1/N4.2 shared conformance suite | open | `packages/interactive-engine/test/conformance/` does not exist | See §7.2. |
| N5.1 composed-lesson golden | **DONE (equivalent)** | `packages/interactive-engine/test/composition.golden.test.ts` — deterministic + byte-matched composed event log, using `docs/fixtures/composition/narrative-timeline-visual.json` | None; extend that test for W-3.2/W-4.1 composition coverage. |
| N6.1 publish dry-run + smoke | open | — | See §7.2. |
| N6.2 freshness guard in CI | **DONE** | `.github/workflows/ci.yml` has the "Check engine-skills freshness" step | None. Do not re-add. |

### 7.2 W-5 work items

| Item | Scope | Notes |
|------|-------|-------|
| Per-item `interactive` gating | chart, diagram, timeline | Item-level `interactive` (authoring signal) on nodes/edges/markers, mirroring the house pattern in Visual/GeoMap (`docs/schemas/geomap-spec.schema.json:178,215`; visual `$defs.element.properties`). **Enforcement is scoped to learner-initiated input, per `docs/adr/ADR-12.md`:22-24** — `interactive: false` removes the item from hit-testing, tab order and the pointer/keyboard dispatch paths, and the renderer never paints an interactive affordance for it. It must **not** make the reducer reject a direct host `dispatch()`: ADR-12 records that the host may legitimately dispatch D5 actions the author did not declare (a lesson-level `reset`, telemetry-driven `jump-to`), and runtime access-control over the declared set belongs to the host (D6). So: opt-in per-engine, learner-input-scoped, no core reducer rule. Qualifies under the 2+ rule (guided-select rows in all three engines). SPEC each engine before code. |
| A11y-tree scope | chart, timeline | Promote axis/tick/period labels into the a11y tree (currently `aria-label`-only — `fixture/line/expected.a11y.json` holds only the four point buttons). **This is an enhancement, not gap closure:** `ch-b5-read-value` and `tl-e3-read-date` are `done` and already pass acceptance via the tabular/linear alternative, so widening the snapshot contract for them is a deliberate P6 investment. It is a **core snapshot contract change** (ledger entry 22) — axis nodes carry a static-text role, never `button`/interactive, and nothing becomes a D5 target. Widening the snapshot shape also churns the `ch-b5`/`tl-e3` goldens; those are `done` rows, so the fixture updates are reviewed changes and their acceptance re-checked, not a silent re-baseline. |
| N3.2 — L4 a11y parity | chart, timeline | Missing root/component `accessibility.label` → L4 error cases (2 each) through full `validate()` pipeline. |
| N4 — shared conformance suite | all engines | `packages/interactive-engine/test/conformance/` helper + per-engine `conformance.test.ts`. |
| N6.1 — publish verification | repo | `pnpm publish:dry` + `pnpm publish:smoke` (`scripts/p7-publish-smoke.mjs`). N6.2 is already in CI (§7.1). |

---

## 8. W-6 — Workstream-D kind slices (SPEC-gated per family)

Each becomes its own PLAN task with a T0 decision (PLAN.md §11) and a SPEC slice. **No code until the family's W-1…W-5 exit is green.** Add the row to `docs/PLAN-P8.md` §6 at the same time — the table there is the registry of deferred D slices, and a slice that appears only in this plan is invisible to it.

| Family | Slice | Catalog rows | Notes |
|--------|-------|--------------|-------|
| Chart | `kind: "area"` | ch-p1 | Filled path; reuses line stroke + W-2 series machinery. Already deferred by `PLAN-P3` Chart-D1. |
| Chart | `kind: "scatter"` | ch-p2 | Two quantitative dimensions/measures; validation negatives (reject single-series scatter). Already deferred by `PLAN-P3` Chart-D1. |
| Diagram | `kind: "label-diagram"` | di-p1, di-lab-1 | Node → region-of-interest mapping; first future-kind gate to pull forward. `di-lab-2/3/4` are **not** here — they are covered by the done baseline plus W-3.3/W-3.11/W-3.1. Already deferred by `PLAN-P6` Diagram-D1. |
| Diagram | `compare-layout` / `diff-emphasis` | di-cmp-1, di-cmp-2 | Decide composition vs new layout strategy in the SPEC slice before code. `di-cmp-3` is owned by W-3.2, not here. `PLAN-P6` Diagram-D1 also holds the line: ELK only behind `LayoutEngine` if a slice outgrows radial/hierarchical/grid. |
| Timeline | `eras[]` / parallel timelines | tl-f2 | Synchronized side-by-side axes; composition vs new slice decided in SPEC. `PLAN-P5` holds "no engine-side `setInterval` playback; extra kinds out of P5" — the slice must not reintroduce a timer. |

---

## 9. Deferrals summary

| Deferred | Rows | Why |
|----------|------|-----|
| GeoMap `construct-mark` | gm-mark-1…3, gm-inq-2, gm-asm-1 (mark half), gm-asm-3 | Direction (this plan); big D5-adjacent construct contract |
| Visual construct | nl-place-value, ck-set-time | Same construct-action family; widget-preferred until a construct slice is gated |

Record the deferral in each row's Status (e.g. `` `planned` (construct-mark deferred) ``) so the catalog self-documents. `gm-asm-1` is the one **split** row: its Status text must say both halves — e.g. `` `planned` (marking half deferred — §1; loc/identify/trace half in W-1) `` — because a single `**Status**` cell cannot express a partial deferral. No deferred row may appear in the §3.3 audit table.

---

## 10. Exit gates

Per workstream: `pnpm typecheck && pnpm lint && pnpm -w test && pnpm playwright && node scripts/check-engine-skills-fresh.mjs`.

| Substage | Green when |
|----------|------------|
| W-1 | Catalog statuses match runtime for every audited row; new fixtures assert acceptance; geomap §66 repointed at §30; full repo gate green |
| W-2 | Each contract addition has SPEC + schema + goldens + e2e; every `promoted` entry's slice exit gate met and its promotion noted in the catalog row |
| W-3 | All 48 `planned` diagram rows flipped or carried as explicit deferrals (24 in W-1 incl. the 3 former W-3.3 multi-select rows + 20 §5 + 4 §8 = 48); `diagram.spec.ts`/unit green |
| W-4 | period-slice (host-driven) + encoding-honesty landed; geomap catalog reconciled; `gm-asm-1` non-construct remainder flipped in W-1 |
| W-5 | Per-item gating live in chart/diagram/timeline; a11y-tree change landed; ADR-11 confirmed or amended (not re-recorded); conformance suite green; N6.1 checks pass |
| W-6 | Per-slice PLAN task + `PLAN-P8` §6 row + SPEC + fixtures; not all of W-6 needs to be done for the gap-closure summary |

**Row assignment ledger (100 pending rows, row-disjoint; nothing unassigned).** Any pending row not listed here is a plan defect, not an implicit deferral. Counts are per distinct catalog row.

| Bucket | Rows | Where |
|--------|------|-------|
| Fixture-only, done mechanics | 57 | Visual 3 (§3.1), Chart 2 (§3.2), GeoMap 28 (§3.3: 24 audit-table + 3 workflow + `gm-asm-1` remainder), Diagram 24 (§3.4's 21 + `di-cause-1`, `di-cause-2`, `di-lab-2` from W-3.3) |
| W-2 contract additions | 6 | `cs-pick-n` (W-2.1), `fr-shade-n-parts` (W-2.2), `ch-x2` (W-2.3), `tl-f1` (W-2.5), `gm-nav-1`+`gm-dir-2` (W-2.7) |
| W-3 diagram contract | 20 | §5 W-3.1…W-3.12 (W-3.3 contributes no contract) |
| W-4 geomap contract | 3 | `gm-hist-1`, `gm-hist-3` (W-4.1 period-slice), `gm-asm-2` (W-4.2 encoding honesty) |
| W-6 future kinds | 7 | `ch-p1`, `ch-p2`, `di-p1`, `di-lab-1`, `di-cmp-1`, `di-cmp-2`, `tl-f2` |
| Explicit deferral (construct-mark) | 5 | `gm-mark-1`, `gm-mark-2`, `gm-mark-3`, `gm-inq-2`, `gm-asm-3` |
| Deferred construct (Visual) | 2 | `nl-place-value` (`widget-preferred`), `ck-set-time` (`planned`) |
| **Total** | **100** | 57 + 6 + 20 + 3 + 7 + 5 + 2 |

Per-engine check: Visual 3+2+2 = 7, Chart 2+1+2 = 5, Timeline 1+1 = 2, GeoMap 28+2+3+5 = 38, Diagram 24+20+4 = 48. Status mix across the 100: 99 `planned` + 1 `widget-preferred` (`nl-place-value`; `ck-set-time` is `planned`).

Three rows are counted once but worked twice, and the ledger says so rather than double-counting: `gm-asm-1` sits in the W-1 bucket (its non-construct half; the marking half is deferred per §1/§9), and `gm-hist-2` + `gm-move-1…4` sit in the W-1 bucket while W-4.3 lands their e2e. `di-hist-3` is claimed by W-3.2 (links vocabulary) and was claimed by W-3.3 (multi-select); it is counted once, in W-3, because its `links` reference is a real contract gap even though its selection behaviour is not.

This ledger counts only the 100 **pending** rows, and buckets track *row ownership*, not how many slices touch a row: W-2.6 (`gm-dir-1`, `gm-nav-2`) and W-4.2 (`gm-asm-2`) each serve a row that is counted in the W-1 or W-4 bucket respectively. `geo-identify-vertex` is provisionally in the W-1 bucket: if W-1 finds `highlightVertices` is not scoped, the row stays `planned` and W-1 must add a named W-2 entry here rather than drop it silently (§3.1). Only two §11 entries serve no pending row at all — W-2.4 (`ch-l1`, a reopened false-`done`) and the a11y-tree entry, a pure enhancement.

**Full gap-closure exit:** every `planned`/`widget-preferred` row across the five catalogs is `done` or carries an explicit deferral note per the assignment ledger above; **every `done` row's acceptance still holds** — `ch-l1-read-trend` is reopened to `planned` in W-2.4 and re-flipped only when the line-stroke slice lands; catalogs, SPECs, schemas, and engine-skills are mutually consistent; full repo gate green.

---

## 11. Contract additions ledger (summary)

Every contract addition this plan implies. The `Rule` cell is mandatory: `2+` = two or more catalogued rows; `promoted` = single row promoted to that slice's exit gate under `docs/use-cases/README.md` ("2+ use-case rule"). **12 of the 22 are promotions** — that is the honest count, not an oversight, and each one's slice exit gate is named in §4/§5/§6. Per §0.2 these are **payload, kind, or event** additions; the only *new D5 action* this plan proposes is `bearing` (entry 7).

| # | Engine | Capability | Rows | Rule | Surface |
|---|--------|-----------|------|------|---------|
| 1 | Visual | `maxSelection` (W-2.1) | cs-pick-n | `promoted` | counting-set component prop; the cap rejects an over-limit learner `select` deterministically and is scoped to `select`/`deselect`, not to host dispatch of other D5 actions (`ADR-12.md`:22-24) |
| 2 | Visual | fraction fill-on-select (W-2.2) | fr-shade-n-parts | `promoted` | selection-driven shading state |
| 3 | Chart | grouped multi-measure (W-2.3) | ch-x2-multi-measure | `promoted` | `measures[]` ≥ 2 render + node ids + legend |
| 4 | Chart | line series stroke (W-2.4, N1.8) | ch-l1-read-trend | `promoted` | `<polyline>`/`<path>` connector; reopens `ch-l1` |
| 5 | Timeline | duration events (W-2.5) | tl-f1-duration-events | `promoted` | `events[].duration`/`to` + span bars |
| 6 | GeoMap | adjacency alternative (W-2.6) | gm-dir-1, gm-nav-2 | `2+` | `adjacentTo` in alternative list |
| 7 | GeoMap | bearing / compass (W-2.7) | gm-nav-1, gm-dir-2 | `2+` | **the one new D5 action** + compass scene node + derived bearing in alternative; no authored bearing values; no new library (ADR-10) |
| 8 | GeoMap | `period-slice` (W-4.1) | gm-hist-1, gm-hist-3 | `2+` | period-keyed region sets + host-driven stepping + **mandatory non-empty root-level `sources[]` + `class` per period (shipped surface; §15's example is drifted, corrected in T3)** |
| 9 | GeoMap | encoding honesty rule (W-4.2) | gm-asm-2 | `promoted` | breakpoints + alternative-as-truth |
| 10 | Diagram | `relation-vocab` (W-3.1) | di-cycl-3, di-sys-1, di-lab-4 | `2+` | extended `relationship` enum |
| 11 | Diagram | `links` vocabulary (W-3.2) | di-hist-1…4, di-cmp-3 | `2+` | `nodes[].links` + `timelineEventId`/`geomapEntityId` |
| 12 | Diagram | `edge-select` (W-3.4) | di-cause-3 | `promoted` | edges addressable under D5 `select`; engine emits `diagram.edge-selected` **event** |
| 13 | Diagram | `filter-nodes` (W-3.5) | di-proc-5, di-class-5, di-sys-1, di-sys-4 | `2+` | D5 `filter` payload `{ categories }` on node `category`; `diagram.filter-applied` event |
| 14 | Diagram | `relationship-gate` (W-3.6) | di-cause-6 | `promoted` | hidden edge labels until D5 `answer` |
| 15 | Diagram | `edge-weight` (W-3.7) | di-cause-5 | `promoted` | `strength` metadata |
| 16 | Diagram | `follow-chain` (W-3.8) | di-cause-4 | `promoted` | per-step path emphasis |
| 17 | Diagram | `what-if` (W-3.9) | di-inq-3 | `promoted` | non-destructive de-emphasis |
| 18 | Diagram | `construct-order` (W-3.10) | di-ord-1, di-ord-3 | `2+` | shuffled candidates + ordered `answer` |
| 19 | Diagram | `construct-edge` (W-3.11) | di-lab-3, di-ord-3 | `2+` | learner-authored edges via D5 `connect`, checked against the graph rules the SPEC states for the kind |
| 20 | Diagram | `concept-map-cycle` (W-3.12) | di-m3 | `promoted` | `kind: "concept-map"` accepts a directed back-edge + layout decision; **no graph law assumed** — any cycle/self-loop rule is new SPEC work with its own `2+` case |
| 21 | Cross | per-item `interactive` gating | chart/diagram/timeline guided rows | `2+` | item-level `interactive` enforcing hit-test/tab-order/pointer-keyboard **only**; must not reject a direct host `dispatch()` (`docs/adr/ADR-12.md`:22-24) |
| 22 | Cross | a11y-tree scope | (none — enhancement) | `2+` justification recorded: serves no pending row; `ch-b5` and `tl-e3` are `done` and pass via the tabular/linear alternative, so this is a **deliberate P6 investment, not a row promotion** | axis/tick/period nodes in the a11y tree as **static text** (never a D5 target); **core snapshot contract change**; golden churn is expected for the `done` rows `ch-b5`/`tl-e3` and is a reviewed fixture change |

**Not a contract addition:** W-3.3 (diagram multi-select) was removed from this ledger. `baseReducer` already accumulates — `select` → `appendUnique` (`runtime/reducer.ts:22`), `deselect` removes, `state.selection: string[]` (`core/state.ts:8`) — so `di-cause-1`, `di-cause-2` and `di-lab-2` are fixture-only work in W-1, and proposing an engine contract for a capability the shared runtime already provides would be engine-smuggling.

Contract additions implied but **not** made here: W-6 future kinds (chart `area`/`scatter`, diagram `label-diagram`/`compare-layout`/`diff-emphasis`, timeline `eras[]`/parallel timelines) are SPEC-gated and get ledger rows only when their PLAN task is opened.

---

## 12. Change log

| Date | Change |
|------|--------|
| 2026-09-30 | Initial plan: distills all `planned` rows in `docs/use-cases/*.md` into W-1…W-6; reconciles stale geomap catalog; defers construct-mark (direction) and Visual construct rows (widget-preferred). |
| 2026-09-30 | Review pass 1 — coverage and status corrections, no scope added: (1) fixed the broken successor path in `docs/_archive/README.md`; (2) corrected the GeoMap event citation from §66 to §30 and made repointing the §66 stub a W-1 task; (3) assigned the 5 previously unassigned rows — `di-m3` → W-3.12, `gm-nav-1`/`gm-dir-2` → W-2.7 (bearing/compass, new contract), `gm-cmp-3`/`gm-hist-2` → W-1 §3.3; (4) removed deferred rows (`gm-mark-3`, `gm-asm-3`) and `gm-asm-2` from the W-1 audit table so no audit pass can flip them early, and gave `gm-asm-1`'s split deferral explicit bookkeeping; (5) added §7.1 upstream N-status reconciliation (N2.1, N3.1, N5.1, N6.2 already delivered) and changed "Record ADR-11" to amend/confirm; (6) reopened the false-`done` `ch-l1-read-trend` and scoped W-2.4 to it alone; (7) added the mandatory `Rule` cell (`2+` / `promoted`) to every §4/§5/§6/§11 entry; (8) added the a11y-tree snapshot contract change to the ledger and framed it as an enhancement; (9) gave `di-cmp-3` a single owner (W-3.2) and narrowed W-6 to `di-cmp-1`/`di-cmp-2`; (10) made W-4.1 playback host-driven per `PLAN-P8` §6; (11) added a row-disjoint 100-row assignment ledger to §10. |
| 2026-09-30 | Review pass 3 (implementation-plan review) — (1) **provenance field names corrected repo-wide**: the surface is a non-empty root-level `sources[]` with a `class` per source (`authoritative`/`illustrative`/`simulated`), enforced by `packages/geomap-engine/src/validation/semantic.ts:144-155`; §3.3, W-4.1 and ledger entry 8 no longer name `provenance.sources[]`/`confidence` (pass 2 introduced that error by "correcting" the accurate bare `sources[]`), and GeoMap `SPEC.md` §15's `provenance: { sources, confidence, notes }` example — which matches no schema and no fixture — is flagged for correction in the implementation plan's T3. (2) W-1 owns 57 rows but flips 55: `gm-dir-1`/`gm-nav-2` are W-1-owned and flip in T13 (W-2.6), so the pending chain is **45 → 37 → 17 → 14 → 7** (W-2 flips 8: its own 6 + T13's 2); the ownership buckets 57/6/20/3/7/5/2 are unchanged. |
| 2026-09-30 | Review pass 2 — **scope reduced, contract surface cut**; ledger recomputed: (1) added the §0.2 rule that D5 is closed on *actions* (engines extend payloads, never add action names) and fixed the cells that treated namespaced events as new actions — W-3.4/W-3.5/W-4.1 now reuse D5 `select`/`filter`/`step` with engine payloads plus a namespaced **event**; `bearing` is the only new action proposed; (2) **deleted W-3.3's contract** — `baseReducer` already accumulates via `appendUnique` (`runtime/reducer.ts:22`) with `state.selection: string[]`, so `di-cause-1`, `di-cause-2`, `di-lab-2` are W-1 fixtures, and the §11 entry is removed (23 → 22 entries, promotions 13 → 12); (3) removed the invented graph laws from W-3.12 — no self-loop/cycle-length rule exists anywhere in the repo, and constraining cycles is now named as new SPEC work needing its own `2+` case; (4) added W-4.1's **mandatory provenance gate** (`provenance.sources[]` + `confidence`, GeoMap `SPEC.md` §15 / DESIGN §9) for the historical boundary and route-over-time claims, and corrected §3.3's bare `sources[]` to `provenance.sources[]`; (5) rewrote W-5 per-item gating to be **ADR-12-compliant** — enforcement scoped to learner-initiated input (hit-test/tab order/pointer-keyboard), explicitly *not* a reducer rejection of host `dispatch()`; (6) relabelled the a11y-tree ledger entry from `promoted` to a recorded enhancement (it serves no pending row) and acknowledged its golden churn on the `done` rows `ch-b5`/`tl-e3`; (7) corrected three status facts — `ck-set-time` is `planned` not `widget-preferred` (100 pending = 99 + 1), the `done` re-check is **68** rows not 69, and §1's deferral row now names each row's real status; (8) made `geo-identify-vertex`'s W-1→W-2 fallback a ledger-recorded decision instead of a silent reclassification, and disambiguated `di-sys-1/4` to `di-sys-1, di-sys-4`; (9) fixed §2's graph, which implied W-2 was a hard blocker for all work and programme-wide Workstream-D gating; (10) recomputed the row ledger: W-1 54 → **57** (W-3.3's three rows move in), W-3 23 → **20**, remaining 46 → **43**, still summing to 100. |
