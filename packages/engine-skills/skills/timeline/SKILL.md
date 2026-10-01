# Temporal Timeline — Agent Skill

Use when authoring a **Timeline** engine specification (`type: "timeline"`) for temporal reasoning — exploring when things happened, durations, and parallel developments.

## When to use

| Use case | Engine |
|----------|--------|
| Events unfolding through time | **Timeline** ← you are here |
| Quantitative magnitudes (how much) | Chart |
| Spatial/geographic (where) | GeoMap |
| Structural relationships (how connected) | Diagram |

## Spec structure

```jsonc
{
  "type": "timeline",
  "version": "1.0.0",
  "id": "my-timeline",
  "content": {
    "kind": "events",                          // closed — always "events"
    "events": [                                // REQUIRED
      {
        "id": "event-1857",                    // stable, unique id
        "label": "1857 uprising",              // human-readable
        "date": "1857",                        // Timeline-D3 grammar (see below)
        "links": { "visualEntityId": "figure-1857" }  // composition hints (optional)
      }
    ],
    "periods": [                               // optional
      {
        "id": "period-company",
        "label": "Company rule",
        "from": "1757",
        "to": "1858",
        "style": { "role": "secondary-period" }
      }
    ],
    "tracks": [                                // optional
      {
        "id": "track-movement",
        "label": "National movement",
        "events": ["event-1857", "event-1947"]
      }
    ]
  },
  "interaction": {
    "mode": "explore",
    "actions": ["select", "deselect", "focus", "play-pause", "step", "scrub", "reset"]
  },
  "accessibility": {
    "label": "Descriptive label for the timeline"
  },
  "sources": [{ "class": "authoritative" }]
}
```

## Timeline-D3 date grammar

Dates MUST match: `^[+-]?\d{1,6}(-\d{2}){0,2}$`

Valid examples: `1857`, `1947-08-15`, `1919-04`, `-500`, `100000`
Invalid: `yesterday`, `Aug 1947`, `47 BC`, `2026-13-01` (months are structural — the grammar only checks format, not month/day validity)

## Rules

- **No invented dates/durations.** All temporal values come from `content.events[].date`, `periods[].from`, `periods[].to`. Provenance `sources[]` REQUIRED.
- **Membership, not positions.** Track lanes and x-positions are derived. Never write `x`, `y`, `pixel`, `width` in the spec.
- **No causality from order.** Events listed in chronological order do not necessarily imply cause/effect.
- **Playback via D5 actions.** `play-pause` toggles, `step` advances, `scrub` jumps to an event. All through the shared action set — no `setInterval`, no timers.
- **Selection toggles.** Renderer input maps a repeat activation of a selected event to `deselect`, so an interactive accepting `select` must also declare `deselect`.
- **`links.*` are composition hints**, not cross-package imports. They reference entities in peer engine instances within the same lesson.
- **Linear alternative is auto-derived.** No need to author a separate list — the engine produces `linear` as an accessible ordered list.

## Validation

Validate via the manifest `validationContract` (install `package`, import `symbol`, call `method(spec)`), which checks:
- L1: envelope (`type`, `version`, `id`) per `interactive-engine.schema.json`
- L2: `content.kind === "events"`, references resolve, IDs unique, dates match grammar, periods `.from ≤ .to`, actions ⊆ D5
- L3: layout feasible (bounds on canvas)
- L4: `accessibility.label` present, every interactive marker labeled, linear alternative non-empty (engine own fixtures)

## Example

`./skill-example.json` — Indian independence timeline with events, periods, tracks.
