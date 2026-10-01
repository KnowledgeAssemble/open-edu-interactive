# Educational Visual Engine — AI Authoring Skill


## When to use

Use the Visual Engine when you need to create an interactive educational visualization. The Visual Engine supports these kinds (set `content.kind`):

| Kind | Purpose |
|------|---------|
| `number-line` | Teach number sense, estimation, fractions on a line |
| `counting-set` | Teach counting, cardinality, one-to-one correspondence |
| `fraction` | Teach fractions using a rectangular bar model |
| `fraction-comparison` | Compare two fractions using circle models |
| `clock` | Teach telling time |
| `coordinate-grid` | Teach coordinate systems, plotting points |
| `geometry` | Teach shape recognition, sides, vertices |
| `comparison` | Compare two values (greater-than, less-than, equal) |
| `illustration` | Labeled, selectable/focusable visual entities for narrative scenes |
| `fraction-circle` | Teach fractions using sector wedges in a circle |

## Practice mode

The `interactive` prop on components enables two modes:

| Mode | `interactive` | Highlight prop | Selectable nodes |
|------|---------------|----------------|-----------------|
| **Guided** | `false` or absent | e.g. `highlight`, `highlightedParts`, `highlightHand` | Only the highlighted subset |
| **Discovery** | `true` | Same (metadata only) | All structurally valid targets (per kind; geometry uses `highlight*` to choose shape vs vertices vs sides) |

### Discovery example — number-line

```json
{
  "id": "nl",
  "type": "number-line",
  "props": { "min": 0, "max": 10, "step": 1, "interactive": true, "highlight": [7] }
}
```

**Rule:** In discovery mode, labels (or ticks when `showLabels: false`) become the interactive targets — not marker circles. Each step produces `{parentId}-label-{v}` with `interactive: true`; `highlight` controls `metadata.emphasized` only. Do **not** set `interactive: true` expecting a marker per step — the engine emits label targets instead.

Events: `visual.nl-label-7-selected` (label target, not `nl-marker-7`).

### Guided example — number-line

```json
{
  "id": "nl",
  "type": "number-line",
  "props": { "min": 0, "max": 10, "step": 1, "highlight": [7] }
}
```

Only `nl-marker-7` is interactive. Event: `visual.nl-marker-7-selected`.

### Guided example — clock

```json
{
  "id": "ck",
  "type": "clock",
  "props": { "hour": 3, "minute": 30, "highlightHand": "hour" }
}
```

Only the hour hand `ck-hour-hand` is selectable (event: `visual.ck-hour-hand-selected`).

### Event convention

Every select emits a namespaced event: `visual.{sceneNodeId}-selected`. The `sceneNodeId` follows the pattern:
- `{componentId}-marker-{v}` (number-line guided)
- `{componentId}-label-{v}` (number-line discovery; `{componentId}-tick-{v}` when `showLabels: false`)
- `{componentId}-object-{i}` (counting-set)
- `{componentId}-part-{i}` (fraction bar)
- `{componentId}-sector-{i}` (fraction-circle)
- `{componentId}-hour-hand` / `{componentId}-minute-hand` (clock)
- `{componentId}-point-{pointId}` (coordinate-grid)
- `{componentId}-shape` / `{componentId}-shape-vertex-{i}` / `{componentId}-shape-side-{i}` (geometry)

### fraction-circle props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `numerator` | number | yes | Number of parts to show as selected |
| `denominator` | number | yes | Total number of equal sectors (≥ 2) |
| `highlightedParts` | number[] | no | Sector indices for guided selectivity; visual emphasis only when `interactive: true` |
| `showFraction` | boolean | no | Show "numerator/denominator" label (default true) |
| `allowImproper` | boolean | no | Allow numerator > denominator |
| `interactive` | boolean | no | Enable discovery mode

## Spec structure

Use the shared Interactive Engine envelope (`type: "visual"`, `version`, `id`). All visual content lives under `content`:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "number-line-01",
  "purpose": {
    "learningObjective": "...",
    "interactionGoal": "...",
    "reasoningMode": "identify | compare | estimate | explore"
  },
  "content": {
    "kind": "number-line",
    "components": [
      {
        "id": "nl",
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
    "label": "Short accessible name",
    "description": "Full description for screen readers"
  },
  "interaction": {
    "mode": "explore | identify | construct",
    "actions": ["select", "deselect", "focus", "reset"]
  }
}
```

## Rules

- **Semantic-first:** describe *what*, not pixels. No `x`, `y`, `width`, `height` in spec.
- **D5 actions only:** use `select`, `deselect`, `focus`, `reset`, etc. No `click`, `highlight`, `show`.
- **Selection toggles:** renderer input maps a repeat activation of a selected node to `deselect`, so any interactive that accepts `select` must also declare `deselect` — otherwise the declaration understates the node's real behavior.
- **Accessibility required:** always include `accessibility.label` and `accessibility.description`.
- **Valid component id pattern:** `^[a-zA-Z][a-zA-Z0-9._-]*$`, max 128 chars.
- **No raw colors:** use semantic tokens (`accent.primary`, `surface.primary`, etc.).

## Number-line props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `min` | number | yes | Start of range |
| `max` | number | yes | End of range (must be > min) |
| `step` | number | yes | Interval between ticks (> 0) |
| `showLabels` | boolean | no | Show tick labels (default true) |
| `highlight` | number[] | no | Values to show as interactive markers |

## Validation

Always validate your spec before use. Use the VisualEngine's `validate()` method or run through the full pipeline. Common errors:

- `INVALID_ENTITY` — unknown kind, invalid props (e.g. max <= min)
- `INVALID_REFERENCE` — relationship refers to nonexistent id
- `INVALID_ACTION` — action not in D5 set
- `ACCESSIBILITY_ERROR` — missing labels or color-only meaning

## Example round-trip

This spec should pass validation:

```json
{
  "type": "visual",
  "version": "1.0.0",
  "id": "example-nl",
  "content": {
    "kind": "number-line",
    "components": [
      {
        "id": "nl",
        "type": "number-line",
        "props": { "min": 0, "max": 10, "step": 1, "highlight": [5] }
      }
    ]
  },
  "accessibility": {
    "label": "Number line from 0 to 10",
    "description": "The number 5 is highlighted"
  }
}
```

## Design constraints

- Do NOT include `timeline`, `flowchart`, or `label-diagram` as Visual kinds. Those belong to the Timeline and Diagram engines.
- Do NOT add inline scripts, `on*` event handlers, or `javascript:` URIs.
- Do NOT use wall-clock or random values for layout or IDs.
- Do NOT import `@open-edu/*` or other engine packages from visual-engine code.
