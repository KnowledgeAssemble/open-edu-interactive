import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { centerOf } from '../src/layout/edge-geometry.js';
import type { DiagramContent } from '../src/schema.js';
import type { Bounds, Scene, SceneNode } from '../src/scene/types.js';

const WATER_CYCLE: DiagramContent = {
  kind: 'cycle',
  nodes: [
    { id: 'evaporation', label: 'Evaporation' },
    { id: 'condensation', label: 'Condensation' },
    { id: 'precipitation', label: 'Precipitation' },
    { id: 'collection', label: 'Collection' },
  ],
  edges: [
    { from: 'evaporation', to: 'condensation', relationship: 'leads-to' },
    { from: 'condensation', to: 'precipitation', relationship: 'leads-to' },
    { from: 'precipitation', to: 'collection', relationship: 'leads-to' },
    { from: 'collection', to: 'evaporation', relationship: 'leads-to' },
  ],
};

describe('layout engine', () => {
  it('assigns bounds and positionSource to all nodes', () => {
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' }, 'radial');
    const root = laidOut.nodes.find((n) => n.kind === 'diagram');
    expect(root).toBeDefined();
    const nodeChildren = root!.children.filter((n) => n.kind === 'node');
    for (const n of nodeChildren) {
      expect(n.bounds).toBeDefined();
      expect((n as unknown as Record<string, unknown>).positionSource).toBe('illustrative');
    }
  });

  it('determinism: two runs byte-equal', () => {
    const scene = buildScene(WATER_CYCLE);
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const l1 = layout(scene, ctx, 'radial');
    const l2 = layout(scene, ctx, 'radial');
    expect(JSON.stringify(l1)).toBe(JSON.stringify(l2));
  });

  it('all node positions carry positionSource illustrative', () => {
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' }, 'hierarchical');
    const root = laidOut.nodes.find((n) => n.kind === 'diagram');
    const nodeChildren = root!.children.filter((n) => n.kind === 'node');
    for (const n of nodeChildren) {
      expect((n as unknown as Record<string, unknown>).positionSource).toBe('illustrative');
    }
  });
});

function mediaCycle(n: number): DiagramContent {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, n);
  return {
    kind: 'cycle',
    nodes: ids.map((id) => ({ id, label: id.toUpperCase(), media: { kind: 'figure' } })),
    edges: ids.map((from, i, arr) => ({ from, to: arr[(i + 1) % arr.length]!, relationship: 'leads-to' })),
  };
}

function nodeRows(laidOut: Scene): Array<{ id: string; bounds: { x: number; y: number; width: number; height: number } }> {
  const root = laidOut.nodes.find((n) => n.kind === 'diagram');
  const children: SceneNode[] = root ? root.children.filter((n) => n.kind === 'node') : [];
  return children.map((n) => ({
    id: n.metadata?.nodeId as string,
    bounds: {
      x: n.bounds!.x,
      y: n.bounds!.y,
      width: n.bounds!.width,
      height: n.bounds!.height,
    },
  }));
}

/** Strictly-inside test; local to the test so src/ carries no test-only export. */
function pointInInterior(b: Bounds, p: { x: number; y: number }): boolean {
  return p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height;
}

describe('media node layout', () => {
  const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' as const };

  it('5-node media cycle: square media slot, worst label y ~579', () => {
    const rows = nodeRows(layout(buildScene(mediaCycle(5)), CTX, 'radial'));
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect(r.bounds.width).toBe(152);
      expect(r.bounds.height).toBe(152);
    }
    const worstLabelY = Math.max(...rows.map((r) => r.bounds.y + r.bounds.height + 14));
    expect(Math.abs(worstLabelY - 579)).toBeLessThanOrEqual(1);
  });

  it('6-node media cycle: square media slot, worst label y ~579', () => {
    const rows = nodeRows(layout(buildScene(mediaCycle(6)), CTX, 'radial'));
    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(r.bounds.width).toBe(152);
      expect(r.bounds.height).toBe(152);
    }
    const worstLabelY = Math.max(...rows.map((r) => r.bounds.y + r.bounds.height + 14));
    expect(Math.abs(worstLabelY - 579)).toBeLessThanOrEqual(1);
  });

  it('non-media 5-node cycle bounds are byte-identical to baseline', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const content: DiagramContent = {
      kind: 'cycle',
      nodes: ids.map((id) => ({ id, label: id.toUpperCase() })),
      edges: ids.map((from, i, arr) => ({ from, to: arr[(i + 1) % arr.length]!, relationship: 'leads-to' })),
    };
    const rows = nodeRows(layout(buildScene(content), CTX, 'radial'));
    const byId = new Map(rows.map((r) => [r.id, r.bounds]));
    expect(byId.get('a')).toEqual({ x: 610, y: 270, width: 60, height: 60 });
    expect(byId.get('b')).toEqual({ x: 444, y: 498, width: 60, height: 60 });
    expect(byId.get('c')).toEqual({ x: 176, y: 411, width: 60, height: 60 });
    expect(byId.get('d')).toEqual({ x: 176, y: 129, width: 60, height: 60 });
    expect(byId.get('e')).toEqual({ x: 444, y: 42, width: 60, height: 60 });
  });

  it('tiny 200x200 canvas media cycle falls back without throwing; every bound finite', () => {
    const laidOut = layout(buildScene(mediaCycle(5)), { width: 200, height: 200, minTouchTarget: 44, textStyle: 'normal' }, 'radial');
    const root = laidOut.nodes.find((n) => n.kind === 'diagram');
    const nodeChildren: SceneNode[] = root ? root.children.filter((n) => n.kind === 'node') : [];
    expect(nodeChildren.length).toBe(5);
    for (const n of nodeChildren) {
      expect(Number.isFinite(n.bounds!.x)).toBe(true);
      expect(Number.isFinite(n.bounds!.y)).toBe(true);
      expect(Number.isFinite(n.bounds!.width)).toBe(true);
      expect(Number.isFinite(n.bounds!.height)).toBe(true);
    }
  });

  it('5-node grid media spec: 220x120, cols=3 -> x 70/290/510, row 0 y=146, row 1 y=300', () => {
    const content: DiagramContent = {
      kind: 'concept-map',
      nodes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, label: id.toUpperCase(), media: { kind: 'figure' } })),
      edges: [],
    };
    const rows = nodeRows(layout(buildScene(content), CTX, 'grid'));
    const byId = new Map(rows.map((r) => [r.id, r.bounds]));
    expect(byId.get('a')).toEqual({ x: 70, y: 146, width: 220, height: 120 });
    expect(byId.get('b')).toEqual({ x: 290, y: 146, width: 220, height: 120 });
    expect(byId.get('c')).toEqual({ x: 510, y: 146, width: 220, height: 120 });
    expect(byId.get('d')).toEqual({ x: 70, y: 300, width: 220, height: 120 });
    expect(byId.get('e')).toEqual({ x: 290, y: 300, width: 220, height: 120 });
  });

  it('3-layer hierarchical media chain: 220x120 at x=40, y=57/211/365', () => {
    const content: DiagramContent = {
      kind: 'hierarchy',
      nodes: ['a', 'b', 'c'].map((id) => ({ id, label: id.toUpperCase(), media: { kind: 'figure' } })),
      edges: [
        { from: 'a', to: 'b', relationship: 'contains' },
        { from: 'b', to: 'c', relationship: 'contains' },
      ],
    };
    const rows = nodeRows(layout(buildScene(content), CTX, 'hierarchical'));
    const byId = new Map(rows.map((r) => [r.id, r.bounds]));
    expect(byId.get('a')).toEqual({ x: 40, y: 57, width: 220, height: 120 });
    expect(byId.get('b')).toEqual({ x: 40, y: 211, width: 220, height: 120 });
    expect(byId.get('c')).toEqual({ x: 40, y: 365, width: 220, height: 120 });
  });

  it('mixed radial cycle: media nodes square, non-media nodes keep the 60x60 default', () => {
    const content: DiagramContent = {
      kind: 'cycle',
      nodes: [
        { id: 'a', label: 'A', media: { kind: 'figure' } },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C', media: { kind: 'figure' } },
        { id: 'd', label: 'D' },
      ],
      edges: [
        { from: 'a', to: 'b', relationship: 'leads-to' },
        { from: 'b', to: 'c', relationship: 'leads-to' },
        { from: 'c', to: 'd', relationship: 'leads-to' },
        { from: 'd', to: 'a', relationship: 'leads-to' },
      ],
    };
    const rows = nodeRows(layout(buildScene(content), CTX, 'radial'));
    expect(rows).toHaveLength(4);
    const byId = new Map(rows.map((r) => [r.id, r.bounds]));
    expect(byId.get('a')!.width).toBe(byId.get('a')!.height);
    expect(byId.get('c')!.width).toBe(byId.get('c')!.height);
    expect(byId.get('b')!.width).toBe(60);
    expect(byId.get('b')!.height).toBe(60);
    expect(byId.get('d')!.width).toBe(60);
    expect(byId.get('d')!.height).toBe(60);
    for (const r of rows) {
      expect(Number.isFinite(r.bounds.x)).toBe(true);
      expect(Number.isFinite(r.bounds.y)).toBe(true);
    }
  });

  it('mixed grid: media cells 220x120, non-media cells stay within the shared cell', () => {
    const content: DiagramContent = {
      kind: 'concept-map',
      nodes: [
        { id: 'a', label: 'A', media: { kind: 'figure' } },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C', media: { kind: 'figure' } },
      ],
      edges: [],
    };
    const rows = nodeRows(layout(buildScene(content), CTX, 'grid'));
    expect(rows).toHaveLength(3);
    const byId = new Map(rows.map((r) => [r.id, r.bounds]));
    expect(byId.get('a')!.width).toBe(220);
    expect(byId.get('a')!.height).toBe(120);
    expect(byId.get('c')!.width).toBe(220);
    expect(byId.get('c')!.height).toBe(120);
    expect(byId.get('b')!.width).toBeLessThan(220);
    expect(byId.get('b')!.height).toBeLessThan(120);
    for (const r of rows) {
      expect(Number.isFinite(r.bounds.x)).toBe(true);
      expect(Number.isFinite(r.bounds.y)).toBe(true);
    }
  });

  it('mixed hierarchy: media layer 220x120, non-media layer keeps the 100x50 default', () => {
    const content: DiagramContent = {
      kind: 'hierarchy',
      nodes: [
        { id: 'a', label: 'A', media: { kind: 'figure' } },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ],
      edges: [{ from: 'a', to: 'b', relationship: 'contains' }],
    };
    const rows = nodeRows(layout(buildScene(content), CTX, 'hierarchical'));
    expect(rows).toHaveLength(3);
    const byId = new Map(rows.map((r) => [r.id, r.bounds]));
    expect(byId.get('a')!.width).toBe(220);
    expect(byId.get('a')!.height).toBe(120);
    expect(byId.get('b')!.width).toBe(100);
    expect(byId.get('b')!.height).toBe(50);
    expect(byId.get('c')!.width).toBe(100);
    expect(byId.get('c')!.height).toBe(50);
  });
});

interface EdgeGeometry {
  type: string;
  points: Array<{ x: number; y: number }>;
  path?: string;
}

function edgesOf(laidOut: Scene): Array<{ from: string; to: string; geo: EdgeGeometry }> {
  const root = laidOut.nodes.find((n) => n.kind === 'diagram');
  const edges: SceneNode[] = root ? root.children.filter((n) => n.kind === 'edge') : [];
  return edges.map((e) => ({
    from: e.metadata?.fromNodeId as string,
    to: e.metadata?.toNodeId as string,
    geo: e.metadata?.edgeGeometry as EdgeGeometry,
  }));
}

function boundsOf(laidOut: Scene): Map<string, Bounds> {
  const root = laidOut.nodes.find((n) => n.kind === 'diagram');
  const nodes: SceneNode[] = root ? root.children.filter((n) => n.kind === 'node') : [];
  return new Map(
    nodes.map((n) => [
      n.metadata?.nodeId as string,
      { x: n.bounds!.x, y: n.bounds!.y, width: n.bounds!.width, height: n.bounds!.height },
    ]),
  );
}

const MEDIA_CHAIN: DiagramContent = {
  kind: 'hierarchy',
  nodes: ['a', 'b', 'c'].map((id) => ({ id, label: id.toUpperCase(), media: { kind: 'figure' } })),
  edges: [
    { from: 'a', to: 'b', relationship: 'contains' },
    { from: 'b', to: 'c', relationship: 'contains' },
  ],
};

describe('edge boundary routing', () => {
  const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' as const };

  it('does not anchor edges at node centers (the arrow-overlap bug)', () => {
    const bounds = boundsOf(layout(buildScene(MEDIA_CHAIN), CTX, 'hierarchical'));
    for (const { from, to, geo } of edgesOf(layout(buildScene(MEDIA_CHAIN), CTX, 'hierarchical'))) {
      expect(geo.points).not.toContainEqual(centerOf(bounds.get(from)!));
      expect(geo.points).not.toContainEqual(centerOf(bounds.get(to)!));
    }
  });

  it('anchors a vertical hierarchy edge on the source bottom and target top borders', () => {
    const laidOut = layout(buildScene(MEDIA_CHAIN), CTX, 'hierarchical');
    const bounds = boundsOf(laidOut);
    const ab = edgesOf(laidOut).find((e) => e.from === 'a' && e.to === 'b')!;
    const a = bounds.get('a')!;
    const b = bounds.get('b')!;
    expect(ab.geo.points[0]).toEqual({ x: a.x + a.width / 2, y: a.y + a.height });
    expect(ab.geo.points[1]).toEqual({ x: b.x + b.width / 2, y: b.y });
  });

  it('keeps every edge endpoint on the border of its own endpoint box', () => {
    const layered: DiagramContent = {
      kind: 'concept-map',
      nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })),
      edges: [
        { from: 'a', to: 'b', relationship: 'leads-to' },
        { from: 'b', to: 'c', relationship: 'leads-to' },
        { from: 'a', to: 'd', relationship: 'leads-to' },
        { from: 'c', to: 'd', relationship: 'leads-to' },
      ],
    };
    for (const strategy of ['hierarchical', 'grid', 'radial'] as const) {
      const content = strategy === 'radial' ? mediaCycle(5) : layered;
      const laidOut = layout(buildScene(content), CTX, strategy);
      const bounds = boundsOf(laidOut);
      for (const { from, to, geo } of edgesOf(laidOut)) {
        const start = geo.points[0]!;
        const end = geo.points[1]!;
        expect(pointInInterior(bounds.get(from)!, start), `${from}->${to} start inside source`).toBe(false);
        expect(pointInInterior(bounds.get(to)!, end), `${from}->${to} end inside target`).toBe(false);
        expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(0);
      }
    }
  });

  it('non-overlapping layouts: no edge endpoint falls inside any node box', () => {
    const layered: DiagramContent = {
      kind: 'concept-map',
      nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })),
      edges: [
        { from: 'a', to: 'b', relationship: 'leads-to' },
        { from: 'b', to: 'c', relationship: 'leads-to' },
        { from: 'a', to: 'd', relationship: 'leads-to' },
        { from: 'c', to: 'd', relationship: 'leads-to' },
      ],
    };
    for (const strategy of ['hierarchical', 'grid'] as const) {
      const laidOut = layout(buildScene(layered), CTX, strategy);
      const boxes = [...boundsOf(laidOut).values()];
      for (const { geo } of edgesOf(laidOut)) {
        for (const p of geo.points) {
          for (const b of boxes) {
            expect(pointInInterior(b, p), `${strategy}: endpoint inside a node`).toBe(false);
          }
        }
      }
    }
  });

  // Regression guard for the radial media overlap that previously shipped as
  // KNOWN DEBT: the ring radius is now derived from the fitted box size, so an
  // endpoint anchored on one box's border is never inside its neighbour.
  it('radial media cycle keeps every node box disjoint', () => {
    const laidOut = layout(buildScene(mediaCycle(5)), CTX, 'radial');
    const boxes = [...boundsOf(laidOut).entries()];
    const overlaps: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]![1];
        const b = boxes[j]![1];
        const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (ox > 0 && oy > 0) overlaps.push(`${boxes[i]![0]}/${boxes[j]![0]}`);
      }
    }
    expect(overlaps).toEqual([]);
  });

  it('never lets the target endpoint sit at the target center', () => {
    const laidOut = layout(buildScene(mediaCycle(5)), CTX, 'radial');
    const bounds = boundsOf(laidOut);
    for (const { to, geo } of edgesOf(laidOut)) {
      expect(geo.points[1]).not.toEqual(centerOf(bounds.get(to)!));
    }
  });

  it('emits non-degenerate segments for a cycle where nodes are close together', () => {
    const laidOut = layout(buildScene(mediaCycle(6)), CTX, 'radial');
    for (const { geo } of edgesOf(laidOut)) {
      const [a, b] = geo.points;
      expect(Math.hypot(b!.x - a!.x, b!.y - a!.y)).toBeGreaterThan(0);
    }
  });

  it('keeps the svg path in sync with the geometry points', () => {
    const laidOut = layout(buildScene(MEDIA_CHAIN), CTX, 'hierarchical');
    for (const { geo } of edgesOf(laidOut)) {
      const [a, b] = geo.points;
      expect(geo.path).toBe(`M${a!.x},${a!.y} L${b!.x},${b!.y}`);
    }
  });
});