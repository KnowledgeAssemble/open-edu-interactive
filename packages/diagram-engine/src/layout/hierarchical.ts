import type { Bounds } from '../scene/types.js';
import { MEDIA_BOX, MEDIA_LABEL_GAP } from '@knowledgeassemble/svg-kit';

export function assignLayers(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>,
  topoOrder: string[],
): Map<string, number> {
  const layerOf = new Map<string, number>();
  for (const id of nodeIds) {
    layerOf.set(id, 0);
  }

  const predecessors = new Map<string, string[]>();
  for (const id of nodeIds) {
    predecessors.set(id, []);
  }
  for (const e of edges) {
    const list = predecessors.get(e.to);
    if (list) list.push(e.from);
  }

  for (const u of topoOrder) {
    const preds = predecessors.get(u) ?? [];
    let maxLayer = 0;
    for (const p of preds) {
      maxLayer = Math.max(maxLayer, layerOf.get(p) ?? 0);
    }
    layerOf.set(u, maxLayer + 1);
  }

  const minLayer = Math.min(...layerOf.values());
  for (const id of nodeIds) {
    layerOf.set(id, (layerOf.get(id) ?? 0) - minLayer);
  }

  return layerOf;
}

export function computeHierarchicalBounds(
  layerOf: Map<string, number>,
  nodeBounds: Map<string, { width: number; height: number }>,
  ctx: { width: number; height: number; minTouchTarget: number },
  hasMedia = false,
): Map<string, Bounds> {
  const colWidth = Math.max(ctx.minTouchTarget, 120, hasMedia ? MEDIA_BOX.width : 0);
  const layerHeight = Math.max(ctx.minTouchTarget + 20, 80, hasMedia ? MEDIA_BOX.height + MEDIA_LABEL_GAP + 20 : 0);
  const padding = 40;

  const nodesInLayer = new Map<number, string[]>();
  for (const [id, layer] of layerOf) {
    const list = nodesInLayer.get(layer) ?? [];
    list.push(id);
    nodesInLayer.set(layer, list);
  }

  const bounds = new Map<string, Bounds>();
  const totalWidth = ctx.width;
  const startX = padding;

  for (const [layer, ids] of nodesInLayer) {
    const count = ids.length;
    const spacing = Math.min(colWidth, (totalWidth - 2 * padding) / count);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const b = nodeBounds.get(id) ?? { width: spacing * 0.8, height: layerHeight * 0.6 };
      const x = startX + i * spacing + (spacing - b.width) / 2;
      const y = padding + layer * layerHeight + (layerHeight - b.height) / 2;
      bounds.set(id, { x: Math.round(x), y: Math.round(y), width: b.width, height: b.height });
    }
  }

  return bounds;
}