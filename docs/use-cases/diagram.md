# Diagram engine — use-case catalog

**Status:** Active (P8 Workstream A — slice honesty)  
**Engine:** `diagram` (`packages/diagram-engine`)  
**Contract:** `docs/engines/diagram/SPEC.md`  
**Vision:** `docs/engines/diagram/VISION.md`

## How to read this document

Each use case is a **lesson archetype**. Implementers ship fixtures that match acceptance criteria; authors and agents copy those fixtures, not abstract prop grids.

Use cases are grouped by **diagram kind** (`flow`, `cycle`, `hierarchy`, `concept-map`). Stable scene node ids follow `node-{nodeId}` for nodes and `edge-{from}-{to}` for edges (authored node ids also resolve in dispatch).

**D7 boundary (always):**

| Layer | Owns |
|-------|------|
| **Engine** | Graph model, auto-layout, scene, SVG, semantic targets, D5 `select` / `focus` / `follow` / `expand` / `collapse` / `reset`, snapshot, alternative relationship list |
| **OpenEdu host** | Prompt text, answer key, correct/incorrect feedback, hints, progression, scoring, cross-engine links via `nodes[].links` |

---

## Interaction modes by diagram kind

| Mode | Kind | Authoring signal | Learner experience | Engine events |
|------|------|------------------|--------------------|---------------|
| **display** | all | Host asks without requiring selection; diagram is reference | Learner reads structure from labels and layout | — |
| **guided-select** | all | Host prompt names one node; future per-node gating | Learner taps the prompted stage or concept | `diagram.node-selected` |
| **discovery-select** | all | All nodes visible; host scores on `nodeId` | Learner finds the correct node among candidates | `diagram.node-selected` |
| **explore** | all | `interaction.mode: "explore"` | Free exploration of nodes and relationships | `diagram.node-selected`, `diagram.node-focused`, `diagram.relationship-followed` |
| **follow** | all | `follow` in `interaction.actions` | Learner traces an authored edge | `diagram.relationship-followed` |
| **focus** | all | `focus` in `interaction.actions` | Keyboard / programmatic emphasis on a node | `diagram.node-focused` |
| **expand-collapse** | hierarchy | `contains` / `part-of` edges; `expand` / `collapse` in actions | Learner reveals or hides subtree children | — *(state change only; no bespoke event)* |
| **edge-select** *(planned)* | all | edge items `interactive: true` | Learner selects the edge itself to answer a relationship question | `diagram.edge-selected` *(planned)* |
| **multi-select** *(planned)* | concept-map | cumulative `select` set | Learner chooses every cause / effect, not just one | repeated `diagram.node-selected` |
| **relationship-gate** *(planned)* | all | edge labels hidden until answered | Learner recalls the relationship, then confirms on reveal | `diagram.relationship-followed` *(planned reveal)* |
| **construct** *(planned)* | all | shuffled candidates; `answer` arranges or declares | Learner builds the structure: an order, or edges between parts | namespaced `diagram.*` result *(planned)* |
| **filter-nodes** *(planned)* | all | D5 `filter` on node `category` metadata | Learner narrows a busy graph to a subset | `diagram.filter-applied` *(planned)* |
| **what-if** *(planned)* | all | pick a node to de-emphasise | Learner inspects consequence paths when a node is removed | `diagram.node-deemphasised` *(planned)* |

**Node id convention:** scene nodes use `node-{nodeId}`; edges use `edge-{from}-{to}` unless `edges[].id` is authored. Dispatch accepts either `node-{nodeId}` or the authored `nodeId`.

**Layout:** `layout.type` at envelope root (`radial` | `hierarchical` | `grid`) is a strategy selector — never author coordinates. Auto-layout positions are `positionSource: 'illustrative'` (DESIGN §9).

**Graph laws (enforced):** `flow` and `hierarchy` MUST be acyclic DAGs; `cycle` MUST contain ≥ 1 directed cycle; `concept-map` MAY contain cycles. Every edge MUST declare an explicit `relationship` — never infer causality from adjacency.

**Guided vs discovery (current slice):** every node and edge is `interactive: true` in the scene. Host distinguishes guided lessons by prompt and scores on `nodeId` / `relationship`. Per-node `interactive` gating is not implemented yet — propose in SPEC if two or more use cases require it.

---

## Flow diagram (`content.kind: "flow"`)

Reference UX: acyclic process or progression. Default layout: `hierarchical`.

### `di-f1-trace-process` — Follow a linear process (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–7: explores Start → Process → End to understand sequence. |
| **Prompt** | Host: “What happens after Start?” |
| **Action** | Select nodes or `follow` edges along the path |
| **Acceptance** | Three nodes in DAG order; `leads-to` edges explicit; no directed cycle; `select` → `diagram.node-selected`; `follow` → `diagram.relationship-followed` |
| **Spec** | `kind: "flow"`, `edges[].relationship: "leads-to"`, acyclic graph |
| **Fixture** | `packages/diagram-engine/fixture/flow/` |
| **Host** | Discussion or scored follow-up |
| **Status** | `done` |

### `di-f2-identify-next-step` — Which step comes next? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: selects the node that follows Process in the flow. |
| **Prompt** | Host: “What comes after Process?” |
| **Action** | Tap the correct node (`End`) |
| **Acceptance** | Wrong node selections still emit `diagram.node-selected` (host scores); event payload includes `nodeId` |
| **Spec** | Same flow model as `di-f1-trace-process` |
| **Fixture** | `packages/diagram-engine/fixture/flow/` |
| **Host** | Answer key: `end` |
| **Status** | `done` |

### `di-f3-reject-cycle` — Flow must not contain a cycle (validation)

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Back-edge in a `flow` diagram → `INVALID_ENTITY`; `tryCreate` fails |
| **Spec** | `kind: "flow"` with `a → b → a` edge pair |
| **Fixture** | `packages/diagram-engine/e2e/diagram.spec.ts`, `packages/diagram-engine/test/validation.test.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Cycle diagram (`content.kind: "cycle"`)

Reference UX: circular process with ≥ 1 directed cycle. Default layout: `radial`.

### `di-c1-explore-cycle` — Explore a cyclical process (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–7: explores the water cycle stages in any order. |
| **Prompt** | Host: “Explore how water moves through the cycle.” |
| **Action** | Select / focus any stage; follow any `leads-to` edge |
| **Acceptance** | Four nodes in a closed cycle; radial layout; alternative list includes ≥ 1 `cycle` row; `nodes[].links` preserved in selection payload |
| **Spec** | `kind: "cycle"`, `layout: { type: "radial" }`, closed `leads-to` loop |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Lesson framing only |
| **Status** | `done` (e2e: `packages/diagram-engine/e2e/diagram.spec.ts`) |

### `di-c2-identify-stage` — Which stage follows evaporation? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: selects the stage that comes after evaporation. |
| **Prompt** | Host: “What happens right after evaporation?” |
| **Action** | Tap `condensation` node |
| **Acceptance** | Selection id resolves to `evaporation` / `node-evaporation`; payload `nodeId: "condensation"` on correct tap |
| **Spec** | Same cycle model as `di-c1-explore-cycle` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Answer key: `condensation` |
| **Status** | `done` |

### `di-c3-follow-relationship` — Trace a relationship (follow)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: follows the edge from collection back to evaporation. |
| **Prompt** | Host: “Follow the path from Collection back to Evaporation.” |
| **Action** | `follow` on `edge-collection-evaporation` |
| **Acceptance** | `diagram.relationship-followed` emitted; payload includes `relationship: "leads-to"`, `fromNodeId`, `toNodeId` |
| **Spec** | `interaction.actions` includes `follow` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Optional narration on follow |
| **Status** | `done` |

### `di-c4-minimal-cycle` — Minimal two-node cycle (baseline)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–8: sees the smallest valid cycle diagram. |
| **Prompt** | Host: “Stage A and Stage B form a repeating cycle.” |
| **Action** | Select either node |
| **Acceptance** | Two nodes, two opposing `leads-to` edges; cycle detection passes; golden scene + SVG stable |
| **Spec** | `kind: "cycle"` with 2-node cycle |
| **Fixture** | `packages/diagram-engine/fixture/cycle/` |
| **Host** | — |
| **Status** | `done` |

### `di-c5-reject-acyclic` — Cycle kind must contain a cycle (validation)

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | `kind: "cycle"` with only acyclic edges → `INVALID_ENTITY` |
| **Spec** | Single `leads-to` edge between two nodes |
| **Fixture** | `packages/diagram-engine/test/validation.test.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Hierarchy diagram (`content.kind: "hierarchy"`)

Reference UX: tree or organizational structure. Default layout: `hierarchical`. `contains` / `part-of` edges enable expand/collapse.

### `di-h1-explore-tree` — Explore an organizational tree (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–7: explores Root and its children. |
| **Prompt** | Host: “What does Root contain?” |
| **Action** | Select nodes; optional expand on Root |
| **Acceptance** | `contains` edges from Root to children; hierarchical layout; nodes labelled |
| **Spec** | `kind: "hierarchy"`, `relationship: "contains"` on parent → child edges |
| **Fixture** | `packages/diagram-engine/fixture/hierarchy/` |
| **Host** | Open response or discussion |
| **Status** | `done` |

### `di-h2-expand-collapse` — Reveal or hide subtree (expand / collapse)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: expands CEO node to reveal reports, then collapses to hide them. |
| **Prompt** | Host: “Show the teams under the CEO.” |
| **Action** | `expand` on `node-ceo`; `collapse` on same node |
| **Acceptance** | `snapshot.expanded` includes child node ids after expand; children hidden after collapse; only nodes with `contains`/`part-of` outgoing edges accept expand/collapse |
| **Spec** | `interaction.actions` includes `expand`, `collapse` |
| **Fixture** | `packages/diagram-engine/fixture/hierarchy/` |
| **Host** | Expand control labels |
| **Status** | `done` (`packages/diagram-engine/test/instance.test.ts`) |

### `di-h3-identify-parent` — Which node contains Child 1? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: selects the parent of Child 1. |
| **Prompt** | Host: “Which node contains Child 1?” |
| **Action** | Tap Root |
| **Acceptance** | `contains` edge `root → child1` in alternative list; selection payload identifies parent `nodeId` |
| **Spec** | Same hierarchy model as `di-h1-explore-tree` |
| **Fixture** | `packages/diagram-engine/fixture/hierarchy/` |
| **Host** | Answer key: `root` |
| **Status** | `done` |

---

## Concept map (`content.kind: "concept-map"`)

Reference UX: associative web of concepts; cycles allowed. Default layout: `grid`.

### `di-m1-explore-concepts` — Explore conceptual relationships (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: explores how Gravity and Mass relate to Weight. |
| **Prompt** | Host: “How are these concepts connected?” |
| **Action** | Select nodes; follow `influences` edges |
| **Acceptance** | Three nodes; two `influences` edges converge on Weight; node `description` available in metadata |
| **Spec** | `kind: "concept-map"`, `relationship: "influences"` |
| **Fixture** | `packages/diagram-engine/fixture/concept-map/` |
| **Host** | Discussion |
| **Status** | `done` |

### `di-m2-identify-influence` — What influences Weight? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: selects a concept that influences Weight. |
| **Prompt** | Host: “Tap one concept that influences Weight.” |
| **Action** | Tap Gravity or Mass |
| **Acceptance** | Both are valid selections; host scores on `nodeId`; edge labels show relationship type in alternative list |
| **Spec** | Same concept-map model as `di-m1-explore-concepts` |
| **Fixture** | `packages/diagram-engine/fixture/concept-map/` |
| **Host** | Answer key: `gravity` or `mass` (or both accepted) |
| **Status** | `done` |

### `di-m3-cyclic-concept-map` — Concept map with a cycle *(planned)*

| Field | Value |
|-------|-------|
| **Learner** | Grades 7–9: explores reciprocal influences between concepts. |
| **Prompt** | Host: “How do these ideas reinforce each other?” |
| **Action** | Select nodes along a cyclic path |
| **Acceptance** | `concept-map` kind accepts directed cycle; layout remains deterministic |
| **Spec** | `kind: "concept-map"` with back-edge |
| **Fixture** | `planned` |
| **Host** | — |
| **Status** | `planned` |

---

## Cross-kind

### `di-x1-focus-node` — Focus without selecting (keyboard / programmatic)

| Field | Value |
|-------|-------|
| **Learner** | Uses keyboard or host-driven focus to inspect a node before answering. |
| **Prompt** | Host: optional (“Use arrow keys to explore each stage.”) |
| **Action** | `focus` on `node-{nodeId}` or authored `nodeId` |
| **Acceptance** | `diagram.node-focused` emitted; selection unchanged unless `select` also dispatched |
| **Spec** | `interaction.actions` includes `focus` |
| **Fixture** | Any fixture |
| **Host** | — |
| **Status** | `done` |

### `di-x2-visual-entity-link` — Node links to Visual engine entity

| Field | Value |
|-------|-------|
| **Learner** | Selects Evaporation; host highlights linked water figure in a composed lesson. |
| **Prompt** | Host: “Select the stage where liquid becomes vapour.” |
| **Action** | `select` on node with `links.visualEntityId` |
| **Acceptance** | `diagram.node-selected` payload includes `links.visualEntityId`; cross-engine composition via event bus, not imports |
| **Spec** | `nodes[].links: { visualEntityId: "…" }` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Composed lesson chrome |
| **Status** | `done` |

### `di-x3-identify-relationship` — What relationship connects two nodes? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: follows or identifies the relationship between two named nodes. |
| **Prompt** | Host: “What is the relationship from Evaporation to Condensation?” |
| **Action** | `follow` on `edge-evaporation-condensation` |
| **Acceptance** | `diagram.relationship-followed` payload includes `relationship: "leads-to"`; alternative list names edge with relationship |
| **Spec** | Explicit `edges[].relationship` required |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | Answer key: `leads-to` |
| **Status** | `done` |

### `di-x4-photosynthesis-flow` — Multi-input process flow (authoring reference)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–8: traces inputs (sunlight, water, CO₂) through chloroplast to outputs. |
| **Prompt** | Host: “What do sunlight, water, and carbon dioxide produce?” |
| **Action** | Follow edges into and out of chloroplast |
| **Acceptance** | DAG with converging inputs and diverging outputs; all relationships explicit |
| **Spec** | `kind: "flow"`, multiple `leads-to` edges |
| **Fixture** | `docs/fixtures/diagram/skill-example.json` |
| **Host** | Scoring on output nodes |
| **Status** | `done` |

---

## NIOS course-building catalog

Lesson archetypes for building NIOS courses — open schooling (OBE **primary**, **Secondary**, **Senior Secondary**) and any board that wants process / structure literacy. The engine reasons about **graph structure** (D7 — host owns prompt, answer key, feedback, hints, scoring); structure is the skill, topics are the content. All content below is placeholder-generic — swap any board's real topics in, keep the activity the same.

As with the GeoMap catalog, most cases reveal **contract gaps**. Marked `planned`; status flips to `done` when the engine and fixtures carry acceptance (exit gate, not intent).

### Syllabus mapping

| Level | Subject | Typical diagram topics | Cases |
|-------|---------|------------------------|-------|
| OBE-A | Env studies — nature & surroundings | Parts of a plant, body parts, day–night | `di-lab-1`, `di-class-1` |
| OBE-B | Env studies — surroundings | Butterfly/frog life cycle, seasons, water cycle | `di-cycl-1`, `di-cycl-2`, `di-ord-1` |
| OBE-C | Science | Photosynthesis, food chain, neighbourhood systems | `di-proc-2`, `di-sys-1`, `di-inq-3` |
| Secondary | Science | Digestion, photosynthesis, rock cycle, food web, plant/animal cells | `di-proc-1`, `di-proc-3`, `di-cycl-3`, `di-sys-1`, `di-lab-4`, `di-cmp-1` |
| Secondary | Social science (history) | National movement, causes → events → outcomes | `di-hist-1`, `di-hist-2`, `di-hist-3`, `di-proc-5` |
| Secondary | Social science (geography) | Monsoon mechanism, drainage, disaster cycle | `di-sys-2`, `di-cycl-4`, `di-proc-4` |
| Secondary | Social science (civics) | Government & judiciary levels, election flow | `di-class-3`, `di-class-2`, `di-class-6`, `di-proc-4` |
| Senior Secondary | Geography — physical | Rock / hydrological cycles, landform formation, drainage basin | `di-cycl-3`, `di-cycl-5`, `di-sys-2`, `di-proc-1` |
| Senior Secondary | Geography — economic | Sector taxonomy, industrial linkages, urban hierarchy | `di-class-4`, `di-class-5`, `di-sys-3` |
| Senior Secondary | Geography — human | Population change, migration causes, settlement, city systems | `di-cause-2`, `di-proc-5`, `di-sys-4`, `di-lab-3` |
| Senior Secondary | Geography — practical | Flow / statistical diagram reading, explanation with evidence | `di-proc-1`, `di-asm-1`, `di-asm-3`, `di-inq-1` |

### Activity taxonomy and engine readiness

| Activity | Learner does | Mechanics | Capability |
|----------|--------------|-----------|------------|
| Follow a process | Trace steps in order | `select` / `follow` on flow | `done` |
| Identify the next / earlier step | Pick the node that succeeds (or precedes) | discovery `select` | `done` *(direction is host-side)* |
| Step around a natural cycle | Follow the loop, name each stage | `follow` on cycle | `done` |
| Classify / parts-whole | Expand levels, locate a node | hierarchy `expand` / `collapse` | `done` |
| Read a network / system | Explore links and loops | concept-map with cycles | `done` |
| Name a relationship | Pick the edge that connects two nodes | edge targeting | `edge-select` *(planned)* |
| Choose all causes / effects | Select every relevant node in a set | cumulative selection | `multi-select` *(planned)* |
| Recall a hidden relationship | Answer before confirming on the edge | gated labels | `relationship-gate` *(planned)* |
| Narrow a busy graph | Focus a subset (producers only, a sector only) | category filter | `filter-nodes` *(planned)* |
| Assemble the structure | Arrange shuffled stages in the right order | construct | `construct-order` *(planned)* |
| Connect parts with a relation | Declare a relationship between two parts | construct | `construct-edge` *(planned)* |
| Label parts of a figure | Identify a named part of an illustration | `label-diagram` kind | `label-diagram` *(future kind)* |
| Compare two structures | Side-by-side; spot the difference | parallel scenes | `compare-layout` *(planned)* |
| Explain using the diagram | Follow an influence chain, argue in the host | explore + `follow` | `done` (+ `follow-chain`) |
| Interpret a structure change | Suppose a node is removed — what breaks? | de-emphasis | `what-if` *(planned)* |
| Judgement on validity | Is this graph a valid flow / cycle / hierarchy? | graph laws | `done` (validation) |
| Board-style diagram reading | Answer N questions against one diagram | mixture | `done`-host |

### Group prefixes and new capabilities

| Group | Focus | Cases | New capability used |
|-------|-------|-------|---------------------|
| `di-proc-*` | Processes & sequences | 1–5 | `filter-nodes` |
| `di-cycl-*` | Natural & social cycles | 1–5 | `relation-vocab` (multi-path rock cycle) |
| `di-class-*` | Classification & hierarchy | 1–6 | `filter-nodes` |
| `di-cause-*` | Cause-effect concept maps | 1–6 | `multi-select`, `edge-select`, `relationship-gate`, `edge-weight`, `follow-chain` |
| `di-sys-*` | Systems & networks | 1–4 | `filter-nodes`, `relation-vocab` |
| `di-lab-*` | Label & annotate | 1–4 | `label-diagram`, `multi-select`, `construct-edge`, `relation-vocab` |
| `di-ord-*` | Ordering & construction | 1–3 | `construct-order`, `construct-edge` |
| `di-cmp-*` | Compare structures | 1–3 | `compare-layout`, `diff-emphasis` |
| `di-hist-*` | Historical processes & change | 1–4 | `links` vocabulary (`geomapEntityId`, `timelineEventId`) |
| `di-inq-*` | Inquiry & explanation | 1–3 | `what-if`, `follow-chain` |
| `di-asm-*` | Assessment | 1–3 | mixture (no new capability) |

### New capabilities in one line

- `edge-select` — edges become selectable targets ("which relationship connects A and B?") → planned `diagram.edge-selected`
- `multi-select` — cumulative selection set (all causes / all effects / all parts)
- `relationship-gate` — edge labels hidden until the learner commits an answer, then revealed
- `filter-nodes` — D5 `filter` on node `category` metadata → planned `diagram.filter-applied`
- `construct-order` — shuffled candidate nodes; learner arranges them into an order (construct answer)
- `construct-edge` — learner declares a relationship between two nodes, validated by graph laws
- `label-diagram` — the future diagram kind (`di-p1`): node → region-of-interest mapping
- `compare-layout` — two subgraph scenes rendered side-by-side under one layout strategy
- `diff-emphasis` — delta highlight between two authored structures
- `what-if` — non-destructive node de-emphasis (spec never mutated)
- `edge-weight` — semantic relative strength / influence metadata on edges (data, never style)
- `follow-chain` — per-step emphasis along a multi-edge path
- `relation-vocab` — extend the closed `relationship` enum with domain relations
- `links` vocabulary — extend `nodes[].links` beyond `visualEntityId` to `geomapEntityId`, `timelineEventId`

### Content rules

- **Generic placeholders:** every case keeps entities generic (`Kingdom → Phylum → Class`, `Chain A → Zone B`). The syllabus mapping names the *slot* a real course fills.
- **Structure before content (P1):** diagram-reading skill transfers across boards; topics do not. Keep the activity, swap the content.
- **Provenance (P9):** learner-facing entities must carry `sources[]` from host data; never invent relationships, kingdom branches, or boundaries absent from the data. `relationship` is never inferred from adjacency.

---

## Processes & sequences (`di-proc-*`) — `flow`

### `di-proc-1-follow-process` — Follow a natural process through its stages

| Field | Value |
|-------|-------|
| **Learner** | Secondary science / SR practical: traces how one stage becomes the next (digestion, weathering → erosion → deposition). |
| **Prompt** *(host)* | "Follow the path of a grain from source to delta." |
| **Action** | `follow` each directed edge in order. |
| **Acceptance** | Flow is a DAG with explicit `leads-to`; step emphasis tracks the learner; alternative list ranks steps in authored order. |
| **Spec** | `kind: "flow"`, `follow` in actions. |
| **Fixture** | `nios/di-proc-follow-process` *(planned)* |
| **New capability** | — (current slice) |
| **Host** | Step narration; order scoring. |
| **Status** | `done` |

### `di-proc-2-input-output` — Multi-input process with named outputs

| Field | Value |
|-------|-------|
| **Learner** | OBE-C / Secondary (Photosynthesis): separates inputs, process, outputs. |
| **Prompt** *(host)* | "Which of these are inputs to the process, and which are outputs?" |
| **Action** | Select input vs output node (two discovery rounds). |
| **Acceptance** | Converging inputs / diverging outputs; selection scored per role; alternative list groups inputs and outputs. |
| **Spec** | `kind: "flow"`, multiple `leads-to` into and out of the process node. |
| **Fixture** | `nios/di-proc-input-output` *(planned)* |
| **New capability** | — (scored lesson built on `di-x4`) |
| **Host** | Role-group scoring; correctness narration. |
| **Status** | `done` |

### `di-proc-3-which-step` — Identify the next or preceding step (reverse reading)

| Field | Value |
|-------|-------|
| **Learner** | Secondary: given a step, finds its successor or predecessor. |
| **Prompt** *(host)* | "Which step comes right after grinding? Which came before it?" |
| **Action** | Discovery `select` of an adjacent node, in either direction. |
| **Acceptance** | Only the correct neighbour accepted; direction supplied by prompt; predecessor vs successor disambiguated. |
| **Spec** | `kind: "flow"` + discovery. |
| **Fixture** | `nios/di-proc-which-step` *(planned)* |
| **New capability** | — (directed edges already support reverse prompts) |
| **Host** | Bi-directional prompts. |
| **Status** | `done` |

### `di-proc-4-branch-flow` — Branching / decisional flow

| Field | Value |
|-------|-------|
| **Learner** | Secondary civics (election process) / science: follows a flow that fans out at a junction. |
| **Prompt** *(host)* | "Follow the path from 'polling day' to its outcomes." |
| **Action** | `follow` along one chosen branch. |
| **Acceptance** | DAG with a junction node; branch choice is a selection; alternative list shows all branches. |
| **Spec** | `kind: "flow"` with fan-out. |
| **Fixture** | `nios/di-proc-branch-flow` *(planned)* |
| **New capability** | — (fan-out is ordinary DAG) |
| **Host** | Branch-level acceptance; per-branch explanations. |
| **Status** | `done` |

### `di-proc-5-effect-chain` — Cause → mechanism → consequence chain

| Field | Value |
|-------|-------|
| **Learner** | Secondary social science / SR geography: traces an effect chain (rainfall → crop → price). |
| **Prompt** *(host)* | "What follows a weak monsoon season? Keep tracing." |
| **Action** | `follow` along the chain; grey out unrelated branches. |
| **Acceptance** | Each step explicit `leads-to`; alternative list is the chain order; final consequence emphasised. |
| **Spec** | `kind: "flow"` + `filter-nodes`. |
| **Fixture** | `nios/di-proc-effect-chain` *(planned)* |
| **New capability** | `filter-nodes` *(planned)* — grey unrelated branches. |
| **Host** | Consequence rubric. |
| **Status** | `done` |

---

## Natural & social cycles (`di-cycl-*`) — `cycle`

### `di-cycl-1-water-cycle-course` — Stage identification on the water cycle (course version)

| Field | Value |
|-------|-------|
| **Learner** | OBE-B: moves around the loop and names each stage. |
| **Prompt** *(host)* | "Where does water become vapour?" |
| **Action** | Discovery `select` of a stage node; `follow` to the next. |
| **Acceptance** | Directed cycle with ≥ 4 stages; both directions followable; stage ids stable. |
| **Spec** | `kind: "cycle"` + `follow`. |
| **Fixture** | `nios/di-cycl-water-cycle` *(planned; course variant of `di-c1`)* |
| **New capability** | — |
| **Host** | Stage narration. |
| **Status** | `done` |

### `di-cycl-2-life-cycle` — Butterfly / frog life cycle

| Field | Value |
|-------|-------|
| **Learner** | OBE-B: traces egg → larva → … → egg. |
| **Prompt** *(host)* | "Follow a frog's journey and find the step that repeats." |
| **Action** | `follow` the loop; start anywhere. |
| **Acceptance** | Directed cycle; any entry node accepted as the start; alternative list iterates the stages. |
| **Spec** | `kind: "cycle"`. |
| **Fixture** | `nios/di-cycl-life-cycle` *(planned)* |
| **New capability** | — (construct variant in `di-ord-1`) |
| **Host** | Stage narration. |
| **Status** | `done` |

### `di-cycl-3-rock-cycle` — Multi-path geological cycle

| Field | Value |
|-------|-------|
| **Learner** | SR geography: transitions between igneous, sedimentary, metamorphic — not a simple loop. |
| **Prompt** *(host)* | "Which process turns sediment into rock? And that rock back into magma?" |
| **Action** | Follow one transition at a time; name the transformation. |
| **Acceptance** | Best modelled as `concept-map` (permits cycles) with explicit `transforms-to` relations; every transition declared. |
| **Spec** | `kind: "concept-map"` (reuses `di-m3` cyclic machinery). |
| **Fixture** | `nios/di-cycl-rock-cycle` *(planned)* |
| **New capability** | `relation-vocab` *(planned)* — domain relations (`transforms-to`, `weathers-into`) beyond the closed initial set. |
| **Host** | Transition quizzes. |
| **Status** | `done` |

### `di-cycl-4-disaster-cycle` — Disaster management cycle

| Field | Value |
|-------|-------|
| **Learner** | Secondary geography / civics: mitigation → preparedness → response → recovery → mitigation. |
| **Prompt** *(host)* | "Where does a community restart after response?" |
| **Action** | `follow` / select stages; identify the loop. |
| **Acceptance** | Directed cycle; phase labels as stage nodes. |
| **Spec** | `kind: "cycle"`. |
| **Fixture** | `nios/di-cycl-disaster-cycle` *(planned)* |
| **New capability** | — |
| **Host** | Phase definitions. |
| **Status** | `done` |

### `di-cycl-5-social-cycle` — A social / economic cycle

| Field | Value |
|-------|-------|
| **Learner** | SR geography / economics: sees a recurring economic pattern as a loop. |
| **Prompt** *(host)* | "Follow demand → prices → production → demand. Where do you return?" |
| **Action** | `follow` around the loop; notice the return point. |
| **Acceptance** | Directed cycle with explicit relations; the return node reuses the start node id. |
| **Spec** | `kind: "cycle"`. |
| **Fixture** | `nios/di-cycl-social-cycle` *(planned)* |
| **New capability** | — |
| **Host** | Cycle-recognition prompt. |
| **Status** | `done` |

---

## Classification & hierarchy (`di-class-*`) — `hierarchy`

### `di-class-1-classify` — Classification tree

| Field | Value |
|-------|-------|
| **Learner** | OBE-B / Secondary: unfolds a taxonomy level by level. |
| **Prompt** *(host)* | "Open the top group — what appears below it?" |
| **Action** | `expand` / `collapse` subtrees; locate a named leaf. |
| **Acceptance** | Hierarchy with `contains` / `is-a`; expand state per node; alternative list = visible nodes. |
| **Spec** | `kind: "hierarchy"` + expand/collapse. |
| **Fixture** | `nios/di-class-classify` *(planned; course variant of `di-h2`)* |
| **New capability** | — |
| **Host** | Level narration. |
| **Status** | `done` |

### `di-class-2-part-whole` — Parts of a system

| Field | Value |
|-------|-------|
| **Learner** | Secondary science or civics: knows what is part of what. |
| **Prompt** *(host)* | "Which of these is a part of the Parliament?" |
| **Action** | Discovery `select` of a node via `part-of` / `contains`. |
| **Acceptance** | Hierarchy with `contains` / `part-of`; membership questions scored. |
| **Spec** | `kind: "hierarchy"`. |
| **Fixture** | `nios/di-class-part-whole` *(planned)* |
| **New capability** | — |
| **Host** | Membership scoring. |
| **Status** | `done` |

### `di-class-3-government-levels` — Union → State → Local; judiciary ladder

| Field | Value |
|-------|-------|
| **Learner** | Secondary civics: places offices at their level of government. |
| **Prompt** *(host)* | "Which level of government runs a municipality?" |
| **Action** | Select the correct level node; expand / collapse to inspect. |
| **Acceptance** | Level hierarchy (centre / state / local, plus a parallel judiciary ladder); an office maps to one level node. |
| **Spec** | `kind: "hierarchy"`. |
| **Fixture** | `nios/di-class-gov-levels` *(planned)* |
| **New capability** | — (multi-ladder is two subgraphs in one scene) |
| **Host** | Level-label mapping. |
| **Status** | `done` |

### `di-class-4-sector-taxonomy` — Economic sectors and their activities

| Field | Value |
|-------|-------|
| **Learner** | SR geography / economics: classifies activities into primary / secondary / tertiary / quaternary. |
| **Prompt** *(host)* | "Which sector does a school belong to?" |
| **Action** | `select` a leaf under the sector level; expand to see examples. |
| **Acceptance** | Sector hierarchy with example leaves; classification scored. |
| **Spec** | `kind: "hierarchy"` with examples as leaves. |
| **Fixture** | `nios/di-class-sector-taxonomy` *(planned)* |
| **New capability** | — |
| **Host** | Classification rubric. |
| **Status** | `done` |

### `di-class-5-urban-hierarchy` — Settlement / urban ladder

| Field | Value |
|-------|-------|
| **Learner** | SR geography: village → town → city → metropolis with size thresholds. |
| **Prompt** *(host)* | "Order the settlements by size." |
| **Action** | Rank the levels; highlight a size bracket. |
| **Acceptance** | Ranked hierarchy; thresholds are node metadata (host copy), never pixels; bracket highlight focuses a subset. |
| **Spec** | `kind: "hierarchy"` + `filter-nodes`. |
| **Fixture** | `nios/di-class-urban-hierarchy` *(planned)* |
| **New capability** | `filter-nodes` *(planned)* — threshold-bracket highlight. |
| **Host** | Rank prompts. |
| **Status** | `done` |

### `di-class-6-parent-locate` — Find the parent level (reverse)

| Field | Value |
|-------|-------|
| **Learner** | Secondary: given a leaf, finds its immediate parent. |
| **Prompt** *(host)* | "What sits directly above 'district'?" |
| **Action** | Discovery `select` of the parent. |
| **Acceptance** | Known parent adjacency; `part-of` edges scorable in both directions. |
| **Spec** | `kind: "hierarchy"`. |
| **Fixture** | `nios/di-class-parent-locate` *(planned)* |
| **New capability** | — (edges already support reverse reading) |
| **Host** | Reverse-reading prompts. |
| **Status** | `done` |

---

## Cause-effect concept maps (`di-cause-*`) — `concept-map`

### `di-cause-1-many-effects` — One cause → several effects (all that apply)

| Field | Value |
|-------|-------|
| **Learner** | Secondary: "which of these follow X?" |
| **Prompt** *(host)* | "Select every effect of deforestation." |
| **Action** | Select **all** effect nodes (cumulative). |
| **Acceptance** | Cumulative selection set; scored on the set (exact or partial — host policy). |
| **Spec** | `kind: "concept-map"`, `influences` / `leads-to`. |
| **Fixture** | `nios/di-cause-many-effects` *(planned)* |
| **New capability** | `multi-select` *(planned)* |
| **Host** | Set-scoring. |
| **Status** | `done` |

### `di-cause-2-many-causes` — Several causes → one outcome

| Field | Value |
|-------|-------|
| **Learner** | SR: "which of these drive urban growth?" |
| **Prompt** *(host)* | "Pick every factor that increases migration to cities." |
| **Action** | Select all causal nodes. |
| **Acceptance** | Cumulative multi-select; the outcome node is the shared target. |
| **Spec** | `kind: "concept-map"` with converging `influences`. |
| **Fixture** | `nios/di-cause-many-causes` *(planned)* |
| **New capability** | `multi-select` *(planned)* |
| **Host** | Set-scoring + distractors. |
| **Status** | `done` |

### `di-cause-3-relationship-name` — Name the relationship between two concepts

| Field | Value |
|-------|-------|
| **Learner** | Secondary / SR: "are these the same or opposite?"; `influences` vs `leads-to`. |
| **Prompt** *(host)* | "Which word describes how rainfall connects to soil erosion?" |
| **Action** | Select / follow the edge between them. |
| **Acceptance** | Edge selection yields the authored `relationship`; alternative list edges with relations. |
| **Spec** | `kind: "concept-map"`, authored edge ids. |
| **Fixture** | `nios/di-cause-relationship-name` *(planned)* |
| **New capability** | `edge-select` *(planned)* — planned `diagram.edge-selected`. |
| **Host** | Relationship scoring. |
| **Status** | `done` |

### `di-cause-4-influence-chain` — Follow an influence chain end to end

| Field | Value |
|-------|-------|
| **Learner** | SR inquiry: "why is the delta so fertile?" — argued through influences. |
| **Prompt** *(host)* | "Trace every factor feeding sediment fertility." |
| **Action** | `follow` along a multi-edge path, one hop emphasised at a time. |
| **Acceptance** | Consecutive emphasis along a unique path; alternative list is the path. |
| **Spec** | `kind: "concept-map"` + `follow`. |
| **Fixture** | `nios/di-cause-influence-chain` *(planned)* |
| **New capability** | `follow-chain` *(planned)* — per-step path emphasis. |
| **Host** | Explanation rubric. |
| **Status** | `done` |

### `di-cause-5-relative-influence` — Heavier vs lighter influence (advanced)

| Field | Value |
|-------|-------|
| **Learner** | SR: two causes, one dominant for a given outcome. |
| **Prompt** *(host)* | "Which matters more for crop choice: soil or rain?" |
| **Action** | Compare edge weights; select the dominant cause. |
| **Acceptance** | Edges carry semantic `strength` / influence metadata; scoring on the dominant edge. |
| **Spec** | `kind: "concept-map"` with weighted edges. |
| **Fixture** | `nios/di-cause-relative-influence` *(planned)* |
| **New capability** | `edge-weight` *(planned)* — weight is data, never style. |
| **Host** | Relative-reasoning rubric. |
| **Status** | `done` |

### `di-cause-6-relationship-gate` — Recall the hidden relationship, then confirm

| Field | Value |
|-------|-------|
| **Learner** | Secondary: edge labels hidden; recalls the relationship first. |
| **Prompt** *(host)* | "What is the relationship between rainfall and soil erosion?" |
| **Action** | Learner states the answer in the host → engine reveals the label → confirm via `follow`. |
| **Acceptance** | Labels hidden initially; reveal only after an answer; follow afterwards; deterministic. |
| **Spec** | `relationship-gate` *(planned)* |
| **Fixture** | `nios/di-cause-relationship-gate` *(planned)* |
| **New capability** | `relationship-gate` *(planned)* |
| **Host** | Recall prompts + reveal copy. |
| **Status** | `done` |

---

## Systems & networks (`di-sys-*`) — `concept-map`

### `di-sys-1-food-web` — Food web with energy direction

| Field | Value |
|-------|-------|
| **Learner** | Secondary science: traces who eats whom; finds the loop via decomposers. |
| **Prompt** *(host)* | "Follow energy from the Sun to the top consumer, then to the decomposer." |
| **Action** | `follow` directed feeding edges; find the returning loop. |
| **Acceptance** | `concept-map` with directed feeding relations and ≥ 1 cycle; `filter-nodes` isolates producers. |
| **Spec** | `kind: "concept-map"` + cycle alternative list. |
| **Fixture** | `nios/di-sys-food-web` *(planned)* |
| **New capability** | `filter-nodes`, `relation-vocab` (`feeds-on`). |
| **Host** | Energy-path narration. |
| **Status** | `done` |

### `di-sys-2-drainage-basin` — Drainage basin as inputs, storage, outputs

| Field | Value |
|-------|-------|
| **Learner** | SR geography: precipitation → runoff → river → sea, with groundwater storage. |
| **Prompt** *(host)* | "Where does rainwater accumulate before entering the river?" |
| **Action** | Follow flows; identify storage vs transport nodes. |
| **Acceptance** | Nodes typed by role (storage / flow) as metadata; relations explicit. |
| **Spec** | `kind: "concept-map"` or `flow` with named storages. |
| **Fixture** | `nios/di-sys-drainage-basin` *(planned)* |
| **New capability** | — (roles are node metadata; host copy) |
| **Host** | Storage / flow narration. |
| **Status** | `done` |

### `di-sys-3-industrial-linkages` — Backward / forward linkages

| Field | Value |
|-------|-------|
| **Learner** | SR economics / geography: minerals → steel → machinery → goods; backward linkage to mining. |
| **Prompt** *(host)* | "Which industry feeds steel, and which does steel feed?" |
| **Action** | Follow forward and backward edges from a hub node. |
| **Acceptance** | Flows with explicit linkage relations; directions scorable both ways. |
| **Spec** | `kind: "flow"`. |
| **Fixture** | `nios/di-sys-industrial-linkages` *(planned)* |
| **New capability** | — |
| **Host** | Linkage definitions. |
| **Status** | `done` |

### `di-sys-4-city-system` — City as a metabolic system (inputs → waste loop)

| Field | Value |
|-------|-------|
| **Learner** | SR: food, energy, water in; waste out; recycling loops. |
| **Prompt** *(host)* | "Follow the city's food chain and find the loop that returns waste." |
| **Action** | Explore a mixed graph (acyclic intake + loop). |
| **Acceptance** | Mixed graph via `concept-map` kind; alternative list isolates the loop. |
| **Spec** | `kind: "concept-map"` with cycles + `filter-nodes`. |
| **Fixture** | `nios/di-sys-city-system` *(planned)* |
| **New capability** | `filter-nodes` *(planned)* — waste-loop highlight. |
| **Host** | Sustainability narration. |
| **Status** | `done` |

---

## Label & annotate (`di-lab-*`) — `label-diagram` (future kind)

### `di-lab-1-identify-part` — Select a named part of an illustration

| Field | Value |
|-------|-------|
| **Learner** | OBE-B / Secondary: flower, plant cell, human heart — "which is the pistil?" |
| **Prompt** *(host)* | "Tap the part that holds the seeds." |
| **Action** | Guided / discovery `select` of the mapped region. |
| **Acceptance** | `label-diagram` scene maps each node to a region of interest; selection resolves to that node id. |
| **Spec** | `kind: "label-diagram"` (future; pulls `di-p1` forward). |
| **Fixture** | `nios/di-lab-identify-part` *(planned)* |
| **New capability** | `label-diagram` kind — part → region mapping. |
| **Host** | Part narration. |
| **Status** | `planned` |

### `di-lab-2-label-all-parts` — Label every part of a figure

| Field | Value |
|-------|-------|
| **Learner** | SR practical: labels all parts of a figure in any order. |
| **Prompt** *(host)* | "Select every part, then give its function." |
| **Action** | Multi-part sequential select (cumulative). |
| **Acceptance** | Cumulative selection set covering all parts; order-independent scoring. |
| **Spec** | `kind: "label-diagram"` + cumulative set. |
| **Fixture** | `nios/di-lab-label-all` *(planned)* |
| **New capability** | `multi-select` *(planned)* |
| **Host** | Set-completion rubric. |
| **Status** | `done` |

### `di-lab-3-connect-parts` — Connect two parts with a relation

| Field | Value |
|-------|-------|
| **Learner** | SR practical: "what flows from the artery to the capillary?" |
| **Prompt** *(host)* | "Declare how blood moves between these two parts." |
| **Action** | Declare an edge between two mapped parts (construct). |
| **Acceptance** | Learner-authored edge stored; validated against graph laws; snapshot includes the authored relation. |
| **Spec** | `kind: "label-diagram"` + `construct-edge`. |
| **Fixture** | `nios/di-lab-connect-parts` *(planned)* |
| **New capability** | `construct-edge` *(planned)* |
| **Host** | Validity feedback. |
| **Status** | `planned` |

### `di-lab-4-cell-organelle` — Cell with parts and functions (course deep-dive)

| Field | Value |
|-------|-------|
| **Learner** | Secondary biology: organelle names, locations, functions. |
| **Prompt** *(host)* | "Which organelle turns sunlight into food?" |
| **Action** | Identify a part, then follow a function edge. |
| **Acceptance** | `label-diagram` nodes plus explicit function relations; two mechanics in one lesson. |
| **Spec** | `kind: "label-diagram"`, functions as `produces`. |
| **Fixture** | `nios/di-lab-cell-organelle` *(planned)* |
| **New capability** | `label-diagram`, `relation-vocab` (`produces`). |
| **Host** | Function scoring. |
| **Status** | `done` |

---

## Ordering & construction (`di-ord-*`)

### `di-ord-1-assemble-cycle` — Build the lifecycle order from shuffled stages

| Field | Value |
|-------|-------|
| **Learner** | OBE-B: butterfly stage cards out of order. |
| **Prompt** *(host)* | "Assemble the butterfly's journey in the right order." |
| **Action** | Place shuffled stage candidates into the correct order (construct). |
| **Acceptance** | Shuffled stage nodes (no layout); learner order validated against the reference; `answer` returns the ordered contract. |
| **Spec** | `kind: "cycle"` + `construct-order`. |
| **Fixture** | `nios/di-ord-assemble-cycle` *(planned)* |
| **New capability** | `construct-order` *(planned)* |
| **Host** | Order validation + hinting. |
| **Status** | `done` |

### `di-ord-2-insert-missing` — Fill the single blank in a process

| Field | Value |
|-------|-------|
| **Learner** | Secondary: sequence with one hidden stage. |
| **Prompt** *(host)* | "Which stage belongs in the blank?" |
| **Action** | Discovery `select` among candidate stages. |
| **Acceptance** | A blank slot defined; only the correct candidate accepted. |
| **Spec** | `kind: "flow"` / `cycle` with a detached candidate set. |
| **Fixture** | `nios/di-ord-insert-missing` *(planned)* |
| **New capability** | — (host defines the blank; candidates partially linked) |
| **Host** | Blank definition + scoring. |
| **Status** | `done` |

### `di-ord-3-build-valid-graph` — Build a valid structure from parts (advanced)

| Field | Value |
|-------|-------|
| **Learner** | SR: given nodes and relations, builds a valid cycle or hierarchy. |
| **Prompt** *(host)* | "Connect these into a valid cycle." |
| **Action** | Construct edges with on-the-fly law validation. |
| **Acceptance** | Learner graph judged by the same graph laws as authored specs; invalid intermediate states flagged but allowed. |
| **Spec** | `construct-edge` + `construct-order`, all kinds. |
| **Fixture** | `nios/di-ord-build-valid-graph` *(planned)* |
| **New capability** | `construct-edge`, `construct-order` |
| **Host** | Law-based feedback. |
| **Status** | `done` |

---

## Compare structures (`di-cmp-*`)

### `di-cmp-1-side-by-side` — Two structures compared in parallel

| Field | Value |
|-------|-------|
| **Learner** | Secondary / SR: "what does an animal cell have that a plant cell lacks?" |
| **Prompt** *(host)* | "Compare the two — find what is present only on one side." |
| **Action** | Explore both scenes; select the differing node. |
| **Acceptance** | Two scenes share the layout strategy; node ids distinct per scene; selection resolves per scene. |
| **Spec** | `compare-layout` *(planned)* — parallel scenes. |
| **Fixture** | `nios/di-cmp-side-by-side` *(planned)* |
| **New capability** | `compare-layout` *(planned)* |
| **Host** | Difference rubric. |
| **Status** | `planned` |

### `di-cmp-2-find-difference` — Find the single changed relationship

| Field | Value |
|-------|-------|
| **Learner** | SR: two nearly identical structures with one relation flipped. |
| **Prompt** *(host)* | "One relationship differs — find it." |
| **Action** | Select / follow the differing edge. |
| **Acceptance** | Delta computed from authored metadata; only the differing edge accepted. |
| **Spec** | `diff-emphasis` *(planned)* |
| **Fixture** | `nios/di-cmp-find-difference` *(planned)* |
| **New capability** | `diff-emphasis` *(planned)* |
| **Host** | Observation scoring. |
| **Status** | `planned` |

### `di-cmp-3-process-before-after` — Same structure at two periods (composition)

| Field | Value |
|-------|-------|
| **Learner** | SR history / geography: a river course or boundary at two dates. |
| **Prompt** *(host)* | "What changed between the two periods?" |
| **Action** | Toggle period; follow the same chain in both; compare node presence. |
| **Acceptance** | Two scenes share node ids across periods; period toggle via composition with Timeline; delta scorable. |
| **Spec** | `compare-layout` + `links` to timeline events. |
| **Fixture** | `nios/di-cmp-before-after` *(planned)* |
| **New capability** | `compare-layout`, `links` vocabulary (`timelineEventId`). |
| **Host** | Change narration. |
| **Status** | `done` |

---

## Historical processes & change (`di-hist-*`) — composition-led

### `di-hist-1-cause-sequence` — History as a causal flow

| Field | Value |
|-------|-------|
| **Learner** | Secondary history: causes → trigger → outcomes. |
| **Prompt** *(host)* | "Follow the causes to the immediate trigger, then the outcome." |
| **Action** | Follow the causal chain; pick the trigger node linking long-term causes to the event. |
| **Acceptance** | Flow / concept-map with explicit cause–event–outcome layers; trigger identifiable. |
| **Spec** | `kind: "concept-map"` + `links` to timeline events. |
| **Fixture** | `nios/di-hist-cause-sequence` *(planned)* |
| **New capability** | `links` vocabulary (`timelineEventId`) *(planned)* |
| **Host** | Period narration via Timeline. |
| **Status** | `done` |

### `di-hist-2-resistance-chain` — A chain of movements connected by events

| Field | Value |
|-------|-------|
| **Learner** | Secondary history: successive movements linked by `leads-to`. |
| **Prompt** *(host)* | "What came next in the chain of movements?" |
| **Action** | Follow between movement nodes; each node links to a timeline event. |
| **Acceptance** | Chain DAG; each node's `links.timelineEventId` resolves; follow carries intent. |
| **Spec** | `kind: "flow"` + `links`. |
| **Fixture** | `nios/di-hist-resistance-chain` *(planned)* |
| **New capability** | `links` vocabulary. |
| **Host** | Event context popups (from Timeline). |
| **Status** | `done` |

### `di-hist-3-cause-and-consequence` — Long-term causes vs immediate causes

| Field | Value |
|-------|-------|
| **Learner** | SR historical geography: separates structural causes from triggers. |
| **Prompt** *(host)* | "Which is the long-term cause and which is the trigger?" |
| **Action** | Sort nodes into cause / trigger piles (multi-select). |
| **Acceptance** | Nodes tagged cause / trigger in the graph; selection scored per pile. |
| **Spec** | `kind: "concept-map"` + `multi-select`. |
| **Fixture** | `nios/di-hist-causes` *(planned)* |
| **New capability** | `multi-select` *(planned)* |
| **Host** | Pile scoring. |
| **Status** | `done` |

### `di-hist-4-boundary-as-diagram` — Structure change paired with the GeoMap engine

| Field | Value |
|-------|-------|
| **Learner** | SR geography: the diagram answers *why*, the map answers *where*. |
| **Prompt** *(host)* | "The map shows the shift — why did it happen?" |
| **Action** | Follow `leads-to` for causes; cross-engine emphasis from GeoMap selection. |
| **Acceptance** | Diagram nodes share ids with the GeoMap scene (`links.geomapEntityId`); selecting a diagram node emphasises the map entity. |
| **Spec** | `links` vocabulary field + composition via event bus. |
| **Fixture** | `nios/di-hist-boundary` *(planned)* |
| **New capability** | `links` vocabulary (`geomapEntityId`) *(planned)* |
| **Host** | Cross-engine composition. |
| **Status** | `done` |

---

## Inquiry & explanation (`di-inq-*`)

### `di-inq-1-explain-why` — Explain "why" using the diagram as evidence

| Field | Value |
|-------|-------|
| **Learner** | SR: written / verbal explanation traced through influences. |
| **Prompt** *(host)* | "Use the diagram to explain why the delta supports dense agriculture." |
| **Action** | Follow a chain; the event trail is captured as evidence. |
| **Acceptance** | Monotonic event log replays the learner's reasoning path (P4 determinism). |
| **Spec** | `kind: "concept-map"` + explore / follow. |
| **Fixture** | `nios/di-inq-explain-why` *(planned)* |
| **New capability** | — (event log + snapshot unchanged) |
| **Host** | Explanation rubric; log as evidence. |
| **Status** | `done` |

### `di-inq-2-open-explore` — Free exploration of a rich structure

| Field | Value |
|-------|-------|
| **Learner** | Any: browse, expand, collapse, jump via focus. |
| **Prompt** *(host)* | — (open exploration) |
| **Action** | Free `select` / `focus` / `expand` / `collapse` / `follow`. |
| **Acceptance** | Technically identical to `di-m1` / `di-h1`; content is the differentiator. |
| **Spec** | `interaction.mode: "explore"`. |
| **Fixture** | `nios/di-inq-open-explore` *(planned)* |
| **New capability** | — |
| **Host** | Minimal chrome. |
| **Status** | `done` |

### `di-inq-3-what-if` — "What breaks if this is removed?" (systems thinking)

| Field | Value |
|-------|-------|
| **Learner** | SR: removes a node (e.g. decomposers) and observes consequence paths. |
| **Prompt** *(host)* | "What happens to the web if the decomposer disappears?" |
| **Action** | De-emphasise a chosen node; emphasise its dependent paths. |
| **Acceptance** | Non-destructive what-if — no spec mutation, scene re-emphasis only; event log records the choice. |
| **Spec** | `what-if` *(planned)* — de-emphasis on a live scene. |
| **Fixture** | `nios/di-inq-what-if` *(planned)* |
| **New capability** | `what-if` *(planned)* |
| **Host** | Consequence narration. |
| **Status** | `done` |

---

## Assessment (`di-asm-*`)

### `di-asm-1-read-diagram` — Board-style diagram reading test

| Field | Value |
|-------|-------|
| **Learner** | Secondary / SR: one diagram, N questions (node, edge, relation, cycle). |
| **Prompt** *(host)* | "Answer all questions about this diagram." |
| **Action** | Mixed select / follow rounds; each observable is an instruction. |
| **Acceptance** | Reuses the `done` slice composed by the host into a graded set. |
| **Spec** | Composition of existing mechanics. |
| **Fixture** | `nios/di-asm-read-diagram` *(planned)* |
| **New capability** | — |
| **Host** | Grading + feedback. |
| **Status** | `done` |

### `di-asm-2-validate-diagram` — Is this a valid X? (graph-law judgement)

| Field | Value |
|-------|-------|
| **Learner** | SR: judges whether a presented graph is a valid flow / cycle / hierarchy. |
| **Prompt** *(host)* | "Is this a valid flow?" |
| **Action** | Inspect the graph; answer validity. |
| **Acceptance** | `tryCreate`-style validation surfaced as a learnable skill; deterministic law checks. |
| **Spec** | Graph laws + alternative list. |
| **Fixture** | `nios/di-asm-validate-diagram` *(planned)* |
| **New capability** | — (validation result made learnable) |
| **Host** | Judgement rubric. |
| **Status** | `done` |

### `di-asm-3-evidence-essay` — Explain with cited diagram and event trace

| Field | Value |
|-------|-------|
| **Learner** | SR: graded explanation citing the exact path followed. |
| **Prompt** *(host)* | "Write a three-sentence answer; back it with the path you traced." |
| **Action** | Trace a chain, then answer in the host. |
| **Acceptance** | The traced event sublog is attached to the answer; submission bundles prompt + log. |
| **Spec** | Explore / follow + snapshot. |
| **Fixture** | `nios/di-asm-evidence-essay` *(planned)* |
| **New capability** | — |
| **Host** | Essay rubric over the event trace. |
| **Status** | `done` |

---

## Accessibility and data fidelity

### `di-a1-alternative-list` — Structured relationship list

| Field | Value |
|-------|-------|
| **Learner** | Uses a table/list of nodes, edges, and cycles instead of the SVG diagram. |
| **Prompt** | — |
| **Action** | Host binds list row → `select` or `follow` dispatch |
| **Acceptance** | Alternative includes node rows, edge rows with non-empty `relationship`, and cycle rows for cyclic graphs; nothing conveyed by color or position alone (P6) |
| **Spec** | Any fixture with `accessibility.label` |
| **Fixture** | `packages/diagram-engine/fixture/water-cycle/` |
| **Host** | List presentation chrome |
| **Status** | `done` |

### `di-a2-validate-graph` — Reject invalid specs

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Unknown `kind` → `INVALID_SPEC`; unknown `layout.type` (e.g. `force`) → `INVALID_SPEC`; unknown content/node keys → `INVALID_SPEC`; edge without `relationship` → schema failure; unknown node reference → `INVALID_REFERENCE`; self-loop → `INVALID_ENTITY`; empty `nodes[]` → `INVALID_SPEC` |
| **Spec** | Negative cases in unit tests + e2e `tryCreate` |
| **Fixture** | `packages/diagram-engine/test/validation.test.ts`, `packages/diagram-engine/e2e/diagram.spec.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Future diagram kinds (SPEC — not in MVP slice)

### `di-p1-label-diagram` — Annotated figure with callouts

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–8: labels parts of a scientific illustration. |
| **Prompt** | Host: “Select the part that carries blood to the heart.” |
| **Action** | Select labelled node |
| **Acceptance** | `content.kind: "label-diagram"` (future enum value); nodes map to figure regions via `links` |
| **Spec** | Future kind; replaces legacy `science.label-diagram` widget |
| **Fixture** | `planned` |
| **Host** | Scoring + figure asset |
| **Status** | `planned` |

---

## Fixture map

| Fixture path | Use cases | Notes |
|--------------|-----------|-------|
| `packages/diagram-engine/fixture/flow/` | `di-f1-trace-process`, `di-f2-identify-next-step` | Acyclic 3-node DAG; hierarchical layout |
| `packages/diagram-engine/fixture/cycle/` | `di-c4-minimal-cycle` | Minimal 2-node cycle |
| `packages/diagram-engine/fixture/hierarchy/` | `di-h1-explore-tree`, `di-h2-expand-collapse`, `di-h3-identify-parent` | `contains` edges; expand/collapse |
| `packages/diagram-engine/fixture/concept-map/` | `di-m1-explore-concepts`, `di-m2-identify-influence` | Grid layout; `influences` edges |
| `packages/diagram-engine/fixture/water-cycle/` | `di-c1-explore-cycle`, `di-c2-identify-stage`, `di-c3-follow-relationship`, `di-x2-visual-entity-link`, `di-x3-identify-relationship`, `di-a1-alternative-list` | Integrated cycle; default e2e harness fixture |
| `docs/fixtures/diagram/skill-example.json` | `di-x4-photosynthesis-flow` | Multi-input flow authoring reference |

Conformance harness: `/?engine=diagram` (default fixture: `water-cycle`).

---

## P8 priority (Workstream A — slice honesty)

| Priority | Use case | Rationale |
|----------|----------|-----------|
| P0 | `di-c1-explore-cycle`, `di-a1-alternative-list`, `di-a2-validate-graph` | Exit gate: cycle explore, a11y list, validation |
| P0 | `di-f1-trace-process`, `di-h1-explore-tree`, `di-m1-explore-concepts` | One baseline per kind |
| P1 | `di-c3-follow-relationship`, `di-h2-expand-collapse`, `di-x1-focus-node` | Follow, expand/collapse, focus mechanics |
| P1 | `di-f2-identify-next-step`, `di-c2-identify-stage`, `di-h3-identify-parent`, `di-m2-identify-influence` | Discovery scoring paths |
| P2 | `di-x2-visual-entity-link`, `di-x3-identify-relationship`, `di-x4-photosynthesis-flow` | Composition and multi-input flow |
| P3 | `di-m3-cyclic-concept-map`, `di-p1-label-diagram` | Cyclic concept-map fixture; future label-diagram kind |

---

## Contract changes (proposed by the NIOS catalog)

The `done` slice is expressible on the current surface (`flow` / `cycle` / `hierarchy` / `concept-map`, explicit `relationship`, D5 `select` / `focus` / `follow` / `expand` / `collapse` / `reset`, alternative list). The NIOS catalog proposes additions only where a catalogued case fails acceptance without them — each row names its use cases:

| Capability | Use cases that need it | Proposed contract surface |
|------------|------------------------|---------------------------|
| `multi-select` | `di-cause-1…2`, `di-lab-2`, `di-hist-3` | Cumulative selection set; set-scored dispatch |
| `edge-select` | `di-cause-3` | Edge items selectable; planned `diagram.edge-selected` |
| `relationship-gate` | `di-cause-6` | Edge labels hidden until `answer`; reveal then `follow` |
| `filter-nodes` | `di-proc-5`, `di-class-5`, `di-sys-1`, `di-sys-4` | D5 `filter` on node `category`; planned `diagram.filter-applied` |
| `construct-order` | `di-ord-1`, `di-ord-3` | Shuffled candidates + ordered `answer` (construct mode) |
| `construct-edge` | `di-lab-3`, `di-ord-3` | Learner-authored relationship edges, validated by graph laws |
| `label-diagram` | `di-lab-1…4` | Future kind (`di-p1`); node → region-of-interest mapping |
| `compare-layout` | `di-cmp-1`, `di-cmp-3` | Parallel scenes, same layout strategy |
| `diff-emphasis` | `di-cmp-2`, `di-cmp-3` | Delta highlight between authored structures |
| `what-if` | `di-inq-3` | Non-destructive node de-emphasis (spec never mutated) |
| `edge-weight` | `di-cause-5` | Semantic relative `strength` / influence metadata on edges |
| `relation-vocab` | `di-cycl-3`, `di-sys-1`, `di-lab-4` | Extend the closed `relationship` enum (`feeds-on`, `transforms-to`, `produces`, …) |
| `links` vocabulary | `di-hist-1…4`, `di-cmp-3` | `nodes[].links` beyond `visualEntityId`: `timelineEventId`, `geomapEntityId` |
| `follow-chain` | `di-cause-4` | Per-step emphasis along a multi-edge path |

Every proposal lands in `docs/engines/diagram/SPEC.md` (kinds & laws, actions, events) before implementation; the graph laws remain authoritative for validity. `kind: "label-diagram"` (`di-p1`) becomes the first future-kind gate to pull forward when `di-lab-*` demand is real.
