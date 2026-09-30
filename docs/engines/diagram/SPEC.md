# Diagram Engine — Normative Specification (thin)

**File:** `docs/engines/diagram/SPEC.md`  
**Status:** Proposed (thin — gates P6 implementation; expand in code, not prose)  
**Version:** 1.0.0  
**Parent:** DESIGN D1 · shared contract · `engines/diagram/VISION.md` (non-normative)

---

## 1. Purpose

Normative surface for the Diagram Engine: structural reasoning (`how connected`). Replaces `science.label-diagram` and flowchart widgets over time (DESIGN §3, §95).

## 2. Envelope

```json
{
  "type": "diagram",
  "version": "1.0.0",
  "id": "water-cycle",
  "metadata": { "title": "Water cycle" },
  "purpose": {
    "learningObjective": "Understand how water moves through the cycle",
    "reasoningMode": "explore"
  },
  "content": {
    "kind": "cycle",
    "profile": "process",
    "nodes": [
      { "id": "evaporation", "label": "Evaporation" },
      { "id": "condensation", "label": "Condensation" },
      { "id": "precipitation", "label": "Precipitation" },
      { "id": "collection", "label": "Collection" }
    ],
    "edges": [
      { "from": "evaporation", "to": "condensation", "relationship": "leads-to" },
      { "from": "condensation", "to": "precipitation", "relationship": "leads-to" },
      { "from": "precipitation", "to": "collection", "relationship": "leads-to" },
      { "from": "collection", "to": "evaporation", "relationship": "leads-to" }
    ]
  },
  "layout": { "type": "radial" },
  "interaction": {
    "mode": "explore",
    "actions": ["select", "focus", "expand", "collapse", "follow", "reset"]
  },
  "questions": [],
  "accessibility": {
    "label": "Water cycle diagram showing evaporation, condensation, precipitation, and collection"
  }
}
```

Rules:

- `type` MUST be `"diagram"`.
- Relationships are first-class (`relationship` on edges), not line styling (D5, `VISION.md` §10).
- The closed `relationship` enum: `connected-to`, `contains`, `influences`, `is-a`, `leads-to`, `part-of`, plus the W-3.1 domain additions `feeds-on`, `transforms-to`, `produces`, `weathers-into`. Engines extend the **payload**, never add relationship names beyond this closed set.
- `nodes[].links` carries cross-engine composition hints (W-3.2): beyond `visualEntityId`, `timelineEventId` and `geomapEntityId` are valid link keys. They are authoring metadata surfaced on the scene node (`metadata.links`) and resolved by composition bindings — never engine imports (D2/§6).
- Edges are addressable D5 `select` targets (W-3.4): an edge id resolves to the authored edge, and selecting it emits `diagram.edge-selected` with the edge payload (`from`, `to`, `relationship`). This is an **event** distinction — the action is still D5 `select`, never a new action name.
- Node filtering (W-3.5): nodes MAY carry `categories: string[]`. D5 `filter` with payload `{ categories }` hides every node whose categories match none of the requested set and emits `diagram.filter-applied`; `clear-filter` restores all nodes. This is a presentational grey-out/hide — the reducer never rejects a host dispatch to a filtered node.
- Relationship gating (W-3.6): edges MAY carry `gated: boolean`. A gated edge hides its `relationship` until the learner dispatches D5 `answer` targeting the edge id (the engine records it in `snapshot().revealedEdges`); after reveal, `follow` works normally. Deterministic.
- Edge weight (W-3.7): edges MAY carry `strength: number` — semantic influence metadata (data, never style). It is surfaced on the edge scene node and in the alternative edge rows; the engine never uses it for layout.
- Follow chain (W-3.8): consecutive `follow` dispatches accumulate a path. `snapshot().followedChain` lists edges in follow order, and the most recent edge renders with `data-oedu-chain-step="N"` (monotonic step). Alternative list stays the path.
- What-if (W-3.9): D5 `answer` with payload `{ whatIf: true, whatIfNode }` non-destructively de-emphasises a node — the authored spec is never mutated; the engine re-derives scene metadata (`whatIf: "deemphasized"` → `data-oedu-what-if`) and records `snapshot().deemphasizedNodes`, emitting `diagram.what-if`.
- Construct order (W-3.10): D5 `answer` with payload `{ construct: "order", order: [ids] }` validates the ordered sequence against the graph's directed edges and exposes the result as `snapshot().constructOrder: { order, valid }`, emitting `diagram.construct-order`. The engine never shuffles; the host presents shuffled candidates.
- `content.kind` / `profile` MVP: `flow` | `cycle` | `hierarchy` | `concept-map` (one engine, multiple profiles).
- Layout is semantic (`layout.type`); coordinates are derived (DESIGN §8).
- Auto-layout positions are **illustrative** unless provenance says otherwise (DESIGN §9).
- Emit `diagram.node-selected`, `diagram.relationship-followed`.

## 2.1 Per-item `interactive` gating (W-5a)

Nodes and edges accept the optional `interactive: boolean` prop. `interactive: false` removes the item from **hit-testing, tab order, and the pointer/keyboard dispatch paths** — the renderer never paints an interactive affordance for it and it never appears in the `interactive` a11y list. Absent means `true` (current behavior). Enforcement is **scoped to learner-initiated input only** (ADR-12): a direct host `dispatch()` of a D5 action targeting the item still applies — the reducer never rejects it. Per-item `interactive` is the authoring signal the guided-select rows of W-3 depend on.

## 3. MVP slice (P6)

1. **Nodes / edges / auto-layout** with deterministic semantic behavior.
2. Cycle detection → clean layout; invalid references fail L2.
3. Structured relationship list as accessible alternative (L4).

## 4. Non-goals

Not a general diagramming IDE. Not causal claims without explicit `relationship` types.
