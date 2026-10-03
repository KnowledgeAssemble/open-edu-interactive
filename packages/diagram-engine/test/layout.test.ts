import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import type { DiagramContent } from '../src/schema.js';
import type { Scene, SceneNode } from '../src/scene/types.js';

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

describe('media node layout', () => {
  const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' as const };

  it('5-node media cycle: 220x120 boxes, worst label y ~522.4', () => {
    const rows = nodeRows(layout(buildScene(mediaCycle(5)), CTX, 'radial'));
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect(r.bounds.width).toBe(220);
      expect(r.bounds.height).toBe(120);
    }
    const worstLabelY = Math.max(...rows.map((r) => r.bounds.y + r.bounds.height + 14));
    expect(Math.abs(worstLabelY - 522.4)).toBeLessThanOrEqual(1);
  });

  it('6-node media cycle: worst label y ~509.1', () => {
    const rows = nodeRows(layout(buildScene(mediaCycle(6)), CTX, 'radial'));
    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(r.bounds.width).toBe(220);
      expect(r.bounds.height).toBe(120);
    }
    const worstLabelY = Math.max(...rows.map((r) => r.bounds.y + r.bounds.height + 14));
    expect(Math.abs(worstLabelY - 509.1)).toBeLessThanOrEqual(1);
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
});