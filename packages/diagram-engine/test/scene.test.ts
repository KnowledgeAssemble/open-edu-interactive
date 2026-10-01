import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import type { DiagramContent } from '../src/schema.js';

const WATER_CYCLE: DiagramContent = {
  kind: 'cycle',
  profile: 'process',
  nodes: [
    { id: 'evaporation', label: 'Evaporation', description: 'Liquid becomes vapour' },
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

const FLOW: DiagramContent = {
  kind: 'flow',
  nodes: [
    { id: 'start', label: 'Start' },
    { id: 'process', label: 'Process' },
    { id: 'end', label: 'End' },
  ],
  edges: [
    { from: 'start', to: 'process', relationship: 'leads-to' },
    { from: 'process', to: 'end', relationship: 'leads-to' },
  ],
};

describe('buildScene', () => {
  it('builds 4 nodes + 4 edges for water cycle', () => {
    const scene = buildScene(WATER_CYCLE);
    expect(scene.nodes).toHaveLength(1);
    const root = scene.nodes[0]!;
    expect(root.kind).toBe('diagram');
    expect(root.children).toHaveLength(8); // 4 nodes + 4 edges
  });

  it('builds 3 nodes + 2 edges for flow', () => {
    const scene = buildScene(FLOW);
    const root = scene.nodes[0]!;
    const nodeChildren = root.children.filter((n) => n.kind === 'node');
    const edgeChildren = root.children.filter((n) => n.kind === 'edge');
    expect(nodeChildren).toHaveLength(3);
    expect(edgeChildren).toHaveLength(2);
  });

  it('node scene nodes carry correct metadata', () => {
    const scene = buildScene(WATER_CYCLE);
    const root = scene.nodes[0]!;
    const evaporationNode = root.children.find((n) => n.metadata?.nodeId === 'evaporation');
    expect(evaporationNode).toBeDefined();
    expect(evaporationNode!.id).toBe('node-evaporation');
    expect(evaporationNode!.label).toBe('Evaporation');
    expect(evaporationNode!.description).toBe('Liquid becomes vapour');
    expect(evaporationNode!.interactive).toBe(true);
    expect(evaporationNode!.acceptsActions).toContain('select');
    expect(evaporationNode!.acceptsActions).toContain('focus');
  });

  it('edge scene nodes carry correct metadata', () => {
    const scene = buildScene(WATER_CYCLE);
    const root = scene.nodes[0]!;
    const edgeNode = root.children.find((n) =>
      n.metadata?.fromNodeId === 'evaporation' && n.metadata?.toNodeId === 'condensation',
    );
    expect(edgeNode).toBeDefined();
    expect(edgeNode!.id).toBe('edge-evaporation-condensation');
    expect(edgeNode!.metadata?.relationship).toBe('leads-to');
    expect(edgeNode!.acceptsActions).toEqual(['select', 'focus', 'follow']);
  });

  it('edges reference only declared nodes', () => {
    const badContent: DiagramContent = {
      kind: 'flow',
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'b', relationship: 'leads-to' }],
    };
    expect(() => buildScene(badContent)).toThrow();
  });

  it('self-loop edge is caught', () => {
    const badContent: DiagramContent = {
      kind: 'flow',
      nodes: [{ id: 'a', label: 'A' }],
      edges: [{ from: 'a', to: 'a', relationship: 'leads-to' }],
    };
    expect(() => buildScene(badContent)).toThrow();
  });

  it('walk order is stable (nodes then edges)', () => {
    const scene = buildScene(WATER_CYCLE);
    const root = scene.nodes[0]!;
    const kinds = root.children.map((n) => n.kind);
    // All nodes first, then all edges
    const firstEdgeIndex = kinds.findIndex((k) => k === 'edge');
    const lastNodeIndex = kinds.lastIndexOf('node');
    expect(firstEdgeIndex).toBeGreaterThan(lastNodeIndex);
  });

  it('semantics contains both scene-id and authored-id entries', () => {
    const scene = buildScene(WATER_CYCLE);
    expect(scene.semantics['node-evaporation']).toBeDefined();
    expect(scene.semantics['evaporation']).toBeDefined();
  });

  it('authored id dispatch resolves to node', () => {
    const scene = buildScene(WATER_CYCLE);
    const node = scene.semantics['evaporation'];
    expect(node).toBeDefined();
    expect(node!.metadata?.nodeId).toBe('evaporation');
  });
});