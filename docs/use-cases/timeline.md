# Timeline engine — use-case catalog

**Status:** Active (P8 Workstream A — slice honesty)  
**Engine:** `timeline` (`packages/timeline-engine`)  
**Contract:** `docs/engines/timeline/SPEC.md`  
**Vision:** `docs/engines/timeline/VISION.md`

## How to read this document

Each use case is a **lesson archetype**. Implementers ship fixtures that match acceptance criteria; authors and agents copy those fixtures, not abstract prop grids.

Use cases are grouped by **content slice** (`events` only, `events` + `periods`, `events` + `tracks`, integrated). Event marker ids are the authored `events[].id` values (e.g. `event-1947`).

**D7 boundary (always):**

| Layer | Owns |
|-------|------|
| **Engine** | Temporal model, layout, scene, SVG, semantic event markers, D5 `select` / `focus` / `play-pause` / `step` / `scrub` / `reset`, snapshot, linear alternative |
| **OpenEdu host** | Prompt text, answer key, correct/incorrect feedback, hints, progression, scoring, citations, cross-engine links via `events[].links` |

---

## Interaction modes

| Mode | Authoring signal | Learner experience | Engine events |
|------|------------------|--------------------|---------------|
| **display** | Host asks without requiring selection | Learner reads dates and order from the timeline | — |
| **guided-select** | Host prompt names one event | Learner taps the prompted marker | `timeline.event-selected` |
| **discovery-select** | All events visible; host scores on `eventId` | Learner finds the correct event among candidates | `timeline.event-selected` |
| **explore** | `interaction.mode: "explore"` | Free exploration of events | `timeline.event-selected`, `timeline.event-focused` |
| **focus** | `focus` in `interaction.actions` | Keyboard / programmatic emphasis on an event | `timeline.event-focused` |
| **playback** | `play-pause`, `step`, `scrub` in `interaction.actions` | Learner walks through events in chronological order | — *(updates `snapshot.step` / `snapshot.playback`; no `timeline.*` result event)* |
| **sequence-walk** | Host uses `step` or `scrub` between scored steps | Learner advances one event at a time through a lesson | — |

**Node id convention:** event markers use authored `events[].id`; period bands use `period-{periodId}` (display-only); track lanes use `track-{trackId}` (implicit default lane: `track-track-default`).

**Date grammar (Timeline-D3):** `^[+-]?\d{1,6}(-\d{2}){0,2}$` — e.g. `1857`, `1947-08-15`, `1919-04`. Invalid prose (`yesterday`) or out-of-range calendar dates are rejected.

**Temporal honesty:** never invent dates or durations. All values come from `content.events[].date` and `periods[].from` / `to`. Provenance `sources[]` is required. Chronological order does not imply causality (VISION).

**Guided vs discovery (current slice):** every event marker is `interactive: true`. Host distinguishes guided lessons by prompt and scores on `eventId`. Per-event `interactive` gating is not implemented yet — propose in SPEC if two or more use cases require it.

---

## Events-only (`content.events` — minimal slice)

Reference UX: chronological markers on a single axis. No periods or tracks.

### `tl-e1-explore-sequence` — Explore events in order (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–7: explores two dated events on a timeline. |
| **Prompt** | Host: “What happened between 1900 and 1910?” |
| **Action** | Select or focus either event marker |
| **Acceptance** | Two `event-marker` nodes in date order; `select` → `timeline.event-selected` with `dateString` in payload; linear alternative lists both events |
| **Spec** | `content.kind: "events"`, `events[]` with Timeline-D3 dates |
| **Fixture** | `packages/timeline-engine/fixture/events/` |
| **Host** | Discussion |
| **Status** | `done` |

### `tl-e2-identify-earlier` — Which event came first? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: selects the earlier of two events. |
| **Prompt** | Host: “Which happened first, Event A or Event B?” |
| **Action** | Tap `e1` (1900) |
| **Acceptance** | Layout places earlier date left of later; wrong selection still emits `timeline.event-selected` (host scores) |
| **Spec** | Same events-only model as `tl-e1-explore-sequence` |
| **Fixture** | `packages/timeline-engine/fixture/events/` |
| **Host** | Answer key: `e1` |
| **Status** | `done` |

### `tl-e3-read-date` — Read a date from the timeline (display)

| Field | Value |
|-------|-------|
| **Learner** | Grades 4–6: reads when Event B occurred from the marker label. |
| **Prompt** | Host: “In what year did Event B happen?” |
| **Action** | None required (oral or typed answer in host) |
| **Acceptance** | Marker label includes date (`1910`); linear alternative exposes exact `dateString` |
| **Spec** | `events[].label` + `events[].date` |
| **Fixture** | `packages/timeline-engine/fixture/events/` |
| **Host** | Answer key: `1910` |
| **Status** | `done` |

---

## Events with periods (`content.periods`)

Reference UX: shaded bands showing eras or regimes behind event markers. Period bands are display-only.

### `tl-p1-context-periods` — See events within historical periods (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: explores events while seeing which period band they fall under. |
| **Prompt** | Host: “Notice which period each event belongs to.” |
| **Action** | Select events; periods are not tappable |
| **Acceptance** | Two `period-band` nodes (`period-p1`, `period-p2`); bands `interactive: false`; events span period ranges; `style.role` on periods |
| **Spec** | `periods[].from` ≤ `periods[].to`; Timeline-D3 dates |
| **Fixture** | `packages/timeline-engine/fixture/periods/` |
| **Host** | Lesson framing |
| **Status** | `done` |

### `tl-p2-identify-period` — Which period contains an event? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: identifies which period Event B (1950) falls in. |
| **Prompt** | Host: “Was Event B in the First half or Second half?” |
| **Action** | Host scores oral answer or event selection as proxy |
| **Acceptance** | Period metadata `from`/`to` bracket event date; alternative list names periods with date ranges |
| **Spec** | Same periods model as `tl-p1-context-periods` |
| **Fixture** | `packages/timeline-engine/fixture/periods/` |
| **Host** | Answer key: `p2` (Second half) |
| **Status** | `done` |

### `tl-p3-reject-invalid-period` — Period from must not exceed to (validation)

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | `periods[].from > periods[].to` → validation failure |
| **Spec** | Inverted period range |
| **Fixture** | `packages/timeline-engine/test/validation.test.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Events with tracks (`content.tracks`)

Reference UX: parallel lanes for concurrent storylines. Each event belongs to exactly one track (or the implicit default lane).

### `tl-t1-parallel-lanes` — Compare parallel developments (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: explores events on a named track alongside events on the default lane. |
| **Prompt** | Host: “What was happening on the First track at the same time as the default lane?” |
| **Action** | Select events on either lane |
| **Acceptance** | `track-t1` lane holds `e1` and `e2`; `e3` on `track-track-default`; no event in two tracks |
| **Spec** | `tracks[].events` lists event ids; membership validated |
| **Fixture** | `packages/timeline-engine/fixture/tracks/` |
| **Host** | Discussion |
| **Status** | `done` |

### `tl-t2-identify-track` — Which track contains an event? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: identifies that Tracked A is on the First track. |
| **Prompt** | Host: “Which track is Tracked A on?” |
| **Action** | Select `e1` or answer from metadata |
| **Acceptance** | Event payload / metadata includes `trackId: "t1"` |
| **Spec** | Same tracks model as `tl-t1-parallel-lanes` |
| **Fixture** | `packages/timeline-engine/fixture/tracks/` |
| **Host** | Answer key: `t1` |
| **Status** | `done` |

### `tl-t3-reject-dup-membership` — Event cannot belong to two tracks (validation)

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Same `eventId` in two `tracks[].events` arrays → `INVALID_ENTITY` |
| **Spec** | Duplicate track membership |
| **Fixture** | `packages/timeline-engine/test/validation.test.ts`, `packages/timeline-engine/e2e/timeline.spec.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Integrated timeline (events + periods + tracks)

Reference UX: full historical narrative with eras and parallel storylines. Default conformance fixture.

### `tl-x1-explore-independence` — Explore a historical narrative (explore)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: explores seven key events in Indian independence history. |
| **Prompt** | Host: “Explore the major events leading to independence.” |
| **Action** | Select / focus any event; optional playback |
| **Acceptance** | Seven event markers in chronological order; two period bands; two named tracks + default lane; SVG `title`/`desc`; every marker has `aria-label`; linear alternative non-empty |
| **Spec** | `content.kind: "events"` with `events`, `periods`, `tracks`; `sources[]` with provenance |
| **Fixture** | `packages/timeline-engine/fixture/independence/` |
| **Host** | Lesson framing only |
| **Status** | `done` (e2e: `packages/timeline-engine/e2e/timeline.spec.ts`) |

### `tl-x2-identify-event` — Which event happened on 15 August 1947? (discovery)

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: selects Independence from seven events. |
| **Prompt** | Host: “Tap the event that happened on 15 August 1947.” |
| **Action** | Tap `event-1947` |
| **Acceptance** | Click on `[data-event-id="event-1947"]` updates `snapshot.selection`; `timeline.event-selected` emitted once |
| **Spec** | Precise date `1947-08-15` on target event |
| **Fixture** | `packages/timeline-engine/fixture/independence/` |
| **Host** | Answer key: `event-1947` |
| **Status** | `done` |

### `tl-x3-playback-sequence` — Walk through events in order (playback)

| Field | Value |
|-------|-------|
| **Learner** | Grades 5–8: steps through the timeline chronologically. |
| **Prompt** | Host: “Press play to watch events unfold in order.” |
| **Action** | `play-pause` toggles playback; `step` advances; `scrub` jumps to a target event |
| **Acceptance** | `snapshot.playback` toggles `stopped` ↔ `playing`; `step` increments `snapshot.step`; `scrub` sets `step` to target event index; `play-pause` / `step` do not emit `timeline.event-selected`; `reset` clears step and stops playback |
| **Spec** | `interaction.actions` includes `play-pause`, `step`, `scrub`, `reset` |
| **Fixture** | `packages/timeline-engine/fixture/independence/` |
| **Host** | Transport controls |
| **Status** | `done` |

### `tl-x4-focus-event` — Focus without selecting (keyboard / programmatic)

| Field | Value |
|-------|-------|
| **Learner** | Uses keyboard or host-driven focus to inspect an event before answering. |
| **Prompt** | Host: optional (“Use arrow keys to move between events.”) |
| **Action** | `focus` on `event-1857` |
| **Acceptance** | `timeline.event-focused` emitted with full event record; selection unchanged unless `select` also dispatched |
| **Spec** | `interaction.actions` includes `focus` |
| **Fixture** | `packages/timeline-engine/fixture/independence/` |
| **Host** | — |
| **Status** | `done` |

### `tl-x5-visual-entity-link` — Event links to Visual engine entity

| Field | Value |
|-------|-------|
| **Learner** | Selects Independence; host highlights linked figure in a composed lesson. |
| **Prompt** | Host: “Select the independence event.” |
| **Action** | `select` on `event-1947` |
| **Acceptance** | `timeline.event-selected` payload includes `links.visualEntityId: "figure-independence"`; cross-engine composition via event bus, not imports |
| **Spec** | `events[].links: { visualEntityId: "…" }` |
| **Fixture** | `packages/timeline-engine/fixture/independence/` |
| **Host** | Composed lesson chrome |
| **Status** | `done` |

### `tl-x6-precise-date` — Event with full calendar date

| Field | Value |
|-------|-------|
| **Learner** | Grades 6–9: sees events with year-only and full ISO-style dates on the same timeline. |
| **Prompt** | Host: “Find the event that happened on 13 April 1919.” |
| **Action** | Select `event-1919` |
| **Acceptance** | Mixed granularity dates (`1857`, `1919-04-13`, `1947-08-15`) layout deterministically; marker labels include date strings |
| **Spec** | Timeline-D3 grammar at multiple precisions |
| **Fixture** | `packages/timeline-engine/fixture/independence/` |
| **Host** | Answer key: `event-1919` |
| **Status** | `done` |

---

## Accessibility and data fidelity

### `tl-a1-linear-alternative` — Linear ordered list

| Field | Value |
|-------|-------|
| **Learner** | Uses a chronological list instead of the SVG timeline to review or select events. |
| **Prompt** | — |
| **Action** | Host binds list row → `select` dispatch |
| **Acceptance** | `snapshot.linear` (and harness `linear()`) lists events in chronological order with `kind` and `id`; nothing conveyed by position or color alone (P6) |
| **Spec** | Any fixture with `accessibility.label` |
| **Fixture** | `packages/timeline-engine/fixture/independence/` |
| **Host** | List presentation chrome |
| **Status** | `done` |

### `tl-a2-validate-temporal` — Reject invalid specs

| Field | Value |
|-------|-------|
| **Learner** | — (authoring / validation) |
| **Prompt** | — |
| **Action** | — |
| **Acceptance** | Prose date (`yesterday`) → `INVALID_SPEC`/`INVALID_ENTITY`; out-of-range calendar (`1947-04-31`) → `INVALID_ENTITY`; unknown `content.kind` → `INVALID_SPEC`; missing `sources` → `INVALID_SPEC`; unknown track reference → `INVALID_REFERENCE`; duplicate track membership → `INVALID_ENTITY`; reserved id `track-default` → failure; event id colliding with generated `period-*` node → `INVALID_ENTITY`; strict schema rejects unknown keys |
| **Spec** | Negative cases in unit tests + e2e `tryCreate` |
| **Fixture** | `packages/timeline-engine/test/validation.test.ts`, `packages/timeline-engine/e2e/timeline.spec.ts` |
| **Host** | — |
| **Status** | `done` |

---

## Future slices (SPEC — not in MVP)

### `tl-f1-duration-events` — Events with explicit duration

| Field | Value |
|-------|-------|
| **Learner** | Grades 7–9: compares how long events lasted, not just when they started. |
| **Prompt** | Host: “Which event lasted longer?” |
| **Action** | Select events; compare duration metadata |
| **Acceptance** | Event span rendered as bar, not just point marker |
| **Spec** | `events[].duration` or `to` date (future contract) |
| **Fixture** | `packages/timeline-engine/fixture/duration-events/` |
| **Host** | Scoring |
| **Status** | `done` (promoted: W-2.5 duration events — `events[].duration` in the Timeline-D3 grammar renders a span bar from `date` to `duration`; linear alternative exposes the span; negatives inverted/unparsable/missing span rejected; SPEC §2.1) |

### `tl-f2-compare-eras` — Side-by-side era comparison *(planned)*

| Field | Value |
|-------|-------|
| **Learner** | Grades 8–10: compares two civilizations on aligned time axes. |
| **Prompt** | Host: “Which civilization reached its peak first?” |
| **Action** | Select events on parallel era tracks |
| **Acceptance** | Multi-era layout with synchronized axis |
| **Spec** | Future `eras[]` or multi-timeline composition |
| **Fixture** | `planned` |
| **Host** | Scoring |
| **Status** | `planned` |

---

## Fixture map

| Fixture path | Use cases | Notes |
|--------------|-----------|-------|
| `packages/timeline-engine/fixture/events/` | `tl-e1-explore-sequence`, `tl-e2-identify-earlier`, `tl-e3-read-date` | Minimal 2-event slice |
| `packages/timeline-engine/fixture/periods/` | `tl-p1-context-periods`, `tl-p2-identify-period` | Events + 2 period bands |
| `packages/timeline-engine/fixture/tracks/` | `tl-t1-parallel-lanes`, `tl-t2-identify-track` | Named track + default lane |
| `packages/timeline-engine/fixture/independence/` | `tl-x1-explore-independence` … `tl-x6-precise-date`, `tl-a1-linear-alternative` | Full integrated slice; default e2e harness fixture |
| `docs/fixtures/timeline/skill-example.json` | Authoring reference | Same independence narrative pattern |

Conformance harness: `/?engine=timeline` (default fixture: `independence`).

---

## P8 priority (Workstream A — slice honesty)

| Priority | Use case | Rationale |
|----------|----------|-----------|
| P0 | `tl-x1-explore-independence`, `tl-a1-linear-alternative`, `tl-a2-validate-temporal` | Exit gate: integrated explore, linear a11y, validation |
| P0 | `tl-e1-explore-sequence` | Minimal events-only baseline |
| P1 | `tl-x3-playback-sequence`, `tl-x2-identify-event`, `tl-x4-focus-event` | Playback, discovery select, focus |
| P1 | `tl-p1-context-periods`, `tl-t1-parallel-lanes` | Period bands and track lanes |
| P2 | `tl-e2-identify-earlier`, `tl-p2-identify-period`, `tl-t2-identify-track`, `tl-x5-visual-entity-link`, `tl-x6-precise-date` | Scoring paths and composition |
| P3 | `tl-f1-duration-events`, `tl-f2-compare-eras` | Future temporal features named in vision |

---

## Contract changes (none proposed)

All `done` use cases are expressible with the current Timeline spec surface (`content.kind: "events"`, optional `periods` / `tracks`, Timeline-D3 dates, D5 `select` / `focus` / `play-pause` / `step` / `scrub` / `reset`). Planned cases (`tl-f1-duration-events`, `tl-f2-compare-eras`) require new contract fields — propose in SPEC before implementation.
