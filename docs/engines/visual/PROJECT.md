# KnowledgeAssemble Visual Engine
## Project & AI Coding-Agent Implementation Specification

**Status:** Proposed  
**Repository:** `knowledgeassemble/visual-engine`  
**Organization:** KnowledgeAssemble  
**Primary language:** TypeScript  
**Initial output:** Semantic SVG  
**License:** Open-source; license to be finalized by KnowledgeAssemble  
**Primary consumer:** OpenEdu  
**Architecture:** Library-first, service-optional

---

# 1. Project Mission

Build an open-source **semantic educational visual engine** that allows humans and AI agents to create accessible, deterministic, interactive educational visuals.

The initial renderer is SVG.

The system MUST NOT be designed as merely an "SVG generator".

The core abstraction is:

> **Educational Visual Specification → Semantic Scene → Rendered Visual**

SVG is the first rendering target.

Future rendering targets MAY include:

- HTML
- Canvas
- PDF
- static images
- accessible non-visual representations
- animated visuals

The system must therefore avoid coupling its semantic model to SVG-specific implementation details.

---

# 2. Primary Problem

AI coding and course-authoring agents frequently need to create visuals such as:

- number lines
- counting objects
- fraction diagrams
- geometric figures
- coordinate grids
- comparison diagrams
- science diagrams
- sorting/matching boards
- interactive learning scenes

**Out of Visual scope (D9):** timelines, labelled diagrams, and flowcharts belong to Timeline and Diagram engines — not Visual components.

Current approaches have several problems:

1. Agents generate fragile raw SVG.
2. Generated SVG has inconsistent visual quality.
3. Accessibility is often forgotten.
4. Interactive elements lack semantic identity.
5. Geometry/layout is frequently incorrect.
6. Different generated visuals have inconsistent styles.
7. There is no reusable educational visual vocabulary.
8. Regeneration is difficult because SVG is treated as the source rather than a compiled artifact.
9. Visuals become tightly coupled to the application rendering implementation.

Visual Engine solves these problems by introducing a structured intermediate representation.

---

# 3. Core Architecture Principle

The canonical source MUST be a structured **Visual Specification**.

```text
Visual Specification
        ↓
Schema Validation
        ↓
Semantic Scene
        ↓
Layout Engine
        ↓
Renderer
        ↓
SVG
```

The generated SVG is a compiled artifact.

It MUST NOT be treated as the canonical source of truth.

Recommended artifact structure:

```text
assets/
  flower.svg
  flower.visual.json
```

Where:

- `flower.visual.json` = canonical visual specification
- `flower.svg` = generated artifact

---

# 4. Design Principles

## 4.1 Semantic First

Every meaningful visual object should have:

- stable ID
- semantic role
- optional educational meaning
- optional accessibility description
- optional interaction contract

Example:

```json
{
  "id": "number-7",
  "role": "number",
  "value": 7,
  "interactive": true
}
```

---

## 4.2 Deterministic Rendering

Given the same:

- visual specification
- renderer version
- theme
- locale

the renderer SHOULD produce deterministic output.

LLMs MAY assist in producing specifications, but MUST NOT be responsible for geometric correctness.

Prefer:

```text
LLM
 ↓
Structured specification
 ↓
Deterministic renderer
```

over:

```text
LLM
 ↓
Raw SVG
```

---

## 4.3 Accessibility by Default

Accessibility is a core feature, not post-processing.

Generated visuals SHOULD support:

- `<title>`
- `<desc>`
- semantic grouping
- meaningful IDs
- ARIA labels where appropriate
- keyboard interaction metadata
- sufficient contrast
- readable text
- reduced visual complexity
- alternative descriptions

Interactive elements MUST have identifiable semantic roles.

---

## 4.4 Educational Semantics

The engine should understand educational concepts rather than only drawing primitives.

For example:

```text
circle
rectangle
line
```

are primitives.

Whereas:

```text
number-line
fraction
clock
counting-set
coordinate-grid
```

are educational components.

---

## 4.5 Renderer Independence

The schema MUST NOT contain unnecessary SVG-specific assumptions.

Bad:

```json
{
  "svgPath": "..."
}
```

Preferred:

```json
{
  "shape": "circle",
  "position": {...},
  "radius": 20
}
```

The renderer decides how this becomes SVG.

---

## 4.6 Agent First

The system must be easy for AI agents to use.

Agents should generally interact with:

```text
visual schemas
components
recipes
tools
validation
```

rather than manually constructing XML.

---

# 5. Target Users

## Primary

### AI Coding Agents

Agents creating course content, lesson activities, widgets, and educational experiences.

---

## Secondary

### Course Authors

Educators using OpenEdu Studio or other authoring environments.

---

## Tertiary

### Developers

Developers integrating educational visuals into applications.

---

# 6. MVP Scope

The MVP MUST include the following.

## 6.1 Core Primitives

Support:

- rectangle
- circle
- ellipse
- line
- polyline
- polygon
- path
- text
- group
- arrow
- image reference where safe and explicitly supported

---

# 7. Layout Engine

Initial layout primitives:

- absolute positioning
- horizontal layout
- vertical layout
- grid
- centered layout
- radial layout
- alignment
- spacing
- padding
- bounding boxes
- basic collision detection

The engine MUST support deterministic label placement.

---

# 8. Educational Components

Visual component library (closed set — DESIGN D9). Ten kinds; `VISUAL_KINDS` in `visual-engine/src/schema.ts` is canonical.

### Mathematics

1. `number-line`
2. `counting-set`
3. `fraction`
4. `fraction-circle`
5. `fraction-comparison`
6. `clock`
7. `coordinate-grid`
8. `geometry`

### General

9. `comparison`
10. `illustration` — geometry-less group of labelled `focus`/`select`-able entities whose picture is host-supplied (`PLAN-P2.5` T0/T3); adds no drawing surface of its own

**Not Visual components:** `timeline`, `label-diagram`, and `flowchart` — use Timeline or Diagram engines.

The component architecture MUST allow additional **Visual-domain** kinds later without absorbing other engines' reasoning spaces.

---

# 9. Example Visual Specification

Example:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "numbers-0-10",
  "content": {
    "kind": "number-line",
    "range": {
      "min": 0,
      "max": 10,
      "step": 1
    },
    "objects": [
      {
        "id": "number-7",
        "role": "number",
        "value": 7,
        "interactive": true
      }
    ],
    "style": {
      "theme": "openedu-calm"
    }
  },
  "accessibility": {
    "label": "Number line from zero to ten",
    "description": "The number seven is highlighted."
  }
}
```

The exact schema MAY evolve during implementation.

However, semantic separation between specification and rendering MUST remain.

---

# 10. Interaction Contracts

Visual elements MAY expose which D5 semantic actions they accept. Pointer and keyboard input are mapped to those actions by the renderer at runtime (DESIGN D5) — they MUST NOT appear in specifications.

Example:

```json
{
  "id": "root",
  "role": "diagram-part",
  "interactive": true,
  "acceptsActions": ["select", "open-annotation", "focus"]
}
```

Envelope-level declaration:

```json
{
  "interaction": {
    "mode": "explore",
    "actions": ["select", "open-annotation", "close-annotation", "focus"]
  }
}
```

The Visual Engine MUST NOT contain application-specific React event handlers.

Instead, it exposes semantic interaction contracts.

The consuming application interprets those contracts.

---

# 11. Interaction Roles

Initial roles SHOULD include:

```text
selectable
clickable
draggable
drop-target
hotspot
label
answer
option
group
diagram-part
counting-object
number
fraction
axis
marker
```

The role vocabulary MUST be extensible.

---

# 12. OpenEdu Integration

OpenEdu will be the first major consumer.

The Visual Engine MUST NOT depend on OpenEdu application code.

Instead, OpenEdu integration should occur through:

```text
@knowledgeassemble/visual-schema
@knowledgeassemble/visual-engine
```

or equivalent package names.

OpenEdu MAY add adapters for:

- lesson activities
- widgets
- course assets
- interaction handlers
- learner analytics

Those adapters belong outside the core Visual Engine.

---

# 13. Theme System

The engine MUST support design tokens rather than hard-coded visual styles.

Example:

```json
{
  "theme": "opened u-calm"
}
```

Initial conceptual themes:

```text
opened u-calm
opened u-low-stimulation
opened u-high-contrast
opened u-dark
opened u-print
```

Actual naming MUST be finalized before implementation.

Themes SHOULD control:

- colors
- typography
- stroke widths
- corner radius
- spacing
- interaction states
- label sizes
- visual density

Educational semantics MUST remain independent of themes.

---

# 14. Localization

Visual specifications SHOULD support locale-independent semantics.

Labels SHOULD be representable as localization keys.

Example:

```json
{
  "label": {
    "key": "science.flower.parts.petals"
  }
}
```

The renderer MAY receive:

```text
locale = "en"
```

and resolve localized content.

The geometry should generally remain independent of language.

The layout engine MUST account for text expansion.

---

# 15. Accessibility Validation

The project MUST provide automated validation.

At minimum validate:

### Structure

- valid SVG
- unique IDs
- valid references
- valid viewport
- no broken links

### Accessibility

- title
- description where appropriate
- accessible names for interactive objects
- keyboard metadata where applicable
- contrast
- minimum text size

### Geometry

- objects inside viewport
- text not clipped
- labels not overlapping
- basic collision detection
- invalid dimensions

### Complexity

Warn about:

- excessive node counts
- unnecessary paths
- deeply nested groups
- embedded raster assets
- unsupported SVG features

Validation should produce machine-readable results.

Example:

```json
{
  "valid": false,
  "errors": [
    {
      "code": "LABEL_OVERLAP",
      "objects": [
        "leaf-label",
        "stem-label"
      ]
    }
  ],
  "warnings": []
}
```

---

# 16. Preview Renderer

The project SHOULD provide a way to render SVG previews as PNG/WebP for:

- AI agent inspection
- Studio preview
- automated testing
- visual regression tests

The preview system MUST NOT become the canonical representation.

---

# 17. Visual Regression Testing

Each educational component SHOULD have:

```text
spec
expected SVG
expected preview
```

Tests SHOULD detect unintended changes in:

- layout
- labels
- geometry
- accessibility structure
- theme rendering

---

# 18. Repository Structure

Recommended repository:

```text
visual-engine/
│
├── packages/
│   ├── schema/
│   │   ├── src/
│   │   ├── schemas/
│   │   └── tests/
│   │
│   ├── core/
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── components/
│   │   ├── src/
│   │   │   ├── math/
│   │   │   ├── science/
│   │   │   └── general/
│   │   └── tests/
│   │
│   ├── layout/
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── renderer-svg/
│   │   ├── src/
│   │   └── tests/
│   │
│   ├── validator/
│   │   ├── src/
│   │   └── tests/
│   │
│   └── themes/
│       ├── src/
│       └── themes/
│
├── apps/
│   ├── playground/
│   └── api/
│
├── cli/
│
├── skills/
│   └── educational-visual/
│       ├── SKILL.md
│       ├── components.md
│       ├── schema.md
│       ├── accessibility.md
│       └── examples/
│
├── recipes/
│   ├── mathematics/
│   ├── science/
│   ├── language/
│   └── general/
│
├── docs/
│
├── examples/
│
├── tests/
│   ├── integration/
│   └── fixtures/
│
├── package.json
├── README.md
├── ARCHITECTURE.md
└── PROJECT-SPEC.md
```

The exact monorepo tooling is implementation-dependent.

---

# 19. Package Boundaries

The following boundaries MUST be maintained.

## `schema`

Owns:

- data structures
- schemas
- validation types
- semantic vocabulary

Must have minimal dependencies.

---

## `core`

Owns:

- scene graph
- primitives
- semantic objects
- transformations

Must not depend on a specific renderer.

---

## `components`

Owns:

- educational components
- component specifications
- component defaults

---

## `layout`

Owns:

- positioning
- sizing
- alignment
- collision detection
- label placement

---

## `renderer-svg`

Owns:

- SVG XML generation
- SVG-specific optimization
- SVG accessibility markup

---

## `validator`

Owns:

- structural validation
- accessibility checks
- geometry checks
- complexity checks

---

## `themes`

Owns:

- visual tokens
- theme definitions
- rendering styles

---

# 20. CLI

Provide an initial CLI.

Conceptual commands:

```bash
visual generate visual.json --output flower.svg
visual validate flower.svg
visual preview flower.svg
visual inspect flower.svg
```

The CLI MUST be usable by AI coding agents.

Machine-readable JSON output SHOULD be supported:

```bash
visual validate flower.svg --format json
```

---

# 21. Agent Skill

Create:

```text
skills/educational-visual/SKILL.md
```

The skill should teach agents:

1. When to use Visual Engine.
2. When to reuse an existing visual.
3. How to select an educational component.
4. How to construct a visual specification.
5. How to add semantic IDs.
6. How to define interaction contracts.
7. How to specify accessibility.
8. How to validate the result.
9. How to inspect a preview.
10. How to iterate when validation fails.

Core agent rule:

> Prefer an existing educational component or recipe over manually composing primitives.

Second rule:

> Never generate raw SVG manually when Visual Engine can express the visual.

Third rule:

> Validate every generated visual before committing it.

---

# 22. Recipe System

Recipes provide higher-level reusable visual patterns.

Example:

```text
recipes/
  mathematics/
    comparing-fractions.json
    counting-to-ten.json
    place-value.json

  science/
    labelled-plant.json
    water-cycle.json

  general/
    process-flow.json
    comparison.json
```

A recipe SHOULD define:

- required inputs
- optional inputs
- component composition
- layout
- accessibility defaults
- interaction defaults

Recipes are declarative.

---

# 23. Asset Reuse

Before generating a new visual, agents SHOULD be able to search existing assets.

Conceptual pipeline:

```text
Request
  ↓
Search existing assets
  ↓
Existing asset?
  ├── yes → reuse
  │
  └── no
       ↓
   recipe?
       ├── yes → instantiate
       │
       └── no → generate specification
```

This prevents unnecessary duplication.

---

# 24. AI Responsibilities

AI MAY be used for:

- interpreting natural-language visual requirements
- selecting components
- creating specifications
- composing components
- selecting recipes
- generating descriptions
- suggesting labels
- explaining validation failures

AI MUST NOT be the sole source of truth for:

- geometric calculations
- coordinate correctness
- SVG syntax
- accessibility validation
- collision detection
- deterministic rendering

---

# 25. Optional AI Service

An HTTP API MAY be added after the core library stabilizes.

Conceptual endpoints:

```text
POST /visuals/generate
POST /visuals/validate
POST /visuals/preview
POST /visuals/inspect
GET  /components
GET  /recipes
```

The API MUST be a thin wrapper over the core libraries.

Business/application logic MUST NOT be duplicated in the API layer.

---

# 26. Security

The renderer MUST treat external content as untrusted.

SVG generation MUST prevent:

- arbitrary script injection
- event-handler injection
- unsafe external resource loading
- malicious SVG constructs
- JavaScript URLs
- unsafe embedded HTML

Generated SVG should be safe to render in a browser under the intended OpenEdu security model.

---

# 27. Performance

MVP goals:

- deterministic generation
- fast generation for normal educational diagrams
- no unnecessary dependencies
- small runtime footprint
- tree-shakeable packages where practical

The renderer SHOULD support server-side and browser-side execution where practical.

---

# 28. Testing Strategy

Every component requires:

### Unit tests

Test:

- schema
- geometry
- layout
- rendering
- accessibility

### Snapshot tests

Test:

- generated SVG structure

### Visual tests

Test:

- rendered preview

### Validation tests

Test known invalid inputs.

### Property tests where useful

Examples:

```text
fraction denominator > 0
number-line min < max
clock hour within valid range
polygon has >= 3 points
```

---

# 29. Documentation

Required documentation:

```text
README.md
ARCHITECTURE.md
SCHEMA.md
COMPONENTS.md
THEMES.md
ACCESSIBILITY.md
AGENT-GUIDE.md
CONTRIBUTING.md
```

Every educational component MUST have:

- purpose
- schema
- example
- rendered example
- accessibility behavior
- interaction behavior
- limitations

---

# 30. Playground

Build a simple developer playground.

It SHOULD provide:

```text
┌──────────────────────────────────────┐
│ Visual Specification                 │
│                                      │
│ { ... }                              │
│                                      │
├──────────────────────────────────────┤
│                                      │
│           Rendered Visual            │
│                                      │
├──────────────────────────────────────┤
│ Validation                           │
│ ✓ Structure                          │
│ ✓ Accessibility                      │
│ ✓ Geometry                           │
└──────────────────────────────────────┘
```

The playground should make developing components significantly easier.

---

# 31. MVP Implementation Order

AI coding agents MUST implement in this order unless there is a documented reason to deviate.

## Phase 1 — Foundation

Implement:

- repository setup
- TypeScript configuration
- package boundaries
- schema package
- primitive scene model
- basic tests

Do NOT implement AI generation yet.

---

## Phase 2 — SVG Renderer

Implement:

- SVG renderer
- IDs
- groups
- text
- accessibility
- deterministic output
- renderer tests

---

## Phase 3 — Layout

Implement:

- horizontal
- vertical
- grid
- alignment
- spacing
- bounding boxes
- label placement
- basic collision detection

---

## Phase 4 — Educational Components

Implement (closed set — DESIGN D9):

1. number line
2. counting set
3. fraction bar
4. fraction circle
5. clock
6. coordinate grid
7. geometry shape
8. comparison

Each component requires tests and examples. Timeline, label diagram, and flowchart are **not** Phase 4 — see Timeline and Diagram engine phases.

---

## Phase 5 — Validator

Implement:

- SVG validation
- accessibility validation
- geometry validation
- complexity warnings

---

## Phase 6 — Themes

Implement the first OpenEdu-compatible theme plus:

- high contrast
- low stimulation

Do not tightly couple theme implementation to OpenEdu source code.

---

## Phase 7 — CLI

Implement:

```text
generate
validate
preview
inspect
components
recipes
```

---

## Phase 8 — Agent Skill

Create the complete:

```text
educational-visual/SKILL.md
```

and examples.

---

## Phase 9 — Playground

Build the visual development environment.

---

## Phase 10 — OpenEdu Integration

Create a small integration proof:

```text
OpenEdu course
      ↓
Author Agent
      ↓
Visual Engine
      ↓
visual.json
      ↓
SVG
      ↓
OpenEdu lesson
```

Only after this integration works should an API/service become a priority.

---

# 32. Explicit Non-Goals for MVP

Do NOT initially build:

- general-purpose image generation
- text-to-image generation
- automatic SVG tracing/vectorization
- complex animation engine
- 3D rendering
- video generation
- full design editor
- Figma replacement
- complete diagramming application
- cloud asset marketplace
- user accounts
- billing
- multi-tenant SaaS infrastructure

These MAY be considered later.

---

# 33. Future Architecture

The long-term architecture should support:

```text
                 Visual Specification
                         │
                 Semantic Scene Graph
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       SVG            Canvas          HTML
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  Rendered Visual
```

Potential future capabilities:

- animation
- responsive visuals
- print rendering
- PDF
- accessible alternate representations
- interactive simulation
- AI-assisted composition
- visual asset marketplace
- community component library

---

# 34. Quality Bar

A component is NOT considered complete merely because it renders.

It is complete only when:

```text
Schema
  ✓

Semantic model
  ✓

Deterministic rendering
  ✓

Accessibility
  ✓

Layout correctness
  ✓

Validation
  ✓

Tests
  ✓

Example
  ✓

Documentation
  ✓
```

---

# 35. AI Coding-Agent Rules

When implementing this repository, coding agents MUST:

1. Read this specification before modifying architecture.
2. Preserve package boundaries.
3. Prefer deterministic algorithms over LLM-generated geometry.
4. Never introduce OpenEdu application dependencies into core packages.
5. Avoid prematurely introducing a hosted service.
6. Add tests with every new component.
7. Add documentation with every public component.
8. Use semantic IDs.
9. Validate generated SVG.
10. Avoid raw SVG generation outside the renderer.
11. Keep the Visual Specification renderer-independent.
12. Prefer composition over duplication.
13. Reuse existing components and recipes.
14. Keep accessibility enabled by default.
15. Do not introduce framework-specific dependencies into core packages without strong justification.
16. Record significant architectural decisions as ADRs.

---

# 36. Definition of Done for MVP

The MVP is complete when an external AI agent can perform:

```text
"Create an interactive visual comparing
1/2 and 3/4."
```

and the system can:

```text
Natural language
      ↓
Visual Specification
      ↓
Schema validation
      ↓
Fraction components
      ↓
Deterministic layout
      ↓
Accessible SVG
      ↓
Validation
      ↓
Preview
```

with no manually written SVG.

The resulting artifact MUST contain:

```text
visual.json
visual.svg
```

and the SVG MUST expose semantic objects that a consuming educational application can interact with.

---

# 37. Strategic Positioning

KnowledgeAssemble Visual Engine should be treated as **shared open infrastructure**, not an OpenEdu internal utility.

OpenEdu is the first flagship consumer.

The long-term objective is:

> **Make it easy for AI agents to create high-quality, accessible, semantic educational visuals without requiring an expert SVG designer.**

The project should therefore optimize for:

```text
Semantic
+
Deterministic
+
Accessible
+
Composable
+
Agent-friendly
+
Open
+
Renderer-independent
```

rather than optimizing primarily for raw image-generation capability.

---

# 38. First Implementation Task

The first coding-agent task is NOT to implement the entire engine.

The first agent should:

1. Create the repository structure.
2. Establish package boundaries.
3. Define the initial Visual Specification schema.
4. Define the semantic vocabulary.
5. Define the primitive scene model.
6. Define renderer interfaces.
7. Define validation interfaces.
8. Create the first ADRs.
9. Implement one end-to-end vertical slice:

```text
number-line specification
        ↓
schema validation
        ↓
layout
        ↓
SVG renderer
        ↓
accessibility validation
        ↓
SVG output
```

Only after that vertical slice passes should the agent expand the component library.

---

# 39. First Vertical Slice

The first successful example should be:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "content": {
    "kind": "number-line",
    "range": {
      "min": 0,
      "max": 10,
      "step": 1
    },
    "highlight": [7]
  },
  "accessibility": {
    "label": "Number line from zero to ten",
    "description": "The number seven is highlighted."
  }
}
```

Expected result:

```text
0 ── 1 ── 2 ── 3 ── 4 ── 5 ── 6 ── 7 ── 8 ── 9 ── 10
                                      ↑
                                  interactive
```

The exact visual design is implementation-dependent.

The semantic behavior is not.

---

# 40. Final Architectural Statement

The project should be understood as:

> **A compiler and runtime foundation for semantic educational visuals.**

Not:

> "An AI that draws SVGs."

The distinction is fundamental.

AI generates intent.

The Visual Engine turns intent into structured semantics.

The renderer turns semantics into graphics.

The validator ensures the result is safe, accessible, and structurally correct.

OpenEdu consumes the resulting visual as an educational asset.