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
