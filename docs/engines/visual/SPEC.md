# KnowledgeAssemble Visual Specification
## Normative Schema Specification — v1

**Project:** KnowledgeAssemble Visual Engine  
**Schema:** `VisualSpecification`  
**Version:** `1.0`  
**Status:** Proposed / Normative  
**Canonical format:** JSON  
**File extension:** `.visual.json`

---

# 1. Purpose

The KnowledgeAssemble Visual Specification defines a renderer-independent, semantic, declarative format for describing educational visuals.

A Visual Specification describes:

- what a visual represents
- what semantic objects exist
- how objects relate to each other
- what data they represent
- how they should behave
- how they should be accessible
- how they should be localized
- what visual constraints apply
- which components should construct the visual

It does **not** directly describe SVG XML.

The specification is the canonical source artifact.

```text
.visual.json
     │
     ▼
Schema validation
     │
     ▼
Semantic Scene
     │
     ▼
Layout
     │
     ▼
Renderer
     │
     ▼
SVG / HTML / Canvas / PDF
```

---

# 2. Design Goals

The schema MUST be:

- declarative
- renderer-independent
- semantic
- deterministic
- extensible
- AI-agent-friendly
- human-readable
- machine-validatable
- accessible by default
- localizable
- composable

The schema SHOULD be:

- concise enough for LLMs
- predictable enough for tooling
- expressive enough for interactive educational graphics

---

# 3. Non-Goals

The schema is NOT:

- raw SVG
- an SVG template language
- a React component definition
- a CSS specification
- an animation timeline
- an application state model
- a lesson schema
- an assessment schema
- an analytics schema

Those concerns belong to other layers.

---

# 4. Top-Level Structure

A `VisualSpecification` has the following structure:

The serialized document MUST use the shared Interactive Engine envelope (DESIGN D1). Visual-specific fields live under `content`.

```text
VisualSpecification
│
├── type                  // always "visual"
├── version               // semver of this specification, e.g. "1.0.0"
├── id
├── metadata              // envelope metadata only
├── purpose
├── content               // kind + visual scene (canvas, elements, components, …)
├── layout
├── interaction           // shared action/mode object
├── questions
└── accessibility
```

Minimal valid example:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "content": {
    "kind": "number-line",
    "elements": []
  }
}
```

The former top-level `schemaVersion` field and using `type` for the visual kind (e.g. `"number-line"`) are superseded. Do not copy those forms forward.

---

# 5. JSON Schema Conventions

The canonical machine-readable schema MUST use JSON Schema Draft 2020-12 unless a later project-wide standard is adopted.

The schema MUST reject unknown top-level properties by default.

Extension points are explicitly provided through:

```text
extensions
```

and MAY be used for experimental functionality.

---

# 6. Top-Level Fields

| Field | Required | Type |
|---|---|---|
| `type` | YES | `"visual"` |
| `version` | YES | semver string |
| `id` | YES | identifier |
| `metadata` | NO | envelope metadata |
| `purpose` | NO | envelope purpose (D4) |
| `content` | YES | visual content object |
| `content.kind` | YES | visual kind (see §9) |
| `layout` | NO | envelope layout |
| `interaction` | NO | envelope interaction |
| `questions` | NO | envelope questions |
| `accessibility` | NO | envelope accessibility |

Visual scene fields (`canvas`, `theme`, `data`, `definitions`, `elements`, `components`, `relationships`, visual `interactions`, `localization`, `constraints`, `extensions`) belong under `content`, not at the envelope root.

---

# 7. `version`

Identifies the version of this Visual Specification (DESIGN D1). Same meaning as the shared envelope `version` field.

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "example-01"
}
```

Format: semantic version (`MAJOR.MINOR.PATCH`).

Rules:

- MAJOR changes may introduce breaking changes.
- MINOR changes add backward-compatible functionality.
- Patch versions fix specification mistakes without new capability.

The superseded `schemaVersion` field (`"1.0"`, `"1.1"`) MUST NOT appear in new specifications.

---

# 8. `id`

Stable identifier for the visual.

```json
{
  "id": "fraction-comparison-01"
}
```

Requirements:

- unique within the containing asset context
- deterministic where possible
- lowercase preferred
- kebab-case recommended

Valid:

```text
flower-parts
number-line-0-20
fraction-comparison-01
```

Avoid:

```text
Visual1
random-uuid
generated-at-1728392
```

---

# 9. `content.kind`

The envelope `type` is always `"visual"`. The semantic kind of the visual is `content.kind`.

Initial vocabulary:

```text
illustration
number-line
counting-set
fraction
fraction-circle
fraction-comparison
clock
coordinate-grid
geometry
comparison
```

`VISUAL_KINDS` in `visual-engine/src/schema.ts` is canonical for this list. `generic` and `interactive-scene` are **not** Visual kinds: they appear nowhere in the runtime and are absent from every fixture. The examples in §41 and §59 are forward-looking sketches of a possible future kind and are **not** valid against the current envelope — an `interactive-scene` spec fails `INVALID_SPEC` today. Admitting either name is a SPEC change with its own cases.

`timeline`, `flowchart`, and `label-diagram` as Visual kinds are superseded (DESIGN §15). Use the Timeline or Diagram engines.

The vocabulary is extensible within Visual’s reasoning space.

A component-specific kind MAY be used where a dedicated semantic visual kind exists.

---

# 10. `metadata`

Optional descriptive metadata.

```json
{
  "metadata": {
    "title": "Comparing Fractions",
    "description": "A visual comparison of one-half and three-quarters.",
    "subject": "mathematics",
    "tags": [
      "fraction",
      "comparison"
    ],
    "author": "agent"
  }
}
```

Envelope metadata MAY only use fields defined in `interactive-engine.schema.json` (`title`, `description`, `language`, `locale`, `tags`, `subject`, `educationalLevel`, `estimatedInteractionTime`, `author`). Topic, audience, difficulty, and tool provenance belong in `content` if needed.

Recommended fields:

```text
title
description
subject
topic
tags
audience
difficulty
creator
createdWith
```

Unknown metadata fields SHOULD NOT be added directly.

Use `extensions` for custom metadata.

---

# 11. `canvas`

Defines the target visual context.

```json
{
  "canvas": {
    "width": 800,
    "height": 500,
    "viewBox": {
      "x": 0,
      "y": 0,
      "width": 800,
      "height": 500
    },
    "aspectRatio": "16:10",
    "background": "transparent"
  }
}
```

Fields:

| Field | Required | Type |
|---|---|---|
| `width` | NO | number |
| `height` | NO | number |
| `viewBox` | NO | Bounds |
| `aspectRatio` | NO | string |
| `background` | NO | color/token |

The canonical semantic model SHOULD NOT depend on fixed pixel dimensions.

---

# 12. `canvas.background`

May be:

```text
transparent
theme token
color
```

Examples:

```json
"background": "transparent"
```

or:

```json
"background": "surface.primary"
```

Raw colors MAY be supported for controlled authoring but SHOULD generally be avoided in favor of theme tokens.

---

# 13. `theme`

Defines visual styling.

```json
{
  "theme": {
    "name": "opened u-calm",
    "mode": "light",
    "density": "comfortable"
  }
}
```

Recommended fields:

```text
name
mode
density
overrides
```

Theme controls appearance, not semantics.

---

# 14. `theme.mode`

Allowed values:

```text
light
dark
high-contrast
print
```

Additional modes MAY be added.

---

# 15. `data`

Contains source data used by the visual.

Example:

```json
{
  "data": {
    "fractions": [
      {
        "id": "a",
        "numerator": 1,
        "denominator": 2
      },
      {
        "id": "b",
        "numerator": 3,
        "denominator": 4
      }
    ]
  }
}
```

Data should be semantic rather than presentation-oriented.

Bad:

```json
{
  "x1": 100,
  "x2": 300
}
```

Preferred:

```json
{
  "start": 0,
  "end": 10
}
```

---

# 16. `definitions`

Optional reusable definitions.

```json
{
  "definitions": {
    "colors": {},
    "markers": {},
    "styles": {},
    "symbols": {}
  }
}
```

Definitions MUST NOT become a mechanism for embedding arbitrary SVG.

They exist for reusable semantic structures.

---

# 17. `elements`

Contains explicitly authored semantic elements.

```json
{
  "elements": [
    {
      "id": "number-7",
      "type": "text",
      "role": "number",
      "value": 7
    }
  ]
}
```

Elements represent concrete objects in the visual.

---

# 18. Element Structure

Every element MUST contain:

```text
id
type
```

It MAY contain:

```text
role
data
geometry
style
layout
accessibility
interaction
children
visibility
constraints
extensions
```

Example:

```json
{
  "id": "leaf",
  "type": "shape",
  "role": "diagram-part",
  "data": {
    "label": "leaf"
  }
}
```

---

# 19. Element `type`

Initial primitive types:

```text
group
rect
circle
ellipse
line
polyline
polygon
path
text
arrow
image
```

Educational components SHOULD use:

```text
components
```

rather than creating dozens of primitive types.

---

# 20. Element `role`

Semantic role.

Example:

```json
{
  "id": "number-7",
  "type": "text",
  "role": "number"
}
```

Initial roles:

```text
visual
group
diagram
diagram-part

label
heading
annotation

number
tick
axis
marker

counting-object
fraction
fraction-part

shape
angle
point
line

timeline
timeline-event

option
answer
drop-target
hotspot

selectable
draggable
interactive
```

Roles MUST NOT encode application-specific concepts such as:

```text
react-button
lesson-widget
redux-state
```

---

# 21. Element `data`

Semantic data associated with an element.

Example:

```json
{
  "data": {
    "value": 7,
    "unit": "cm"
  }
}
```

Data SHOULD describe meaning.

---

# 22. Element `geometry`

Optional explicit geometry.

```json
{
  "geometry": {
    "position": {
      "x": 100,
      "y": 200
    },
    "size": {
      "width": 80,
      "height": 40
    }
  }
}
```

Geometry MAY be omitted when the element is generated by a component/layout engine.

---

# 23. Position

```json
{
  "position": {
    "x": 100,
    "y": 200
  }
}
```

Coordinates use the Visual Engine's canonical coordinate system:

```text
origin: top-left
x: →
y: ↓
```

---

# 24. Size

```json
{
  "size": {
    "width": 100,
    "height": 50
  }
}
```

Dimensions MUST be non-negative.

---

# 25. Primitive Shape Examples

## Rectangle

```json
{
  "id": "box",
  "type": "rect",
  "geometry": {
    "position": {
      "x": 20,
      "y": 20
    },
    "size": {
      "width": 200,
      "height": 100
    }
  }
}
```

## Circle

```json
{
  "id": "dot",
  "type": "circle",
  "geometry": {
    "center": {
      "x": 100,
      "y": 100
    },
    "radius": 20
  }
}
```

---

# 26. `style`

Defines semantic visual styling.

Example:

```json
{
  "style": {
    "fill": "accent.primary",
    "stroke": "border.primary",
    "strokeWidth": 2,
    "opacity": 1,
    "radius": "md"
  }
}
```

Styles SHOULD reference theme tokens.

---

# 27. Style Tokens

Recommended categories:

```text
surface.*
text.*
border.*
accent.*
feedback.*
diagram.*
interactive.*
```

Examples:

```text
text.primary
text.secondary
surface.primary
surface.secondary
accent.primary
border.subtle
interactive.focus
feedback.correct
feedback.incorrect
```

---

# 28. Typography

Text elements MAY define:

```json
{
  "style": {
    "typography": {
      "size": "md",
      "weight": "regular",
      "align": "center"
    }
  }
}
```

Avoid raw font-family dependencies in the semantic specification.

---

# 29. `layout`

Defines layout intent.

Example:

```json
{
  "layout": {
    "type": "horizontal",
    "gap": 16,
    "alignment": "center"
  }
}
```

Allowed initial types:

```text
absolute
horizontal
vertical
grid
radial
stack
center
distributed
```

---

# 30. Layout Must Remain Declarative

Bad:

```json
{
  "x": 137,
  "y": 291
}
```

when those values are merely consequences of layout.

Preferred:

```json
{
  "layout": {
    "type": "horizontal",
    "gap": 20
  }
}
```

The layout engine computes coordinates.

---

# 31. `children`

Groups and components MAY contain children.

```json
{
  "id": "fraction",
  "type": "group",
  "role": "fraction",
  "children": [
    {
      "id": "numerator",
      "type": "text",
      "role": "number"
    },
    {
      "id": "denominator",
      "type": "text",
      "role": "number"
    }
  ]
}
```

Children MUST have unique IDs within the visual.

---

# 32. `components`

Components are reusable educational abstractions.

Example:

```json
{
  "components": [
    {
      "id": "fraction-a",
      "type": "fraction-bar",
      "props": {
        "numerator": 1,
        "denominator": 2
      }
    }
  ]
}
```

Components are resolved into semantic scene structures before final rendering.

---

# 33. Component Instance

Structure:

```text
id
type
props
layout
style
accessibility
interaction
```

Example:

```json
{
  "id": "clock-1",
  "type": "clock",
  "props": {
    "hour": 3,
    "minute": 30
  }
}
```

---

# 34. Component Props

Props are component-specific semantic inputs.

Example:

```json
{
  "type": "number-line",
  "props": {
    "min": 0,
    "max": 20,
    "step": 1,
    "highlight": [7]
  }
}
```

Component props MUST be schema validated by the component.

---

# 35. `relationships`

Relationships express semantic connections between elements.

Example:

```json
{
  "relationships": [
    {
      "type": "labels",
      "source": "leaf-label",
      "target": "leaf"
    }
  ]
}
```

Initial relationship types:

```text
labels
points-to
contains
part-of
precedes
follows
compares-with
corresponds-to
belongs-to
associated-with
```

---

# 36. Relationship Structure

```json
{
  "type": "labels",
  "source": "leaf-label",
  "target": "leaf"
}
```

Relationships MUST reference valid IDs.

---

# 37. `interaction` (envelope)

Interaction is declared at the **envelope** level using D5 semantic actions (`DESIGN §7.4`; `interactive-engine.schema.json` `$defs.actionType`). Specifications declare **what the learner may do**, not how the renderer maps pointer or keyboard input.

Example:

```json
{
  "interaction": {
    "mode": "explore",
    "actions": ["select", "focus", "reset"]
  },
  "content": {
    "kind": "number-line",
    "entities": [
      {
        "id": "number-7",
        "interactive": true,
        "acceptsActions": ["select"]
      }
    ]
  }
}
```

Interactive entities MAY declare which D5 actions they accept via `acceptsActions`. The renderer maps pointer activation (click, tap, Enter) to those semantic actions at runtime — that mapping MUST NOT appear in the specification.

Interactions MUST NOT contain executable code.

---

# 38. Renderer input (non-normative)

Pointer, keyboard, and DOM events are **renderer input**. They MUST NOT appear in Visual specifications.

```text
click          → maps to select / deselect / focus / open-annotation (runtime)
pointer.enter  → maps to focus (runtime)
keydown        → maps to select / deselect / step / … (runtime)
```

A click or Enter/Space activation on an already-selected interactive node maps to `deselect` (the selection-capable renderer toggles); the same activation on an unselected node maps to `select`. A selection-capable interactive declares both `select` and `deselect` in `interaction.actions`. Host-side `dispatch()` stays additive and non-toggling — `select` on a selected id is a no-op, `deselect` removes exactly that id.

See `STRUCTURE.md` §25 and the shared contract §15. Authors specify semantic actions only.

---

# 39. Interaction Actions

Visual Engine instances MUST use the **closed D5 action enum** from the shared envelope schema. Superseded names (`highlight`, `show`, `show-explanation`, `annotate`, `play`, …) MUST NOT appear in new specifications.

| Superseded | D5 replacement |
|---|---|
| `highlight` | `select` or `focus` |
| `show-explanation` | `open-annotation` |
| `show` / `hide` | `open-annotation` / `close-annotation` |
| `play` | `play-pause` |

Full enum: DESIGN §7.4 and `interactive-engine.schema.json` `$defs/actionType`.

**Selection toggles.** A selection-capable interactive (an interactive entity or component that accepts `select`) declares **both** `select` and `deselect` in `interaction.actions`. Renderer input maps repeat activation of a selected node to `deselect` (§38), so a declaration that lists only `select` would understate the node's actual behavior. The shared reducer keeps `select` idempotent and additive (repeat `select` is a no-op) and `deselect` membership-removing; the toggle is a renderer-input translation, never a new D5 action.

---

# 40. Interaction Example

Opening an annotation when the learner selects a diagram part:

```json
{
  "interaction": {
    "mode": "explore",
    "actions": ["select", "open-annotation", "close-annotation"]
  },
  "content": {
    "entities": [
      {
        "id": "leaf",
        "interactive": true,
        "acceptsActions": ["select", "open-annotation"],
        "annotationId": "leaf-explanation"
      }
    ]
  }
}
```

The Visual Engine declares the semantic contract. The host renders explanation UI when it receives namespaced result events (e.g. `visual.leaf-selected`).

---

# 41. Drag-and-Drop

Drag-and-drop uses D5 manipulation actions on the envelope:

```json
{
  "interaction": {
    "mode": "construct",
    "actions": ["drag", "drop", "place", "reset"]
  },
  "content": {
    "kind": "interactive-scene",
    "elements": [
      { "id": "apple-1", "role": "draggable", "acceptsActions": ["drag"] },
      { "id": "fruit-bin", "role": "drop-target", "acceptsActions": ["drop"] }
    ]
  }
}
```

The renderer translates pointer drag gestures to `drag` / `drop` actions. Drop validation belongs to the engine reducer and host.

---

# 42. `accessibility`

Defines accessibility metadata.

Example:

```json
{
  "accessibility": {
    "label": "Parts of a flower",
    "description": "A labelled diagram showing the main parts of a flower.",
    "readingOrder": [
      "title",
      "flower",
      "petal",
      "stigma",
      "stem",
      "root"
    ]
  }
}
```

---

# 43. Accessibility Fields

Recommended:

```text
label
description
role
readingOrder
instructions
alternativeRepresentation
```

---

# 44. Accessibility `label`

Short accessible name.

Example:

```text
"Number line from zero to ten"
```

---

# 45. Accessibility `description`

Longer description.

Example:

```text
"A horizontal number line from zero to ten with seven highlighted."
```

---

# 46. Accessibility `readingOrder`

Defines semantic reading order.

```json
{
  "readingOrder": [
    "title",
    "axis",
    "number-0",
    "number-1",
    "number-2"
  ]
}
```

The renderer SHOULD preserve this order where the target format supports it.

---

# 47. Alternative Representation

A visual MAY provide structured non-visual information.

Example:

```json
{
  "alternativeRepresentation": {
    "type": "structured-text",
    "content": [
      "Number line starts at 0.",
      "Number line ends at 10.",
      "Number 7 is highlighted."
    ]
  }
}
```

This creates a path toward accessible non-visual renderers.

---

# 48. `localization`

Localization defines translatable content.

Example:

```json
{
  "localization": {
    "locale": "en-IN",
    "strings": {
      "flower.title": "Parts of a Flower",
      "flower.petals": "Petals"
    }
  }
}
```

For reusable assets, localization keys SHOULD be preferred over embedded strings.

---

# 49. Localization Key

Example:

```json
{
  "text": {
    "key": "science.flower.petals"
  }
}
```

The renderer receives the actual locale and resolves the key.

---

# 50. Text Representation

Text SHOULD support:

```json
{
  "text": {
    "key": "fraction.oneHalf"
  }
}
```

or:

```json
{
  "text": {
    "value": "1/2"
  }
}
```

Keys are preferred for human-language content.

---

# 51. `constraints`

Constraints express requirements the layout/rendering engine must satisfy.

Example:

```json
{
  "constraints": {
    "minimumTextSize": 16,
    "keepLabelsInsideCanvas": true,
    "avoidOverlap": true,
    "minimumTouchTarget": 44
  }
}
```

Initial constraints:

```text
minimumTextSize
minimumTouchTarget
keepLabelsInsideCanvas
avoidOverlap
preserveAspectRatio
maximumComplexity
```

---

# 52. Constraint Priority

Constraints SHOULD support priority.

```json
{
  "type": "avoid-overlap",
  "priority": "required"
}
```

Priority levels:

```text
required
preferred
optional
```

If a required constraint cannot be satisfied, validation MUST fail.

---

# 53. Element Visibility

Elements MAY define:

```json
{
  "visibility": {
    "default": "visible"
  }
}
```

Allowed values:

```text
visible
hidden
```

Conditional visibility belongs to the consuming interaction/runtime layer unless it is purely visual.

---

# 54. Extensions

Experimental or domain-specific data belongs under:

```json
{
  "extensions": {
    "example.org/custom": {}
  }
}
```

Extensions MUST NOT silently change core semantics.

Stable extensions may eventually be promoted into the core schema.

---

# 55. Generic Visual Example

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "flower-diagram-01",
  "metadata": {
    "title": "Parts of a Flower",
    "subject": "science"
  },
  "content": {
    "kind": "illustration",
    "topic": "plants",
    "canvas": {
      "aspectRatio": "4:3"
    },
    "theme": {
      "name": "openedu-calm"
    },
    "elements": [
      {
        "id": "flower",
        "type": "group",
        "role": "diagram"
      },
      {
        "id": "petal-label",
        "type": "text",
        "role": "label",
        "text": {
          "key": "flower.petal"
        }
      }
    ],
    "relationships": [
      {
        "type": "labels",
        "source": "petal-label",
        "target": "flower"
      }
    ]
  },
  "accessibility": {
    "label": "Parts of a flower",
    "description": "A diagram showing the main parts of a flower."
  }
}
```

---

# 56. Number Line Component

Canonical example:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "content": {
    "kind": "number-line",
    "components": [
      {
        "id": "line",
        "type": "number-line",
        "props": {
          "min": 0,
          "max": 10,
          "step": 1,
          "highlight": [7]
        }
      }
    ]
  },
  "accessibility": {
    "label": "Number line from zero to ten",
    "description": "Number seven is highlighted."
  }
}
```

The component is responsible for creating:

```text
axis
ticks
numbers
highlight
semantic IDs
```

---

# 57. Fraction Component

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "fraction-3-4",
  "content": {
    "kind": "fraction",
    "components": [
      {
        "id": "fraction",
        "type": "fraction-bar",
        "props": {
          "numerator": 3,
          "denominator": 4
        }
      }
    ]
  },
  "accessibility": {
    "label": "Three quarters",
    "description": "A fraction divided into four equal parts, with three parts represented."
  }
}
```

---

# 58. Label Diagram Component

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "flower-01",
  "content": {
    "kind": "illustration",
    "components": [
      {
        "id": "flower",
        "type": "flower-diagram",
        "props": {
          "parts": [
            "petal",
            "stigma",
            "anther",
            "stem",
            "root"
          ]
        }
      }
    ]
  }
}
```

---

# 59. Generic Interactive Scene

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "sorting-scene-01",
  "content": {
    "kind": "interactive-scene",
    "elements": [
      {
        "id": "apple-1",
        "type": "circle",
        "role": "draggable"
      },
      {
        "id": "fruit-bin",
        "type": "rect",
        "role": "drop-target",
        "acceptsActions": ["drop"]
      }
    ]
  },
  "interaction": {
    "mode": "construct",
    "actions": ["drag", "drop", "reset"]
  }
}
```

---

# 60. Semantic Data vs Presentation Data

This distinction is mandatory.

Semantic:

```json
{
  "numerator": 3,
  "denominator": 4
}
```

Presentation:

```json
{
  "x": 120,
  "y": 80,
  "width": 200
}
```

Agents SHOULD provide semantic information whenever possible.

The engine SHOULD calculate presentation information.

---

# 61. Author Coordinates

Explicit coordinates are allowed when the author genuinely requires spatial positioning.

Example:

```json
{
  "geometry": {
    "position": {
      "x": 100,
      "y": 200
    }
  }
}
```

However:

> Explicit coordinates SHOULD NOT be used to simulate component layout.

---

# 62. Generated vs Authored Fields

The schema SHOULD distinguish between:

```text
author intent
```

and:

```text
compiled geometry
```

A Visual Specification MUST NOT contain renderer-generated fields such as:

```text
svgPath
svgAttributes
serializedXml
domNode
```

Those belong to compiled artifacts.

---

# 63. Scene Compilation

Compilation proceeds:

```text
VisualSpecification
       │
       ├── validate
       │
       ▼
Component Expansion
       │
       ▼
Semantic Scene
       │
       ▼
Layout
       │
       ▼
Resolved Scene
       │
       ▼
Renderer
```

The Visual Specification is never mutated into the compiled scene.

---

# 64. Component Expansion

For:

```json
{
  "type": "number-line",
  "props": {
    "min": 0,
    "max": 3
  }
}
```

the component may produce:

```text
number-line
├── axis
├── tick-0
├── label-0
├── tick-1
├── label-1
├── tick-2
├── label-2
├── tick-3
└── label-3
```

All generated IDs MUST be deterministic.

---

# 65. ID Generation

Component-generated IDs SHOULD derive from the parent ID.

Example:

```text
number-line
number-line-axis
number-line-tick-0
number-line-label-0
```

Avoid:

```text
random-id-839203
```

Deterministic IDs are required for:

- tests
- interaction
- accessibility
- analytics
- regeneration

---

# 66. References

References MUST use IDs.

Example:

```json
{
  "source": "leaf-label",
  "target": "leaf"
}
```

References to nonexistent IDs are validation errors.

---

# 67. Units

The semantic schema SHOULD avoid hard-coded units where possible.

For physical measurement components, units SHOULD be explicit.

Example:

```json
{
  "value": 10,
  "unit": "cm"
}
```

Initial supported units may include:

```text
mm
cm
m
km
g
kg
ml
l
s
min
h
```

Unit conversion belongs to the component/data layer.

---

# 68. Mathematical Values

Mathematical values SHOULD use structured representations when precision matters.

Example:

```json
{
  "fraction": {
    "numerator": 1,
    "denominator": 3
  }
}
```

Do not rely on:

```json
{
  "value": 0.3333333333333333
}
```

for exact mathematical concepts.

---

# 69. Numeric Precision

The engine SHOULD avoid floating-point assumptions for educational mathematics.

For example:

```text
1/3
```

should remain a rational representation.

The renderer can calculate its visual representation.

---

# 70. Color

Colors SHOULD be semantic tokens.

Preferred:

```json
{
  "fill": "accent.primary"
}
```

Allowed for controlled cases:

```json
{
  "fill": "#789ABC"
}
```

Raw color usage SHOULD be validated against theme/accessibility requirements.

---

# 71. Interactive State Styling

The specification MAY define semantic states:

```text
default
hover
focus
selected
correct
incorrect
disabled
dragging
drop-target
```

Example:

```json
{
  "style": {
    "states": {
      "selected": {
        "fill": "interactive.selected"
      }
    }
  }
}
```

---

# 72. State Does Not Belong to the Source Visual

Persistent learner state SHOULD NOT be stored in the Visual Specification.

Bad:

```json
{
  "selected": true
}
```

The visual declares possible states.

The consuming application owns current learner state.

---

# 73. Animation

Animation is explicitly outside v1 core semantics.

The schema MAY reserve:

```textanimation
```

for future versions, but v1 implementations MUST NOT depend on it.

Do not embed:

```textSMIL
CSS animation
JavaScript animation
```

inside Visual Specification v1.

---

# 74. External Assets

External raster/image assets SHOULD be referenced semantically.

Example:

```json
{
  "type": "image",
  "source": {
    "type": "asset",
    "id": "tree-illustration"
  }
}
```

Raw arbitrary URLs SHOULD be prohibited by default.

Asset resolution belongs to the consuming environment.

---

# 75. Security

The schema MUST NOT support:

```textjavascript
event handlers
embedded scripts
arbitrary HTML
javascript: URLs
```

SVG security is a renderer responsibility, but the schema MUST not provide an unsafe escape hatch.

---

# 76. Validation Levels

A Visual Specification can be validated at four levels.

## Level 1 — Schema

Is the JSON structurally valid?

## Level 2 — Semantic

Are referenced roles, components and relationships valid?

## Level 3 — Layout

Can the specification be laid out successfully?

## Level 4 — Accessibility

Does the resulting visual satisfy accessibility requirements?

---

# 77. Required Validation

Every renderer invocation MUST begin with schema validation.

A production build SHOULD also perform:

```text
schema
semantic
layout
accessibility
security
```

validation.

---

# 78. Error Example

```json
{
  "valid": false,
  "errors": [
    {
      "code": "UNKNOWN_REFERENCE",
      "path": "/relationships/0/target",
      "message": "Target 'leaf-2' does not exist."
    }
  ]
}
```

---

# 79. Schema Strictness

Core schema fields SHOULD be strict.

Unknown properties MUST NOT silently become renderer instructions.

This prevents LLM hallucinations such as:

```json
{
  "makeItPretty": true,
  "drawNicely": true,
  "svgMagic": true
}
```

from becoming accidental API contracts.

---

# 80. Agent Authoring Guidelines

AI agents SHOULD follow this order:

```text
1. Identify visual semantic type
2. Search existing component
3. Search existing recipe
4. Define semantic data
5. Define components/elements
6. Define relationships
7. Define interactions
8. Define accessibility
9. Define localization
10. Define visual constraints
11. Validate
```

Agents SHOULD NOT begin by writing coordinates.

---

# 81. Agent Example

User intent:

> Show that 3/4 is greater than 1/2.

Agent should produce conceptually:

```json
{
  "type": "fraction-comparison",
  "components": [
    {
      "id": "one-half",
      "type": "fraction-bar",
      "props": {
        "numerator": 1,
        "denominator": 2
      }
    },
    {
      "id": "three-fourths",
      "type": "fraction-bar",
      "props": {
        "numerator": 3,
        "denominator": 4
      }
    }
  ],
  "relationships": [
    {
      "type": "compares-with",
      "source": "three-fourths",
      "target": "one-half"
    }
  ]
}
```

The agent does NOT need to calculate SVG coordinates.

---

# 82. Component Discovery

The schema itself SHOULD remain small.

Educational complexity should live in registered components.

Example component registry:

```text
number-line
counting-set
fraction-bar
fraction-circle
clock
coordinate-grid
geometry-shape
timeline
label-diagram
flowchart
comparison
```

Components expose their own prop schemas.

---

# 83. Component Registry Contract

Conceptually:

```ts
interface ComponentDefinition<TProps = unknown> {
  type: string;

  schema: JSONSchema;

  create(
    props: TProps,
    context: ComponentContext
  ): SceneNode;

  capabilities?: {
    interactive?: boolean;
    localizable?: boolean;
    accessible?: boolean;
  };
}
```

---

# 84. Component Capabilities

A component MAY declare:

```text
interactive
localizable
responsive
accessible
animatable
```

Example:

```json
{
  "capabilities": {
    "interactive": true,
    "localizable": true,
    "accessible": true
  }
}
```

This registry metadata is implementation-level and need not be embedded in every Visual Specification.

---

# 85. Composition Rules

Components MAY contain:

```text
primitive elements
other components
groups
relationships
```

Circular component composition MUST be rejected.

Example invalid:

```text
A
 ↓
B
 ↓
A
```

---

# 86. Responsive Constraints

A visual MAY define preferred aspect ratios and minimum dimensions.

Example:

```json
{
  "constraints": {
    "minimumWidth": 320,
    "minimumHeight": 200,
    "preserveAspectRatio": true
  }
}
```

The renderer may adapt geometry to available space.

---

# 87. Touch Targets

Interactive objects intended for touch SHOULD declare or inherit:

```text
minimumTouchTarget: 44
```

The exact accessibility standard used by the project should be documented separately.

The layout engine SHOULD expand hit regions without unnecessarily changing visual geometry.

---

# 88. Hit Regions

An interactive object MAY define:

```json
{
  "interaction": {
    "hitArea": {
      "padding": 8
    }
  }
}
```

The hit area is not necessarily visible.

---

# 89. Semantic vs Visual Grouping

A group can be semantic:

```json
{
  "role": "fraction"
}
```

or purely organizational:

```json
{
  "type": "group"
}
```

Semantic groups MUST have meaningful roles.

Purely structural groups SHOULD NOT unnecessarily appear in accessibility reading order.

---

# 90. Reading Order Rules

If `readingOrder` is omitted, the engine SHOULD derive reading order from:

1. explicit semantic ordering
2. component semantics
3. document order
4. spatial order as fallback

Spatial order MUST NOT be the only semantic mechanism.

---

# 91. Relationships and Accessibility

Relationships such as:

```text
labels
points-to
part-of
```

should help generate accessible descriptions.

For example:

```text
leaf-label → labels → leaf
```

may produce:

```text
"Leaf: a green structure attached to the stem."
```

The engine SHOULD NOT invent educational facts.

It can describe structural relationships.

---

# 92. Metadata vs Accessibility

`metadata.description` describes the asset for systems/authors.

`accessibility.description` describes the visual to learners/assistive technology.

They MAY be identical but are conceptually distinct.

---

# 93. Versioned Component Schemas

Components SHOULD be independently versioned where necessary.

Example:

```text
number-line@1
fraction-bar@1
clock@1
```

A component breaking change SHOULD NOT silently alter old visual specifications.

---

# 94. Rendering Context

Rendering SHOULD receive a separate context object.

Example:

```ts
interface RenderContext {
  locale: string;
  theme: VisualTheme;
  viewport: Viewport;
  renderer: string;
}
```

The Visual Specification should not contain runtime context.

---

# 95. Example Full Specification

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "fraction-comparison-01",
  "metadata": {
    "title": "Comparing One Half and Three Quarters",
    "subject": "mathematics",
    "tags": [
      "fractions",
      "comparison"
    ]
  },
  "content": {
    "kind": "fraction-comparison",
    "topic": "fractions",
    "canvas": {
      "aspectRatio": "16:9"
    },
    "theme": {
      "name": "openedu-calm",
      "mode": "light",
      "density": "comfortable"
    },
    "components": [
      {
        "id": "one-half",
        "type": "fraction-bar",
        "props": {
          "numerator": 1,
          "denominator": 2
        }
      },
      {
        "id": "three-fourths",
        "type": "fraction-bar",
        "props": {
          "numerator": 3,
          "denominator": 4
        }
      }
    ],
    "relationships": [
      {
        "type": "compares-with",
        "source": "three-fourths",
        "target": "one-half"
      }
    ],
    "constraints": {
      "avoidOverlap": true,
      "keepLabelsInsideCanvas": true,
      "minimumTouchTarget": 44
    }
  },
  "interaction": {
    "mode": "compare",
    "actions": ["select", "deselect", "reset"]
  },
  "accessibility": {
    "label": "Comparing one half and three quarters",
    "description": "Two fraction bars compare one half and three quarters. Three quarters represents the larger fraction.",
    "focusOrder": [
      "one-half",
      "three-fourths"
    ]
  }
}
```

---

# 96. TypeScript Domain Model

The TypeScript API SHOULD mirror the schema without becoming the schema itself.

Conceptual types:

```ts
export interface VisualSpecification {
  type: "visual";
  version: string;
  id: string;

  metadata?: VisualMetadata;
  purpose?: VisualPurpose;
  content: VisualContent;
  layout?: LayoutSpec;
  interaction?: InteractionSpec;
  questions?: QuestionSpec[];
  accessibility?: AccessibilitySpec;
}

export interface VisualContent {
  kind: string;
  canvas?: CanvasSpec;
  theme?: ThemeSpec;
  data?: Record<string, unknown>;
  definitions?: Definitions;
  elements?: VisualElement[];
  components?: ComponentInstance[];
  relationships?: Relationship[];
  interactions?: Interaction[];
  localization?: LocalizationSpec;
  constraints?: ConstraintSpec;
  extensions?: Record<string, unknown>;
}
```

Runtime types MAY be richer than the serialized schema.

---

# 97. Separation of Public and Internal Models

The project SHOULD maintain:

```text
Serialized Visual Specification
            ↓
        Normalized AST
            ↓
        Semantic Scene
            ↓
        Resolved Scene
```

Do not force the serialized JSON schema to represent every internal rendering detail.

---

# 98. Normalization

Before compilation, the engine MAY normalize:

- defaults
- IDs
- component references
- theme values
- accessibility defaults
- localization references

Normalization MUST NOT change semantic meaning.

---

# 99. Deterministic Compilation

Compilation SHOULD be deterministic.

Given:

```text
same Visual Specification
+
same component versions
+
same theme
+
same locale
+
same engine version
```

the resulting scene SHOULD be equivalent.

---

# 100. Canonical Serialization

When saving a Visual Specification:

- use UTF-8
- use JSON
- use deterministic property ordering where practical
- use two-space indentation for human-authored files
- avoid unnecessary generated fields
- preserve semantic ordering

Canonical serialization is desirable for Git-based workflows.

---

# 101. Git-Friendly Design

Visual Specifications are expected to be committed to source repositories.

Therefore:

- avoid binary source formats
- avoid enormous inline assets
- avoid generated coordinates where possible
- keep ordering stable
- keep IDs stable
- make diffs meaningful

Example Git diff:

```diff
- "numerator": 2
+ "numerator": 3
```

is desirable.

A diff containing thousands of coordinate changes for a semantic change is undesirable.

---

# 102. Migration

When schema versions change:

```text
v1 → v2
```

the project SHOULD provide migration functions:

```ts
migrateVisual(spec, "2.0")
```

Migration MUST operate on the semantic source.

Do not migrate generated SVG as the primary strategy.

---

# 103. Compatibility

A Visual Specification MAY declare:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "example-01"
}
```

The engine MUST reject unsupported major versions.

Minor versions SHOULD support backward compatibility where possible.

A `schemaVersion` field without envelope `type`/`version` is invalid.

---

# 104. Validation Rules — Core

At minimum:

1. Envelope `type` MUST be `"visual"` and `version` MUST be a supported semver.
2. `id` must be valid.
3. `content.kind` must be known or explicitly extensible.
4. element IDs must be unique.
5. component IDs must be unique.
6. relationship references must resolve.
7. interaction targets must resolve.
8. reading-order IDs must resolve.
9. component props must validate.
10. required accessibility fields must exist for interactive visuals.

---

# 105. Validation Rules — Semantic

Examples:

```text
fraction denominator != 0
number-line min < max
number-line step > 0
polygon has >= 3 points
clock hour is valid
clock minute is valid
timeline events have ordering
```

These rules belong to component/domain validators.

---

# 106. Validation Rules — Security

Reject or sanitize:

```text
scripts
event-handler attributes
javascript URLs
unsafe external references
arbitrary HTML
```

---

# 107. Validation Rules — Accessibility

For interactive visuals:

- accessible name MUST exist
- interactive targets MUST have stable IDs
- keyboard-accessible intent SHOULD be declared
- touch targets SHOULD meet minimum requirements
- contrast MUST be checked after rendering
- focus state MUST be representable

---

# 108. Extensibility Model

There are three extension levels.

## Level 1 — New Component

Preferred approach.

Example:

```text
solar-system
```

## Level 2 — New Semantic Role

Use when the concept is broadly reusable.

## Level 3 — Schema Extension

Use only when core schema cannot express the requirement.

Agents MUST NOT modify core schema merely to support one component.

---

# 109. Component Example — Future

A future `water-cycle` component might expose:

```json
{
  "id": "water-cycle",
  "type": "water-cycle",
  "props": {
    "stages": [
      "evaporation",
      "condensation",
      "precipitation",
      "collection"
    ],
    "showArrows": true
  }
}
```

The schema itself does not need a special `waterCycle` top-level field.

---

# 110. Why This Schema Is Intentionally Small

The Visual Specification should describe **intent and composition**.

It should not attempt to encode every possible educational domain.

Instead:

```text
Core schema
     +
component registry
     +
recipe system
     +
semantic roles
```

provides the extensibility mechanism.

---

# 111. Recipe Layer

Recipes are one abstraction above Visual Specification.

A recipe MAY generate a Visual Specification.

Example:

```text
"compare two fractions"
       ↓
fraction-comparison recipe
       ↓
Visual Specification
```

The generated specification remains canonical.

Recipes are authoring conveniences, not a replacement for the schema.

---

# 112. AI Agent Contract

AI agents SHOULD be given:

1. schema documentation
2. component registry
3. component prop schemas
4. recipes
5. examples
6. validation errors

The agent should be able to generate a valid Visual Specification without knowing the renderer.

---

# 113. Recommended Agent Prompt Pattern

Conceptually:

```text
You are generating a KnowledgeAssemble Visual Specification.

Rules:
- Use semantic components.
- Do not generate SVG.
- Do not invent schema fields.
- Prefer existing components.
- Prefer semantic values over coordinates.
- Define accessibility.
- Define interactions declaratively.
- Validate before finalizing.
```

---

# 114. What Agents Must Never Put in the Specification

Agents MUST NOT generate:

```text
raw SVG XML
React JSX
DOM nodes
JavaScript callbacks
CSS blocks
browser event handlers
application state
analytics code
router URLs
OpenEdu-specific React components
```

unless a future explicitly defined extension permits it.

---

# 115. OpenEdu Boundary

OpenEdu MAY embed a Visual Specification reference in a lesson.

For example:

```json
{
  "assetType": "visual",
  "asset": "fraction-comparison-01.visual.json"
}
```

The exact OpenEdu lesson schema is outside this specification.

---

# 116. Runtime State Boundary

The Visual Specification describes:

```text
possible interactions
possible states
semantic relationships
```

The learner runtime describes:

```text
current state
selected object
score
attempts
progress
```

Do not mix these concerns.

---

# 117. Analytics Boundary

The Visual Engine may expose semantic IDs useful for analytics.

Example:

```text
fraction-3-4
```

But it MUST NOT implement analytics.

OpenEdu or another consumer may record:

```text
learner selected fraction-3-4
```

---

# 118. Final Data Flow

The complete architecture is:

```text
                     HUMAN / AI
                         │
                         ▼
                Visual Specification
                         │
                         ▼
                  Schema Validator
                         │
                         ▼
                     Normalize
                         │
                         ▼
                 Component Expansion
                         │
                         ▼
                   Semantic Scene
                         │
                         ▼
                     Layout
                         │
                         ▼
               Resolved Semantic Scene
                    │           │
                    │           ▼
                    │      Accessibility
                    │        analysis
                    │
                    ▼
                  Renderer
                    │
             ┌──────┼──────┐
             ▼      ▼      ▼
            SVG    HTML   Canvas
```

---

# 119. Normative Rules Summary

The following rules are mandatory:

1. Visual Specification is the canonical source.
2. SVG is a compiled artifact.
3. Semantic data MUST be separated from presentation geometry.
4. Components MUST be declarative.
5. Interactions MUST be declarative.
6. Interaction contracts MUST NOT contain executable code.
7. IDs MUST be stable and unique.
8. Relationships MUST reference valid IDs.
9. Accessibility MUST be part of the semantic model.
10. Localization MUST be supported without changing semantic geometry.
11. Core schema MUST remain renderer-independent.
12. Core schema MUST remain application-independent.
13. Unknown core fields MUST NOT silently become rendering instructions.
14. Components MUST own domain-specific validation.
15. Renderers MUST NOT invent educational semantics.
16. Runtime state MUST NOT be stored as canonical visual source.
17. Generated SVG MUST NOT become the source of truth.
18. Security validation MUST prevent executable SVG content.
19. Schema versions MUST be explicit.
20. Breaking schema changes require a major version.

---

# 120. Implementation Deliverables

The implementation should produce:

```text
packages/schema/
├── src/
│   ├── types.ts
│   ├── enums.ts
│   ├── validation.ts
│   └── normalization.ts
│
├── schemas/
│   └── visual-spec.v1.json
│
└── tests/
    ├── valid/
    └── invalid/
```

Additionally:

```text
docs/
├── SPEC.md
├── COMPONENT-SPECIFICATION.md
├── INTERACTION-SPECIFICATION.md
└── ACCESSIBILITY-SPECIFICATION.md
```

---

# 121. v1 Scope Boundary

Version 1 MUST support:

```text
metadata
canvas
theme
data
elements
components
relationships
interactions
accessibility
localization
constraints
extensions
```

Version 1 SHOULD NOT include:

```text
animation
runtime state
application logic
assessment logic
analytics
arbitrary SVG
arbitrary HTML
embedded scripts
```

---

# 122. Final Principle

The Visual Specification should answer:

> **"What educational visual should exist?"**

It should NOT answer:

> **"How should an SVG renderer draw every pixel?"**

That distinction is the foundation of the KnowledgeAssemble Visual Engine.

```text
Intent
  ↓
Semantic specification
  ↓
Semantic scene
  ↓
Layout
  ↓
Rendering
```

AI agents operate primarily at the **Intent → Semantic Specification** boundary.

The deterministic Visual Engine owns everything downstream.

This allows KnowledgeAssemble to build a reusable visual infrastructure layer while OpenEdu remains only one consumer of that infrastructure.

---

# Appendix A — Practice Mode (Discovery vs Guided)

## A.1 Modes

| Mode | `interactive` prop | Highlight | Selectable nodes |
|------|-------------------|-----------|-----------------|
| **Guided** | `false` or absent | `highlight` / `highlightedParts` / `highlightHand` / `highlightPoints` / `highlightVertices` / `highlightSides` | Only highlighted subset |
| **Discovery** | `true` | Same props (metadata only) | All candidate nodes |

## A.2 `interactive` prop semantics

Each component accepts the optional `interactive: boolean` prop. When `true`, every structurally valid interaction target for that kind becomes selectable (see A.3 — e.g. number-line labels/ticks, fraction parts, clock hands, grid points). Highlight props still control `metadata` but are not required for interactivity.

### A.2.1 `maxSelection` (counting-set)

The counting-set component accepts the optional `maxSelection: number` prop. It constrains how many objects a learner may select: a `select` that would push the component's selection past `maxSelection` is rejected deterministically with `INVALID_ACTION` (`packages/visual-engine/src/engine.ts`). Absent means unlimited. Enforcement is scoped to the learner-facing `select`/`deselect` actions only — a host `dispatch()` of any other D5 action is never rejected by the cap (ADR-12: the declared action set is an authoring contract, not a runtime access-control list). The validator ranges it to a non-negative integer (`INVALID_SPEC` otherwise). Because renderer input toggles (§39), a counting-set interactive declares both `select` and `deselect` so a learner can undo a pick before the cap is reached. Use case: `cs-pick-n`.

### A.2.2 Selection-driven fraction fill

For `fraction` in discovery mode, fill is **engine-state**, not static emphasis: `state.selection` is the source of truth. Each `select`/`deselect` that touches a `fraction-part` node re-derives `metadata.filled = true` on the selected parts and re-renders the SVG deterministically (identical input → identical SVG). The renderer draws filled parts with a solid fill plus `data-oedu-filled="true"`; unfilled parts keep the translucent stroke-only look. Highlight props (`highlightedParts`) still carry guided-mode emphasis; they do not gate the selection-driven fill. Because renderer input toggles (§39), a discovery-mode fraction interactive declares both `select` and `deselect`, letting a learner un-fill a part. Use case: `fr-shade-n-parts`.

## A.3 Scene node id conventions

| Kind | Shape/Group | Children (guided) | Discovery interactive targets |
|------|-------------|-------------------|-------------------------------|
| `number-line` | `{id}-axis` | `{id}-marker-{v}` (highlighted only) | `{id}-label-{v}` or `{id}-tick-{v}` (when `showLabels: false`) |
| `clock` | `{id}-face` | `{id}-hour-hand`, `{id}-minute-hand`, `{id}-number-{n}` |
| `coordinate-grid` | `{id}-x-axis`, `{id}-y-axis` | `{id}-point-{pointId}`, `{id}-gridline-x-{i}`, `{id}-gridline-y-{i}` |
| `geometry` | `{id}-shape` | `{id}-shape-vertex-{i}`, `{id}-shape-side-{i}` |
| `fraction-circle` | `{id}` | `{id}-sector-{i}`, `{id}-label` |

## A.4 Practice fixtures

See `packages/visual-engine/fixture/*-practice/` and `number-line-identify-marked` for guided and discovery examples, `docs/use-cases/visual.md` for learner scenarios, and `docs/_archive/retired-specs/2026-09-09-visual-engine-practice-mode-spec.md` for the archived full specification.

### A.4.1 Use case `nl-identify-marked`

Discovery fixture `number-line-identify-marked` (`packages/visual-engine/fixture/number-line-identify-marked/`):
- `interactive: true` → labels are interactive targets (not marker circles)
- `highlight: [7]` → `metadata.emphasized: true` on `nl-label-7` (bold text)
- No `{id}-marker-{v}` nodes are emitted in discovery mode