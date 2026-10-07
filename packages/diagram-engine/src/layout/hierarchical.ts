import type { Bounds } from '../scene/types.js';
import { CANVAS_PADDING, LABEL_ALLOWANCE, NODE_GAP, fitMediaBox } from './fit.js';

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
  mediaIds: Set<string>,
  ctx: { width: number; height: number; minTouchTarget: number },
): Map<string, Bounds> {
  const padding = CANVAS_PADDING;
  const hasMedia = mediaIds.size > 0;

  const nodesInLayer = new Map<number, string[]>();
  for (const [id, layer] of layerOf) {
    const list = nodesInLayer.get(layer) ?? [];
    list.push(id);
    nodesInLayer.set(layer, list);
  }

  const layers = Math.max(...[...layerOf.values()]) + 1;
  const widestLayer = Math.max(...[...nodesInLayer.values()].map((ids) => ids.length));

  // Media boxes are fitted to the canvas. The vertical allowance is derived so
  // that every layer's label lands inside the canvas, which is what previously
  // overflowed for long chains.
  const mediaBox = hasMedia
    ? fitMediaBox(
        widestLayer <= 1
          ? ctx.width - 2 * padding
          : (ctx.width - 2 * padding - (widestLayer - 1) * NODE_GAP) / widestLayer,
        (ctx.height - padding - LABEL_ALLOWANCE * (layers + 0.5)) / layers,
      )
    : null;

  const colWidth = mediaBox
    ? mediaBox.width
    : Math.max(ctx.minTouchTarget, 120);
  const layerHeight = mediaBox
    ? mediaBox.height + LABEL_ALLOWANCE
    : Math.max(ctx.minTouchTarget + 20, 80);

  const bounds = new Map<string, Bounds>();
  const totalWidth = ctx.width;
  const startX = padding;

  for (const [layer, ids] of nodesInLayer) {
    const count = ids.length;
    const spacing = Math.min(colWidth, (totalWidth - 2 * padding) / count);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const b =
        (mediaBox && mediaIds.has(id) ? mediaBox : nodeBounds.get(id)) ?? {
          width: spacing * 0.8,
          height: layerHeight * 0.6,
        };
      const x = startX + i * spacing + (spacing - b.width) / 2;
      const y = padding + layer * layerHeight + (layerHeight - b.height) / 2;
      bounds.set(id, { x: Math.round(x), y: Math.round(y), width: b.width, height: b.height });
    }
  }

  return bounds;
}
