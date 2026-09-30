# OpenEdu Interactive Engine Specification

**File:** `INTERACTIVE-ENGINE-SPEC.md`
**Status:** Draft
**Version:** 0.1.0
**Parent System:** OpenEdu
**Scope:** Shared architecture and semantic contract for OpenEdu Interactive Engines

---

## 1. Purpose

The OpenEdu Interactive Engine is a common runtime architecture for building interactive educational experiences from structured JSON specifications.

OpenEdu defines five initial semantic engines:

```text
                    OpenEdu Interactive Engine
                              │
       ┌──────────────┬───────┼────────┬──────────────┐
       ▼              ▼       ▼        ▼              ▼
    Visual          GeoMap   Chart   Timeline       Diagram
    Engine          Engine   Engine    Engine        Engine
```

Each engine specializes in a different kind of learner reasoning:

| Engine   | Primary reasoning space                 |
| -------- | --------------------------------------- |
| Visual   | Visual objects and spatial manipulation |
| GeoMap   | Geographic and spatial relationships    |
| Chart    | Quantitative relationships and data     |
| Timeline | Temporal relationships and change       |
| Diagram  | Structural and conceptual relationships |

The engines share a common runtime contract so that:

* lessons can compose multiple engines
* AI agents can author engines consistently
* learner interactions can be tracked uniformly
* engines can communicate through semantic events
* accessibility can be implemented consistently
* renderers can evolve independently from content
* engine state can be serialized and restored
* interactive experiences remain deterministic

---

# 2. Core Philosophy

## 2.1 Interactive experiences are semantic

OpenEdu does not define an interaction primarily as a UI gesture.

The system should represent:

```text
Learner intent
    ↓
Semantic action
    ↓
Engine state change
    ↓
Semantic event
```

For example:

```json
{
  "action": "select",
  "target": {
    "type": "event",
    "id": "independence-1947"
  }
}
```

rather than:

```json
{
  "event": "svg-click",
  "x": 483,
  "y": 221
}
```

The renderer is an implementation detail.

The educational meaning is the contract.

---

# 3. Design Principles

All Interactive Engines SHALL follow these principles.

## 3.1 Semantic First

The specification describes:

* what exists
* how things relate
* what learners can do
* what state exists
* what events occur

It SHOULD NOT describe:

* DOM structure
* React components
* CSS classes
* SVG implementation details
* renderer-specific APIs

---

## 3.2 Data Driven

Interactive experiences SHALL be representable as structured JSON.

The same specification should be renderable by:

* web
* desktop
* mobile
* future native clients
* alternative accessibility interfaces

---

## 3.3 Renderer Independent

The architecture SHALL separate:

```text
Specification
      ↓
Semantic Model
      ↓
Layout / Interpretation
      ↓
Renderer
```

An engine specification MUST NOT depend on a particular rendering technology.

---

## 3.4 Accessibility Is Part of the Model

Accessibility SHALL NOT be treated as a post-processing step.

Each engine MUST support:

* semantic descriptions
* keyboard interaction
* focus management
* reduced-motion behavior
* screen-reader representation
* alternative linear representations where applicable
* sufficient interaction targets
* meaningful labels
* state announcements

---

## 3.5 Deterministic

Given the same:

```text
Specification
+
Initial State
+
Action Sequence
```

the engine SHOULD produce the same:

```text
State
+
Events
```

This enables:

* reproducible lessons
* testing
* replay
* analytics
* AI evaluation
* debugging
* collaborative authoring

---

## 3.6 Educational Purpose

Every interactive engine SHOULD have an explicit educational purpose.

An interaction should answer:

> What is the learner expected to understand by interacting with this?

Avoid interactions that exist only because they are visually interesting.

---

# 4. Engine Taxonomy

OpenEdu initially defines five engine types.

## 4.1 Visual Engine

Purpose:

> Explore and manipulate visual objects.

Examples:

* image exploration
* object identification
* visual comparison
* hotspots
* layers
* annotations
* visual transformations

---

## 4.2 GeoMap Engine

Purpose:

> Explore geographic space and spatial relationships.

Examples:

* maps
* regions
* routes
* locations
* geographic comparison
* spatial overlays
* coordinate exploration

---

## 4.3 Chart Engine

Purpose:

> Explore quantitative information and relationships.

Examples:

* bar charts
* line charts
* scatter plots
* distributions
* comparisons
* data filtering
* trend investigation

---

## 4.4 Timeline Engine

Purpose:

> Explore temporal relationships and change.

Examples:

* historical timelines
* periods
* events
* parallel developments
* duration
* sequence
* temporal comparison

---

## 4.5 Diagram Engine

Purpose:

> Explore structural, conceptual, procedural, and causal relationships.

Examples:

* flow diagrams
* concept maps
* systems
* hierarchies
* processes
* causal structures
* networks
* state diagrams

---

# 5. Common Engine Architecture

Every engine SHALL conceptually contain the following layers:

```text
┌───────────────────────────────────┐
│         Engine Specification      │
│              JSON                 │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│         Semantic Model             │
└─────────────────┬─────────────────┘
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
    Layout     Interaction  Accessibility
       │          │           │
       └──────────┼───────────┘
                  ▼
┌───────────────────────────────────┐
│              State                │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│          Event System             │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│             Renderer              │
└───────────────────────────────────┘
```

---

# 6. Common Specification Structure

Every engine specification SHOULD follow this conceptual structure:

```json
{
  "type": "engine-type",
  "version": "1.0",
  "id": "unique-engine-id",

  "metadata": {},

  "purpose": {},

  "content": {},

  "layout": {},

  "interaction": {},

  "questions": {},

  "accessibility": {},

  "appearance": {},

  "state": {},

  "events": {}
}
```

Individual engines MAY extend these sections.

They MUST NOT redefine their meaning incompatibly.

---

# 7. Identity

Every engine instance MUST have a stable identifier.

```json
{
  "id": "timeline-independence"
}
```

The ID:

* MUST be unique within the lesson scope
* SHOULD remain stable across revisions
* SHOULD be suitable for event references
* SHOULD NOT depend on generated DOM IDs

---

# 8. Versioning

Every engine specification MUST declare its schema version.

```json
{
  "type": "timeline",
  "version": "1.0"
}
```

Versioning SHALL use semantic-versioning principles where appropriate:

```text
MAJOR.MINOR.PATCH
```

Breaking changes require a major version.

Backward-compatible additions SHOULD increment the minor version.

Bug fixes SHOULD increment the patch version.

---

# 9. Metadata

Metadata provides non-semantic information about the engine.

Example:

```json
{
  "metadata": {
    "title": "The Indian Independence Timeline",
    "description": "Explore major events leading to independence.",
    "language": "en",
    "tags": [
      "history",
      "india",
      "independence"
    ]
  }
}
```

Metadata MAY include:

* title
* description
* language
* locale
* tags
* author
* source
* attribution
* educational level
* subject
* estimated interaction time

Metadata MUST NOT be required for the engine's core runtime behavior unless explicitly defined by an engine.

---

# 10. Purpose

The educational purpose SHOULD be explicit.

Example:

```json
{
  "purpose": {
    "learningObjective": "Understand how major events contributed to Indian independence.",
    "interactionGoal": "Explore events in chronological order and compare periods.",
    "reasoningMode": "sequence"
  }
}
```

Possible reasoning modes include:

```text
identify
compare
sequence
classify
estimate
explore
predict
explain
analyze
construct
investigate
```

Individual engines MAY define additional domain-specific reasoning modes.

---

# 11. Semantic Content

The `content` section contains the actual educational model.

For example:

```json
{
  "content": {
    "items": []
  }
}
```

The exact structure is engine-specific.

Examples:

```text
Visual → objects
GeoMap → locations / regions / routes
Chart → dimensions / measures / data
Timeline → events / periods / tracks
Diagram → nodes / relationships
```

The content model MUST describe meaning rather than rendering.

---

# 12. Semantic Entities

All engines SHOULD represent their primary entities with stable IDs.

Example:

```json
{
  "id": "event-1947",
  "type": "event",
  "label": "Indian Independence"
}
```

Stable IDs allow:

* selection
* cross-engine references
* events
* state serialization
* accessibility
* analytics
* learner activities

---

# 13. Relationships

Relationships SHOULD be represented semantically.

For example:

```json
{
  "source": "event-a",
  "target": "event-b",
  "type": "precedes"
}
```

The relationship type carries meaning.

Avoid encoding meaning purely through visual properties.

Bad:

```json
{
  "lineStyle": "arrow"
}
```

Good:

```json
{
  "relationship": "causes"
}
```

The renderer may choose an arrow to represent the relationship.

---

# 14. Cross-Engine References

Engines MAY reference entities belonging to another engine.

Example:

```json
{
  "target": {
    "engine": "geomap",
    "id": "india"
  }
}
```

This allows experiences such as:

```text
Timeline
    │
    │ event-selected
    ▼
GeoMap
    │
    ▼
Display geographic context
```

Or:

```text
Timeline
    │
    ▼
Chart
    │
    ▼
Show population / economic data
```

Cross-engine references SHOULD remain semantic.

---

# 15. Interaction Model

All engines SHALL expose the D5 semantic action vocabulary (DESIGN §7.4; schema `$defs.actionType`).

Core actions:

```text
select
deselect
focus
unfocus
filter
clear-filter
open-annotation
close-annotation
answer
compare
toggle
expand
collapse
zoom
pan
scrub
jump-to
play-pause
step
drag
drop
place
move
connect
disconnect
follow
bearing
reset
```

`bearing` (GeoMap W-2.7) is the closed enum's only engine-specific extension: it queries the computed compass bearing from an authored reference point to a candidate entity. The bearing is **derived from authored geometry** — it is never authored as a value — and the "is it north of X" answer holds only when the bearing falls inside the authored axis window (a semantic field, not a tolerance constant). GeoMap emits namespaced `geomap.bearing-*` events in response; the action name itself stays in the D5 enum.

Not every engine must support every action.

Individual engines SHALL declare which of these actions are valid in `interaction.actions`.

`highlight`, `annotate`, `blur`, `play`, and `show` are superseded (D5). Pointer events (`click`, `pointer.enter`) are renderer input and MUST NOT appear in specifications.

---

# 16. Action Structure

A common action representation SHOULD look like:

```json
{
  "type": "select",
  "target": {
    "id": "event-1947"
  }
}
```

Optional parameters MAY be included:

```json
{
  "type": "compare",
  "targets": [
    {
      "id": "event-a"
    },
    {
      "id": "event-b"
    }
  ]
}
```

Actions represent learner intent.

---

# 17. Action Lifecycle

An action follows:

```text
Action
  ↓
Validation
  ↓
Semantic Interpretation
  ↓
State Transition
  ↓
Event Emission
```

Example:

```text
select(event-1947)
        ↓
validate target
        ↓
selectedEvent = event-1947
        ↓
emit event-selected
```

Invalid actions SHOULD be rejected without corrupting state.

---

# 18. State

Engine state represents the current learner interaction state.

State SHOULD be:

* serializable
* deterministic
* inspectable
* resettable

Example:

```json
{
  "state": {
    "selectedId": "event-1947",
    "focusedId": "event-1947",
    "filters": {},
    "interactionMode": "explore"
  }
}
```

State SHOULD contain interaction state rather than duplicate immutable content.

---

# 19. State Categories

State can be classified into:

### Content State

What the engine contains.

Usually immutable during learner interaction.

### View State

How the learner is currently viewing it.

Examples:

```text
zoom
viewport
expanded groups
filters
focus
```

### Interaction State

What the learner has done.

Examples:

```text
selected entities
completed actions
placements
annotations
answers
```

### Activity State

Progress toward a pedagogical objective.

Examples:

```text
completed
attempts
score
currentTask
```

---

# 20. State Reset

Every engine SHOULD support reset.

```text
reset()
```

Reset SHOULD return the engine to its declared initial state.

A reset SHOULD emit:

```text
<engine>-reset
```

and, where appropriate:

```text
interaction-reset
```

---

# 21. Events

Events communicate semantic state changes.

Common lifecycle events:

```text
engine-mounted
engine-ready
state-changed
interaction-started
interaction-completed
engine-reset
```

Engine-specific events are defined by individual engine specifications.

---

# 22. Event Structure

Events SHOULD follow a common structure:

```json
{
  "type": "timeline.event-selected",
  "engineId": "timeline-independence",
  "target": {
    "id": "event-1947",
    "type": "event"
  },
  "state": {},
  "timestamp": 0
}
```

Events SHOULD contain semantic information.

Avoid:

```json
{
  "type": "mouse-click",
  "x": 284,
  "y": 391
}
```

Prefer:

```json
{
  "type": "timeline.event-selected",
  "target": {
    "id": "event-1947"
  }
}
```

---

# 23. Event Bus

The OpenEdu lesson runtime SHOULD provide a shared semantic event bus.

```text
                 Lesson Runtime
                       │
              ┌────────┴────────┐
              │   Event Bus     │
              └────────┬────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
   Timeline         GeoMap           Chart
```

An engine SHOULD NOT directly manipulate another engine.

Instead:

```text
Engine A
   │
   ▼
Semantic Event
   │
   ▼
Lesson Runtime / Event Bus
   │
   ▼
Engine B
```

This keeps engines loosely coupled.

---

# 24. Event Routing

A lesson MAY define event-driven interactions.

Example:

```json
{
  "on": {
    "timeline.event-selected": {
      "target": "map-india",
      "action": "focus",
      "targetIdFrom": "locationId"
    }
  }
}
```

The exact event-routing schema belongs to the lesson/runtime specification.

The engine specification only defines the event contract.

---

# 25. Composition

Interactive Engines SHALL be composable.

Example:

```text
┌───────────────┐
│   Timeline    │
└───────┬───────┘
        │ event-selected
        ▼
┌───────────────┐
│    GeoMap     │
└───────┬───────┘
        │ region-selected
        ▼
┌───────────────┐
│     Chart     │
└───────────────┘
```

Another example:

```text
Diagram
   │ node-selected
   ▼
Visual
   │
   ▼
Show detailed illustration
```

Composition MUST happen through semantic contracts.

---

# 26. Questions

Envelope `questions` are **optional authoring hints** (DESIGN D7). OpenEdu quiz nodes, workflow, and Pipili evaluate learner responses, score activities, and deliver hints. Engines MUST remain correct with an empty `questions` array and MUST NOT require envelope questions to function.

Questions MAY still appear in specifications to:

* document intended prompts for authors and AI agents;
* declare expected interaction targets for validation;
* carry non-normative success conditions for preview tooling.

They MUST NOT be treated as the runtime scoring source of truth.

Example (authoring hint):

```json
{
  "questions": [
    {
      "id": "q1",
      "type": "identify",
      "prompt": "Which event happened first?",
      "interaction": {
        "type": "select"
      }
    }
  ]
}
```

Engines SHOULD expose enough semantic state (snapshot + D5 events) for OpenEdu to evaluate activities. Evaluation logic lives in OpenEdu, not in engine packages.

---

# 27. Learner Activities

Engines MAY support activity modes.

Common modes:

```text
explore
identify
compare
sequence
classify
predict
construct
investigate
explain
```

An engine MAY transition between modes.

Example:

```json
{
  "interaction": {
    "mode": "explore"
  }
}
```

An activity may later switch to:

```json
{
  "interaction": {
    "mode": "identify"
  }
}
```

---

# 28. Feedback

Feedback SHOULD be expressed semantically.

Examples:

```text
correct
incorrect
partially-correct
hint
revealed
completed
```

Feedback SHOULD NOT require a particular UI.

The renderer may represent feedback through:

* text
* highlight
* animation
* sound
* iconography
* accessibility announcement

---

# 29. Accessibility Model

Every engine MUST expose an accessibility representation.

At minimum:

```json
{
  "accessibility": {
    "label": "Timeline of major events",
    "description": "Explore events from 1857 to 1947.",
    "keyboard": true,
    "reducedMotion": true
  }
}
```

Where appropriate, the engine SHOULD provide an alternative semantic representation.

For example:

```text
1857 — First War of Independence
1885 — Indian National Congress founded
1919 — Jallianwala Bagh
1942 — Quit India Movement
1947 — Independence
```

The alternative representation MUST derive from the same semantic model.

It MUST NOT be a separately authored duplicate that can become inconsistent.

---

# 30. Keyboard Interaction

Interactive entities MUST be keyboard accessible where interaction is meaningful.

Common keyboard concepts:

```text
Tab
Arrow keys
Enter
Space
Escape
Home
End
```

Individual engines SHOULD define their keyboard navigation semantics.

---

# 31. Focus

Focus is a semantic concept.

State may include:

```json
{
  "focusedId": "event-1947"
}
```

Focus SHOULD be independent from CSS or DOM focus implementation.

This allows alternative renderers to reproduce the same interaction state.

---

# 32. Reduced Motion

Animations MUST NOT be required to understand the underlying concept.

Engines SHOULD support:

```json
{
  "appearance": {
    "motion": {
      "enabled": true,
      "reducedMotionBehavior": "instant"
    }
  }
}
```

When reduced motion is enabled:

* transitions may become instant
* decorative animation should be removed
* essential state changes remain visible

---

# 33. Progressive Disclosure

Complex interactive experiences SHOULD support progressive disclosure.

Possible levels:

```text
overview
guided
detailed
advanced
```

For example:

```text
Overview
   ↓
Select concept
   ↓
Reveal details
   ↓
Explore relationship
   ↓
Inspect evidence
```

This helps prevent unnecessary cognitive load.

---

# 34. Layout

Layout describes how semantic content should be spatially arranged.

Layout SHOULD be declarative.

Example:

```json
{
  "layout": {
    "type": "auto",
    "orientation": "horizontal"
  }
}
```

The specification MAY provide constraints such as:

```text
orientation
alignment
spacing
grouping
ordering
anchors
bounds
```

Exact layout capabilities are engine-specific.

---

# 35. Renderer Independence

The same semantic model MAY be rendered through different renderers.

Example:

```text
Timeline Specification
        │
        ▼
Timeline Semantic Model
        │
   ┌────┼─────┐
   ▼    ▼     ▼
  SVG  Canvas  HTML
```

Future:

```text
Semantic Model
      │
      ├── Web
      ├── Mobile
      ├── Desktop
      ├── Print
      └── Screen Reader
```

---

# 36. Appearance

Appearance MAY define:

* theme
* density
* typography scale
* visual emphasis
* contrast
* decorative style

Appearance MUST NOT contain the semantic meaning of an object.

Example:

```json
{
  "appearance": {
    "theme": "default",
    "density": "comfortable"
  }
}
```

The OpenEdu design system remains responsible for actual visual tokens.

---

# 37. Localization

Engine specifications SHOULD support localization.

Text-bearing properties SHOULD be localizable.

Example:

```json
{
  "label": {
    "key": "timeline.independence.title",
    "default": "Indian Independence"
  }
}
```

Alternatively, lesson-level localization mechanisms may resolve text before runtime.

Engines MUST NOT assume:

* English
* left-to-right layout
* fixed text length
* Gregorian dates where another calendar is semantically required

---

# 38. Data Provenance

Where an engine contains externally sourced information, provenance SHOULD be represented.

Example:

```json
{
  "source": {
    "type": "reference",
    "title": "Government of India",
    "citation": "..."
  }
}
```

Data may be classified as:

```text
authoritative
reference
illustrative
simulated
learner-generated
AI-generated
```

This distinction is particularly important for:

* Chart
* Timeline
* GeoMap
* Diagram

---

# 39. AI Authoring

Interactive Engines SHALL be designed for AI generation.

An AI author should be able to generate an engine from educational intent.

Example:

```text
Learning Objective
        +
Subject Knowledge
        +
Learner Level
        +
Interaction Goal
        ↓
AI Authoring Agent
        ↓
JSON Engine Specification
        ↓
Schema Validation
        ↓
Semantic Validation
        ↓
Educational Validation
        ↓
Runtime
```

The AI should not need to generate:

* React code
* SVG markup
* CSS
* canvas drawing code
* DOM event handlers

---

# 40. AI Authoring Contract

AI-generated specifications SHOULD explicitly provide:

```text
purpose
content
relationships
interaction
questions
accessibility
sources
```

The authoring system SHOULD validate generated specifications before publishing.

---

# 41. Validation

Interactive Engines SHOULD have multiple validation layers.

```text
JSON Schema Validation
        ↓
Structural Validation
        ↓
Semantic Validation
        ↓
Interaction Validation
        ↓
Accessibility Validation
        ↓
Educational Validation
```

---

# 42. Structural Validation

Checks:

* required properties
* valid types
* valid IDs
* valid references
* supported enum values
* schema version

---

# 43. Semantic Validation

Checks:

* referenced entities exist
* relationships are valid
* incompatible concepts are rejected
* semantic types are consistent
* cross-engine references resolve

---

# 44. Interaction Validation

Checks:

* actions target valid entities
* required interaction capabilities exist
* action sequences are valid
* activity completion conditions are achievable

---

# 45. Accessibility Validation

Checks:

* meaningful labels exist
* interactive elements are reachable
* focus behavior is defined
* alternative representation exists where required
* reduced-motion behavior is valid

---

# 46. Educational Validation

The system SHOULD detect:

* interaction without purpose
* ambiguous objectives
* impossible activities
* excessive complexity
* misleading visual relationships
* unsupported causal claims
* decorative interactions masquerading as learning activities

---

# 47. Semantic Safety

Interactive visualizations can accidentally communicate claims that the author did not intend.

The engine MUST preserve semantic distinctions.

For example:

```text
before ≠ causes
near ≠ related
related ≠ equivalent
correlated ≠ causal
same group ≠ same category
```

AI-generated content MUST NOT silently upgrade a weak relationship into a stronger one.

---

# 48. Engine API

All engines SHOULD expose a common runtime interface.

Conceptually:

```text
load(specification)
render()
update(state)
reset()
getState()
dispatch(action)
destroy()
```

A more explicit conceptual API:

```text
load(spec)
initialize()
getState()
dispatch(action)
subscribe(listener)
reset()
destroy()
```

The exact implementation may differ by runtime.

---

# 49. Engine Lifecycle

The standard lifecycle is:

```text
created
   ↓
loaded
   ↓
validated
   ↓
initialized
   ↓
ready
   ↓
interactive
   ↓
resettable
   ↓
destroyed
```

Lifecycle events SHOULD be observable.

---

# 50. Engine Runtime Contract

An engine runtime SHOULD behave as a pure state transition system where practical:

```text
nextState = reducer(currentState, action)
```

Conceptually:

```text
Specification
      +
Current State
      +
Action
      ↓
Deterministic State Transition
      ↓
New State
      +
Semantic Events
```

This architecture makes engines easier to:

* test
* replay
* serialize
* synchronize
* debug
* run offline

---

# 51. Serialization

Engine state SHOULD be JSON serializable.

Example:

```json
{
  "engineId": "timeline-1",
  "state": {
    "selectedEvent": "event-1947",
    "zoomLevel": 2,
    "filters": {
      "political": true
    }
  }
}
```

Serialization enables:

* save/resume
* learner progress
* replay
* analytics
* collaboration
* debugging

---

# 52. Undo / Redo

Engines that support learner construction or manipulation SHOULD consider:

```text
undo
redo
```

These SHOULD operate on semantic actions rather than renderer-specific mutations.

Example:

```text
place-node
connect-nodes
move-node
```

rather than:

```text
set-svg-transform
```

---

# 53. Analytics

Engines SHOULD emit semantic interaction events suitable for learning analytics.

Example:

```json
{
  "type": "node-selected",
  "engineId": "photosynthesis-diagram",
  "target": {
    "id": "chloroplast"
  }
}
```

Analytics systems can then determine:

* what learners explored
* what they ignored
* where they struggled
* which relationships they investigated
* whether an activity was completed

The engine itself SHOULD NOT own analytics storage.

---

# 54. Privacy

Engines SHOULD minimize learner data collection.

Engine state SHOULD contain only information necessary for:

* interaction
* progress
* accessibility
* activity evaluation

Personally identifiable information MUST NOT be embedded in engine specifications.

---

# 55. Performance

Interactive Engines SHOULD be lightweight enough for:

* low-end devices
* classroom networks
* offline/PWA operation
* mobile devices

Large datasets SHOULD support:

* lazy loading
* progressive rendering
* virtualization
* simplified representations

where appropriate.

---

# 56. Offline Support

The engine architecture SHOULD support offline operation.

An engine specification SHOULD NOT inherently require a network connection.

External resources MAY be referenced, but the runtime SHOULD support packaged/local resources where possible.

This aligns with OpenEdu's broader offline/PWA direction.

---

# 57. Resource References

Resources SHOULD be referenced semantically.

Example:

```json
{
  "resource": {
    "type": "image",
    "id": "plant-cell",
    "src": "assets/plant-cell.svg"
  }
}
```

The engine should not assume a specific asset loading mechanism.

---

# 58. Security

Engine specifications MUST be treated as untrusted data.

Runtime implementations MUST:

* validate input
* sanitize rendered content
* reject unsafe resource references
* prevent arbitrary script execution
* constrain external content
* avoid executable code inside specifications

The JSON specification is data, not executable logic.

---

# 59. No Arbitrary Code

Interactive behavior SHOULD be expressed using declarative actions and conditions.

Avoid:

```json
{
  "onClick": "javascript:..."
}
```

Prefer:

```json
{
  "interaction": {
    "onSelect": {
      "action": "focus"
    }
  }
}
```

This is critical for:

* security
* deterministic behavior
* AI authoring
* validation
* portability

---

# 60. Conditions

Where conditional behavior is required, it SHOULD use a constrained declarative expression model.

Example:

```json
{
  "condition": {
    "state": {
      "selectedId": {
        "equals": "event-1947"
      }
    }
  }
}
```

Arbitrary executable expressions SHOULD NOT be allowed.

---

# 61. The Engine Registry

OpenEdu SHOULD maintain an engine registry.

Conceptually:

```json
{
  "engines": {
    "visual": {
      "version": "1.0"
    },
    "geomap": {
      "version": "1.0"
    },
    "chart": {
      "version": "1.0"
    },
    "timeline": {
      "version": "1.0"
    },
    "diagram": {
      "version": "1.0"
    }
  }
}
```

The registry provides:

* engine discovery
* schema versions
* renderer registration
* capability discovery
* compatibility information

---

# 62. Capability Model

Engines SHOULD expose capabilities.

Example:

```json
{
  "capabilities": [
    "select",
    "zoom",
    "filter",
    "compare",
    "keyboard-navigation"
  ]
}
```

This allows lesson runtime and authoring tools to determine what an engine supports.

---

# 63. Engine Composition Contract

A composed lesson should conceptually look like:

```text
Lesson
│
├── Engine Instance
│     ├── Specification
│     ├── State
│     └── Events
│
├── Engine Instance
│     ├── Specification
│     ├── State
│     └── Events
│
└── Interaction Rules
```

Interaction rules connect semantic events to semantic actions.

---

# 64. Example Composition

Consider a lesson about India's independence.

```text
Timeline
   │
   │ event-selected
   ▼
GeoMap
   │
   │ region-selected
   ▼
Chart
   │
   │ data-point-selected
   ▼
Visual
```

A learner might:

```text
Select 1942
    ↓
Map focuses on relevant region
    ↓
Select region
    ↓
Chart shows population/economic data
    ↓
Select data point
    ↓
Visual shows contextual image
```

No engine needs to know how another engine renders itself.

---

# 65. Shared Semantic Vocabulary

OpenEdu SHOULD maintain a shared vocabulary registry.

Core concepts include:

```text
entity
relationship
action
event
state
selection
focus
filter
annotation
question
answer
feedback
source
activity
```

Engine-specific vocabularies extend this shared vocabulary.

---

# 66. Engine-Specific Extensions

Each engine MAY define specialized semantics.

For example:

### Chart

```text
measure
dimension
series
data-point
trend
distribution
```

### Timeline

```text
event
period
era
duration
track
moment
```

### GeoMap

```text
location
region
route
boundary
coordinate
layer
```

### Diagram

```text
node
edge
group
path
relationship
process-step
```

### Visual

```text
object
layer
hotspot
region
annotation
transformation
```

---

# 67. Common Error Model

Errors SHOULD be structured.

Example:

```json
{
  "error": {
    "code": "INVALID_TARGET",
    "message": "The selected entity does not exist.",
    "targetId": "event-999"
  }
}
```

Suggested categories:

```text
INVALID_SPEC
INVALID_VERSION
INVALID_ENTITY
INVALID_REFERENCE
INVALID_ACTION
INVALID_STATE
UNSUPPORTED_ACTION
RESOURCE_ERROR
ACCESSIBILITY_ERROR
```

---

# 68. Testing

Each engine SHOULD have tests at four levels.

### Schema Tests

Validate JSON structure.

### Semantic Tests

Validate meaning and references.

### State Tests

Validate action → state transitions.

### Interaction Tests

Validate learner workflows.

Example:

```text
load timeline
→ select event
→ verify selectedEvent
→ verify event-selected
→ reset
→ verify initial state
```

---

# 69. Snapshot Testing

Engine state SHOULD support snapshot testing.

Example:

```json
{
  "selectedEvent": "event-1947",
  "zoomLevel": 1,
  "filters": {}
}
```

This makes renderer-independent testing possible.

---

# 70. Replay

Because actions are semantic, a learner interaction session can be represented as:

```json
{
  "actions": [
    {
      "type": "select",
      "target": {
        "id": "event-1857"
      }
    },
    {
      "type": "select",
      "target": {
        "id": "event-1947"
      }
    }
  ]
}
```

The session can be replayed against the same specification.

---

# 71. AI Evaluation

The semantic architecture allows AI systems to inspect interactions.

For example:

```text
Learner:
select → compare → filter → inspect → answer
```

An AI evaluator could infer:

* learner explored the intended concepts
* learner compared relevant entities
* learner missed an important relationship
* learner may need a hint

The engine provides structured evidence without exposing renderer internals.

---

# 72. Authoring UX

OpenEdu Course Creator Studio SHOULD edit engine specifications over the semantic model. Interactive Engine SHALL NOT ship a competing Studio (DESIGN D6).

The engine playground MAY preview a spec. Authors and AI assistants operate on the same JSON the learner runtime hosts.

---

# 73. AI + Human Authoring

The architecture SHOULD support:

```text
Human
  ↓
Learning objective
  ↓
AI
  ↓
Draft engine specification
  ↓
Validation
  ↓
Human review
  ↓
Publish
```

The AI should generate structured data that the author can inspect and modify.

---

# 74. Content vs Presentation

OpenEdu MUST maintain a strong separation:

```text
CONTENT
    │
    ├── facts
    ├── entities
    ├── relationships
    └── educational intent

PRESENTATION
    │
    ├── layout
    ├── typography
    ├── visual styling
    └── animation

INTERACTION
    │
    ├── actions
    ├── state
    └── events
```

This separation is essential for long-term portability.

---

# 75. Content vs Activity

The same semantic content SHOULD be reusable across multiple activities.

For example:

```text
Same Timeline
    │
    ├── Explore activity
    ├── Sequence activity
    ├── Compare activity
    └── Assessment activity
```

The underlying content should not need to be duplicated.

---

# 76. Content vs Renderer

The same content SHOULD support multiple representations.

Example:

```text
Same Diagram
    │
    ├── Interactive SVG
    ├── Accessible linear view
    ├── Static image
    ├── Text description
    └── Print representation
```

---

# 77. Progressive Complexity

Engines SHOULD support multiple levels of complexity.

```text
Level 1
Simple exploration

Level 2
Guided interaction

Level 3
Multi-step investigation

Level 4
Learner construction

Level 5
Open-ended reasoning
```

This allows one semantic model to serve different learner levels.

---

# 78. Guided Interaction

An engine MAY provide guidance.

Example:

```json
{
  "interaction": {
    "guided": {
      "enabled": true,
      "steps": [
        "select",
        "compare",
        "explain"
      ]
    }
  }
}
```

Guidance should be declarative.

---

# 79. Learner Construction

Some engines support creation as well as exploration.

Examples:

```text
Diagram → connect concepts
Chart → construct a graph
Timeline → place events
GeoMap → draw route
Visual → label objects
```

Construction actions should be semantic.

Example:

```json
{
  "type": "connect",
  "source": "cause",
  "target": "effect"
}
```

---

# 80. Interaction Completion

Envelope `completion` is an **optional authoring hint** (DESIGN D7). OpenEdu workflow and quiz nodes determine lesson progression and mastery. Engines MAY expose a serializable snapshot (including semantic selections and mode) but MUST NOT require envelope `completion` to function.

```json
{
  "state": {
    "completed": true
  }
}
```

When present, `completion` MAY describe intended semantic conditions for authors and validators — not click counts or renderer internals.

Example (authoring hint):

```text
Required nodes connected
+
Required relationships identified
+
Required selections made
```

Not:

```text
User clicked 5 times
```

---

# 81. Determining Completion

When envelope `completion` is present, rules SHOULD be declarative **hints for authoring and validation**. OpenEdu evaluates whether a learner has satisfied lesson goals; engines emit D5 events and maintain snapshot state.

Example (authoring hint):

```json
{
  "completion": {
    "all": [
      {
        "type": "selected",
        "target": "event-1947"
      },
      {
        "type": "selected",
        "target": "event-1857"
      }
    ]
  }
}
```

Engine-specific completion vocabulary MAY extend this for preview tooling only. It MUST NOT duplicate OpenEdu quiz scoring.

---

# 82. Shared Event Naming

Event names SHOULD use semantic language.

Recommended pattern:

```text
<engine>.<entity>-<result>
```

Examples:

```text
diagram.node-selected
timeline.event-selected
geomap.region-selected
chart.data-point-selected
visual.object-focused
diagram.relationship-followed
```

Lifecycle events may use:

```text
engine-mounted
engine-ready
engine-reset
```

---

# 83. Namespacing

Events SHOULD be namespaceable.

Example:

```text
timeline.event-selected
diagram.node-selected
chart.point-selected
geomap.region-selected
visual.object-selected
```

This avoids ambiguity when multiple engines are active.

---

# 84. Interaction Logging

The runtime MAY record semantic action sequences:

```json
{
  "engineId": "diagram-photosynthesis",
  "actions": [
    {
      "type": "select",
      "target": {
        "id": "sunlight"
      }
    },
    {
      "type": "follow",
      "target": {
        "id": "energy-flow"
      }
    }
  ]
}
```

This provides a foundation for:

* analytics
* debugging
* replay
* AI tutoring
* research

---

# 85. Engine Independence

Each engine MUST be independently usable.

A Timeline should work without a Chart.

A Diagram should work without a GeoMap.

A Chart should work without a Timeline.

Composition is an enhancement, not a dependency.

---

# 86. Engine Interoperability

Although independent, engines SHOULD share:

```text
IDs
Events
Actions
State conventions
Accessibility conventions
Localization conventions
Theme conventions
Validation conventions
```

This creates a coherent OpenEdu ecosystem.

---

# 87. Future Engine Types

The architecture SHOULD allow future engines.

Potential future engines:

```text
Simulation Engine
Equation Engine
Code Engine
Audio Engine
3D Engine
Spatial Engine
Chemistry Engine
Physics Engine
Story Engine
Conversation Engine
```

A future engine should implement the same common contract.

---

# 88. Engine Capability Discovery

The runtime SHOULD be able to ask:

```text
What engine is this?
What version?
What capabilities?
What actions?
What events?
What accessibility modes?
```

Example:

```json
{
  "type": "chart",
  "version": "1.0",
  "capabilities": [
    "select",
    "filter",
    "zoom",
    "compare",
    "keyboard-navigation"
  ]
}
```

---

# 89. Registry and Plugin Architecture

Long-term, engines MAY be registered dynamically.

```text
OpenEdu Runtime
      │
      ├── Core Engines
      │    ├── Visual
      │    ├── GeoMap
      │    ├── Chart
      │    ├── Timeline
      │    └── Diagram
      │
      └── Extension Engines
           ├── Simulation
           ├── Equation
           └── 3D
```

This allows the Interactive Engine ecosystem to grow without changing the lesson runtime architecture.

---

# 90. Recommended Repository Structure

A future implementation SHOULD follow a structure similar to:

```text
packages/
  interactive-engine/
    src/
      core/
        engine.ts
        state.ts
        action.ts
        event.ts
        registry.ts
        validation.ts

      accessibility/
      composition/
      runtime/

    schemas/
      interactive-engine.schema.json

  visual-engine/
    src/
    schemas/
      visual-spec.schema.json

  geomap-engine/
    src/
    schemas/
      geomap-spec.schema.json

  chart-engine/
    src/
    schemas/
      chart-spec.schema.json

  timeline-engine/
    src/
    schemas/
      timeline-spec.schema.json

  diagram-engine/
    src/
    schemas/
      diagram-spec.schema.json
```

The exact repository location may differ, but the conceptual separation SHOULD remain.

---

# 91. Specification Hierarchy

OpenEdu specifications SHOULD follow this hierarchy:

```text
INTERACTIVE-ENGINE-SPEC.md
        │
        ├── visual-engine
        │      └── visual-spec.schema.json
        │
        ├── geomap-engine
        │      └── geomap-spec.schema.json
        │
        ├── chart-engine
        │      └── chart-spec.schema.json
        │
        ├── timeline-engine
        │      └── timeline-spec.schema.json
        │
        └── diagram-engine
               └── diagram-spec.schema.json
```

The shared specification defines the common contract.

Individual engine specifications define specialized semantics.

JSON Schemas enforce the machine-readable contract.

---

# 92. Canonical Separation

OpenEdu SHOULD maintain three conceptual layers:

```text
1. Engine Specification
   What the author defines.

2. Engine Runtime
   How the specification behaves.

3. Renderer
   How the experience is displayed.
```

Example:

```text
timeline.json
     ↓
Timeline Runtime
     ↓
Timeline Semantic State
     ↓
SVG / HTML / Canvas Renderer
```

---

# 93. What Does NOT Belong in an Engine Specification

The following SHOULD NOT be part of the semantic engine contract:

```text
React components
DOM selectors
CSS classes
pixel-specific event handlers
arbitrary JavaScript
renderer-specific implementation
database schemas
analytics storage
authentication
user accounts
server infrastructure
```

These belong to other OpenEdu layers.

---

# 94. Relationship to Course Specification

An Interactive Engine is a component of a course or lesson.

Conceptually:

```text
Course
  ↓
Lesson
  ↓
Content
  +
Activity
  +
Interactive Engine
```

A lesson may embed an engine instance:

```json
{
  "type": "interactive",
  "engine": "timeline",
  "spec": {}
}
```

The exact lesson embedding contract SHOULD be defined by the OpenEdu Course Specification.

---

# 95. Relationship to Widgets

Existing OpenEdu widgets SHOULD progressively migrate toward Interactive Engines where appropriate.

For example:

```text
core.timeline
        ↓
Timeline Engine

science.label-diagram
        ↓
Diagram / Visual Engine

core.hotspot
        ↓
Visual Engine

core.image-compare
        ↓
Visual Engine
```

Widgets can remain as lightweight presentation primitives.

Interactive Engines represent richer semantic interactions.

---

# 96. Widget vs Engine

A useful distinction:

```text
Widget
  = UI component

Engine
  = semantic interactive system
```

A widget answers:

> How do I display this UI?

An engine answers:

> What does this interactive educational object mean, and how can the learner reason through it?

---

# 97. Long-Term Architecture

The long-term OpenEdu model is:

```text
                         Course
                           │
                         Lesson
                           │
                ┌──────────┴──────────┐
                │                     │
             Content             Activities
                                      │
                                      ▼
                           Interactive Engines
                                      │
          ┌───────────────┬───────────┼──────────────┐
          ▼               ▼           ▼              ▼
       Semantic         State       Events       Accessibility
          │               │           │              │
          └───────────────┴───────────┴──────────────┘
                                      │
                                      ▼
                                   Renderers
```

---

# 98. The Core Abstraction

The deepest abstraction of the Interactive Engine architecture is:

```text
                    SEMANTIC MODEL
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
           Actions       State       Events
              │           │           │
              └───────────┼───────────┘
                          ▼
                     Learner Model
```

The renderer is downstream from this model.

---

# 99. Five Engines, Five Reasoning Spaces

The five initial engines form a coherent educational system:

```text
Visual
  → What does it look like?

GeoMap
  → Where is it?

Chart
  → How does it change or relate quantitatively?

Timeline
  → When did it happen?

Diagram
  → How is it connected?
```

Together:

```text
WHAT
 │
 ├── Visual
 │
WHERE
 │
 ├── GeoMap
 │
HOW MUCH / HOW
 │
 ├── Chart
 │
WHEN
 │
 ├── Timeline
 │
HOW CONNECTED
 │
 └── Diagram
```

These are complementary reasoning spaces rather than five unrelated widgets.

---

# 100. Success Criteria

The Interactive Engine architecture is successful when an AI author can express:

> "Help the learner understand this concept by allowing them to explore these relationships."

and produce:

```text
Valid JSON
      ↓
Validated Semantic Model
      ↓
Interactive Experience
      ↓
Accessible Representation
      ↓
Semantic Events
      ↓
Learner Understanding
```

without writing renderer-specific code.

---

# 101. Final Design Principle

The OpenEdu Interactive Engine should not be thought of as:

> a collection of interactive UI components.

It should be thought of as:

> **a collection of semantic reasoning engines that happen to have visual interfaces.**

The ultimate goal is:

```text
Knowledge
   ↓
Semantic Model
   ↓
Interactive Engine
   ↓
Learner Exploration
   ↓
Interaction
   ↓
Reasoning
   ↓
Understanding
```

And the five initial engines provide five complementary ways for a learner to think:

```text
Visual   → WHAT
GeoMap   → WHERE
Chart    → HOW MUCH / HOW
Timeline → WHEN
Diagram  → HOW CONNECTED
```

This common architecture should remain stable even as the rendering technologies, authoring tools, AI systems, and client platforms evolve.
