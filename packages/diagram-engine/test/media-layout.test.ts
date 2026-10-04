import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { validateLayout } from '../src/validation/layout.js';
import { LABEL_ALLOWANCE, NODE_GAP, RADIAL_BOX_MAX } from '../src/layout/fit.js';
import { computeEdgeGeometry } from '../src/layout/edge-geometry.js';
import type { Bounds } from '../src/scene/types.js';
import type { DiagramContent } from '../src/schema.js';

const IDS = ['a', 'b', 'c', 'd', 'e'];
const CANVASES = [
  [1200, 900],
  [800, 600],
  [640, 480],
  [480, 360],
  [400, 300],
] as const;

function mediaNodes(ids: string[]): DiagramContent['nodes'] {
  return ids.map((id) => ({ id, label: id.toUpperCase(), media: { kind: 'figure' as const } }));
}

const CYCLE_5: DiagramContent = {
  kind: 'cycle',
  nodes: mediaNodes(IDS),
  edges: IDS.map((from, i, arr) => ({ from, to: arr[(i + 1) % arr.length]!, relationship: 'leads-to' })),
};

const CHAIN_5: DiagramContent = {
  kind: 'hierarchy',
  nodes: mediaNodes(IDS),
  edges: [
    { from: 'a', to: 'b', relationship: 'contains' },
    { from: 'b', to: 'c', relationship: 'contains' },
    { from: 'c', to: 'd', relationship: 'contains' },
    { from: 'd', to: 'e', relationship: 'contains' },
  ],
};

const FAN_5: DiagramContent = {
  kind: 'hierarchy',
  nodes: mediaNodes(IDS),
  edges: [
    { from: 'a', to: 'b', relationship: 'contains' },
    { from: 'a', to: 'c', relationship: 'contains' },
    { from: 'a', to: 'd', relationship: 'contains' },
    { from: 'a', to: 'e', relationship: 'contains' },
  ],
};

const MAP_5: DiagramContent = {
  kind: 'concept-map',
  nodes: mediaNodes(IDS),
  edges: [
    { from: 'a', to: 'b', relationship: 'leads-to' },
    { from: 'b', to: 'c', relationship: 'leads-to' },
  ],
};

interface Placement {
  id: string;
  bounds: Bounds;
}

function place(content: DiagramContent, strategy: string, width: number, height: number): Placement[] {
  const ctx = { width, height, minTouchTarget: 44, textStyle: 'normal' as const };
  const laidOut = layout(buildScene(content), ctx, strategy);
  const root = laidOut.nodes.find((n) => n.kind === 'diagram')!;
  return root.children
    .filter((n) => n.kind === 'node')
    .map((n) => ({ id: n.metadata!.nodeId as string, bounds: { ...n.bounds! } }));
}

function overlaps(placed: Placement[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]!.bounds;
      const b = placed[j]!.bounds;
      const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) out.push(`${placed[i]!.id}/${placed[j]!.id} ${ox}x${oy}`);
    }
  }
  return out;
}

const TOLERANCE = 10;

function outsideCanvas(placed: Placement[], width: number, height: number): string[] {
  return placed
    .filter(
      (p) =>
        p.bounds.x < -TOLERANCE ||
        p.bounds.y < -TOLERANCE ||
        p.bounds.x + p.bounds.width > width + TOLERANCE ||
        p.bounds.y + p.bounds.height + LABEL_ALLOWANCE > height + TOLERANCE,
    )
    .map((p) => p.id);
}

function issuesFor(content: DiagramContent, strategy: string, width: number, height: number): string[] {
  const ctx = { width, height, minTouchTarget: 44, textStyle: 'normal' as const };
  return validateLayout(layout(buildScene(content), ctx, strategy), ctx).issues.map((i) => i.message);
}

describe('container/descendant overlap', () => {
  // A container legitimately encloses its own subtree, so the overlap rule must
  // only fire between two nodes neither of which contains the other.
  const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' as const };
  const INNER: Bounds = { x: 100, y: 100, width: 150, height: 150 };

  function overlapsFor(mutate: (scene: ReturnType<typeof buildScene>) => void): string[] {
    const scene = layout(buildScene(CYCLE_5), CTX, 'radial');
    mutate(scene);
    return validateLayout(scene, CTX)
      .issues.map((i) => i.message)
      .filter((m) => m.includes('overlap'));
  }

  function nodesOf(scene: ReturnType<typeof buildScene>) {
    return scene.nodes.flatMap((n) => [n, ...n.children]);
  }

  it('a container enclosing its children is not an overlap', () => {
    const found = overlapsFor((scene) => {
      const root = scene.nodes[0]!;
      // Wrap the whole ring; every leaf now sits inside its own ancestor.
      root.bounds = { x: 0, y: 0, width: 800, height: 600 };
    });
    expect(found).toEqual([]);
  });

  it('two sibling nodes that overlap are still reported', () => {
    const found = overlapsFor((scene) => {
      for (const n of nodesOf(scene)) {
        if (n.id === 'node-a' || n.id === 'node-b') n.bounds = INNER;
      }
    });
    // The pair must be named; neighbours of the moved boxes may collide too.
    expect(found.some((m) => m.includes('"node-a"') && m.includes('"node-b"'))).toBe(true);
  });
});

const CASES: Array<[string, DiagramContent, string]> = [
  ['cycle/radial', CYCLE_5, 'radial'],
  ['chain/hierarchical', CHAIN_5, 'hierarchical'],
  ['fan/hierarchical', FAN_5, 'hierarchical'],
  ['map/grid', MAP_5, 'grid'],
];

/**
 * Canvas sizes where the geometry is satisfiable at the 120x65 media floor.
 * Everything below is arithmetically impossible without breaching that floor.
 */
const FEASIBLE: Record<string, Array<[number, number]>> = {
  'cycle/radial': [[1200, 900], [800, 600], [640, 480], [480, 360]],
  'chain/hierarchical': [[1200, 900], [800, 600]],
  'fan/hierarchical': [[1200, 900], [800, 600], [640, 480]],
  'map/grid': [[1200, 900], [800, 600], [640, 480], [480, 360], [400, 300]],
};

const INFEASIBLE: Record<string, Array<[number, number]>> = {
  'cycle/radial': [[400, 300]],
  'chain/hierarchical': [[640, 480], [480, 360], [400, 300]],
  'fan/hierarchical': [[480, 360], [400, 300]],
  'map/grid': [],
};

/**
 * Canvases where a five-node ring still fits square media slots.
 *
 * A square floor of 120x120 needs more vertical room than the shared 120x65
 * floor, so below this threshold the layout falls back to an 11:6 box. Measured
 * boundary: 700x520 is the smallest canvas that still takes a square slot.
 */
const SQUARE_RING: Array<[number, number]> = [
  [1600, 1200],
  [1200, 900],
  [1000, 750],
  [900, 700],
  [800, 600],
  [700, 520],
];

describe('media layout invariants where the geometry allows', () => {
  for (const [name, content, strategy] of CASES) {
    for (const [width, height] of FEASIBLE[name]!) {
      it(`${name} @ ${width}x${height}: no node overlap`, () => {
        expect(overlaps(place(content, strategy, width, height))).toEqual([]);
      });

      it(`${name} @ ${width}x${height}: every node and its label fits the canvas`, () => {
        expect(outsideCanvas(place(content, strategy, width, height), width, height)).toEqual([]);
      });

      it(`${name} @ ${width}x${height}: validates clean`, () => {
        expect(issuesFor(content, strategy, width, height)).toEqual([]);
      });

      // Same-process repetition: catches accidental Set/Map iteration order, not
      // cross-engine float differences. The goldens are the real cross-run guard.
      it(`${name} @ ${width}x${height}: layout is stable across repeated calls`, () => {
        const a = JSON.stringify(place(content, strategy, width, height));
        const b = JSON.stringify(place(content, strategy, width, height));
        expect(a).toBe(b);
      });
    }
  }
});

describe('radial ring spacing', () => {
  /** Smallest axis gap between two boxes; negative means they overlap. */
  function minGap(a: Bounds, b: Bounds): number {
    return Math.max(
      b.x - (a.x + a.width),
      a.x - (b.x + b.width),
      b.y - (a.y + a.height),
      a.y - (b.y + b.height),
    );
  }

  for (const [name, content, strategy] of CASES) {
    if (strategy !== 'radial') continue;
    for (const [width, height] of FEASIBLE[name]!) {
      it(`${name} @ ${width}x${height}: no two boxes crowd each other`, () => {
        const boxes = place(content, strategy, width, height).map((p) => p.bounds);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            // -1 absorbs the Math.round applied to emitted bounds.
            expect(minGap(boxes[i]!, boxes[j]!)).toBeGreaterThanOrEqual(NODE_GAP - 1);
          }
        }
      });

      it(`${name} @ ${width}x${height}: composition is centred in the canvas`, () => {
        const placed = place(content, strategy, width, height);
        const left = Math.min(...placed.map((p) => p.bounds.x));
        const right = Math.max(...placed.map((p) => p.bounds.x + p.bounds.width));
        const top = Math.min(...placed.map((p) => p.bounds.y));
        const bottom = Math.max(...placed.map((p) => p.bounds.y + p.bounds.height + LABEL_ALLOWANCE));
        expect(Math.abs((left + right) / 2 - width / 2)).toBeLessThanOrEqual(2);
        expect(Math.abs((top + bottom) / 2 - height / 2)).toBeLessThanOrEqual(2);
      });
    }
  }
});

describe('media layout never fails silently', () => {
  for (const [name, content, strategy] of CASES) {
    for (const [width, height] of CANVASES) {
      it(`${name} @ ${width}x${height}: any overlap or overflow is reported at L3`, () => {
        const placed = place(content, strategy, width, height);
        const bad = overlaps(placed).length + outsideCanvas(placed, width, height).length;
        const reported = issuesFor(content, strategy, width, height);
        if (bad === 0) {
          expect(reported).toEqual([]);
        } else {
          expect(reported.length).toBeGreaterThanOrEqual(bad);
          expect(reported.length).toBe(bad);
        }
      });
    }
  }
});

describe('radial arrow uniformity', () => {
/**
   * Ceiling on the ratio of the longest to shortest visible arrow in a ring.
   *
   * Centre-to-centre edges were already uniform (1.007 on a 5-node ring) but
   * every arrowhead was buried inside its target node. Anchoring on borders
   * fixes that and introduces the skew: on the pre-existing 220x120 ring at
   * 800x600 the border-anchored arrows are 112/72/64/72/112, a 1.74 ratio. At a
   * fixed ring radius the box aspect is the lever, so ring layouts take square
   * slots (1.55 at 800x600), and this bound locks that in. Measurements are in
   * docs/PLAN-P8.md section 8a.
   */
  const MAX_ARROW_RATIO = 1.7;

  function arrowLengths(content: DiagramContent, width: number, height: number): number[] {
    const ctx = { width, height, minTouchTarget: 44, textStyle: 'normal' as const };
    const root = layout(buildScene(content), ctx, 'radial').nodes.find((n) => n.kind === 'diagram')!;
    const byId = new Map(
      root.children.filter((n) => n.kind === 'node').map((n) => [n.metadata!.nodeId as string, n.bounds!]),
    );
    return content.edges.map((e) => {
      const geo = computeEdgeGeometry(byId.get(e.from)!, byId.get(e.to)!, { width, height });
      const [a, b] = geo.points;
      return Math.hypot(b!.x - a!.x, b!.y - a!.y);
    });
  }

  for (const [width, height] of SQUARE_RING) {
    it(`cycle/radial @ ${width}x${height}: arrows stay visually even`, () => {
      const lens = arrowLengths(CYCLE_5, width, height);
      expect(Math.max(...lens) / Math.min(...lens)).toBeLessThanOrEqual(MAX_ARROW_RATIO);
    });
  }

  it('KNOWN DEBT (T39): below 700x520 the ring falls back to an 11:6 box and skews again', () => {
    for (const [width, height] of [
      [640, 480],
      [480, 360],
      [400, 300],
    ] as const) {
      const lens = arrowLengths(CYCLE_5, width, height);
      expect(Math.max(...lens) / Math.min(...lens)).toBeGreaterThan(MAX_ARROW_RATIO);
    }
  });
});

describe('KNOWN DEBT: media floors out before the geometry is satisfiable', () => {
  for (const [name, content, strategy] of CASES) {
    for (const [width, height] of INFEASIBLE[name]!) {
      it.fails(`${name} @ ${width}x${height} cannot fit media at the 120x65 floor`, () => {
        const placed = place(content, strategy, width, height);
        expect(overlaps(placed)).toEqual([]);
        expect(outsideCanvas(placed, width, height)).toEqual([]);
      });
    }
  }
});

describe('media box sizing', () => {
  it('keeps the largest square media box the ring can carry at 1200x900', () => {
    for (const p of place(CYCLE_5, 'radial', 1200, 900)) {
      expect(p.bounds.width).toBe(RADIAL_BOX_MAX);
      expect(p.bounds.height).toBe(RADIAL_BOX_MAX);
    }
  });

  it('shrinks the media box down to the floor, never below 120x65', () => {
    for (const [width, height] of CANVASES) {
      for (const [, content, strategy] of CASES) {
        for (const p of place(content, strategy, width, height)) {
          expect(p.bounds.width).toBeGreaterThanOrEqual(120);
          expect(p.bounds.height).toBeGreaterThanOrEqual(65);
          expect(p.bounds.width).toBeLessThanOrEqual(220);
          expect(p.bounds.height).toBeLessThanOrEqual(RADIAL_BOX_MAX);
        }
      }
    }
  });

  it('radial media slots are square where the ring has room, so arrows absorb equal chord', () => {
    for (const [width, height] of SQUARE_RING) {
      for (const p of place(CYCLE_5, 'radial', width, height)) {
        expect(p.bounds.width).toBe(p.bounds.height);
      }
    }
  });

  it('square radial slots never exceed the square cap', () => {
    for (const [width, height] of SQUARE_RING) {
      for (const p of place(CYCLE_5, 'radial', width, height)) {
        expect(p.bounds.width).toBeLessThanOrEqual(RADIAL_BOX_MAX);
        expect(p.bounds.height).toBeLessThanOrEqual(RADIAL_BOX_MAX);
      }
    }
  });

  it('non-radial media keeps the 11:6 media aspect ratio within 5%', () => {
    for (const [width, height] of CANVASES) {
      for (const [, content, strategy] of CASES) {
        if (strategy === 'radial') continue;
        for (const p of place(content, strategy, width, height)) {
          const ratio = p.bounds.width / p.bounds.height;
          expect(Math.abs(ratio - 220 / 120)).toBeLessThan(0.05);
        }
      }
    }
  });
});

describe('non-media layouts are untouched', () => {
  const PLAIN: DiagramContent = {
    kind: 'concept-map',
    nodes: IDS.map((id) => ({ id, label: id.toUpperCase() })),
    edges: [
      { from: 'a', to: 'b', relationship: 'leads-to' },
      { from: 'b', to: 'c', relationship: 'leads-to' },
    ],
  };

  const PLAIN_CYCLE: DiagramContent = {
    kind: 'cycle',
    nodes: IDS.map((id) => ({ id, label: id.toUpperCase() })),
    edges: IDS.map((from, i, arr) => ({ from, to: arr[(i + 1) % arr.length]!, relationship: 'leads-to' })),
  };

  it('non-media grid keeps 136x45 boxes at the documented positions', () => {
    const placed = place(PLAIN, 'grid', 800, 600);
    const byId = new Map(placed.map((p) => [p.id, p.bounds]));
    expect(byId.get('a')).toEqual({ x: 160, y: 240, width: 136, height: 45 });
    expect(byId.get('c')).toEqual({ x: 480, y: 240, width: 136, height: 45 });
    expect(byId.get('d')).toEqual({ x: 160, y: 300, width: 136, height: 45 });
  });

  it('non-media hierarchical keeps the 100x50 default box', () => {
    const placed = place(PLAIN, 'hierarchical', 800, 600);
    for (const p of placed) {
      expect(p.bounds.width).toBe(100);
      expect(p.bounds.height).toBe(50);
    }
  });

  it('non-media radial keeps the 60x60 default box', () => {
    for (const p of place(PLAIN_CYCLE, 'radial', 800, 600)) {
      expect(p.bounds.width).toBe(60);
      expect(p.bounds.height).toBe(60);
    }
  });

  it('non-media radial keeps its documented baseline positions', () => {
    const placed = place(PLAIN_CYCLE, 'radial', 800, 600);
    const byId = new Map(placed.map((p) => [p.id, p.bounds]));
    expect(byId.get('a')).toEqual({ x: 610, y: 270, width: 60, height: 60 });
    expect(byId.get('c')).toEqual({ x: 176, y: 411, width: 60, height: 60 });
  });
});

describe('overlap is reported as an L3 validation issue', () => {
  it('validateLayout flags two nodes sharing space', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' as const };
    const scene = buildScene(CYCLE_5);
    const laidOut = layout(scene, ctx, 'radial');
    const root = laidOut.nodes.find((n) => n.kind === 'diagram')!;
    const nodes = root.children.filter((n) => n.kind === 'node');
    // Force an overlap: collapse every node onto the same box.
    const collapsed = {
      ...laidOut,
      nodes: laidOut.nodes.map((n) =>
        n.id === 'diagram-root'
          ? {
              ...n,
              children: n.children.map((c) =>
                c.kind === 'node' ? { ...c, bounds: { x: 10, y: 10, width: 100, height: 50 } } : c,
              ),
            }
          : n,
      ),
    };
    const result = validateLayout(collapsed, ctx);
    expect(result.valid).toBe(false);
    const issues = result.issues.filter((i) => i.message.includes('overlap'));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.level).toBe('L3');
    expect(issues[0]!.code).toBe('INVALID_STATE');
    expect(nodes.length).toBe(5);
  });
});
