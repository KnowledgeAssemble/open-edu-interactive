# Timeline Engine — Normative Specification (thin)

**File:** `docs/engines/timeline/SPEC.md`  
**Status:** Proposed (thin — gates P5 implementation; expand in code, not prose)  
**Version:** 1.0.0  
**Parent:** DESIGN D1 · shared contract · `engines/timeline/VISION.md` (non-normative)

---

## 1. Purpose

Normative surface for the Timeline Engine: temporal reasoning (`when / what unfolds`). Used by P2.5 composition fixtures with a **minimal** event list before the full renderer exists.

## 2. Envelope

```json
{
  "type": "timeline",
  "version": "1.0.0",
  "id": "timeline-independence",
  "metadata": { "title": "Indian independence — key events" },
  "purpose": {
    "learningObjective": "Explore major events in chronological order",
    "reasoningMode": "sequence"
  },
  "content": {
    "kind": "events",
    "events": [
      {
        "id": "event-1857",
        "label": "1857 uprising",
        "date": "1857"
      },
      {
        "id": "event-1947",
        "label": "Independence",
        "date": "1947-08-15",
        "links": { "visualEntityId": "figure-independence" }
      }
    ]
  },
  "interaction": {
    "mode": "explore",
    "actions": ["select", "focus", "play-pause", "step", "scrub", "reset"]
  },
  "questions": [],
  "accessibility": {
    "label": "Timeline of major events leading to independence"
  }
}
```

Rules:

- `type` MUST be `"timeline"`.
- Temporal semantics under `content`. `content.kind` MVP: `events` (with optional `periods`, `tracks` in P5).
- `play-pause` and `step` use D5 actions — no engine-private playback API (DESIGN §7.4).
- `links.*` on entities are **composition hints** for lesson bindings (D8), not cross-package imports.
- Emit `timeline.event-selected` on D5 `select`.

## 2.1 Duration events (W-2.5)

Events MAY carry `events[].duration` — a date-string in the same Timeline-D3 grammar as `date` (`^[+-]?\d{1,6}(-\d{2}){0,2}$`). A duration turns the event from a point marker into a **span bar** rendered from `date` to `duration`; the linear alternative lists the span (`from`/`to`). Validation negatives: an unparsable `duration`, an out-of-range calendar `duration`, or a `duration` not strictly after `date` all raise `INVALID_ENTITY`. Use case: `tl-f1-duration-events`.

## 3. MVP slice (P5)

1. **Events / periods / tracks** end-to-end with replayable event log.
2. Playback via shared D5 `play-pause` / `step`.
3. Linear accessible alternative derived from the same model (L4).

## 4. Non-goals

Not a poster timeline widget. Causality MUST NOT be inferred from order alone (`VISION.md`).
