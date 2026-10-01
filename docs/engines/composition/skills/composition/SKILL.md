# Composition — AI Authoring Skill

## When to use

Use a **composition lesson** when one interactive's state must drive another: a timeline selection highlighting a visual figure, a chart selecting annotating a diagram, a map focusing a place. The lesson declares **multiple engine instances** and **event→action bindings**; the runtime (`interactive-engine` `Lesson`) routes namespaced result events between instances over a shared event bus (DESIGN D8).

Use a **single engine spec** when one interactive stands alone. Composition buys cross-engine reasoning at the cost of contract surface — do not compose what one engine can express.

## Canonical shape

```json
{
  "id": "lesson-id",
  "title": "Optional lesson title",
  "engines": [
    {
      "instanceId": "timeline-a",
      "engine": "timeline",
      "spec": { "type": "timeline", "version": "1.0.0", "id": "timeline-a", "content": { "kind": "events", "events": [ { "id": "event-1", "label": "First", "date": "1850", "links": { "visualEntityId": "figure-1" } } ] }, "interaction": { "actions": ["select", "deselect"] } }
    },
    {
      "instanceId": "visual-b",
      "engine": "visual",
      "spec": { "type": "visual", "version": "1.0.0", "id": "visual-b", "content": { "kind": "illustration", "entities": [ { "id": "figure-1", "label": "Caption of figure 1" } ] }, "interaction": { "actions": ["focus"] } }
    }
  ],
  "bindings": [
    {
      "on": "timeline.event-selected",
      "from": "timeline-a",
      "dispatch": { "to": "visual-b", "action": "focus", "targetIdFrom": "links.visualEntityId" }
    }
  ]
}
```

## Rules

- **`engines[].engine` MUST equal `engines[].spec.type`.** The runtime rejects a mismatch (`INVALID_SPEC`).
- **Bindings reference namespaced result events, not raw actions.** `on` is a domain result event (`timeline.event-selected`, `geomap.region-focused`), matched by `^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$`. Never bind `on` to `click`, `pointer.*`, `keyboard`, or a bare action name.
- **`dispatch.action` MUST be a D5 semantic action** (`focus`, `select`, `filter`, `play-pause`, `step`, …). No `highlight`, `show`, `annotate`, `scrub` in specs — those are superseded or renderer-only.
- **The source engine MUST carry the resolution payload.** `targetIdFrom` is a dot-path read off the emitted event's payload. For a timeline→visual binding, `targetIdFrom: "links.visualEntityId"` resolves only if the source event entity record carries `links.visualEntityId`. Always attach the full entity record (including `links`) on the selected entity when authoring timeline specs. Exactly one of `targetIdFrom` / `targetId` resolves per binding.
- **Cross-engine MUST go through the lesson bus**, never through engine-to-engine imports. Engines stay isolated (D2); only `interactive-engine` knows about lessons and bindings.
- **Embedded engine specs MUST each pass L1** on `interactive-engine.schema.json`, and engine-spec L2 where the engine defines one.
- **Semantic-first and accessible.** Timeline events and visual entities carry `id`/`label`/`date` meaning, never coordinates. Everything interactive gets a role + non-empty label.
- **Embedded specs follow their own engine's rules.** An embedded spec that accepts `select` must also declare `deselect` — renderer input maps repeat activation of a selected node to `deselect`, so a `select`-only declaration understates real behavior.

## Do NOT

- Do NOT add non-D5 actions or call engine instances directly from other engines' code.
- Do NOT use `click`, `pointer.*`, `keyboard`, `x`/`y`, `width`/`color` in specs or bindings.
- Do NOT add scoring, hints, or quiz logic to the lesson (OpenEdu owns it, D7) — keep `questions: []`.
- Do NOT invent timeline events, dates, or visual entities absent from source data (provenance, DESIGN §9).

## Validate

- Lesson: validate against `docs/schemas/composition.schema.json`.
- Each `engines[].spec`: validate against `docs/schemas/interactive-engine.schema.json`.
- Runtime proof: `Lesson.load(lesson, registry)` succeeds and the smoke interaction routes the expected namespaced event to the target action.
