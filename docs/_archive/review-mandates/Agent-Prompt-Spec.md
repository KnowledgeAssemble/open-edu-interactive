# Interactive Engine Architecture Review & Next-Phase Planning

**Status:** Proposed  
**Purpose:** Deep architectural review and preparation for the next implementation phase  
**Primary output:** Updated architecture/documentation + executable next-phase implementation plan  
**Audience:** Architecture agent, senior coding agent, engine implementers, maintainers

---

# 1. Mission

You are acting as a **senior software architect and repository reviewer** for the OpenEdu Interactive Engine project.

Your task is **not** to immediately implement features.

Your task is to thoroughly inspect the existing repository, specifications, design documents, engine contracts, fixtures, tests, and implementation, then determine whether the architecture is ready for the next phase.

The project currently contains multiple independent interactive engines:

- Visual
- GeoMap
- Chart
- Timeline
- Diagram

The project is evolving from an implementation-first architecture toward a **use-case-driven, contract-first interactive learning platform**.

The immediate architectural goal is to establish a clean boundary between:

1. OpenEdu host responsibilities
2. Interactive runtime responsibilities
3. Shared engine infrastructure
4. Engine-specific semantics
5. Rendering implementation
6. Use-case catalogs
7. Fixtures and conformance testing

The review must result in a coherent **architecture vNext** and a detailed implementation plan for the next phase.

---

# 2. Critical instruction

Do **not** assume that existing documentation is internally consistent.

Do **not** blindly preserve the current architecture.

Do **not** redesign the system merely for theoretical elegance.

Instead:

> Determine what architecture is actually required by the current use cases, current implementation, existing contracts, and stated product vision.

Where documents conflict:

1. identify the conflict;
2. determine which artifact should be authoritative;
3. explain the reasoning;
4. update the appropriate documentation;
5. record the decision if it represents an architectural change.

Do not silently reconcile contradictions.

---

# 3. Repository-first investigation

Start by inspecting the repository itself.

Do not rely only on the documents listed below.

Inspect:

```text
/
├── docs/
├── packages/
├── apps/
├── fixtures/
├── tests/
├── scripts/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig*
├── vite.config*
└── other repository configuration
```

Determine the actual structure before proposing changes.

Inspect:

- package dependencies
- package boundaries
- TypeScript project references
- imports between packages
- public exports
- runtime lifecycle
- reducers
- state models
- scene generation
- SVG rendering
- accessibility implementation
- event dispatch
- event subscriptions
- validation
- snapshots
- harnesses
- fixtures
- unit tests
- browser/e2e tests
- build configuration
- package publishing configuration

The implementation is evidence.

If documentation says one thing and code does another, explicitly report the discrepancy.

---

# 4. Mandatory documents to review

Locate and thoroughly review the current versions of:

```text
docs/DESIGN.md

docs/STRUCTURE.md
docs/SYSTEM-ARCHITECTURE.md

docs/use-cases/visual.md
docs/use-cases/geomap.md
docs/use-cases/chart.md
docs/use-cases/diagram.md
docs/use-cases/timeline.md

docs/engines/visual/SPEC.md
docs/engines/visual/VISION.md

docs/engines/geomap/SPEC.md
docs/engines/geomap/VISION.md

docs/engines/chart/SPEC.md
docs/engines/chart/VISION.md

docs/engines/diagram/SPEC.md
docs/engines/diagram/VISION.md

docs/engines/timeline/SPEC.md
docs/engines/timeline/VISION.md

docs/PLAN-P8.md

docs/superpowers/specs/2026-09-10-visual-use-cases-implementation-plan.md
```

Also locate related documents concerning:

- interactive engine architecture
- D5 actions
- D7 boundary
- scene model
- accessibility
- validation
- event contracts
- fixtures
- harnesses
- composition
- package structure
- rendering
- migration plans
- previous architecture decisions
- deprecated specifications

Do not assume the listed paths still exist exactly as written. Search the repository.

---

# 5. Use-case catalogs are a key architectural input

Treat the use-case catalogs as a major source of architectural evidence.

The catalogs establish:

```text
DESIGN principles
       ↓
USE CASE
       ↓
ENGINE SPEC
       ↓
FIXTURE
       ↓
IMPLEMENTATION
       ↓
CONFORMANCE TEST
```

Review whether the repository actually follows this chain.

Pay particular attention to:

- use-case IDs
- interaction modes
- D5 actions
- semantic targets
- event payloads
- snapshots
- accessibility acceptance
- validation acceptance
- fixture naming
- planned vs done status
- engine-specific semantics
- host-owned scoring

Determine whether the current architecture sufficiently supports this workflow.

---

# 6. Establish the real architectural dependency graph

Produce an actual dependency graph from the codebase.

The target direction should be evaluated against something conceptually similar to:

```text
OpenEdu Host
     │
     ▼
Interactive Runtime / Composition
     │
     ▼
Interactive Core
     │
     ├───────────────┬──────────────┬─────────────┬─────────────┐
     ▼               ▼              ▼             ▼             ▼
   Visual          GeoMap         Chart        Timeline      Diagram
```

But do not assume this exact structure is correct.

Determine the minimum shared layer required by all engines.

Identify:

- imports from one engine into another
- shared types that are actually engine-specific
- inappropriate abstractions
- duplicated infrastructure
- leakage of host concerns into engines
- leakage of engine semantics into core
- rendering concerns leaking into runtime
- fixture/test dependencies leaking into production packages

Create a table:

| Dependency | Current | Intended | Problem | Action |
|---|---|---|---|---|

---

# 7. Evaluate the shared core boundary

Determine exactly what belongs in shared infrastructure.

Candidates include:

```text
Engine
EngineInstance
Engine lifecycle
EngineAction
EngineEvent
Event envelope
Snapshot
Scene
Semantic target
Dispatch
Subscribe
Validation infrastructure
Accessibility infrastructure
Runtime utilities
```

Determine which of these are genuinely shared.

Do not create abstractions merely because two engines happen to use similar terminology.

In particular, evaluate whether the following belong in core:

- interaction modes
- data points
- timeline events
- map regions
- graph nodes
- chart measures
- geometry entities
- fraction parts
- visual markers

The default assumption should be:

> Shared mechanics belong in core. Domain meaning belongs in the engine.

Confirm or reject this principle using repository evidence.

---

# 8. Evaluate interaction modes

The current use-case catalogs demonstrate that interaction modes differ by engine.

Examples include:

```text
guided-select
discovery-select
construct-place
explore
display
focus
filter
playback
sequence-walk
```

Determine whether these should be:

- shared runtime concepts,
- engine-specific concepts,
- authoring-level concepts,
- host-level concepts,
- or a combination.

Pay special attention to:

```text
interactive: true
```

Determine whether this is currently overloaded.

Analyze whether the architecture needs a distinction between:

```text
semantic capability
```

and

```text
lesson interaction mode
```

For example:

```text
target can be selected
```

versus:

```text
guided-select lesson
```

Do not add a new abstraction unless the evidence supports it.

---

# 9. Evaluate semantic targets

The catalogs repeatedly depend on stable semantic target IDs.

Examples:

```text
event-1947

rainfall-bar-row-may

temp-point-row-jul

fc-sector-0

coordinate point

geometry side

map region
```

Determine whether a semantic target should be a first-class concept in the shared runtime.

Evaluate a possible conceptual shape:

```ts
interface SemanticTarget {
  id: string;
  role: string;
  label?: string;
  interactive?: boolean;
}
```

Do not blindly implement this shape.

Determine:

- which fields are truly shared
- which fields must remain engine-specific
- how targets relate to scene nodes
- how targets are addressed by D5 actions
- how accessibility derives from targets
- how target IDs are validated
- whether target IDs must be globally unique or only engine-local

---

# 10. Evaluate D5 actions

Review the existing D5 action contract in detail.

Determine whether actions such as:

```text
select
focus
filter
clear-filter
reset
play-pause
step
scrub
```

belong in:

- shared core
- engine-specific action unions
- both

The target architecture should preserve semantic interaction.

For example:

```text
DOM click
   ↓
semantic target
   ↓
D5 select action
   ↓
engine reducer
   ↓
engine event
```

Never introduce raw pointer events into the engine contract merely to simplify implementation.

Evaluate:

- action validation
- target addressing
- invalid action handling
- reducer semantics
- idempotency
- reset behavior
- action/event separation
- snapshot updates
- host dispatching
- keyboard dispatching

---

# 11. Evaluate event contracts

Inspect the actual event implementations.

Compare the semantics of:

```text
visual.*
chart.*
timeline.*
geomap.*
diagram.*
```

Determine whether a shared event envelope is useful.

For example:

```ts
EngineEvent<"timeline.event-selected", TimelineSelection>
```

versus engine-specific event interfaces.

Determine:

- what belongs in a common envelope
- what belongs in engine payloads
- whether event IDs are stable
- whether event payloads are serializable
- whether event payloads expose too much renderer detail
- whether host scoring can rely on stable semantic fields
- whether cross-engine composition can use these events safely

---

# 12. Evaluate snapshot contracts

Inspect all current snapshots.

Determine whether snapshot responsibilities are consistent across engines.

Identify:

- shared state
- engine-specific state
- derived state
- transient state
- playback state
- selection state
- focus state
- filter state

Determine whether snapshots are:

1. public contracts,
2. debugging representations,
3. persistence formats,
4. test fixtures,
5. or a combination.

If they serve multiple purposes, determine whether they need separate concepts.

---

# 13. Evaluate validation architecture

Review the current validation architecture.

The intended conceptual model is:

```text
L1 Contract / envelope
L2 Engine semantic validation
L3 Layout validation
L4 Accessibility validation
```

Determine whether this matches the actual implementation.

For each engine identify:

```text
contract validation
semantic validation
reference validation
layout validation
accessibility validation
runtime validation
```

Determine:

- which validation belongs in schema
- which belongs in engine code
- which belongs in derived scene validation
- which belongs in browser conformance
- which errors are stable public errors
- whether validation happens too late
- whether validation is duplicated

Use the Timeline and Chart validation catalogs as concrete evidence.

---

# 14. Evaluate accessibility architecture

Review the accessibility implementation across engines.

The architecture must support:

- semantic labels
- keyboard interaction
- focus
- accessible names
- SVG title/description
- linear alternatives
- tabular alternatives where appropriate
- no information conveyed solely by color
- semantic interaction targets

Determine whether accessibility is:

```text
engine responsibility
shared runtime responsibility
renderer responsibility
host responsibility
```

The likely answer may be layered.

Document the exact boundary.

Pay special attention to:

```text
SVG semantics
semantic target → aria
keyboard → D5 action
linear alternative
tabular alternative
```

---

# 15. Evaluate rendering architecture

Review the current rendering stack.

Determine whether:

```text
SVG
DOM
Canvas
WebGL
D3
```

are correctly treated as implementation details rather than semantic contracts.

Evaluate the existing role of:

- React
- SVG
- D3
- D3-scale
- D3-time
- D3-geo
- layout utilities
- animation
- browser APIs

Determine whether a shared rendering abstraction is becoming too large.

In particular, evaluate the risk of creating a universal visualization component layer.

The desired architectural principle to test is:

> Engines share runtime infrastructure, not domain visualization semantics.

---

# 16. Evaluate engine isolation

Verify that:

```text
Visual ↛ Chart
Visual ↛ Timeline
Chart ↛ Timeline
GeoMap ↛ Visual
Diagram ↛ Chart
```

and so on.

Engine composition should occur through:

- host composition
- event bus
- semantic links
- public runtime contracts

not direct engine imports.

Inspect actual imports and report violations.

---

# 17. Evaluate cross-engine composition

Timeline already contains the concept:

```text
events[].links
```

with examples such as:

```text
visualEntityId
```

Determine whether this is sufficient.

Evaluate whether cross-engine links should be:

```text
engine-specific metadata
```

or a shared:

```text
semantic reference
```

Determine how a composed lesson should work:

```text
Timeline event selected
       ↓
host/event bus
       ↓
Visual entity focused
```

without:

```text
Timeline → Visual package import
```

Define the architectural rule.

---

# 18. Evaluate the use-case → fixture → test pipeline

Determine whether every important use case can be represented as:

```text
Use-case ID
     ↓
Fixture
     ↓
Expected scene
     ↓
Expected semantic targets
     ↓
Expected actions
     ↓
Expected events
     ↓
Expected snapshot
     ↓
Accessibility assertions
     ↓
Browser conformance
```

Identify missing infrastructure.

Do not turn every fixture into an enormous snapshot.

Determine what should be golden and what should be asserted semantically.

---

# 19. Evaluate the conformance harness

Inspect:

```text
/?engine=visual
/?engine=geomap
/?engine=chart
/?engine=timeline
/?engine=diagram
```

and current test harnesses.

Determine whether the harness provides a reliable engine-independent contract test.

Evaluate whether a shared conformance suite can test:

```text
lifecycle
dispatch
events
snapshot
accessibility
reset
keyboard
linear/tabular alternatives
```

while engine-specific suites test:

```text
semantic correctness
layout
domain validation
```

Recommend the minimum useful shared conformance suite.

---

# 20. Review all five engine maturity levels

Create a matrix:

| Engine | Contract | Runtime | Rendering | Interaction | A11y | Validation | Fixtures | E2E | Use-case coverage |
|---|---|---|---|---|---|---|---|---|---|
| Visual | | | | | | | | | |
| GeoMap | | | | | | | | | |
| Chart | | | | | | | | | |
| Timeline | | | | | | | | | |
| Diagram | | | | | | | | | |

Do not infer maturity from documentation alone.

Use implementation and tests as evidence.

---

# 21. Identify architectural debt

Create an explicit debt register.

Categories:

```text
A. Contract debt
B. Runtime debt
C. Engine-boundary debt
D. Rendering debt
E. Accessibility debt
F. Validation debt
G. Fixture/test debt
H. Documentation debt
I. Package/dependency debt
J. Composition debt
K. AI-authoring debt
```

For every significant issue record:

```text
ID
Problem
Evidence
Impact
Severity
Recommended action
Blocking next phase?
```

Use severity:

```text
P0 — architectural blocker
P1 — should fix before next major feature work
P2 — should fix during next phase
P3 — future improvement
```

---

# 22. Identify unnecessary abstractions

This review must be willing to remove abstractions.

Look specifically for:

- universal visualization models
- generic data models
- generic interaction modes
- generic domain entities
- engine-specific concepts placed in core
- duplicate state representations
- renderer abstractions with no independent value
- unused configuration fields
- props added for symmetry
- compatibility layers that are no longer needed

The rule is:

> Prefer a small shared core plus expressive independent engines over a giant generic abstraction.

---

# 23. Identify missing abstractions

Conversely, identify concepts that are genuinely shared but currently duplicated.

Candidates to investigate:

- engine lifecycle
- action dispatch
- event envelopes
- semantic targets
- focus handling
- keyboard navigation
- accessibility metadata
- snapshot conventions
- validation infrastructure
- conformance testing
- scene traversal
- serialization
- engine registration

Only promote a concept to core when multiple engines genuinely need the same semantics.

---

# 24. AI-agent architecture review

This project is designed to be implemented and extended by AI coding agents.

Review whether the architecture is sufficiently machine-readable.

An agent should be able to determine:

```text
What can I change?
What must I not change?
Which package owns this?
Which contract is authoritative?
Which fixture demonstrates the behavior?
Which tests prove it?
What constitutes completion?
```

Evaluate:

- documentation hierarchy
- canonical source markers
- use-case IDs
- fixture naming
- schema quality
- examples
- ADRs
- implementation plans
- acceptance criteria

Recommend changes that make future agents less likely to invent abstractions or violate boundaries.

---

# 25. Documentation authority model

Determine and document the authority hierarchy.

The expected hierarchy is approximately:

```text
DESIGN.md
    ↓
Use-case catalog
    ↓
Engine SPEC.md
    ↓
Fixture
    ↓
Implementation
```

But verify whether this is correct.

Also identify where:

```text
VISION.md
SYSTEM-ARCHITECTURE.md
STRUCTURE.md
PLAN-P8.md
ADR
```

fit into that hierarchy.

Resolve contradictions.

Create an explicit documentation authority rule.

---

# 26. Architecture decisions

After completing the review, produce an architectural decision list.

For each decision:

```text
Decision ID
Title
Context
Options considered
Decision
Reasoning
Consequences
Affected files
```

Important decisions to explicitly evaluate:

1. Shared core boundary
2. Engine isolation
3. Interaction mode ownership
4. Semantic target model
5. D5 action model
6. Event model
7. Snapshot model
8. Validation layers
9. Accessibility ownership
10. Rendering boundary
11. D3 usage
12. Cross-engine composition
13. Fixture/conformance architecture
14. Package structure
15. AI-agent documentation contract

Use ADRs if the repository already has an ADR convention.

---

# 27. Produce architecture vNext

After the review, propose a concrete target architecture.

It must include:

## 27.1 Logical architecture

```text
OpenEdu Host
      │
      ▼
Composition / Engine Runtime
      │
      ▼
Interactive Core
      │
      ├── Visual
      ├── GeoMap
      ├── Chart
      ├── Timeline
      └── Diagram
```

Modify this if repository evidence indicates a better structure.

## 27.2 Package architecture

Show exact package responsibilities.

Example:

```text
packages/
  interactive-core/
  interactive-react/
  interactive-schema/
  visual-engine/
  geomap-engine/
  chart-engine/
  timeline-engine/
  diagram-engine/
```

Do not create packages unless justified.

## 27.3 Dependency rules

Document allowed and forbidden imports.

## 27.4 Runtime lifecycle

Document:

```text
create
validate
mount
dispatch
reduce
render
emit
snapshot
destroy
```

## 27.5 Interaction flow

Document:

```text
pointer / keyboard
       ↓
semantic target
       ↓
D5 action
       ↓
reducer
       ↓
state
       ↓
render
       ↓
engine event
       ↓
host
```

## 27.6 Composition flow

Document:

```text
engine event
       ↓
composition/event bus
       ↓
host or another engine instance
```

without package coupling.

---

# 28. Do not implement the next phase yet

The output of this task is **architecture and planning**, not the implementation itself.

Do not:

- build major new features
- introduce planned chart kinds
- add GeoMap features
- add Timeline duration support
- add new Visual props
- refactor the entire repository unnecessarily
- perform speculative optimization

Only make small documentation/code changes required to establish the reviewed architecture if explicitly justified.

If a small corrective code change is absolutely necessary to verify an architectural claim, record it separately.

---

# 29. Produce the next-phase implementation plan

The final deliverable must include:

```text
docs/superpowers/specs/<date>-interactive-engine-next-phase-implementation-plan.md
```

The plan must be executable by an AI coding agent without requiring architectural interpretation.

Organize work into phases.

Recommended structure:

```text
N0 — Architecture / contract cleanup
N1 — Core runtime hardening
N2 — Semantic target / interaction consistency
N3 — Validation and accessibility infrastructure
N4 — Engine conformance
N5 — Fixture migration
N6 — Cross-engine composition
N7 — Engine-specific feature work
N8 — Release / package verification
```

Modify these phases based on findings.

---

# 30. Each implementation task must contain

Every task must specify:

```text
Task ID
Goal
Why
Affected packages
Affected files
Dependencies
Exact implementation requirements
Contract impact
Tests required
Fixture required
Acceptance criteria
Non-goals
Risk
```

Example:

```text
### N2.3 — Normalize semantic target contract

Goal:
Establish a minimal shared semantic target representation.

Affected:
packages/interactive-core
packages/chart-engine
packages/timeline-engine

Requirements:
...

Acceptance:
- ...
- ...
- ...

Tests:
- ...
```

---

# 31. Implementation ordering

The plan must identify:

```text
blocking dependencies
parallelizable work
migration work
cleanup work
feature work
```

Do not schedule engine feature work before contract changes it depends on.

Produce a dependency graph such as:

```text
N0
 │
 ├── N1
 │    │
 │    ├── N2
 │    └── N3
 │
 └── N4
      │
      └── N5
           │
           └── N6
                │
                └── N7
```

---

# 32. Definition of Done for the architecture phase

The architecture review is complete only when:

### Documentation

- [ ] Current architecture has been reviewed against implementation.
- [ ] Contradictory documents are identified.
- [ ] Authority hierarchy is explicit.
- [ ] Architecture vNext is documented.
- [ ] Package boundaries are documented.
- [ ] Dependency rules are documented.
- [ ] D5/D7 boundaries are explicit.
- [ ] Engine isolation rules are explicit.
- [ ] Use-case → fixture → test workflow is explicit.

### Contracts

- [ ] Shared runtime contract is clearly defined.
- [ ] Engine-specific semantics are clearly defined.
- [ ] Interaction mode ownership is clear.
- [ ] Semantic target ownership is clear.
- [ ] Event ownership is clear.
- [ ] Snapshot ownership is clear.
- [ ] Validation layers are clear.
- [ ] Accessibility ownership is clear.

### Testing

- [ ] Shared conformance responsibilities are defined.
- [ ] Engine-specific conformance responsibilities are defined.
- [ ] Fixture strategy is defined.
- [ ] Accessibility testing strategy is defined.

### Planning

- [ ] Debt register exists.
- [ ] Architecture decisions are recorded.
- [ ] Next-phase implementation plan exists.
- [ ] Implementation tasks have acceptance criteria.
- [ ] Dependencies and ordering are explicit.
- [ ] Plan is executable by an AI coding agent.

---

# 33. Required final artifacts

Produce or update only the artifacts justified by the review.

At minimum, expect:

```text
docs/SYSTEM-ARCHITECTURE.md
docs/STRUCTURE.md

possibly:
docs/DESIGN.md
docs/ADR/*.md
docs/engines/*/SPEC.md

docs/superpowers/specs/<date>-interactive-engine-next-phase-implementation-plan.md
```

Do not rewrite documents unnecessarily.

Preserve useful existing content.

When updating a document, explain why the change was necessary.

---

# 34. Final review report

At the end, provide a concise architecture review report containing:

## Executive summary

What is good, what is wrong, and what must change.

## Architecture scorecard

```text
Core boundary:       X/10
Engine isolation:    X/10
Contracts:           X/10
Interaction model:   X/10
Events:              X/10
Snapshots:           X/10
Validation:          X/10
Accessibility:       X/10
Fixtures:            X/10
Conformance:         X/10
Composition:         X/10
AI-agent readiness:  X/10
```

Scores must be justified.

## Top architectural changes

List the most important changes in priority order.

## What should NOT change

Explicitly identify stable decisions that should be preserved.

## Debt register

Summarize P0/P1/P2/P3 issues.

## Architecture vNext

Summarize the resulting architecture.

## Next phase

Summarize the implementation sequence and major milestones.

---

# 35. Important engineering principles

Throughout the review, preserve these principles unless repository evidence proves they are wrong:

### Principle 1 — Use cases drive capabilities

Do not add props or abstractions merely for symmetry.

```text
use case
   ↓
acceptance criteria
   ↓
required capability
   ↓
contract
```

### Principle 2 — Semantic interaction

The engine deals with:

```text
select
focus
filter
step
scrub
reset
```

not raw DOM events.

### Principle 3 — D7 remains outside engines

Engines do not own:

```text
correctness
answer keys
scoring
feedback
progression
hints
rewards
```

### Principle 4 — Engine semantics stay inside engines

Do not force:

```text
TimelineEvent
ChartDataPoint
MapRegion
DiagramNode
FractionPart
```

into a universal domain model.

### Principle 5 — Shared mechanics belong in core

Only genuinely shared runtime infrastructure should be promoted into core.

### Principle 6 — Accessibility is part of the contract

Accessibility is not a final polish pass.

### Principle 7 — Fixtures are executable examples

Fixtures should demonstrate real learner scenarios.

### Principle 8 — Documentation is part of the architecture

An AI agent should be able to navigate:

```text
principle
 → use case
 → contract
 → fixture
 → test
 → implementation
```

without guessing.

### Principle 9 — Prefer explicitness over clever abstraction

This project will be extended by many AI coding agents.

Simple, explicit boundaries are preferable to elegant but ambiguous abstractions.

### Principle 10 — Do not prematurely optimize

Correct semantic contracts and conformance come before renderer optimization.

---

# 36. Final instruction to the agent

Before making recommendations, **inspect the repository deeply**.

Before changing contracts, **trace the use cases**.

Before creating abstractions, **prove that multiple engines need them**.

Before deleting abstractions, **verify that no current contract depends on them**.

Before proposing implementation work, **establish the target architecture**.

The desired result is not simply a cleaner documentation set.

The desired result is:

> **A stable Interactive Engine architecture in which five independent semantic engines can evolve rapidly, AI agents can implement new use cases without inventing architecture, OpenEdu retains ownership of educational meaning, and conformance can be demonstrated mechanically through fixtures and tests.**

The next coding phase should begin only after this review and implementation plan are complete.