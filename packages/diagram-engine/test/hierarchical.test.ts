import { describe, it, expect } from 'vitest';
import { assignLayers, computeHierarchicalBounds } from '../src/layout/hierarchical.js';

const DAG_NODES = ['start', 'step1', 'step2', 'end'];
const DAG_EDGES = [
  { from: 'start', to: 'step1' },
  { from: 'start', to: 'step2' },
  { from: 'step1', to: 'end' },
  { from: 'step2', to: 'end' },
];

describe('hierarchical layout', () => {
  it('assignLayers produces valid layers', () => {
    const topoOrder = ['start', 'step1', 'step2', 'end'];
    const layerOf = assignLayers(DAG_NODES, DAG_EDGES, topoOrder);
    expect(layerOf.get('start')).toBe(0);
    expect(layerOf.get('step1')).toBeGreaterThan(0);
    expect(layerOf.get('end')).toBeGreaterThan(layerOf.get('step1')!);
  });

  it('computeHierarchicalBounds produces valid bounds', () => {
    const topoOrder = ['start', 'step1', 'step2', 'end'];
    const layerOf = assignLayers(DAG_NODES, DAG_EDGES, topoOrder);
    const sizeMap = new Map<string, { width: number; height: number }>();
    for (const id of DAG_NODES) {
      sizeMap.set(id, { width: 100, height: 50 });
    }
    const bounds = computeHierarchicalBounds(layerOf, sizeMap, new Set(), {
      width: 800,
      height: 600,
      minTouchTarget: 44,
    });
    expect(bounds.size).toBe(4);
    for (const [, b] of bounds) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.width).toBeGreaterThan(0);
      expect(b.height).toBeGreaterThan(0);
    }
  });

  it('determinism: same input same bounds', () => {
    const topoOrder = ['end', 'step1', 'step2', 'start'];
    const layerOf = assignLayers(DAG_NODES, DAG_EDGES, topoOrder);
    const sizeMap = new Map<string, { width: number; height: number }>();
    for (const id of DAG_NODES) {
      sizeMap.set(id, { width: 100, height: 50 });
    }
    const b1 = computeHierarchicalBounds(layerOf, sizeMap, new Set(), { width: 800, height: 600, minTouchTarget: 44 });
    const b2 = computeHierarchicalBounds(layerOf, sizeMap, new Set(), { width: 800, height: 600, minTouchTarget: 44 });
    expect(JSON.stringify([...b1])).toBe(JSON.stringify([...b2]));
  });
});