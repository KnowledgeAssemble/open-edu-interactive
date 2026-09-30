# GeoMap engine — use-case catalog

**Status:** Active (P8 Workstream A — slice honesty)  
**Engine:** `geomap` (`packages/geomap-engine`)  
**Contract:** `docs/engines/geomap/SPEC.md`  
**Vision:** `docs/engines/geomap/VISION.md`

## How to read this document

Each use case is a **lesson archetype**. Implementers ship fixtures that match acceptance criteria; authors and agents copy those fixtures, not abstract prop grids.

Use cases are grouped by **layer type** (`region`, `marker`, `route`). Stable scene node ids follow `geom-{layerId}-{entityId}` (e.g. `geom-states-odisha`).

**D7 boundary (always):**

| Layer | Owns |
|-------|------|
| **Engine** | Geography, scene, SVG, semantic targets, D5 `select` / `focus` / `deselect` / `reset`, snapshot, alternative entity list |
| **OpenEdu host** | Prompt text, answer key, correct/incorrect feedback, hints, progression, scoring, citation UI |

---

## Interaction modes by layer type

| Mode | Layer | Authoring signal | Learner experience | Engine events |
|------|-------|------------------|--------------------|---------------|
| **display** | region, marker, route | `interactive: false` on layer items (or layer `visible: false`) | Geography is visible; no pointer targets on that layer | — |
| **guided-select** | region, marker | Exactly one (or few) items with `interactive: true`; peers `interactive: false` | Learner taps the prompted place; only valid targets accept input | `geomap.entity-selected` |
| **discovery-select** | region, marker | Multiple items with `interactive: true` | Learner finds the correct entity among several choices | `geomap.entity-selected` |
| **explore** | region, marker (multi-layer) | `interaction.mode: "explore"`; broad `interactive: true` coverage | Free exploration; no single correct answer enforced by engine | `geomap.entity-selected`, `geomap.entity-focused` |
| **focus** | region, marker | `focus` in `interaction.actions` | Keyboard / programmatic emphasis without changing selection | `geomap.entity-focused` |
| **trace** *(planned)* | route | Route layer with `path`; step/play actions | Learner follows a path in order | `geomap.route-step` *(planned)* |
| **filter** *(planned)* | region, marker | `filter` in `interaction.actions`; category metadata on entities | Learner narrows visible entities by attribute | `geomap.filter-applied` *(planned)* |
| **attribute-view** *(planned)* | region, marker | Data-driven fill/size from an authored `measure` per entity (semantic encoding, never raw colors) | Learner reads a theme distribution (rainfall, density, forest cover) | `geomap.theme-view` *(planned)* |
| **overlay-compare** *(planned)* | any | Two or more layers toggled or shown together | Learner relates two themes (rainfall ↔ vegetation) | `geomap.layer-toggled` *(planned)* |
| **construct-mark** *(planned)* | region, marker, route | `mark` construct action on a blank basemap layer | Learner places/labels a feature on a blank map (board-style map skill) | namespaced `geomap.*` result event *(planned)* |

**Node id convention:** `geom-{layerId}-{entityId}` for region and marker items; route nodes use `geom-{layerId}-{routeId}` with segment children `geom-{layerId}-{routeId}-seg-{i}`.

---

## Region layer

### `gm-r1-identify-guided` — Identify a region (guided)

| Field | Value |
|-------|-------|
| **Learner** | Sees a regional map with one state highlighted by lesson chrome; taps the named region. |
| **Prompt** *(host)* | “Select Odisha on the map.” |
| **Action** | Tap interactive region polygon |
| **Acceptance** | Only the target region is `interactive: true`; selection updates snapshot; `geomap.entity-selected` carries full entity record; selected styling via `style.role: "selected"` token |
| **Spec** | `layers[].type: "region"`, single item `interactive: true`, peers `interactive: false` |
| **Fixture** | `packages/geomap-engine/fixture/region/` |
| **Host** | Prompt + answer key on `entityId: "odisha"` |
| **Status** | `done` |

### `gm-r2-locate-discovery` — Locate a region among neighbours (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Sees several adjacent regions; must find the one matching the prompt without a pre-highlighted target. |
| **Prompt** *(host)* | “Which state borders the Bay of Bengal here?” |
| **Action** | Tap one of several interactive regions |
| **Acceptance** | Multiple region items `interactive: true`; wrong taps still emit `geomap.entity-selected` (host scores); regions remain distinguishable by label/alternative list |
| **Spec** | `layers[].type: "region"`, multiple items `interactive: true` |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` (`states` layer) |
| **Host** | Scoring on `entityId`; optional retry |
| **Status** | `done` |

### `gm-r3-context-display` — Display context regions (non-interactive)

| Field | Value |
|-------|-------|
| **Learner** | Sees neighbouring regions for geographic context; only the lesson target is tappable. |
| **Prompt** *(host)* | “Odisha is shown in context with West Bengal.” |
| **Action** | None on context regions |
| **Acceptance** | Context regions rendered with `interactive: false`; no hit targets; legend distinguishes `primary-region` vs `secondary-region` roles |
| **Spec** | Mixed `interactive` flags within one `region` layer, or separate layers with `style.role` |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` |
| **Host** | — |
| **Status** | `done` |

### `gm-r4-filter-regions` — Filter regions by attribute

| Field | Value |
|-------|-------|
| **Learner** | Chooses a category (e.g. “coastal states”) and the map shows only matching regions. |
| **Prompt** *(host)* | “Show only coastal states.” |
| **Action** | `filter` with category payload |
| **Acceptance** | Non-matching regions hidden or de-emphasized; `geomap.filter-applied` in event log; `clear-filter` restores full map |
| **Spec** | Entity metadata + `interaction.actions` includes `filter`, `clear-filter` |
| **Fixture** | `planned` |
| **Host** | Filter control labels |
| **Status** | `done` |

---

## Marker layer

### `gm-m1-identify-guided` — Identify a city (guided)

| Field | Value |
|-------|-------|
| **Learner** | Sees a map with one labelled city marker as the only tappable point. |
| **Prompt** *(host)* | “Tap the capital of Odisha.” |
| **Action** | Tap marker (and optional `label: true` text) |
| **Acceptance** | Marker hit target ≥ min touch size; `geomap.entity-selected` on `geom-cities-bhubaneswar`; label visible when `label: true` |
| **Spec** | `layers[].type: "marker"`, `items[].label`, single `interactive: true` |
| **Fixture** | `packages/geomap-engine/fixture/marker/` |
| **Host** | Answer key on `entityId` |
| **Status** | `done` |

### `gm-m2-locate-discovery` — Locate a landmark among markers (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Several point features on the map; finds the one described in the prompt. |
| **Prompt** *(host)* | “Find Chilika Lake.” |
| **Action** | Tap correct marker |
| **Acceptance** | Multiple markers `interactive: true`; selection events distinguish `entityId`; alternative list names each point |
| **Spec** | `layers[].type: "marker"`, multiple interactive items |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` (`cities`, `water` layers) |
| **Host** | Scoring |
| **Status** | `done` |

### `gm-m3-focus-marker` — Focus a marker (keyboard / programmatic)

| Field | Value |
|-------|-------|
| **Learner** | Uses keyboard or host-driven focus to move emphasis between markers without committing a selection answer. |
| **Prompt** *(host)* | Optional (“Explore cities on the map”) |
| **Action** | `focus` on `geom-{layerId}-{entityId}` |
| **Acceptance** | `geomap.entity-focused` emitted; focus ring visible; selection unchanged unless `select` also dispatched |
| **Spec** | `interaction.actions` includes `focus` |
| **Fixture** | `packages/geomap-engine/fixture/marker/` |
| **Host** | — |
| **Status** | `done` |

---

## Route layer

### `gm-t1-display-route` — Display a trade / migration route

| Field | Value |
|-------|-------|
| **Learner** | Sees a polyline connecting ordered places; taps endpoints to learn about each stop. |
| **Prompt** *(host)* | “Follow the route from A to C.” |
| **Action** | Tap interactive markers along the route; route itself is display-only |
| **Acceptance** | Route layer renders `path` through ≥ 2 entities; route node `interactive: false`; endpoint markers `interactive: true`; `style.role: "route"` on route layer |
| **Spec** | `layers[].type: "route"` with `items[].path`; companion `marker` layer |
| **Fixture** | `packages/geomap-engine/fixture/route/` |
| **Host** | Narration per stop |
| **Status** | `done` |

### `gm-t2-trace-route` — Trace a route step-by-step

| Field | Value |
|-------|-------|
| **Learner** | Advances along a route one segment at a time (play-pause or step). |
| **Prompt** *(host)* | “Watch how goods moved along this path.” |
| **Action** | `play-pause` or namespaced `geomap.step-route` |
| **Acceptance** | Active segment emphasized; completed segments styled; monotonic event log |
| **Spec** | Route layer + timeline-style interaction block |
| **Fixture** | `planned` |
| **Host** | Transport controls |
| **Status** | `done` |

---

## Integrated map (multi-layer)

### `gm-x1-explore-coastal` — Explore a coastal state (reference lesson)

| Field | Value |
|-------|-------|
| **Learner** | Explores regions, cities, and water features together; no single scored answer. |
| **Prompt** *(host)* | “Explore Odisha and its coastal geography.” |
| **Action** | Select / focus any interactive entity |
| **Acceptance** | Region + marker layers compose; legend visible; SVG has `title`/`desc`; every interactive node has `aria-label`; alternative list covers all entities |
| **Spec** | `interaction.mode: "explore"`; `viewport.fit: "content"`; provenance on sources |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` |
| **Host** | Lesson framing only |
| **Status** | `done` (e2e: `packages/geomap-engine/e2e/geomap.spec.ts`) |

### `gm-x2-guided-composed` — Guided lesson with context map

| Field | Value |
|-------|-------|
| **Learner** | Same integrated map as `gm-x1-explore-coastal` but only one entity is tappable for a scored step; context layers display-only. |
| **Prompt** *(host)* | “Select Odisha, then find its capital.” |
| **Action** | Sequential host workflow: dispatch `select` on region, then on marker |
| **Acceptance** | Mixed `interactive` flags across layers; `reset` clears selection between steps |
| **Spec** | Composed spec with `interaction.actions` including `reset` |
| **Fixture** | `planned` (derive from `odisha-coastal` + guided flags) |
| **Host** | Multi-step workflow |
| **Status** | `done` |

---

## NIOS course-building catalog

**Purpose.** Scenarios for building NIOS geography and social-science courses at OBE (primary), Secondary (213), and Senior Secondary (316) levels. Map content below is **generic placeholder** — any board or region can adopt it; the host must supply real data with `sources[]` (P9). Levels: `OBE-A` (≈classes 1–2), `OBE-B` (≈3–5), `OBE-C` (≈6–8), `SEC` (≈10), `SR` (≈12).

**Reading order:** use-case template and mode definitions in `docs/use-cases/README.md` and the sections above. Every case below is `planned` — it names a learner scenario first; a fixture and `New capability` land only when scheduled in PLAN-P8 Workstream A.

### Syllabus mapping

| Level | Subject | Map-relevant module | Typical topics |
|---|---|---|---|
| OBE-A | Environmental Studies | Locality and neighbourhood | home→school route, landmarks, directions, water bodies |
| OBE-B | Environmental Studies | Our India, land and water | states/capitals, major rivers, landforms, seasons |
| OBE-C | Environmental Studies | Physical setting of India | physiographic divisions, climate, vegetation |
| SEC | Social Science (213) | Module 1 (history) | national movement and colonial-era places |
| SEC | Social Science (213) | Module 2, L9–L14 | physiography, climate, biodiversity, agriculture, transport, population; board map skill (~8 marks) |
| SR | Geography (316) | Module VI | physical setting, climate, natural disasters |
| SR | Geography (316) | Modules VII–VIII | land/soil/vegetation/water resources; minerals and energy; industry; transport and trade |
| SR | Geography (316) | Module IX | population density/composition, human development, settlements |
| SR | Geography (316) | Practical geography | map elements, linear scale, map interpretation |

### Activity taxonomy and engine readiness

| Educational activity | What the learner does | Engine mechanics | Slice |
|----------------------|----------------------|------------------|-------|
| Locate | Find a named feature | guided/discovery select on region/marker | **Now** |
| Read the legend | Match symbol → feature | legend nodes + selection | `legend-link` gap |
| Read the compass | Follow cardinal/intercardinal directions | compass node or host chrome | Now (host-drawn ok) |
| Measure and compare distance | “About how far?”, “Which is nearer?” | scale bar + distance estimate | `scale-bar` gap |
| Relative position | Borders, “north of”, adjacency | selection + adjacency in alternative | `adjacency` gap |
| Distribution and pattern | Read a theme’s spread | attribute-encoded fill/markers | `attr-encoding` gap |
| Compare | Max/min, denser, wetter | discovery select over values | values now; visuals need `attr-encoding` |
| Movement and route | Trace a journey in order | route layer + step | `route-step` gap |
| Historical change | Order spatial states over time | period slices + playback | `period-slice` gap |
| Overlay and correlation | Relate two themes | layer toggles / stack | `layer-visibility` gap |
| Construct / mark | Place a feature on a blank map | construct `mark` mode | `construct-mark` gap |
| Inquiry / explore | Open exploration | explore mode, multi-layer | **Now** |
| Assessment | Board-style map questions | mix of the above | mixed |

### Group prefixes and new capabilities

| Prefix | Group | `New capability` | Proposal |
|--------|-------|------------------|----------|
| `gm-loc` | Locate | `linear-feature` | Selectable line entities (rivers, roads, borders) beyond display-only `route` |
| `gm-leg` / `gm-nav` | Legend and compass | `legend-link` | Legend row → scene-entity emphasis linkage |
| `gm-scale` | Distance and scale | `scale-bar` | Linear-scale node + distance estimate in snapshot |
| `gm-dir` | Relative position | `adjacency` | Alternative list exposes shared borders / neighbour sets |
| `gm-dist` | Distribution | `attr-encoding`, `filter-category` | Declarative data-driven region fill/marker size; category filter + `geomap.filter-applied` |
| `gm-cmp` | Comparison | `attr-encoding` | Value-aware visuals for max/min/rank tasks |
| `gm-move` | Movement and route | `route-step` | Ordered path stepping + `geomap.route-step` result event |
| `gm-hist` | Historical geography | `period-slice` | Region/boundary sets keyed by period; shared `play-pause`/`scrub` |
| `gm-ovl` | Overlay | `layer-visibility` | Non-superseded per-layer toggle (e.g. `geomap.toggle-layer`) |
| `gm-mark` | Construct / mark | `construct-mark` | Construct `mark` mode on blank basemap; learner entities in snapshot |
| `gm-inq` | Inquiry | `attr-encoding` (optional) | Explore for site/situation reasoning |
| `gm-asm` | Assessment | `construct-mark`, `scale-bar`, `attr-encoding` | Board-style map skill + encoding honesty |

---

## Location (`gm-loc-*`)

### `gm-loc-1-linear-feature` — Identify a linear feature (river or border)

| Field | Value |
|-------|-------|
| **Learner** | OBE-C / SEC: finds the river that the lesson names and follows its course to the sea. |
| **Prompt** *(host)* | “Tap the river that flows through the northern plain and empties into the eastern sea.” |
| **Action** | Select the river’s line; `focus` its source, then its mouth. |
| **Acceptance** | The river renders as a selectable line with named source/mouth markers; selection emits `geomap.entity-selected` with the feature record; alternative lists source and mouth. |
| **Spec** | A `line` layer (or interactive `route` items) with `items[].label`; source/mouth as `marker` sub-entities. |
| **Fixture** | `nios/loc-linear-feature` *(planned)* |
| **New capability** | `linear-feature` — today `route` items are display-only; rivers/roads need selectable line targets. |
| **Host** | Answer key: the named river. |
| **Status** | `done` |

### `gm-loc-2-multi-locate` — Label a whole map in sequence (board-skill preparation)

| Field | Value |
|-------|-------|
| **Learner** | SEC: works through a board-style list — “mark the capital, the peak, and the western sea on your map” — one feature at a time. |
| **Prompt** *(host)* | “Step 1: tap the capital city.” (host steps through N features) |
| **Action** | Guided select per feature; host dispatches `reset` between steps; a cumulative alternative list shows all placed labels. |
| **Acceptance** | Each step resolves to exactly one target; event log is monotonic (select/reset/select/…); snapshot’s alternative accumulates every answered feature. |
| **Spec** | `interaction.actions` includes `reset`; multi-layer region+marker composition. |
| **Fixture** | `nios/loc-multi-locate` *(planned)* |
| **Host** | Ordered step script + answer keys. |
| **Status** | `done` |

---

## Legend and compass (`gm-leg-*`, `gm-nav-*`)

### `gm-leg-1-match-symbol` — Match legend symbols to features

| Field | Value |
|-------|-------|
| **Learner** | OBE-B / SEC: matches a legend entry (peak, shrine, port) with the feature it describes. |
| **Prompt** *(host)* | “Tap the legend row for ‘mountain peak’, then tap the peak itself.” |
| **Action** | Select a legend row (emphasis on matching entities), then `select` the matching feature; `reset` between pairings. |
| **Acceptance** | Choosing a legend row highlights, but does not select, matching entities; feature selection emits `geomap.entity-selected`; alternative pairs each symbol with its meaning. |
| **Spec** | Legend items with `role`/symbol metadata; legend↔entity link ids. |
| **Fixture** | `nios/leg-match-symbol` *(planned)* |
| **New capability** | `legend-link` — legend selection must drive scene emphasis without changing selection state. |
| **Host** | Pairing rubric; symbol names localizable. |
| **Status** | `done` |

### `gm-leg-2-identify-symbol` — Name the feature a symbol stands for (display)

| Field | Value |
|-------|-------|
| **Learner** | OBE-A / OBE-B: reads the legend and tells what a symbol means. |
| **Prompt** *(host)* | “What does this legend symbol stand for?” (host binds a legend row to `focus`) |
| **Action** | `focus` the legend row; no selection required. |
| **Acceptance** | `geomap.entity-focused` carries the legend row record; alternative exposes the symbol caption for screen readers. |
| **Spec** | Legend rows as focusable semantic targets (display mode). |
| **Fixture** | `nios/leg-identify-symbol` *(planned)* |
| **Host** | Text/numeric answer check. |
| **Status** | `done` |

### `gm-nav-1-follow-compass` — Follow a compass direction

| Field | Value |
|-------|-------|
| **Learner** | OBE-A / OBE-B: “The shrine is to the north of the pond — which way should I walk?” |
| **Prompt** *(host)* | “Tap the feature that lies to the east of the school.” |
| **Action** | Discovery select among candidates; `focus` for keyboard exploration. |
| **Acceptance** | A compass rose (or host chrome) is visible; selection id identifies the correct entity; alternative lists each feature with its bearing from the reference point. |
| **Spec** | Compass node on scene (or host chrome); `interaction.mode: "explore"` optional. |
| **Fixture** | `nios/nav-follow-compass` *(planned)* |
| **Host** | Answer key per bearing; hints degrade gracefully (N→E→SE). |
| **Status** | `done` |

### `gm-nav-2-locate-in-region` — Which region contains this point?

| Field | Value |
|-------|-------|
| **Learner** | OBE-C / SEC: places a point feature (city, dam) and names the region that contains it. |
| **Prompt** *(host)* | “The dam lies inside which region?” |
| **Action** | Select the containing region; `focus` the point first as a cue. |
| **Acceptance** | Point and region compose in one scene; selection of the region emits `geomap.entity-selected`; alternative lists the point under its containing region. |
| **Spec** | Marker + region overlay; containment not required by engine (host scores). |
| **Fixture** | `nios/nav-locate-in-region` *(planned)* |
| **Host** | Containment answer key declared by host data. |
| **Status** | `done` |

---

## Distance and scale (`gm-scale-*`)

### `gm-scale-1-estimate-distance` — Estimate a distance from the scale

| Field | Value |
|-------|-------|
| **Learner** | SEC / SR: reads a linear scale and estimates the straight-line distance between two given points. |
| **Prompt** *(host)* | “About how far is City A from City B?” |
| **Action** | `focus` both markers, then `answer` a numeric estimate in the host. |
| **Acceptance** | A linear-scale node is rendered and labelled; the alternative or host provides the reference distance; nothing measures precise pixels. |
| **Spec** | `scale-bar` scene node; `viewport.fit` ensures a stable scale. |
| **Fixture** | `nios/scale-estimate-distance` *(planned)* |
| **New capability** | `scale-bar` — no scale/distances exist in the current snapshot. |
| **Host** | Tolerance band on the estimate; feedback on units. |
| **Status** | `done` |

### `gm-scale-2-nearest` — Which of two places is nearer to X?

| Field | Value |
|-------|-------|
| **Learner** | OBE-C / SEC: compares two candidate locations against a reference. |
| **Prompt** *(host)* | “Which city is nearer to the capital: City A or City B?” |
| **Action** | Discovery select between the two candidates. |
| **Acceptance** | Both candidate markers and the reference are visible; selection event carries entity ids; host scores on its geodetic reference data. |
| **Spec** | Marker layer with 3 items. |
| **Fixture** | `nios/scale-nearest` *(planned)* |
| **New capability** | `scale-bar` (visual reference for the answer); engine never asserts distance itself. |
| **Host** | Answer key from host data. |
| **Status** | `done` |

---

## Relative position (`gm-dir-*`)

### `gm-dir-1-borders` — Which regions share a border?

| Field | Value |
|-------|-------|
| **Learner** | SEC: works out the neighbours of a shaded region. |
| **Prompt** *(host)* | “Name the regions that border Region R1.” |
| **Action** | Discovery-select each neighbour; `reset` between picks; the shaded target is display-only emphasis. |
| **Acceptance** | The target is emphasised without being selectable; each neighbour selection emits `geomap.entity-selected`; alternative lists every region with its adjacent neighbours. |
| **Spec** | Region layer with mixed `interactive` flags; alternative exposes adjacency when `adjacency` lands. |
| **Fixture** | `nios/dir-borders` *(planned)* |
| **New capability** | `adjacency` — the alternative today lists entities, not neighbour sets. |
| **Host** | Answer set = adjacency list. |
| **Status** | `done` |

### `gm-dir-2-north-of` — What lies to the north?

| Field | Value |
|-------|-------|
| **Learner** | OBE-C / SEC: reasons directionally between named features. |
| **Prompt** *(host)* | “Which feature lies directly north of the national park?” |
| **Action** | Discovery select among candidates only along the target axis. |
| **Acceptance** | Candidates animate/narrow on the meridian (host or future filter); engine emits selection; alternative includes bearing hints. |
| **Spec** | Marker layer, discovery mode. |
| **Fixture** | `nios/dir-north-of` *(planned)* |
| **Host** | Answer key; optional axis filter via `filter`. |
| **Status** | `done` |

---

## Distribution and pattern (`gm-dist-*`)

### `gm-dist-1-theme-identify` — Identify the highest / lowest region for a theme

| Field | Value |
|-------|-------|
| **Learner** | SEC / SR: uses a shaded theme map (rainfall, density, forest cover) to find the region with the highest value. |
| **Prompt** *(host)* | “Which region receives the highest rainfall?” |
| **Action** | Discovery select the correct region among shaded candidates. |
| **Acceptance** | Region fills encode an authored `measure` deterministically (semantic encoding); selection payload includes the measure value; a legend explains buckets; nothing relies on colour alone (P6). |
| **Spec** | `style.by` / `measure` on region items; `attr-encoding` capability. |
| **Fixture** | `nios/dist-theme-identify` *(planned)* |
| **New capability** | `attr-encoding` — current `style.role` is a closed semantic-token set, not data-driven. |
| **Host** | Answer key: max row id + value. |
| **Status** | `done` |

### `gm-dist-2-theme-explore` — Explore a theme’s spatial pattern

| Field | Value |
|-------|-------|
| **Learner** | SR: explores the pattern of a theme before a discussion (e.g. “Where is forest cover highest and why?”). |
| **Prompt** *(host)* | “Explore how forest cover varies across the region.” |
| **Action** | Explore mode: select/focus any shaded region; view values in the alternative. |
| **Acceptance** | All regions interactive; theme legend visible; tabular/alternative lists measure values; deterministic encoding. |
| **Spec** | `interaction.mode: "explore"` + `attr-encoding`. |
| **Fixture** | `nios/dist-theme-explore` *(planned)* |
| **New capability** | `attr-encoding`. |
| **Host** | Discussion scaffold; no single answer. |
| **Status** | `done` |

### `gm-dist-3-filter-category` — Narrow a map by category

| Field | Value |
|-------|-------|
| **Learner** | SEC / SR: filters a busy map to one category (coastal states, rain-fed districts, mining belts). |
| **Prompt** *(host)* | “Show only the coastal regions.” |
| **Action** | Host dispatches `filter` with category ids; learner then selects within the subset. |
| **Acceptance** | Non-matching regions are hidden or de-emphasised; `geomap.filter-applied` in the event log; `clear-filter` restores the full map. |
| **Spec** | `interaction.actions` includes `filter`, `clear-filter`; category metadata on entities. |
| **Fixture** | `nios/dist-filter-category` *(planned)* |
| **New capability** | `filter-category` (extends planned `gm-r4-filter-regions` semantics). |
| **Host** | Filter control labels. |
| **Status** | `done` |

### `gm-dist-4-graduated-marker` — Read a scaled-marker map (city population)

| Field | Value |
|-------|-------|
| **Learner** | SEC / SR: reads city size off marker size, not a table. |
| **Prompt** *(host)* | “Which city has the largest population in this region?” |
| **Action** | Discovery select the largest marker. |
| **Acceptance** | Marker radius encodes a measure deterministically; legend ties size buckets to values; payload includes the population value; alternative lists values textually. |
| **Spec** | `marker.size.by` / `attr-encoding` on marker items. |
| **Fixture** | `nios/dist-graduated-marker` *(planned)* |
| **New capability** | `attr-encoding` (marker sizing). |
| **Host** | Answer key. |
| **Status** | `done` |

---

## Comparison (`gm-cmp-*`)

### `gm-cmp-1-which-more` — Which region has more of a quantity?

| Field | Value |
|-------|-------|
| **Learner** | OBE-C / SEC: compares two regions on a single measure. |
| **Prompt** *(host)* | “Which region has more rainfall: Region A or Region B?” |
| **Action** | Discovery select between two candidates. |
| **Acceptance** | Both candidates visible and comparable; selection payload carries each measure value; alternative lists both values. |
| **Spec** | Two region items with authored `measure` values. |
| **Fixture** | `nios/cmp-which-more` *(planned)* |
| **Host** | Answer key; “both” tolerated when values tie. |
| **Status** | `done` |

### `gm-cmp-2-density-max-min` — Find the densest and sparsest region (SR)

| Field | Value |
|-------|-------|
| **Learner** | SR (Module IX): works a population-density theme map. |
| **Prompt** *(host)* | “Tap the most densely populated region.” |
| **Action** | Discovery select; a second step asks for the least dense. |
| **Acceptance** | Same encoded theme map as `gm-dist-1`; wrong picks still emit selection events; values in payload. |
| **Spec** | `attr-encoding` + guided workflow with `reset`. |
| **Fixture** | `nios/cmp-density-max-min` *(planned)* |
| **New capability** | `attr-encoding`. |
| **Host** | Two answer keys (dense / sparse). |
| **Status** | `done` |

### `gm-cmp-3-relief-order` — Order the regions by height (ranking)

| Field | Value |
|-------|-------|
| **Learner** | SEC / SR: orders physiographic regions from lowest to highest relief. |
| **Prompt** *(host)* | “Put these three regions in order from lowest to highest.” |
| **Action** | Select regions one-by-one in rank order; host records the sequence. |
| **Acceptance** | Engine emits selections in order; alternative lists a relief hint per region; ranking is scored by the host, not the engine. |
| **Spec** | Region layer, discovery; host collects an ordered sequence. |
| **Fixture** | `nios/cmp-relief-order` *(planned)* |
| **Host** | Sequence rubric against authored relief values. |
| **Status** | `done` |

---

## Movement and route (`gm-move-*`)

### `gm-move-1-trace-journey` — Trace a journey in order

| Field | Value |
|-------|-------|
| **Learner** | SEC: follows a historical march or campaign stop by stop. |
| **Prompt** *(host)* | “Press play and watch the route from starting town to destination.” |
| **Action** | `play-pause` toggles stepping; `step` advances; select the current stop. |
| **Acceptance** | Active segment emphasised; completed segments styled; `step`/`scrub` mutate `snapshot.step`; `geomap.route-step` event logged; monotonic event log. |
| **Spec** | Route layer + step interactions (extends planned `gm-t2-trace-route`). |
| **Fixture** | `nios/move-trace-journey` *(planned)* |
| **New capability** | `route-step`. |
| **Host** | Narration per stop; final prompt asks for the destination. |
| **Status** | `done` |

### `gm-move-2-trade-route` — Follow an ancient trade route

| Field | Value |
|-------|-------|
| **Learner** | SEC: explores a long-distance trade route and its staging ports. |
| **Prompt** *(host)* | “Which port did the route leave the coast from?” |
| **Action** | Select staging markers; `follow`/`focus` route segments as they become available. |
| **Acceptance** | Route renders with named stops; each stop is selectable; selection events carry stop records; alternative lists ports in route order. |
| **Spec** | Route + marker layer; `interaction.actions` includes `focus`, `follow` (roadmap). |
| **Fixture** | `nios/move-trade-route` *(planned)* |
| **New capability** | `linear-feature` (selectable segments) + `route-step` (optional). |
| **Host** | Narration per port. |
| **Status** | `done` |

### `gm-move-3-transport-network` — Explore a transport network

| Field | Value |
|-------|-------|
| **Learner** | SEC (L13 Transport): reads a highway/rail network layered over administrative regions. |
| **Prompt** *(host)* | “Which cities does the northern corridor connect?” |
| **Action** | Select corridor lines and city markers; filter by corridor type. |
| **Acceptance** | Multiple routes render from authored data; city markers selectable; filter narrows routes by type; alternative lists routes and their endpoints. |
| **Spec** | Multi-route layer + markers; `filter`/`clear-filter` by route category. |
| **Fixture** | `nios/move-transport-network` *(planned)* |
| **New capability** | `linear-feature` + `filter-category`. |
| **Host** | Endpoint answer key. |
| **Status** | `done` |

### `gm-move-4-migration-patterns` — Trace movements of people

| Field | Value |
|-------|-------|
| **Learner** | SR (Module IX): follows migration flows between two regions. |
| **Prompt** *(host)* | “Trace the main migration stream from the north-east to the western city.” |
| **Action** | Step through a directed route; compare origin/destination markers. |
| **Acceptance** | Directed route with source/destination markers; step emphasises direction; alternative lists the flow with `from`/`to`. |
| **Spec** | Route layer with `directed: true` (roadmap); or authored one-way `path`. |
| **Fixture** | `nios/move-migration-patterns` *(planned)* |
| **New capability** | `route-step` (direction emphasis). |
| **Host** | Narration + discussion. |
| **Status** | `done` |

---

## Historical geography (`gm-hist-*`)

### `gm-hist-1-boundary-change` — Boundaries of a political entity over time

| Field | Value |
|-------|-------|
| **Learner** | SEC (history) / SR: watches a territory grow or shrink across periods. |
| **Prompt** *(host)* | “Press play: how did the territory change between 1700 and 1900?” |
| **Action** | `play-pause` / `scrub` through period slices; select a region on any slice. |
| **Acceptance** | Each period slice shows a different region set; transitions are deterministic; selecting an entity carries its period metadata; snapshot exposes the active slice. |
| **Spec** | Region sets keyed by period; shared `play-pause`/`scrub` (like Timeline). |
| **Fixture** | `nios/hist-boundary-change` *(planned)* |
| **New capability** | `period-slice`. |
| **Host** | Timeline narration; answer question on the final slice. |
| **Status** | `done` |

### `gm-hist-2-place-memory` — Locate the places of a movement

| Field | Value |
|-------|-------|
| **Learner** | SEC: locates the key places of the national movement on a modern map. |
| **Prompt** *(host)* | “Tap the city where the event of 1942 took place.” |
| **Action** | Guided/discovery select among city markers; `reset` between steps. |
| **Acceptance** | Markers carry event metadata; selection payload includes the event name; alternative lists places chronologically. |
| **Spec** | Marker layer with historical metadata; multi-step workflow with `reset`. |
| **Fixture** | `nios/hist-place-memory` *(planned)* |
| **Host** | Chronological facts must carry `sources[]` (P9). |
| **Status** | `done` |

### `gm-hist-3-route-over-time` — One route across changing territory

| Field | Value |
|-------|-------|
| **Learner** | SEC (history): follows an expedition whose route crosses regions that changed hands. |
| **Prompt** *(host)* | “Follow the route; name the regions it crossed in 1800.” |
| **Action** | Step the route; select regions on the active historical slice. |
| **Acceptance** | Route stays fixed while region slices change (composition of `route-step` + `period-slice`); events resolve to the active slice’s entities. |
| **Spec** | Route + period-keyed region set (two capabilities). |
| **Fixture** | `nios/hist-route-over-time` *(planned)* |
| **New capability** | `period-slice` + `route-step` composition. |
| **Host** | Historical facts need explicit provenance. |
| **Status** | `done` |

---

## Overlay and correlation (`gm-ovl-*`)

### `gm-ovl-1-relate-themes` — Relate rainfall to vegetation

| Field | Value |
|-------|-------|
| **Learner** | SEC (L10/L11) / SR: explains one theme with another on the same map. |
| **Prompt** *(host)* | “Where is the wettest region, and what vegetation do you expect there?” |
| **Action** | Toggle between the rainfall layer and the vegetation layer; select regions on either. |
| **Acceptance** | Both themes render from the same basemap; toggling preserves selection identity; alternative lists both values per region. |
| **Spec** | Two attribute-encoded layers + `layer-visibility`. |
| **Fixture** | `nios/ovl-relate-themes` *(planned)* |
| **New capability** | `layer-visibility` + `attr-encoding`. |
| **Host** | Correlation discussion; sources for both themes. |
| **Status** | `done` |

### `gm-ovl-2-why-there` — Explain why an industry is where it is (SR)

| Field | Value |
|-------|-------|
| **Learner** | SR (L24 Industry): interprets the site of an industrial region from minerals, power, rivers, and ports. |
| **Prompt** *(host)* | “Why is the industrial region located here? Point to two contributing factors on the map.” |
| **Action** | Select the mineral belt, the hydro plant, and the port that explain the industry’s site. |
| **Acceptance** | Factor layers compose over one basemap; multi-selection supported by the host or spec; each selection event carries layer + entity id. |
| **Spec** | Multi-layer composition; multi-select or sequential `reset` workflow. |
| **Fixture** | `nios/ovl-why-there` *(planned)* |
| **New capability** | `layer-visibility` (and multi-select if required by a second case). |
| **Host** | Justification rubric; sources required. |
| **Status** | `done` |

### `gm-ovl-3-risk-zones` — Read a disaster-risk map (SR)

| Field | Value |
|-------|-------|
| **Learner** | SR (L13/L18 Natural disasters): reads cyclone and earthquake risk against population. |
| **Prompt** *(host)* | “Which densely populated region is also cyclone-prone?” |
| **Action** | Select the region at the intersection of both hazard layers. |
| **Acceptance** | Hazard zones render as region overlays; population density is a second theme; selection payload includes both; alternative lists risk metadata. |
| **Spec** | Hazard region layer + density layer; `layer-visibility`. |
| **Fixture** | `nios/ovl-risk-zones` *(planned)* |
| **New capability** | `layer-visibility` + `attr-encoding`. |
| **Host** | Forward-looking discussion; data must carry provenance. |
| **Status** | `done` |

---

## Construct / mark (`gm-mark-*`)

### `gm-mark-1-place-on-blank` — Mark a named place on a blank map (board skill)

| Field | Value |
|-------|-------|
| **Learner** | SEC: the exam asks to mark a capital on an outline map. |
| **Prompt** *(host)* | “Mark the capital of Region South on the outline map.” |
| **Action** | `mark` construct: place a point at the correct location on a blank basemap; confirm. |
| **Acceptance** | Learner-placed point lands in snapshot as an authored entity; `mark` emits a namespaced `geomap.*` result event; host scores against a tolerance zone; nothing is pixel-scored by the engine itself. |
| **Spec** | Construct `mark` mode + blank basemap layer. |
| **Fixture** | `nios/mark-place-on-blank` *(planned)* |
| **New capability** | `construct-mark` — new D5-adjacent construct action; big contract item. |
| **Host** | Tolerance scoring; localizable prompts. |
| **Status** | `planned` |

### `gm-mark-2-line-on-blank` — Draw a linear feature on an outline map

| Field | Value |
|-------|-------|
| **Learner** | SEC: marks a river or mountain range on an outline map. |
| **Prompt** *(host)* | “Draw the course of River X from source to sea.” |
| **Action** | `mark` construct: place/connect points along the expected course; confirm. |
| **Acceptance** | Learner segments resolve to a polyline in snapshot; host scores against the reference course corridor; alternative lists the drawn segments for review. |
| **Spec** | Construct line mode; reference corridor is host data (never invented boundaries). |
| **Fixture** | `nios/mark-line-on-blank` *(planned)* |
| **New capability** | `construct-mark` (line variant). |
| **Host** | Corridor tolerance scoring. |
| **Status** | `planned` |

### `gm-mark-3-build-theme` — Shade a mini theme map (SR practical crossover)

| Field | Value |
|-------|-------|
| **Learner** | SR (Practical/Statistical diagrams): represents a small dataset by shading regions. |
| **Prompt** *(host)* | “Shade the two regions with above-average values.” |
| **Action** | `mark` construct: assign each region one of a few semantic classes; confirm. |
| **Acceptance** | Learner-built theme is a scene overlay; host compares to reference buckets; alternative lists the learner’s assignment. |
| **Spec** | Construct shading mode + `attr-encoding` classroom. |
| **Fixture** | `nios/mark-build-theme` *(planned)* |
| **New capability** | `construct-mark` + `attr-encoding`. |
| **Host** | Reference bucketing + feedback. |
| **Status** | `planned` |

---

## Inquiry (`gm-inq-*`)

### `gm-inq-1-why-settlement` — Why is the settlement where it is?

| Field | Value |
|-------|-------|
| **Learner** | SR (L29 Settlements): reasons about site/situation from rivers, relief, and routes. |
| **Prompt** *(host)* | “Explore the map: give two reasons the town grew here.” |
| **Action** | Explore mode across river, relief, and route layers. |
| **Acceptance** | Multi-layer explore; selection events across layers; alternative gives a spatial description. |
| **Spec** | `interaction.mode: "explore"`; multi-layer. |
| **Fixture** | `nios/inq-why-settlement` *(planned)* |
| **New capability** | `layer-visibility` for simultaneous themes (optional). |
| **Host** | Discussion; open response. |
| **Status** | `done` |

### `gm-inq-2-local-area` — Map the local neighbourhood (OBE / optional LAP)

| Field | Value |
|-------|-------|
| **Learner** | OBE-A/B: places the places of their own surroundings on a simple map. |
| **Prompt** *(host)* | “Put your school, the pond, and the bus stop on the map.” |
| **Action** | Guided placement on an outline sketch (construct) or select from provided markers (locate). |
| **Acceptance** | Learner entities appear in snapshot; alternative lists them; relative positions stay as authored. |
| **Spec** | `construct-mark` (or marker selection) on a local basemap. |
| **Fixture** | `nios/inq-local-area` *(planned)* |
| **New capability** | `construct-mark`. |
| **Host** | Learner-authored content is `illustrative` — never authoritative. |
| **Status** | `planned` |

---

## Assessment (`gm-asm-*`)

### `gm-asm-1-board-map-skill` — Board-style mark-and-identify set

| Field | Value |
|-------|-------|
| **Learner** | SEC: a timed sequence of 5 map tasks (mark a city, identify a feature, trace a route). |
| **Prompt** *(host)* | “(1) Mark the capital. (2) Name the feature at X. (3) …” |
| **Action** | Mix of `mark`, guided/discovery select, and `reset` between items. |
| **Acceptance** | Event log is the answer sheet (monotonic, item-tagged); snapshot captured per item; alternative supports screen-reader takers (P6 / NIOS visually-impaired alternative marking scheme). |
| **Spec** | Composed spec from `loc`, `mark`, `dir` cases. |
| **Fixture** | `nios/asm-board-map-skill` *(planned)* |
| **New capability** | `construct-mark`; otherwise composed of current mechanics. |
| **Host** | Rubric per item; per-item feedback; timing. |
| **Status** | `done` (loc/identify/trace half only — marking half deferred per gap-closure plan §1/§9) |

### `gm-asm-2-misconception-encoding` — Catch a misleading theme map

| Field | Value |
|-------|-------|
| **Learner** | SR (data-literacy): spots a theme map whose buckets exaggerate a difference. |
| **Prompt** *(host)* | “Region A looks three times Region B in size/shade. Is the data really three times as large?” |
| **Action** | Compare the encoded visual against the alternative’s numeric values. |
| **Acceptance** | Alternative values contradict any visual exaggeration; learner answers in the host; engine stays honest (P2/P9). |
| **Spec** | `attr-encoding` with explicit breakpoints; alternative as ground truth. |
| **Fixture** | `nios/asm-misconception-encoding` *(planned)* |
| **New capability** | `attr-encoding` — and a rule that encoding is never misleading by construction. |
| **Host** | Explanation rubric; sources required. |
| **Status** | `planned` |

### `gm-asm-3-verify-own-map` — Compare a learner map against the reference

| Field | Value |
|-------|-------|
| **Learner** | SEC: after marking a blank map, overlays it on the reference to self-check. |
| **Prompt** *(host)* | “Check your map: reveal the reference and compare.” |
| **Action** | Toggle between learner layer and reference layer. |
| **Acceptance** | Both overlays keyed to the same basemap; toggling preserves their respective entity ids; alternative lists learner placements. |
| **Spec** | Learner-authored layer + reference layer; `layer-visibility`. |
| **Fixture** | `nios/asm-verify-own-map` *(planned)* |
| **New capability** | `layer-visibility` + `construct-mark`. |
| **Host** | Self-check narration. |
| **Status** | `planned` |

---

## Accessibility and data fidelity

### `gm-a1-alternative-list` — Alternative representation

| Field | Value |
|-------|-------|
| **Learner** | Uses a text list/table instead of the SVG map to select or review entities. |
| **Prompt** *(host)* | — |
| **Action** | Select from alternative list (host binds list → `select` dispatch) |
| **Acceptance** | Alternative list includes every entity with non-empty `name` and `location`; nothing conveyed by color alone (P6) |
| **Spec** | Any fixture with `accessibility.label` |
| **Fixture** | `packages/geomap-engine/fixture/odisha-coastal/` |
| **Host** | List UI |
| **Status** | `done` |

### `gm-a2-validate-geography` — Reject invalid geography

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Unknown projection → `INVALID_SPEC`; missing `featureId` → `INVALID_REFERENCE`; out-of-range coordinates → `INVALID_ENTITY`; overlapping interactive regions → `INVALID_STATE` warning |
| **Spec** | Negative fixtures in e2e `tryCreate` |
| **Fixture** | `packages/geomap-engine/e2e/geomap.spec.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Fixture map

| Fixture path | Use cases | Notes |
|--------------|-----------|-------|
| `packages/geomap-engine/fixture/region/` | `gm-r1-identify-guided` | Minimal single-region guided select |
| `packages/geomap-engine/fixture/marker/` | `gm-m1-identify-guided`, `gm-m3-focus-marker` | Single city marker + focus |
| `packages/geomap-engine/fixture/route/` | `gm-t1-display-route` | Route display + interactive endpoints |
| `packages/geomap-engine/fixture/odisha-coastal/` | `gm-r2-locate-discovery`, `gm-r3-context-display`, `gm-m2-locate-discovery`, `gm-x1-explore-coastal`, `gm-a1-alternative-list` | Integrated explore; golden scene + e2e |
| `docs/fixtures/geomap/skill-example.json` | `gm-x1-explore-coastal` | Authoring skill reference (trimmed GeoJSON) |

Conformance harness: `/?engine=geomap` (default fixture: `odisha-coastal`).

---

## P8 priority (Workstream A — slice honesty)

| Priority | Use case | Rationale |
|----------|----------|-----------|
| P0 | `gm-x1-explore-coastal`, `gm-a1-alternative-list`, `gm-a2-validate-geography` | Exit gate: explore map, a11y, validation |
| P0 | `gm-r1-identify-guided`, `gm-m1-identify-guided` | Smallest guided-select slices per layer type |
| P1 | `gm-r2-locate-discovery`, `gm-m2-locate-discovery`, `gm-t1-display-route` | Discovery + route display |
| P2 | `gm-x2-guided-composed` | Multi-step guided composition (host + engine) |
| P3 | `gm-r4-filter-regions`, `gm-t2-trace-route` | Filter and route animation — spec names exist; engine slice not started |

---

## Contract changes (proposed by the NIOS catalog)

The `done` slice is expressible with the current surface (`region` / `marker` / `route`, `interactive` per item, D5 `select` / `focus` / `deselect` / `reset`). The NIOS catalog above **proposes** contract additions only where a catalogued use case fails acceptance without them (README rule — each entry names its use cases):

| Capability | Use cases that need it | Proposed contract surface |
|------------|------------------------|---------------------------|
| `linear-feature` | `gm-loc-1-linear-feature`, `gm-move-2-trade-route`, `gm-move-3-transport-network` | Selectable line entities (rivers, roads, borders) beyond display-only `route` |
| `legend-link` | `gm-leg-1-match-symbol` | Legend row → scene-entity emphasis linkage |
| `adjacency` | `gm-dir-1-borders`, `gm-nav-2-locate-in-region` | Alternative list exposes shared borders / neighbour sets |
| `scale-bar` | `gm-scale-1-estimate-distance`, `gm-scale-2-nearest`, `gm-asm-1-board-map-skill` | Linear-scale node + distance estimate in snapshot |
| `attr-encoding` | `gm-dist-1…2`, `gm-dist-4`, `gm-cmp-1…2`, `gm-ovl-1…3`, `gm-mark-3`, `gm-inq-1`, `gm-asm-2` | Declarative data-driven region fill / marker size (semantic encoding, never raw colors — P2/P9) |
| `route-step` | `gm-move-1-trace-journey`, `gm-move-4-migration-patterns`, `gm-t2-trace-route` | Ordered path stepping; `geomap.route-step` result event |
| `period-slice` | `gm-hist-1-boundary-change`, `gm-hist-3-route-over-time` | Region/boundary sets keyed by period + shared `play-pause`/`scrub` |
| `layer-visibility` | `gm-ovl-1…3`, `gm-inq-1`, `gm-asm-3-verify-own-map` | Non-superseded per-layer toggle (e.g. `geomap.toggle-layer`) |
| `filter-category` | `gm-dist-3-filter-category`, `gm-r4-filter-regions`, `gm-move-3-transport-network` | Category metadata + `geomap.filter-applied` result event |
| `construct-mark` | `gm-mark-1…3`, `gm-inq-2-local-area`, `gm-asm-1-board-map-skill`, `gm-asm-3` | Construct `mark`/answer mode on blank basemap; learner-authored entities in snapshot |

Every proposal must land in `docs/engines/geomap/SPEC.md` (§7.x actions, §66 events) before implementation. Reconcile as well the **already-emitted-but-undocumented** events `geomap.entity-selected` / `geomap.entity-focused` in SPEC §66, and document the `geom-{layerId}-{entityId}` node-id convention.
