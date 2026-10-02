# Structural Diagram Engine — AI Authoring Skill

## When to use

Use the Diagram Engine when learners reason about **structure and connections**: how nodes relate through explicitly-authored `relationship` edges. Set `content.kind` to one of the closed set:

| Kind | Purpose | Default layout |
|------|---------|----------------|
| `flow` | Acyclic process/progression (must be a DAG) | `hierarchical` |
| `cycle` | Circular process (must contain ≥ 1 directed cycle) | `radial` |
| `hierarchy` | Acyclic tree/organization (must be a DAG) | `hierarchical` |
| `concept-map` | Associative web; cycles allowed | `grid` |

Use Chart for magnitude comparison, Timeline for chronology, Visual for direct manipulation, GeoMap for place. If it's structural connectivity, it's Diagram.

## Spec structure

Use the shared Interactive Engine envelope (`type: "diagram"`, `version`, `id`). The `layout` lives at the **envelope root** (a strategy selector, not coordinates):

```json
{
  "type": "diagram",
  "version": "1.0.0",
  "id": "water-cycle",
  "content": {
    "kind": "cycle",
    "nodes": [
      { "id": "evaporation", "label": "Evaporation", "links": { "visualEntityId": "water-figure" } },
      { "id": "condensation", "label": "Condensation" }
    ],
    "edges": [
      { "from": "evaporation", "to": "condensation", "relationship": "leads-to" }
    ]
  },
  "layout": { "type": "radial" },
  "interaction": { "mode": "explore", "actions": ["select", "deselect", "focus", "expand", "collapse", "follow", "reset"] },
  "sources": [{ "class": "authoritative" }],
  "accessibility": { "label": "Water cycle diagram" }
}
```

## Rules

- `content.kind` is a **closed enum**: `flow | cycle | hierarchy | concept-map`. `label-diagram` is future — do not use it.
- `nodes[]`: `{ id, label, description?, links? }`. At least 1; ids unique.
- `links` values are **opaque references the host resolves** (`visualEntityId`, `timelineEventId`, `geomapEntityId` name an entity in another engine instance). Never put a URL, file path, base64 blob, or coordinates in `links` — a spec carries meaning, not payloads (DESIGN §9).
- `edges[]`: `{ id?, from, to, relationship }`. **`relationship` is REQUIRED and explicit** — never infer causality from adjacency. Closed enum: `connected-to, contains, influences, is-a, leads-to, part-of` plus the W-3.1 domain additions `feeds-on, transforms-to, produces, weathers-into`. Pick the one that names the actual relationship — a life cycle is `transforms-to`, a food web is `feeds-on`, not a generic `leads-to`. No temporal `before`/`after` (Timeline owns that). Edge id is authored or derived `edge-<from>-<to>`.
- `layout.type` (envelope root) is a **strategy selector** `radial | hierarchical | grid`; absent → kind default. **Never author x/y/positions/pixels.**
- **Cycle laws (enforced):** `flow`/`hierarchy` MUST be acyclic (a directed cycle is invalid); `cycle` MUST contain ≥ 1 directed cycle; `concept-map` MAY contain cycles.
- **Provenance:** auto-layout positions are **`illustrative`** (DESIGN §9, SPEC §2) — teaching aids, never measured truth. The engine stamps every laid-out position `positionSource: 'illustrative'`.
- `expand`/`collapse` operate on the `contains`/`part-of` sub-graph tree only; a node without such edges no-ops. `follow` targets an edge id.
- Nobody invents nodes/edges/relationships — everything comes from `content`.

## Interaction

- `select` node → `diagram.node-selected`; `focus` node → `diagram.node-focused`; `follow` edge → `diagram.relationship-followed` — payloads carry the full node/edge record (+ `links` on nodes).
- `expand`/`collapse` are D5 state ops with no bespoke event.

## Design constraints

- Do NOT import `@open-edu/*` or other engine packages.
- Do NOT add inline scripts, `on*`, or `javascript:` URIs; no LLM-pleaser props.
- No wall-clock/randomness; no d3/dagre/graphlib/cytoscape — graph algorithms are deterministic pure functions.
- No scoring/hints/quiz logic (OpenEdu owns it, D7).

## Validate

- Spec: `./schema.json`; envelope: `./schema.json`.
- Runtime: validate via the manifest `validationContract` (install `package`, import `symbol`, call `method(spec)`).
