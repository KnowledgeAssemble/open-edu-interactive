# GEOMAP-SPEC.md

**OpenEdu GeoMap Engine — Declarative Spatial Learning Specification**

**Status:** Draft  
**Version:** 1.0.0  
**Canonical Format:** JSON  
**Audience:** OpenEdu engineers, AI coding agents, content agents, curriculum designers, researchers  
**Scope:** Spatial visualization, geographic learning, historical geography, spatial reasoning, interactive maps, and map-based assessment

---

# 1. Purpose

The **OpenEdu GeoMap Engine** is a declarative engine for representing, visualizing, animating, exploring, and assessing spatial knowledge.

GeoMap is not intended to be a generic GIS library.

It is an **educational spatial-learning engine**.

Its purpose is to turn geographic knowledge into an interactive learning experience.

```text
GeoMap Specification
        ↓
Schema Validation
        ↓
Semantic Resolution
        ↓
GeoMap AST
        ↓
Projection
        ↓
Renderer
        ↓
Interactive Learning Experience
```

The engine SHALL allow OpenEdu content and AI agents to describe:

- places
- regions
- boundaries
- coordinates
- geographic relationships
- routes
- rivers
- territories
- historical territories
- migration
- trade
- cultural transmission
- distributions
- spatial change
- temporal geography
- map narratives
- spatial interactions
- spatial assessments

without requiring authors or AI agents to write renderer-specific code.

---

# 2. Core Principle

> **Do not build a map library. Build a spatial-learning engine.**

GeoMap should make geographic knowledge declarative.

An author or AI agent describes:

```text
What exists?
Where is it?
How is it related?
How does it change?
What should the learner notice?
What should the learner do?
How should learning be assessed?
```

The renderer determines how that specification becomes an interactive experience.

---

# 3. Canonical Serialization

## 3.1 JSON is canonical

**JSON is the sole canonical serialization format for GeoMap Specifications.**

All externally persisted, exchanged, generated, validated, and packaged GeoMap specifications SHALL use JSON.

The canonical representation uses the shared Interactive Engine envelope (DESIGN D1). GeoMap-specific fields live under `content`.

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "example-map",
  "metadata": {},
  "content": {
    "viewport": {},
    "projection": {},
    "geography": {},
    "entities": [],
    "layers": [],
    "legend": {},
    "interactions": [],
    "animations": [],
    "timeline": {},
    "assessment": {},
    "theme": {}
  }
}
```

The former `{ "geomap": { … } }` wrapper is superseded. Do not copy that form forward.

## 3.2 Other serialization formats

YAML, TOML, XML, or other formats MAY be supported by tooling in the future.

If supported:

1. JSON remains canonical.
2. Conversion MUST be lossless.
3. Alternate formats MUST NOT introduce capabilities unavailable in canonical JSON.
4. Round-tripping MUST preserve semantic meaning.

```text
Authoring Format
      ↓
Canonical JSON
      ↓
Validation
      ↓
GeoMap AST
```

The engine SHALL NOT maintain separate semantic implementations for JSON and alternate formats.

---

# 4. Design Principles

GeoMap SHALL follow these principles.

## 4.1 Semantic-first

Specifications describe meaning rather than rendering instructions.

Prefer:

```json
{
  "style": {
    "role": "historical-empire"
  }
}
```

over:

```json
{
  "style": {
    "fill": "#8B4513",
    "stroke": "#000000"
  }
}
```

---

## 4.2 Renderer-independent

The GeoMap specification MUST NOT depend on:

- SVG
- Canvas
- WebGL
- Mapbox
- Google Maps
- Leaflet
- OpenLayers
- Cesium
- any specific mapping library

The same specification should be renderable through different backends.

---

## 4.3 Educational-first

GeoMap exists to support learning.

Maps should answer educational questions such as:

- Where?
- What is nearby?
- What is connected?
- How does it move?
- How does it change?
- Why does location matter?

---

## 4.4 AI-first

AI agents should generate and modify GeoMap specifications rather than renderer code.

Preferred:

```text
Agent
 ↓
GeoMap JSON
 ↓
Validator
 ↓
Preview
 ↓
Correction
```

Not:

```text
Agent
 ↓
SVG / JavaScript / Mapbox code
```

---

## 4.5 Accessibility-first

Every meaningful geographic object SHOULD have semantic meaning.

Visual appearance MUST NOT be the only mechanism for communicating information.

---

## 4.6 Offline-first

GeoMap should support course-packaged geographic datasets and operate without network connectivity where practical.

---

## 4.7 Data-provider independence

The engine SHALL NOT require a commercial geographic-data provider.

Course packages MAY contain their own:

- GeoJSON
- TopoJSON
- simplified boundary datasets
- point datasets
- route datasets
- historical datasets

---

## 4.8 Progressive disclosure

Maps should expose complexity progressively.

A learner may initially see:

```text
India
```

and progressively reveal:

```text
India
 ↓
States
 ↓
Cities
 ↓
Rivers
 ↓
Trade routes
 ↓
Historical boundaries
```

---

## 4.9 Low-stimulation defaults

Default presentation SHOULD follow OpenEdu accessibility principles:

- restrained visual density
- calm visual hierarchy
- limited simultaneous animation
- clear interaction states
- predictable controls
- reduced motion support
- minimal decorative elements

---

# 5. Conceptual Model

GeoMap has three conceptual layers.

```text
┌────────────────────────────┐
│ Geography                  │
│ Where things exist         │
└─────────────┬──────────────┘
              ↓
┌────────────────────────────┐
│ Knowledge                  │
│ Relationships and meaning  │
└─────────────┬──────────────┘
              ↓
┌────────────────────────────┐
│ Learning                   │
│ Explore → Reason → Assess  │
└────────────────────────────┘
```

---

# 6. Learning Loop

GeoMap should support the learning cycle:

```text
Observe
   ↓
Explore
   ↓
Interact
   ↓
Notice
   ↓
Reason
   ↓
Explain
   ↓
Assess
```

A map is therefore not merely an illustration.

It can become the learning environment itself.

---

# 7. Top-Level Specification

The top-level object SHALL be a shared-envelope GeoMap specification: `type` MUST be `"geomap"`, with `version` and `id` required.

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "example-map",
  "metadata": {},
  "content": {
    "viewport": {},
    "projection": {},
    "geography": {},
    "entities": [],
    "layers": [],
    "legend": {},
    "interactions": [],
    "animations": [],
    "timeline": {},
    "assessment": {},
    "theme": {}
  }
}
```

GeoMap scene properties are optional unless required by the selected feature. They MUST NOT appear as siblings of `type`/`version`/`id` except for shared envelope keys.

---

# 8. Metadata

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "india-rivers",
  "metadata": {
    "title": "Major Rivers of India",
    "description": "Explore major rivers of India.",
    "language": "en",
    "subject": "geography",
    "educationalLevel": "middle-school",
    "tags": [
      "india",
      "rivers",
      "geography"
    ]
  }
}
```

`id` is an envelope field, not nested in `metadata`. Envelope metadata MAY only use fields defined in `interactive-engine.schema.json`. `gradeBand` maps to `educationalLevel`. License, timestamps, and extra provenance belong in `content` or `sources`.

Supported metadata MAY include:

| Property | Type | Purpose |
|---|---|---|
| `id` | string | Unique identifier |
| `title` | string | Human-readable title |
| `description` | string | Description |
| `language` | string | Primary language |
| `subject` | string | Subject |
| `gradeBand` | string | Intended learner level |
| `tags` | array | Search/discovery tags |
| `author` | string | Author identifier |
| `license` | string | Content license |
| `sources` | array | Provenance |
| `createdAt` | string | Creation timestamp |
| `updatedAt` | string | Modification timestamp |

---

### 8.1 Node-id convention

Scene node ids follow a deterministic convention (used by renderer, event target ids, and `snapshot.scene.semantics`):

| Node kind | Id pattern |
|---|---|
| layer container | `geom-<layerId>` |
| entity item | `geom-<layerId>-<entityId>` |
| route node | `geom-<layerId>-<routeId>` |
| route segment | `geom-<layerId>-<routeId>-seg-<i>` |
| legend item | `geom-legend-item-<i>` |
| scale bar | `geom-scale-bar` |

Layer containers are `role: 'layer'`; route segments are `role: 'route-segment'` (derived to `route-completed`/`route-active` as steps advance).

### 8.2 New content fields (P8)

The content schema additionally accepts:

- `content.scaleBar: { visible?, unit?: 'km' | 'mi' }` — static scale bar (D5).
- `LayerSchema.encoding: { attribute, type: 'fill' | 'size', breakpoints: [[number, number], ...] }` — attr-encoding.
- Item `measure: { attribute, value }` — bucket source for encoding.
- `EntitySchema.categories: string[]` and `adjacentTo: string[]` — filter categories and adjacency.
- Route item `interactive: boolean`, `label: boolean` — segment interactivity.
- Legend item `linkedEntities: string[]`, `interactive: boolean` — legend-link.
- `content.compass: { referenceEntityId, window: { label, from, to } }` — compass/bearing (W-2.7). `referenceEntityId` MUST name an entity with explicit coordinates; `window` is the authored semantic axis window in degrees (`from`/`to`, `0..360`, wrap-around allowed — e.g. north = `315..45`). The compass renders as a scene node `geom-compass` (a D5 target, no pixel picking). Bearing is **derived** from the authored reference point to each candidate — never authored as a value; `bearing` on a candidate emits `geomap.bearing-computed` with `inWindow` true only when the bearing falls inside the window (a semantic field, not a tolerance constant). Validation negatives: missing `referenceEntityId` (INVALID_REFERENCE), reference lacking coordinates (INVALID_REFERENCE), reference as its own candidate (INVALID_REFERENCE), `from`/`to` outside `[0, 360]` (INVALID_SPEC).
- `content.periods: [{ id, label, from, to, sources, regionEntityIds }]` — period slices (W-4.1). Each period carries its own non-empty `sources[]` (provenance mandatory; empty/missing → validation error) and the region entity ids visible in that period. The scene node `geom-period-slice` is a D5 target: `scrub` (payload `{ step }`) sets the active index, `step` advances it (deterministic reducer ops, no timers — host-driven playback only). `snapshot().activePeriod` exposes the active slice; `geomap.period-step` is emitted. Regions not in the active period's set are hidden.

All new objects carry `additionalProperties: false`.

---

# 9. Viewport

The viewport defines the initial map framing.

```json
{
  "viewport": {
    "center": {
      "lat": 22.5,
      "lon": 79.0
    },
    "zoom": 4
  }
}
```

Supported properties:

```json
{
  "viewport": {
    "center": {
      "lat": 0,
      "lon": 0
    },
    "zoom": 1,
    "bounds": {
      "north": 0,
      "south": 0,
      "east": 0,
      "west": 0
    },
    "fit": "content"
  }
}
```

The renderer MAY adapt viewport behavior to device size.

---

# 10. Projection

Projection defines how geographic coordinates are represented visually.

Implemented enum (validated, strict):

```text
equirectangular
mercator
albers
```

Example:

```json
{
  "projection": {
    "type": "mercator"
  }
}
```

Projection configuration MUST remain semantic. The renderer determines the implementation (this engine uses d3-geo). Unknown types (e.g. `orthographic` in the current slice) are validation errors (`INVALID_ENTITY`).

---

# 11. Geography Sources

GeoMap separates geographic data from educational meaning.

```json
{
  "geography": {
    "sources": [
      {
        "id": "india-states",
        "type": "geojson",
        "uri": "data/india/states.geojson"
      }
    ]
  }
}
```

A source MAY be:

- bundled
- course-local
- remote
- generated
- procedural
- system-provided

For offline course packages, local assets SHOULD be preferred.

---

# 12. Geographic Entities

Entities represent meaningful geographic objects.

Examples:

- country
- state
- district
- city
- village
- river
- mountain
- lake
- ocean
- historical kingdom
- empire
- route
- cultural region

Example:

```json
{
  "entities": [
    {
      "id": "ganges",
      "type": "river",
      "name": "Ganges",
      "location": {
        "source": "india-rivers",
        "featureId": "ganges"
      },
      "description": "One of the major river systems of South Asia."
    }
  ]
}
```

---

# 13. Entity Types

Initial entity types:

```text
country
state
province
district
city
town
village
region
river
lake
sea
ocean
mountain
island
desert
forest
landmark
historical-territory
empire
kingdom
route
place
```

The system SHOULD support custom semantic types.

---

# 14. Location Resolution

An entity MAY resolve to geographic coordinates.

```json
{
  "location": {
    "coordinates": {
      "lat": 20.2961,
      "lon": 85.8245
    }
  }
}
```

Or to a geographic feature:

```json
{
  "location": {
    "source": "india-states",
    "featureId": "odisha"
  }
}
```

Or to multiple geometries:

```json
{
  "location": {
    "features": [
      {
        "source": "historical-india",
        "featureId": "maurya"
      }
    ]
  }
}
```

---

# 15. Provenance and Uncertainty

Historical geography frequently contains uncertainty.

GeoMap MUST support provenance.

Provenance is carried on the **envelope** as a non-empty root-level `sources[]` — there is no `provenance` field in the GeoMap schema. Each entry mirrors `docs/schemas/interactive-engine.schema.json` `$defs.source`: a required `class` (`authoritative` | `illustrative` | `simulated`) plus optional `title`, `citation`, `url`, `author`, `date`, and other per-source fields the `$defs.source` declares. The validator raises L2 `INVALID_SPEC` when `sources` is missing or empty (`packages/geomap-engine/src/validation/semantic.ts`).

```json
{
  "sources": [
    {
      "class": "authoritative",
      "title": "Historical Atlas",
      "url": "..."
    }
  ]
}
```

Every factual, geographic, or historical claim in a map MUST be traceable to at least one source in `sources[]`. Never invent boundaries, extents, values, or dates absent from the authored data.

Historical boundaries SHOULD NOT imply false precision.

---

# 16. Layers

Layers organize map content.

```json
{
  "layers": [
    {
      "id": "states",
      "type": "region",
      "items": [
        {
          "entity": "odisha"
        }
      ]
    }
  ]
}
```

Layers MAY contain:

- regions
- markers
- rivers
- routes
- areas
- heatmaps
- flows
- labels
- boundaries
- annotations
- grids

---

# 17. Layer Properties

```json
{
  "id": "rivers",
  "type": "river",
  "visible": true,
  "interactive": true,
  "items": []
}
```

Supported properties:

```text
id
type
title
description
visible
interactive
locked
opacity
items
style
semanticRole
```

---

# 18. Region Layer

Used for countries, states, districts, territories, and other areas.

```json
{
  "id": "states",
  "type": "region",
  "items": [
    {
      "entity": "odisha"
    },
    {
      "entity": "west-bengal"
    }
  ]
}
```

---

# 19. Marker Layer

Used for points.

```json
{
  "id": "cities",
  "type": "marker",
  "items": [
    {
      "entity": "bhubaneswar"
    },
    {
      "entity": "delhi"
    }
  ]
}
```

Markers MAY contain:

```json
{
  "entity": "bhubaneswar",
  "label": true,
  "interactive": true
}
```

---

# 20. River Layer

```json
{
  "id": "rivers",
  "type": "river",
  "items": [
    {
      "entity": "ganges"
    },
    {
      "entity": "brahmaputra"
    }
  ]
}
```

---

# 21. Route Layer

Routes represent movement or connections.

```json
{
  "id": "silk-road",
  "type": "route",
  "items": [
    {
      "id": "silk-road-main",
      "path": [
        "chang-an",
        "samarkand",
        "taxila",
        "pataliputra"
      ]
    }
  ]
}
```

Routes MAY represent:

- trade
- migration
- pilgrimage
- military movement
- travel
- communication
- cultural transmission

---

# 22. Area Layer

Used for conceptual or analytical geographic areas.

```json
{
  "id": "monsoon-region",
  "type": "area",
  "items": [
    {
      "id": "south-asia-monsoon",
      "geometry": {
        "source": "climate",
        "featureId": "monsoon-region"
      }
    }
  ]
}
```

---

# 23. Heatmap Layer

```json
{
  "id": "population",
  "type": "heatmap",
  "data": {
    "source": "population-2025",
    "value": "population"
  }
}
```

The renderer determines visual encoding.

---

# 24. Flow Layer

Flow maps represent movement between locations.

```json
{
  "id": "migration",
  "type": "flow",
  "items": [
    {
      "from": "region-a",
      "to": "region-b",
      "value": 120
    }
  ]
}
```

Flow semantics MAY represent:

- migration
- trade
- goods
- ideas
- cultural influence
- military movement

---

# 25. Labels

Labels SHOULD be semantic rather than purely visual.

```json
{
  "id": "labels",
  "type": "label",
  "items": [
    {
      "entity": "ganges",
      "text": "Ganges"
    }
  ]
}
```

A renderer MAY reposition labels automatically.

---

# 26. Semantic Styling

GeoMap styling SHOULD use semantic roles.

Example:

```json
{
  "style": {
    "role": "historical-empire"
  }
}
```

Possible roles:

```text
primary-region
secondary-region
historical-empire
historical-kingdom
river
mountain
route
trade-route
migration-route
important-city
capital
highlight
selected
visited
question-target
correct
incorrect
unknown
approximate
```

A theme maps these roles to visual properties.

Raw visual properties MAY be supported as renderer-level implementation details but SHOULD NOT be required in canonical educational specifications.

---

# 27. Legend

```json
{
  "legend": {
    "visible": true,
    "items": [
      {
        "role": "historical-empire",
        "label": "Empire"
      },
      {
        "role": "trade-route",
        "label": "Trade route"
      }
    ]
  }
}
```

Legends SHOULD explain meaning rather than merely reproduce visual symbols.

---

# 28. Geographic Relationships

GeoMap SHOULD support semantic spatial relationships.

Initial relationships:

```text
inside
contains
near
far
adjacent
bordering
north-of
south-of
east-of
west-of
connected-to
flows-to
originates-from
travels-to
expands-into
migrates-to
influences
```

Example:

```json
{
  "relationships": [
    {
      "type": "flows-to",
      "from": "yamuna",
      "to": "ganges"
    }
  ]
}
```

Relationships MAY be declared at the entity level or inferred by the engine.

---

# 29. Interactions

Interactions define what learners can do. Specifications use D5 semantic actions (DESIGN §7.4). `click` / hover are renderer input and MUST be mapped to `select` / `focus` before dispatch.

```json
{
  "interactions": [
    {
      "id": "select-state",
      "target": "states",
      "trigger": "select",
      "actions": [
        {
          "type": "select"
        }
      ]
    }
  ]
}
```

Semantic triggers (subset of D5):

```text
select
focus
drag
drop
play-pause
step
```

Renderer input (`click`, `tap`, `hover`, `keyboard`) is not stored in the specification.

---

# 30. Interaction Actions

GeoMap MUST use the D5 action enum. Typical GeoMap subset:

```text
select
deselect
focus
unfocus
filter
clear-filter
toggle
open-annotation
close-annotation
zoom
pan
scrub
jump-to
play-pause
step
reset
```

`toggle` targets a layer node id (`geom-<layerId>`) toggling its visibility.
`step`/`scrub` target a route node id (`geom-<layerId>-<routeId>`).
`filter` accepts payload `{ ids: string[] }` or `{ categories: string[] }` (engine resolves categories to node ids).
`bearing` (W-2.7) targets any entity id and queries the compass: the engine computes the bearing from the authored reference point to that entity (plain arithmetic on authored coordinates — ADR-10) and reports whether it falls in the authored axis window.

GeoMap emits the following namespaced events:

| Event | Payload | Trigger |
|-------|---------|---------|
| `geomap.layer-toggled` | `{ layerId, hidden }` | `toggle` |
| `geomap.route-step` | `{ routeId, step }` | `step` / `scrub` |
| `geomap.filter-applied` | `{ ids, categories? }` | `filter` / `clear-filter` |
| `geomap.legend-linked` | `{ legendItemId, entityIds }` | `focus` on legend item |
| `geomap.entity-selected` | entity metadata | `select` |
| `geomap.entity-focused` | entity metadata | `focus` |
| `geomap.bearing-computed` | `{ entityId, referenceEntityId, bearing, inWindow }` | `bearing` |
| `geomap.period-step` | `{ periodIndex, periodId }` | `step` / `scrub` on `geom-period-slice` |

Namespaced GeoMap extensions MAY include `geomap.center` when documented. `highlight`, `show`, `hide`, `open-info`, and `play-animation` are superseded (`select` / `focus` / `open-annotation` / `play-pause`).

Example:

```json
{
  "actions": [
    {
      "type": "select",
      "target": "odisha"
    },
    {
      "type": "open-annotation",
      "target": "odisha"
    }
  ]
}
```

---

# 31. Educational Interaction Types

GeoMap SHALL support higher-level educational interactions.

Initial interaction types:

```text
locate
identify
compare
trace
sequence
classify
explore
predict
explain
discover
```

These SHOULD be represented semantically rather than implemented as arbitrary event handlers.

---

# 32. Locate

Example:

```json
{
  "type": "locate",
  "target": "odisha",
  "prompt": "Where is Odisha?"
}
```

The learner identifies the target geographic object.

---

# 33. Identify

```json
{
  "type": "identify",
  "prompt": "Which river is shown?",
  "target": "ganges"
}
```

---

# 34. Trace

Trace interactions allow learners to follow:

- rivers
- routes
- migration paths
- trade networks
- historical expansion

Example:

```json
{
  "type": "trace",
  "target": "ganges"
}
```

---

# 35. Compare

```json
{
  "type": "compare",
  "targets": [
    "india",
    "china"
  ]
}
```

Comparison MAY involve:

- size
- location
- distance
- climate
- population
- territory
- historical extent

---

# 36. Timeline

GeoMap has NO internal timeline. Time-based change is OUT OF SCOPE for the GeoMap engine itself: GeoMap is a rendering/state engine over a static scene, and it MUST NOT host an internal timeline, clock, or temporal layer scheduler.

Temporal behavior is achieved ONLY by composition with the Timeline engine (see §64): the OpenEdu runtime (host) owns the timeline, listens for Timeline events, and routes `toggle` D5 actions to GeoMap. GeoMap consumers SHALL NOT author a `timeline` block inside GeoMap content — in strict schemas an unknown `timeline` key is a validation error.

### 36.1 Layer-visibility pattern (host routing)

The host drives time-based layer visibility:

```text
Timeline engine emits timeline step/changed
        ↓
host maps timeline bucket -> layer id
        ↓
host dispatches { type: 'toggle', target: { id: 'geom-<layerId>' } } to GeoMap
        ↓
GeoMap emits geomap.layer-toggled { layerId, hidden }
```

Each layer's authored `visible: boolean` sets the initial frame; subsequent frames are reachable through `toggle`. GeoMap does not read Timeline events and never imports the Timeline engine (engine isolation, DESIGN D2/§6).

---

# 37. Temporal Layers

There is NO `temporal` property on GeoMap layers. The former "engine determines visibility based on the active timeline state" behavior is REMOVED: GeoMap decides layer visibility ONLY from (a) authored `layer.visible`, and (b) `toggle` actions recorded in the engine-local display fold.

As with §36, time-varying layers are a composition concern:

```json
{
  "id": "maurya-layer",
  "type": "region",
  "visible": false,
  "items": [ ]
}
```

The host decides when to `toggle` this layer on/off in response to Timeline events. GeoMap exposes `snapshot.displayState.hiddenLayerIds` so the host/debug tooling can inspect the resulting layer visibility deterministically.

---

# 38. Animation

Animations should communicate change rather than provide decoration.

```json
{
  "animations": [
    {
      "id": "empire-expansion",
      "target": "maurya",
      "type": "reveal",
      "duration": 2000
    }
  ]
}
```

Animation types MAY include:

```text
reveal
draw
move
expand
fade
pulse
highlight
flow
camera
```

Animations MUST respect reduced-motion preferences.

---

# 39. Map Storytelling

GeoMap supports narrative sequences.

Example:

```json
{
  "scenes": [
    {
      "id": "origin",
      "camera": {
        "target": "pataliputra"
      },
      "layers": [
        "maurya-origin"
      ]
    },
    {
      "id": "expansion",
      "camera": {
        "target": "maurya"
      },
      "layers": [
        "maurya-expansion"
      ]
    }
  ]
}
```

A story can therefore become:

```text
Scene 1
  ↓
Observe origin

Scene 2
  ↓
Reveal expansion

Scene 3
  ↓
Explore relationships

Scene 4
  ↓
Answer question
```

---

# 40. Assessment

GeoMap MAY contain assessment specifications.

```json
{
  "assessment": {
    "items": [
      {
        "id": "q1",
        "type": "locate",
        "target": "odisha",
        "prompt": "Locate Odisha on the map."
      }
    ]
  }
}
```

Assessment should use semantic geographic targets rather than pixel coordinates.

---

# 41. Assessment Types

Initial types:

```text
locate
identify
trace
sequence
compare
classify
match
select-region
select-point
order
```

---

# 42. Assessment Validation

For a locate question, correctness should be evaluated semantically.

Example:

```json
{
  "type": "locate",
  "target": "delhi",
  "tolerance": {
    "type": "geographic",
    "radiusKm": 25
  }
}
```

For regions, correctness MAY be determined by polygon containment.

---

# 43. Feedback

```json
{
  "feedback": {
    "correct": {
      "message": "Correct! Delhi is in northern India."
    },
    "incorrect": {
      "message": "Not quite. Look toward northern India."
    }
  }
}
```

Feedback SHOULD support localization and accessible alternatives.

---

# 44. Accessibility

Accessibility is a first-class part of GeoMap.

```json
{
  "accessibility": {
    "keyboard": true,
    "reducedMotion": true,
    "semanticLabels": true,
    "alternativeView": true
  }
}
```

---

# 45. Alternative View

Every educational GeoMap SHOULD be capable of presenting geographic information without requiring visual map interpretation.

Example:

```text
Alternative representation:

Odisha
Located in eastern India.

Borders:
- West Bengal
- Jharkhand
- Chhattisgarh
- Andhra Pradesh

Capital:
- Bhubaneswar
```

The alternative view MAY be:

- structured list
- accessible table
- textual narrative
- entity browser
- screen-reader optimized representation

---

# 46. Keyboard Navigation

Interactive geographic objects MUST be keyboard accessible.

Example conceptual order:

```text
Map
 ↓
Layer controls
 ↓
Region 1
 ↓
Region 2
 ↓
Region 3
 ↓
Legend
```

Focus MUST be visually apparent.

---

# 47. Color Independence

Important geographic distinctions MUST NOT rely exclusively on color.

Use combinations of:

- labels
- patterns
- symbols
- boundaries
- line styles
- textual descriptions

---

# 48. Reduced Motion

When reduced motion is enabled:

```text
animated route → static route
animated zoom → instant focus
pulse → static highlight
draw animation → immediately visible
```

The educational meaning MUST remain intact.

---

# 49. Responsive Behavior

GeoMap SHALL support:

```text
mobile
tablet
desktop
large display
```

Mobile layouts SHOULD prioritize:

```text
map
 ↓
essential controls
 ↓
context
 ↓
details
```

Controls SHOULD NOT obscure important geographic content.

---

# 50. Performance

The engine SHOULD support:

- geometry simplification
- viewport culling
- lazy layer loading
- lazy labels
- cached geographic data
- progressive rendering
- simplified mobile datasets

Large geographic datasets SHOULD NOT automatically be rendered at full resolution.

---

# 51. Offline Support

GeoMap packages MAY contain:

```text
geomap.json
data/
  world/
  india/
  historical/
assets/
  icons/
```

Example:

```text
course/
├── course.json
├── lessons/
├── geomaps/
│   ├── india-rivers.json
│   └── maurya.json
└── data/
    ├── india-states.geojson
    └── rivers.geojson
```

The GeoMap specification SHALL remain independent of application metadata storage.

---

# 52. Determinism

Given the same:

```text
GeoMap JSON
+
geographic datasets
+
engine version
+
theme
```

the semantic result SHOULD be deterministic.

Randomized visual behavior MUST use explicit seeds where required.

---

# 53. Validation

GeoMap specifications MUST be validated before rendering.

Validation levels:

```text
Syntax
 ↓
Schema
 ↓
Semantic
 ↓
Geographic
 ↓
Accessibility
 ↓
Pedagogical
```

---

# 54. Schema Validation

The project SHALL provide:

```text
schemas/geomap-spec.schema.json
```

The schema validates:

- required fields
- field types
- enum values
- references
- structure
- version compatibility

---

# 55. Semantic Validation

Examples:

```text
Layer references unknown entity
Route references unknown location
Timeline has invalid range
Assessment references nonexistent target
Projection incompatible with geometry
```

---

# 56. Geographic Validation

Examples:

```text
Invalid latitude
Invalid longitude
Malformed GeoJSON
Invalid polygon
Self-intersecting geometry
Missing geometry
Invalid geographic reference
```

---

# 57. Accessibility Validation

The validator SHOULD detect:

```text
Interactive object without semantic label
Assessment dependent only on color
Missing alternative representation
Animation without reduced-motion behavior
Keyboard-inaccessible interaction
```

---

# 58. Actionable Errors

Errors SHOULD be machine-readable.

Example:

```json
{
  "code": "UNKNOWN_ENTITY",
  "path": "$.geomap.layers[0].items[2].entity",
  "message": "Entity 'ganga' does not exist.",
  "suggestion": "Did you mean 'ganges'?"
}
```

AI agents SHOULD be able to consume validation errors directly.

---

# 59. Entity Resolution

The engine MAY resolve natural-language geographic references.

Example:

```text
"Odisha"
```

→

```json
{
  "id": "odisha",
  "type": "state",
  "country": "india"
}
```

Resolution should support:

- exact names
- aliases
- historical names
- multilingual names
- alternate spellings
- IDs
- coordinates

---

# 60. Historical Geography

Historical geography is a first-class GeoMap capability.

Examples:

- Mauryan Empire
- Roman Empire
- Mughal Empire
- ancient trade networks
- partition
- migration
- spread of Buddhism
- spread of agriculture
- historical city development

Historical maps MUST support:

- dates
- approximate boundaries
- provenance
- uncertainty
- temporal changes

---

# 61. Geography Taxonomy

GeoMap supports three broad categories.

## 61.1 Modern Geography

Examples:

```text
countries
states
cities
rivers
mountains
climate zones
population
```

## 61.2 Historical Geography

Examples:

```text
empires
kingdoms
historical borders
migration
trade
religious spread
```

## 61.3 Conceptual Geography

Examples:

```text
urbanization
population density
climate
biomes
economic networks
transport networks
```

---

# 62. Map Taxonomy

GeoMap supports several educational map patterns.

## Locator Map

Answers:

> Where is it?

## Distribution Map

Answers:

> Where is something found?

## Route Map

Answers:

> How does something travel?

## Flow Map

Answers:

> How does something move between places?

## Territory Map

Answers:

> What area does this entity control or occupy?

## Change Map

Answers:

> How does geography change over time?

## Relationship Map

Answers:

> How are places connected?

---

# 63. GeoMap + Visual Engine

GeoMap SHOULD integrate with the OpenEdu Visual Engine.

Example:

```text
GeoMap
   +
Visual Engine
   ↓
Map + explanatory diagram
```

Visual Engine may provide:

- annotations
- callouts
- diagrams
- icons
- overlays
- explanatory illustrations

GeoMap remains responsible for spatial semantics.

---

# 64. GeoMap + Timeline Engine

GeoMap composes with the Timeline engine THROUGH the host event bus, not by import (DESIGN D2/§6). The host owns the timeline and routes `toggle` D5 actions to GeoMap instances.

## Routing pattern

For a layer that should appear at timeline position `t`:

1. Author the GeoMap content layer with `visible: false`.
2. Host listens for Timeline state change events.
3. Host maps timeline bucket → `geom-<layerId>`.
4. Host dispatches `{ type: 'toggle', target: { id: 'geom-<layerId>' } }`.
5. GeoMap emits `geomap.layer-toggled { layerId, hidden }` and shows the layer.

This pattern is the only way to achieve time-based layer visibility. GeoMap does not read timeline state or import the Timeline engine.

## Example

```text
Timeline: frame t=3 → host knows "maurya" layer active
  ↓
host.dispatch({ type: 'toggle', target: { id: 'geom-boundaries-maurya' } })
  ↓
GeoMap → geomap.layer-toggled { layerId: 'geom-boundaries-maurya', hidden: false }
  ↓
snapshot.displayState.hiddenLayerIds ← updated
```

---

# 65. GeoMap + Assessment Engine

GeoMap assessment MAY integrate with OpenEdu's broader assessment engine.

```text
GeoMap interaction
       ↓
Assessment event
       ↓
Assessment engine
       ↓
Learning record
```

GeoMap SHOULD emit semantic events such as:

```text
entityViewed
entitySelected
locationAttempted
routeTraced
layerRevealed
timelineChanged
questionAnswered
```

---

# 66. GeoMap Events

GeoMap events are **renderer-independent** — the same payload is delivered to the host and the event log regardless of how the scene is drawn.

The **canonical payload table** is §30 "Interaction Actions": every namespaced event (`geomap.layer-toggled`, `geomap.route-step`, `geomap.filter-applied`, `geomap.legend-linked`, `geomap.entity-selected`, `geomap.entity-focused`) is defined there with its causing D5 action in the Trigger column. This section is the reference note, not a second definition.

Namespaced example (`geomap.entity-selected`, caused by D5 `select`):

```json
{
  "name": "geomap.entity-selected",
  "payload": {
    "entityId": "odisha",
    "type": "region",
    "name": "Odisha"
  }
}
```

Events MUST use the `geomap.*` namespace, never bare camelCase names like `entitySelected`. Superseded names (`highlight`, `show`, `hide`, `open-info`, `play-animation`) MUST NOT be emitted.

---

# 67. AI Agent Contract

AI agents generating GeoMaps MUST follow these rules.

## MUST

- generate valid JSON
- conform to the GeoMap schema
- use semantic entities
- use semantic styling
- reference known entities
- provide accessible labels
- avoid false geographic precision
- provide provenance for historical claims
- use educational interactions where appropriate
- validate before publishing

## MUST NOT

- generate raw SVG as the canonical artifact
- generate arbitrary HTML
- generate renderer-specific JavaScript
- hard-code pixel coordinates for semantic geography
- rely exclusively on color
- create unnecessary animation
- invent geographic boundaries
- present uncertain historical boundaries as certain

---

# 68. AI Tools

A future GeoMap agent toolkit SHOULD expose:

```text
geomap.create
geomap.validate
geomap.preview
geomap.search-place
geomap.search-region
geomap.resolve-entity
geomap.add-layer
geomap.add-route
geomap.add-flow
geomap.add-timeline
geomap.add-interaction
geomap.add-assessment
geomap.explain
geomap.simplify
```

Example:

```text
geomap.create
        ↓
GeoMap JSON
        ↓
geomap.validate
        ↓
geomap.preview
```

---

# 69. Example: Minimal Map

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "india-rivers",
  "metadata": {
    "title": "Major Rivers of India"
  },
  "content": {
    "projection": {
      "type": "geographic"
    },
    "layers": [
      {
        "id": "rivers",
        "type": "river",
        "items": [
          { "entity": "ganges" },
          { "entity": "yamuna" },
          { "entity": "brahmaputra" }
        ]
      }
    ]
  }
}
```

---

# 70. Example: Locate Assessment

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "locate-odisha",
  "metadata": {
    "title": "Locate Odisha"
  },
  "content": {
    "layers": [
      {
        "id": "states",
        "type": "region",
        "items": [
          { "entity": "odisha" }
        ]
      }
    ],
    "assessment": {
      "items": [
        {
          "id": "q1",
          "type": "locate",
          "target": "odisha",
          "prompt": "Locate Odisha on the map."
        }
      ]
    }
  }
}
```

---

# 71. Example: Historical Empire

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "maurya-empire",
  "metadata": {
    "title": "The Mauryan Empire"
  },
  "content": {
    "projection": {
      "type": "geographic"
    },
    "timeline": {
      "start": -350,
      "end": -150,
      "current": -250,
      "unit": "year"
    },
    "layers": [
      {
        "id": "maurya",
        "type": "region",
        "items": [
          { "entity": "maurya" }
        ],
        "style": {
          "role": "historical-empire"
        }
      }
    ]
  },
  "accessibility": {
    "label": "The Mauryan Empire",
    "reducedMotion": true
  }
}
```

---

# 72. Example: Route

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "silk-road",
  "metadata": {
    "title": "Silk Road"
  },
  "content": {
    "layers": [
      {
        "id": "trade-route",
        "type": "route",
        "items": [
          {
            "id": "silk-road-main",
            "path": [
              "chang-an",
              "samarkand",
              "taxila",
              "pataliputra"
            ]
          }
        ],
        "style": {
          "role": "trade-route"
        }
      }
    ]
  }
}
```

---

# 73. Example: Spread of Buddhism

```json
{
  "type": "geomap",
  "version": "1.0.0",
  "id": "buddhism-spread",
  "metadata": {
    "title": "Spread of Buddhism"
  },
  "content": {
    "timeline": {
      "start": -500,
      "end": 500,
      "unit": "year"
    },
    "layers": [
      {
        "id": "spread",
        "type": "flow",
        "items": [
          { "from": "magadha", "to": "gandhara" },
          { "from": "gandhara", "to": "central-asia" },
          { "from": "india", "to": "sri-lanka" }
        ],
        "style": {
          "role": "cultural-transmission"
        }
      }
    ]
  }
}
```

---

# 74. Package Architecture

Recommended repository structure:

```text
geomap-engine/
│
├── packages/
│   ├── geomap-schema/
│   ├── geomap-core/
│   ├── geomap-resolver/
│   ├── geomap-projection/
│   ├── geomap-renderer-svg/
│   ├── geomap-interaction/
│   ├── geomap-assessment/
│   ├── geomap-accessibility/
│   ├── geomap-data/
│   └── geomap-react/
│
├── schemas/
│   └── geomap-spec.schema.json
│
├── datasets/
│   ├── world/
│   ├── india/
│   └── historical/
│
├── examples/
│
├── tests/
│
└── docs/
    ├── GEOMAP-SPEC.md
    ├── GEOMAP-DATA-SPEC.md
    ├── GEOMAP-INTERACTION-SPEC.md
    └── GEOMAP-ASSESSMENT-SPEC.md
```

---

# 75. Internal Architecture

The engine SHOULD use an intermediate semantic representation.

```text
                 GeoMap JSON
                     │
                     ▼
              JSON Schema
               Validation
                     │
                     ▼
             Semantic Resolver
                     │
                     ▼
                GeoMap AST
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      Projection  Interaction  Assessment
          │          │          │
          └──────────┼──────────┘
                     ▼
                  Renderer
```

The AST is an implementation detail.

The canonical public artifact remains JSON.

---

# 76. Renderer Architecture

Initial renderer:

```text
geomap-renderer-svg
```

Future renderers MAY include:

```text
Canvas
WebGL
3D Globe
Print
Static Image
Accessible Text
```

The GeoMap JSON MUST NOT need to change merely because a renderer changes.

---

# 77. React Integration

A React integration MAY expose:

```tsx
<GeoMap spec={spec} />
```

or:

```tsx
<GeoMapViewer
  spec={spec}
  interactionMode="learning"
/>
```

The React layer SHOULD remain a thin integration layer.

Core GeoMap semantics MUST NOT depend on React.

---

# 78. OpenEdu Integration

GeoMap is an OpenEdu first-class content primitive.

Conceptually:

```text
Course
 └── Lesson
      ├── Text
      ├── Image
      ├── Audio
      ├── Video
      ├── Visual
      ├── GeoMap
      ├── Timeline
      └── Assessment
```

A lesson may embed:

```json
{
  "type": "interactive",
  "engine": "geomap",
  "spec": {
    "type": "geomap",
    "version": "1.0.0",
    "id": "india-rivers"
  }
}
```

---

# 79. Separation of Content and Application State

GeoMap specifications are canonical content artifacts.

They MUST NOT depend on:

- IndexedDB schemas
- React state
- browser storage
- UI component state
- user-session metadata

Application state MAY track:

```text
selectedEntity
currentTimeline
viewport
completedInteractions
assessmentState
```

but these are derived/runtime state, not canonical GeoMap content.

---

# 80. Security

GeoMap implementations MUST:

- validate external data
- sanitize imported GeoJSON
- prevent unsafe URLs
- avoid executable content
- restrict remote data according to course security policy
- avoid arbitrary code execution

GeoMap JSON MUST remain declarative.

---

# 81. Non-Goals

GeoMap is NOT intended to become:

- a full GIS platform
- a professional cartography application
- a spatial database
- a satellite imagery platform
- a navigation system
- a general-purpose map editor
- a replacement for QGIS
- a Google Maps clone

The engine should optimize for:

> **learning, exploration, reasoning, and assessment.**

---

# 82. MVP

The first production-capable MVP SHOULD include:

### Specification

- GeoMap JSON schema
- parser
- validator
- versioning

### Geography

- coordinates
- GeoJSON
- countries
- India states
- major cities
- major rivers

### Rendering

- SVG renderer
- regions
- markers
- rivers
- routes
- labels

### Interaction

- click
- hover
- focus
- highlight
- reveal
- zoom
- pan

### Learning

- locate
- identify
- trace

### Accessibility

- keyboard navigation
- semantic labels
- reduced motion
- alternative list representation

### AI

- spec generation
- validation
- correction loop

---

# 83. Phase 2

Add:

- historical boundaries
- timelines
- animation
- flow maps
- heatmaps
- comparison
- sequence assessment
- custom GeoJSON
- course-packaged geography
- richer accessibility
- multilingual geographic names

---

# 84. Phase 3

Add:

- terrain
- 3D globe
- WebGL
- geographic data service
- spatial analysis
- dynamic datasets
- collaborative annotation
- teacher authoring tools
- advanced map storytelling
- geographic knowledge graph integration

---

# 85. Future Geo Knowledge Graph

GeoMap can eventually become a visualization layer over an OpenEdu geographic knowledge graph.

```text
                 Geo Knowledge Graph
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
         Places      Relations      Events
            │            │            │
            └────────────┼────────────┘
                         ▼
                     GeoMap
```

Example:

```text
Ganges
  ↓
flows-to
  ↓
Bay of Bengal
```

or:

```text
Mauryan Empire
  ↓
expanded-into
  ↓
Northern India
```

This would allow GeoMap to become more than a static visualization format.

---

# 86. Long-Term OpenEdu Interactive Engine

GeoMap should eventually participate in a broader OpenEdu Interactive Engine.

```text
                 OpenEdu Interactive Engine
                            │
        ┌───────────┬───────┼────────┬───────────┐
        ▼           ▼       ▼        ▼           ▼
     Visual      GeoMap   Chart   Timeline    Diagram
     Engine      Engine   Engine    Engine     Engine
```

All engines should share common principles:

```text
JSON
Semantic specifications
Schema validation
Renderer independence
Accessibility
AI generation
Offline support
Composable interactions
Assessment integration
```

---

# 87. Quality Model

A GeoMap should be evaluated across six dimensions.

## Correctness

Is the geographic information accurate?

## Clarity

Can the learner understand the spatial relationships?

## Relevance

Does the map support the learning objective?

## Accessibility

Can learners access the information through multiple modalities?

## Interaction Quality

Do interactions help learners reason rather than distract?

## Pedagogical Value

Does the map improve understanding?

A visually beautiful map with weak educational value is not a successful GeoMap.

---

# 88. Anti-Patterns

Avoid:

### Decoration-only maps

A map that adds visual interest but no learning value.

### Information overload

Showing every available geographic feature simultaneously.

### GIS complexity

Exposing professional GIS controls to learners.

### Navigation mimicry

Turning learning into map navigation.

### Color dependence

Using color as the only source of meaning.

### False precision

Presenting uncertain historical information as exact.

### Animation overload

Animating every geographic object.

### Renderer coupling

Encoding SVG/Canvas/Mapbox implementation details in the content specification.

### Hard-coded coordinates

Using arbitrary pixel coordinates instead of geographic semantics.

---

# 89. Definition of Done

GeoMap Engine v1.0 is complete when:

### Specification

- [ ] Canonical JSON specification defined
- [ ] JSON Schema implemented
- [ ] Versioning defined
- [ ] Semantic validation implemented

### Geography

- [ ] GeoJSON supported
- [ ] Geographic coordinates supported
- [ ] Entity resolution supported
- [ ] Provenance supported
- [ ] Uncertainty supported

### Rendering

- [ ] SVG renderer implemented
- [ ] Regions supported
- [ ] Markers supported
- [ ] Rivers supported
- [ ] Routes supported
- [ ] Labels supported

### Interaction

- [ ] Selection
- [ ] Highlighting
- [ ] Focus
- [ ] Zoom
- [ ] Pan
- [ ] Reveal

### Learning

- [ ] Locate
- [ ] Identify
- [ ] Trace
- [ ] Basic assessment

### Accessibility

- [ ] Keyboard navigation
- [ ] Semantic labels
- [ ] Alternative representation
- [ ] Reduced motion
- [ ] Color-independent meaning

### AI

- [ ] AI generation contract
- [ ] Validation tools
- [ ] Preview/correction loop

### OpenEdu

- [ ] Course integration
- [ ] Lesson integration
- [ ] Offline course packaging
- [ ] Renderer-independent artifacts

---

# 90. Final Principle

GeoMap should not be thought of as:

> "an interactive map component."

It should be thought of as:

> **a declarative spatial-learning engine.**

The fundamental artifact is:

```text
GeoMap JSON
```

not SVG.

The fundamental abstraction is:

```text
spatial knowledge
```

not map pixels.

The fundamental interaction is:

```text
learner reasoning
```

not map navigation.

And the fundamental goal is:

```text
Observe
→ Explore
→ Interact
→ Notice
→ Reason
→ Explain
→ Assess
```

GeoMap turns geography from an illustration into an experience.