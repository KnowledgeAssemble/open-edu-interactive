import type { Bounds } from '../scene/types.js';
import { walkOrder } from './graph.js';
import { MEDIA_LABEL_GAP } from '@knowledgeassemble/svg-kit';

export function radialLayout(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>,
  ctx: { width: number; height: number; minTouchTarget: number },
  sizes?: Map<string, { width: number; height: number }>,
): Map<string, Bounds> {
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const nodeSize = Math.max(ctx.minTouchTarget, 60);
  const hasMedia = sizes !== undefined && sizes.size > 0;
  const maxBox = hasMedia
    ? Math.max(...[...sizes!.values()].map((s) => Math.max(s.width, s.height)))
    : nodeSize;
  const mediaRadius = Math.min(ctx.width, ctx.height) / 2 - maxBox / 2 - MEDIA_LABEL_GAP - 20;
  const radius = hasMedia && mediaRadius > 0
    ? mediaRadius
    : Math.min(ctx.width, ctx.height) / 2 - Math.max(ctx.minTouchTarget, 60);

  const ordered = walkOrder(nodeIds, edges);
  const bounds = new Map<string, Bounds>();

  for (let i = 0; i < ordered.length; i++) {
    const angle = (2 * Math.PI * i) / n;
    const box = sizes?.get(ordered[i]!) ?? { width: nodeSize, height: nodeSize };
    const x = cx + radius * Math.cos(angle) - box.width / 2;
    const y = cy + radius * Math.sin(angle) - box.height / 2;
    bounds.set(ordered[i]!, {
      x: Math.round(x),
      y: Math.round(y),
      width: box.width,
      height: box.height,
    });
  }

  return bounds;
}