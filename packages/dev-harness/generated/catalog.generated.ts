export const catalog = [
  {
    "id": "chart/bar",
    "kind": "engine",
    "engine": "chart",
    "slug": "bar",
    "specPath": "packages/chart-engine/fixture/bar/input.chart.json",
    "golden": {
      "scene": "packages/chart-engine/fixture/bar/expected.scene.json",
      "a11y": "packages/chart-engine/fixture/bar/expected.a11y.json",
      "svg": "packages/chart-engine/fixture/bar/expected.svg"
    },
    "title": "bar"
  },
  {
    "id": "chart/bar-guided-narrow",
    "kind": "engine",
    "engine": "chart",
    "slug": "bar-guided-narrow",
    "specPath": "packages/chart-engine/fixture/bar-guided-narrow/input.chart.json",
    "golden": {
      "scene": "packages/chart-engine/fixture/bar-guided-narrow/expected.scene.json",
      "a11y": "packages/chart-engine/fixture/bar-guided-narrow/expected.a11y.json",
      "svg": "packages/chart-engine/fixture/bar-guided-narrow/expected.svg"
    },
    "title": "bar-guided-narrow"
  },
  {
    "id": "chart/line",
    "kind": "engine",
    "engine": "chart",
    "slug": "line",
    "specPath": "packages/chart-engine/fixture/line/input.chart.json",
    "golden": {
      "scene": "packages/chart-engine/fixture/line/expected.scene.json",
      "a11y": "packages/chart-engine/fixture/line/expected.a11y.json",
      "svg": "packages/chart-engine/fixture/line/expected.svg"
    },
    "title": "line"
  },
  {
    "id": "chart/line-time",
    "kind": "engine",
    "engine": "chart",
    "slug": "line-time",
    "specPath": "packages/chart-engine/fixture/line-time/input.chart.json",
    "golden": {
      "scene": "packages/chart-engine/fixture/line-time/expected.scene.json",
      "a11y": "packages/chart-engine/fixture/line-time/expected.a11y.json",
      "svg": "packages/chart-engine/fixture/line-time/expected.svg"
    },
    "title": "line-time"
  },
  {
    "id": "diagram/concept-map",
    "kind": "engine",
    "engine": "diagram",
    "slug": "concept-map",
    "specPath": "packages/diagram-engine/fixture/concept-map/input.diagram.json",
    "golden": {
      "scene": "packages/diagram-engine/fixture/concept-map/expected.scene.json",
      "a11y": "packages/diagram-engine/fixture/concept-map/expected.a11y.json",
      "alternative": "packages/diagram-engine/fixture/concept-map/expected.alternative.json",
      "svg": "packages/diagram-engine/fixture/concept-map/expected.svg"
    },
    "title": "Simple concept map"
  },
  {
    "id": "diagram/cycle",
    "kind": "engine",
    "engine": "diagram",
    "slug": "cycle",
    "specPath": "packages/diagram-engine/fixture/cycle/input.diagram.json",
    "golden": {
      "scene": "packages/diagram-engine/fixture/cycle/expected.scene.json",
      "a11y": "packages/diagram-engine/fixture/cycle/expected.a11y.json",
      "alternative": "packages/diagram-engine/fixture/cycle/expected.alternative.json",
      "svg": "packages/diagram-engine/fixture/cycle/expected.svg"
    },
    "title": "Simple cycle"
  },
  {
    "id": "diagram/flow",
    "kind": "engine",
    "engine": "diagram",
    "slug": "flow",
    "specPath": "packages/diagram-engine/fixture/flow/input.diagram.json",
    "golden": {
      "scene": "packages/diagram-engine/fixture/flow/expected.scene.json",
      "a11y": "packages/diagram-engine/fixture/flow/expected.a11y.json",
      "alternative": "packages/diagram-engine/fixture/flow/expected.alternative.json",
      "svg": "packages/diagram-engine/fixture/flow/expected.svg"
    },
    "title": "Simple flow"
  },
  {
    "id": "diagram/hierarchy",
    "kind": "engine",
    "engine": "diagram",
    "slug": "hierarchy",
    "specPath": "packages/diagram-engine/fixture/hierarchy/input.diagram.json",
    "golden": {
      "scene": "packages/diagram-engine/fixture/hierarchy/expected.scene.json",
      "a11y": "packages/diagram-engine/fixture/hierarchy/expected.a11y.json",
      "alternative": "packages/diagram-engine/fixture/hierarchy/expected.alternative.json",
      "svg": "packages/diagram-engine/fixture/hierarchy/expected.svg"
    },
    "title": "Simple hierarchy"
  },
  {
    "id": "diagram/water-cycle",
    "kind": "engine",
    "engine": "diagram",
    "slug": "water-cycle",
    "specPath": "packages/diagram-engine/fixture/water-cycle/input.diagram.json",
    "golden": {
      "scene": "packages/diagram-engine/fixture/water-cycle/expected.scene.json",
      "a11y": "packages/diagram-engine/fixture/water-cycle/expected.a11y.json",
      "alternative": "packages/diagram-engine/fixture/water-cycle/expected.alternative.json",
      "svg": "packages/diagram-engine/fixture/water-cycle/expected.svg"
    },
    "title": "Water cycle"
  },
  {
    "id": "geomap/encoding",
    "kind": "engine",
    "engine": "geomap",
    "slug": "encoding",
    "specPath": "packages/geomap-engine/fixture/encoding/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/encoding/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/encoding/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/encoding/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/encoding/expected.svg"
    },
    "title": "Encoding map with 5 regions, 3 breakpoints, categories"
  },
  {
    "id": "geomap/guided-composed",
    "kind": "engine",
    "engine": "geomap",
    "slug": "guided-composed",
    "specPath": "packages/geomap-engine/fixture/guided-composed/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/guided-composed/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/guided-composed/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/guided-composed/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/guided-composed/expected.svg"
    },
    "title": "Guided composed map: select Odisha, then its capital"
  },
  {
    "id": "geomap/india-coastal",
    "kind": "engine",
    "engine": "geomap",
    "slug": "india-coastal",
    "specPath": "packages/geomap-engine/fixture/india-coastal/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/india-coastal/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/india-coastal/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/india-coastal/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/india-coastal/expected.svg"
    },
    "title": "Odisha and the eastern coast (real boundaries)"
  },
  {
    "id": "geomap/linear",
    "kind": "engine",
    "engine": "geomap",
    "slug": "linear",
    "specPath": "packages/geomap-engine/fixture/linear/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/linear/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/linear/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/linear/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/linear/expected.svg"
    },
    "title": "River with interactive segments"
  },
  {
    "id": "geomap/marker",
    "kind": "engine",
    "engine": "geomap",
    "slug": "marker",
    "specPath": "packages/geomap-engine/fixture/marker/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/marker/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/marker/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/marker/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/marker/expected.svg"
    },
    "title": "Marker only"
  },
  {
    "id": "geomap/multi-locate",
    "kind": "engine",
    "engine": "geomap",
    "slug": "multi-locate",
    "specPath": "packages/geomap-engine/fixture/multi-locate/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/multi-locate/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/multi-locate/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/multi-locate/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/multi-locate/expected.svg"
    },
    "title": "Multi-locate: mark the capital, the peak, and the western sea"
  },
  {
    "id": "geomap/odisha-coastal",
    "kind": "engine",
    "engine": "geomap",
    "slug": "odisha-coastal",
    "specPath": "packages/geomap-engine/fixture/odisha-coastal/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/odisha-coastal/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/odisha-coastal/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/odisha-coastal/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/odisha-coastal/expected.svg"
    },
    "title": "Odisha and its coastal neighbours"
  },
  {
    "id": "geomap/overlay",
    "kind": "engine",
    "engine": "geomap",
    "slug": "overlay",
    "specPath": "packages/geomap-engine/fixture/overlay/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/overlay/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/overlay/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/overlay/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/overlay/expected.svg"
    },
    "title": "Overlay with two region layers"
  },
  {
    "id": "geomap/place-memory",
    "kind": "engine",
    "engine": "geomap",
    "slug": "place-memory",
    "specPath": "packages/geomap-engine/fixture/place-memory/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/place-memory/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/place-memory/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/place-memory/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/place-memory/expected.svg"
    },
    "title": "Places of the national movement"
  },
  {
    "id": "geomap/region",
    "kind": "engine",
    "engine": "geomap",
    "slug": "region",
    "specPath": "packages/geomap-engine/fixture/region/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/region/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/region/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/region/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/region/expected.svg"
    },
    "title": "Region only"
  },
  {
    "id": "geomap/route",
    "kind": "engine",
    "engine": "geomap",
    "slug": "route",
    "specPath": "packages/geomap-engine/fixture/route/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/route/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/route/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/route/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/route/expected.svg"
    },
    "title": "Route only"
  },
  {
    "id": "geomap/route-step",
    "kind": "engine",
    "engine": "geomap",
    "slug": "route-step",
    "specPath": "packages/geomap-engine/fixture/route-step/input.geomap.json",
    "golden": {
      "scene": "packages/geomap-engine/fixture/route-step/expected.scene.json",
      "a11y": "packages/geomap-engine/fixture/route-step/expected.a11y.json",
      "alternative": "packages/geomap-engine/fixture/route-step/expected.alternative.json",
      "svg": "packages/geomap-engine/fixture/route-step/expected.svg"
    },
    "title": "Route with scale bar and steps"
  },
  {
    "id": "timeline/events",
    "kind": "engine",
    "engine": "timeline",
    "slug": "events",
    "specPath": "packages/timeline-engine/fixture/events/input.timeline.json",
    "golden": {
      "scene": "packages/timeline-engine/fixture/events/expected.scene.json",
      "a11y": "packages/timeline-engine/fixture/events/expected.a11y.json",
      "svg": "packages/timeline-engine/fixture/events/expected.svg"
    },
    "title": "Events-only test"
  },
  {
    "id": "timeline/independence",
    "kind": "engine",
    "engine": "timeline",
    "slug": "independence",
    "specPath": "packages/timeline-engine/fixture/independence/input.timeline.json",
    "golden": {
      "scene": "packages/timeline-engine/fixture/independence/expected.scene.json",
      "a11y": "packages/timeline-engine/fixture/independence/expected.a11y.json",
      "svg": "packages/timeline-engine/fixture/independence/expected.svg"
    },
    "title": "Indian independence — key events"
  },
  {
    "id": "timeline/periods",
    "kind": "engine",
    "engine": "timeline",
    "slug": "periods",
    "specPath": "packages/timeline-engine/fixture/periods/input.timeline.json",
    "golden": {
      "scene": "packages/timeline-engine/fixture/periods/expected.scene.json",
      "a11y": "packages/timeline-engine/fixture/periods/expected.a11y.json",
      "svg": "packages/timeline-engine/fixture/periods/expected.svg"
    },
    "title": "Periods test"
  },
  {
    "id": "timeline/tracks",
    "kind": "engine",
    "engine": "timeline",
    "slug": "tracks",
    "specPath": "packages/timeline-engine/fixture/tracks/input.timeline.json",
    "golden": {
      "scene": "packages/timeline-engine/fixture/tracks/expected.scene.json",
      "a11y": "packages/timeline-engine/fixture/tracks/expected.a11y.json",
      "svg": "packages/timeline-engine/fixture/tracks/expected.svg"
    },
    "title": "Tracks test"
  },
  {
    "id": "visual/clock",
    "kind": "engine",
    "engine": "visual",
    "slug": "clock",
    "specPath": "packages/visual-engine/fixture/clock/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/clock/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/clock/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/clock/expected.svg"
    },
    "title": "clock"
  },
  {
    "id": "visual/clock-discovery-minute",
    "kind": "engine",
    "engine": "visual",
    "slug": "clock-discovery-minute",
    "specPath": "packages/visual-engine/fixture/clock-discovery-minute/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/clock-discovery-minute/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/clock-discovery-minute/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/clock-discovery-minute/expected.svg"
    },
    "title": "clock-discovery-minute"
  },
  {
    "id": "visual/clock-practice",
    "kind": "engine",
    "engine": "visual",
    "slug": "clock-practice",
    "specPath": "packages/visual-engine/fixture/clock-practice/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/clock-practice/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/clock-practice/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/clock-practice/expected.svg"
    },
    "title": "clock-practice"
  },
  {
    "id": "visual/comparison",
    "kind": "engine",
    "engine": "visual",
    "slug": "comparison",
    "specPath": "packages/visual-engine/fixture/comparison/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/comparison/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/comparison/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/comparison/expected.svg"
    },
    "title": "comparison"
  },
  {
    "id": "visual/coordinate-grid",
    "kind": "engine",
    "engine": "visual",
    "slug": "coordinate-grid",
    "specPath": "packages/visual-engine/fixture/coordinate-grid/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/coordinate-grid/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/coordinate-grid/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/coordinate-grid/expected.svg"
    },
    "title": "coordinate-grid"
  },
  {
    "id": "visual/coordinate-grid-practice",
    "kind": "engine",
    "engine": "visual",
    "slug": "coordinate-grid-practice",
    "specPath": "packages/visual-engine/fixture/coordinate-grid-practice/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/coordinate-grid-practice/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/coordinate-grid-practice/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/coordinate-grid-practice/expected.svg"
    },
    "title": "coordinate-grid-practice"
  },
  {
    "id": "visual/counting-set",
    "kind": "engine",
    "engine": "visual",
    "slug": "counting-set",
    "specPath": "packages/visual-engine/fixture/counting-set/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/counting-set/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/counting-set/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/counting-set/expected.svg"
    },
    "title": "counting-set"
  },
  {
    "id": "visual/fraction",
    "kind": "engine",
    "engine": "visual",
    "slug": "fraction",
    "specPath": "packages/visual-engine/fixture/fraction/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/fraction/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/fraction/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/fraction/expected.svg"
    },
    "title": "fraction"
  },
  {
    "id": "visual/fraction-circle",
    "kind": "engine",
    "engine": "visual",
    "slug": "fraction-circle",
    "specPath": "packages/visual-engine/fixture/fraction-circle/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/fraction-circle/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/fraction-circle/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/fraction-circle/expected.svg"
    },
    "title": "fraction-circle"
  },
  {
    "id": "visual/fraction-comparison",
    "kind": "engine",
    "engine": "visual",
    "slug": "fraction-comparison",
    "specPath": "packages/visual-engine/fixture/fraction-comparison/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/fraction-comparison/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/fraction-comparison/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/fraction-comparison/expected.svg"
    },
    "title": "fraction-comparison"
  },
  {
    "id": "visual/geometry",
    "kind": "engine",
    "engine": "visual",
    "slug": "geometry",
    "specPath": "packages/visual-engine/fixture/geometry/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/geometry/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/geometry/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/geometry/expected.svg"
    },
    "title": "geometry"
  },
  {
    "id": "visual/geometry-discovery-vertex",
    "kind": "engine",
    "engine": "visual",
    "slug": "geometry-discovery-vertex",
    "specPath": "packages/visual-engine/fixture/geometry-discovery-vertex/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/geometry-discovery-vertex/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/geometry-discovery-vertex/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/geometry-discovery-vertex/expected.svg"
    },
    "title": "geometry-discovery-vertex"
  },
  {
    "id": "visual/geometry-practice",
    "kind": "engine",
    "engine": "visual",
    "slug": "geometry-practice",
    "specPath": "packages/visual-engine/fixture/geometry-practice/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/geometry-practice/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/geometry-practice/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/geometry-practice/expected.svg"
    },
    "title": "geometry-practice"
  },
  {
    "id": "visual/illustration",
    "kind": "engine",
    "engine": "visual",
    "slug": "illustration",
    "specPath": "packages/visual-engine/fixture/illustration/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/illustration/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/illustration/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/illustration/expected.svg"
    },
    "title": "illustration"
  },
  {
    "id": "visual/number-line",
    "kind": "engine",
    "engine": "visual",
    "slug": "number-line",
    "specPath": "packages/visual-engine/fixture/number-line/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/number-line/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/number-line/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/number-line/expected.svg"
    },
    "title": "number-line"
  },
  {
    "id": "visual/number-line-compare-distance",
    "kind": "engine",
    "engine": "visual",
    "slug": "number-line-compare-distance",
    "specPath": "packages/visual-engine/fixture/number-line-compare-distance/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/number-line-compare-distance/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/number-line-compare-distance/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/number-line-compare-distance/expected.svg"
    },
    "title": "number-line-compare-distance"
  },
  {
    "id": "visual/number-line-identify-marked",
    "kind": "engine",
    "engine": "visual",
    "slug": "number-line-identify-marked",
    "specPath": "packages/visual-engine/fixture/number-line-identify-marked/input.visual.json",
    "golden": {
      "scene": "packages/visual-engine/fixture/number-line-identify-marked/expected.scene.json",
      "a11y": "packages/visual-engine/fixture/number-line-identify-marked/expected.a11y.json",
      "svg": "packages/visual-engine/fixture/number-line-identify-marked/expected.svg"
    },
    "title": "number-line-identify-marked"
  },
  {
    "id": "chart/skill-example",
    "kind": "engine",
    "slug": "skill-example",
    "engine": "chart",
    "specPath": "docs/fixtures/chart/skill-example.json",
    "title": "skill-example"
  },
  {
    "id": "lesson/narrative-timeline-visual",
    "kind": "composition",
    "slug": "narrative-timeline-visual",
    "specPath": "docs/fixtures/composition/narrative-timeline-visual.json",
    "title": "Timeline drives visual focus (composition smoke test)"
  },
  {
    "id": "lesson/skill-example",
    "kind": "composition",
    "slug": "skill-example",
    "specPath": "docs/fixtures/composition/skill-example.json",
    "title": "Composition skill canonical example"
  },
  {
    "id": "diagram/skill-example",
    "kind": "engine",
    "slug": "skill-example",
    "engine": "diagram",
    "specPath": "docs/fixtures/diagram/skill-example.json",
    "title": "Photosynthesis flow"
  },
  {
    "id": "geomap/skill-example",
    "kind": "engine",
    "slug": "skill-example",
    "engine": "geomap",
    "specPath": "docs/fixtures/geomap/skill-example.json",
    "title": "Odisha and its coastal neighbours"
  },
  {
    "id": "lesson/composed-lesson",
    "kind": "composition",
    "slug": "composed-lesson",
    "specPath": "docs/fixtures/p7/composed-lesson.json",
    "title": "Timeline drives visual focus (composition smoke test)"
  },
  {
    "id": "timeline/skill-example",
    "kind": "engine",
    "slug": "skill-example",
    "engine": "timeline",
    "specPath": "docs/fixtures/timeline/skill-example.json",
    "title": "Indian independence — key events"
  },
  {
    "id": "visual/skill-example",
    "kind": "engine",
    "slug": "skill-example",
    "engine": "visual",
    "specPath": "docs/fixtures/visual/skill-example.json",
    "title": "skill-example"
  }
] as const;
