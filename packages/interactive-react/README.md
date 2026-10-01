# @knowledgeassemble/interactive-react

React bindings for the OpenEdu Interactive Engine. Mount engine instances and composed lessons as React components with SVG click interaction.

## Components

### `InteractiveNode`

Mounts a single engine instance as an SVG surface.

```tsx
import { InteractiveNode } from '@knowledgeassemble/interactive-react';

<InteractiveNode
  spec={mySpec}
  engineType="visual"
  host={myBridge}
  controlsMode="learner"  // default: 'learner'
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `spec` | unknown | required | Valid engine spec JSON |
| `engineType` | string | required | `"visual"`, `"chart"`, `"geomap"`, `"timeline"`, `"diagram"` |
| `host` | OpenEduBridge | required | Bridge to host environment |
| `id` | string | spec id | Optional instance id |
| `controlsMode` | `'learner' \| 'dev'` | `'learner'` | `'learner'` = SVG click only; `'dev'` = SVG + labeled button strip |

### `InteractiveLesson`

Mounts a composed lesson (multiple engine instances).

```tsx
import { InteractiveLesson } from '@knowledgeassemble/interactive-react';

<InteractiveLesson
  lesson={composedLesson}
  host={myBridge}
  controlsMode="learner"
/>
```

## SVG interaction contract

`[data-oedu-interactive="true"]` elements are focusable (`tabindex="0"`, applied at runtime by `syncSvgSurface`) and toggle selection via a delegated listener bound to the surface root: a click or Enter/Space keydown on an unselected element dispatches `select`; the same activation on a selected element dispatches `deselect`. Selection state is mirrored onto the element as `data-oedu-selected` and `aria-pressed`. OpenEdu MUST use default `controlsMode="learner"` — the `'dev'` mode is for conformance testing.

## Subpath exports

- `@knowledgeassemble/interactive-react/svg-surface` — raw SVG interaction utilities (`bindSvgInteraction`, `syncSvgSurface`, `applySelectionState`)