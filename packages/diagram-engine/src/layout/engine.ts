import type { Scene } from '../scene/types.js';
import { adjacency, kahnTopoSort } from './graph.js';
import { assignLayers, computeHierarchicalBounds } from './hierarchical.js';
import { radialLayout } from './radial.js';
import { gridLayout } from './grid.js';
import { MEDIA_BOX } from '@knowledgeassemble/svg-kit';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

interface BoundsWithPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EdgeGeometry {
  type: 'line' | 'path';
  points: Array<{ x: number; y: number }>;
  path?: string;
}

function clampPoint(
  p: { x: number; y: number },
  canvas: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(canvas.width, p.x)),
    y: Math.max(0, Math.min(canvas.height, p.y)),
  };
}

function computeEdgeGeometry(
  fromBounds: BoundsWithPos,
  toBounds: BoundsWithPos,
  canvas: { width: number; height: number },
): EdgeGeometry {
  const fromCenter = {
    x: fromBounds.x + fromBounds.width / 2,
    y: fromBounds.y + fromBounds.height / 2,
  };
  const toCenter = {
    x: toBounds.x + toBounds.width / 2,
    y: toBounds.y + toBounds.height / 2,
  };
  const p1 = clampPoint(fromCenter, canvas);
  const p2 = clampPoint(toCenter, canvas);
  return {
    type: 'line',
    points: [p1, p2],
    path: `M${p1.x},${p1.y} L${p2.x},${p2.y}`,
  };
}

export function layout(scene: Scene, ctx: LayoutContext, layoutType?: string): Scene {
  const root = scene.nodes.find((n) => n.kind === 'diagram');
  if (!root) return scene;

  const nodeChildren = root.children.filter((n) => n.kind === 'node');
  const edgeChildren = root.children.filter((n) => n.kind === 'edge');

  const nodeIds = nodeChildren.map((n) => n.metadata?.nodeId as string ?? n.id);

  const mediaSizes = new Map<string, { width: number; height: number }>();
  for (const n of nodeChildren) {
    const nid = n.metadata?.nodeId as string | undefined;
    const media = n.metadata?.media as { kind?: string } | undefined;
    if (nid && media?.kind === 'figure') {
      mediaSizes.set(nid, { ...MEDIA_BOX });
    }
  }
  const sizes = mediaSizes.size > 0 ? mediaSizes : undefined;

  const edgePairs = edgeChildren.map((e) => ({
    from: e.metadata?.fromNodeId as string,
    to: e.metadata?.toNodeId as string,
  }));

  const graph = adjacency(nodeIds, edgePairs);
  const topoSort = kahnTopoSort(graph);

  const canvas = { width: ctx.width, height: ctx.height };

  // Determine layout strategy
  const strategy = layoutType ?? 'hierarchical';
  let nodeBounds: Map<string, BoundsWithPos>;

  if (strategy === 'radial') {
    const radialBounds = radialLayout(nodeIds, edgePairs, ctx, sizes);
    nodeBounds = new Map<string, BoundsWithPos>();
    for (const [id, b] of radialBounds) {
      nodeBounds.set(id, b as unknown as BoundsWithPos);
    }
  } else if (strategy === 'grid') {
    const gridBounds = gridLayout(nodeIds, ctx, sizes);
    nodeBounds = new Map<string, BoundsWithPos>();
    for (const [id, b] of gridBounds) {
      nodeBounds.set(id, b as unknown as BoundsWithPos);
    }
  } else {
    // hierarchical
    if (topoSort) {
      const layerOf = assignLayers(nodeIds, edgePairs, topoSort);
      const sizeMap = new Map<string, { width: number; height: number }>();
      for (const id of nodeIds) {
        sizeMap.set(id, mediaSizes?.get(id) ?? { width: 100, height: 50 });
      }
      nodeBounds = computeHierarchicalBounds(layerOf, sizeMap, ctx, mediaSizes.size > 0);
    } else {
      const gridBounds = gridLayout(nodeIds, ctx, sizes);
      nodeBounds = new Map<string, BoundsWithPos>();
      for (const [id, b] of gridBounds) {
        nodeBounds.set(id, b as unknown as BoundsWithPos);
      }
    }
  }

  // Assign edge geometry
  const newRootChildren = root.children.map((c) => {
    const nid = c.metadata?.nodeId as string | undefined;
    if (c.kind === 'node' && nid) {
      const b = nodeBounds.get(nid);
      if (b) {
        return { ...c, bounds: { x: b.x, y: b.y, width: b.width, height: b.height }, positionSource: 'illustrative' as const };
      }
    }
    if (c.kind === 'edge') {
      const fromNodeId = c.metadata?.fromNodeId as string ?? '';
      const toNodeId = c.metadata?.toNodeId as string ?? '';
      const fromBounds = nodeBounds.get(fromNodeId);
      const toBounds = nodeBounds.get(toNodeId);
      if (fromBounds && toBounds) {
        const geo = computeEdgeGeometry(fromBounds, toBounds, canvas);
        return {
          ...c,
          metadata: {
            ...c.metadata,
            edgeGeometry: geo,
          },
        };
      }
    }
    return c;
  });

  // Assert every edge has endpoints inside canvas
  for (const child of newRootChildren) {
    if (child.kind === 'edge') {
      const geo = child.metadata?.edgeGeometry as EdgeGeometry | undefined;
      if (geo) {
        for (const p of geo.points) {
          if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            throw new Error(`edge "${child.id}" endpoint outside canvas: (${p.x},${p.y})`);
          }
        }
      }
    }
  }

  return {
    ...scene,
    nodes: scene.nodes.map((n) => {
      if (n.id === 'diagram-root') {
        return { ...n, children: newRootChildren };
      }
      return n;
    }),
  };
}