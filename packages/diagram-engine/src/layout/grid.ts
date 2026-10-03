import type { Bounds } from '../scene/types.js';
import { MEDIA_BOX, MEDIA_LABEL_GAP } from '@knowledgeassemble/svg-kit';

export function gridLayout(
  nodeIds: string[],
  ctx: { width: number; height: number; minTouchTarget: number },
  sizes?: Map<string, { width: number; height: number }>,
): Map<string, Bounds> {
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const hasMedia = sizes !== undefined && sizes.size > 0;
  const cellW = hasMedia
    ? Math.max(ctx.minTouchTarget, Math.min(ctx.width / cols, 160), MEDIA_BOX.width)
    : Math.max(ctx.minTouchTarget, Math.min(ctx.width / cols, 160));
  const cellH = hasMedia
    ? Math.max(ctx.minTouchTarget, 60, MEDIA_BOX.height)
    : Math.max(ctx.minTouchTarget, 60);
  const rowPitch = hasMedia ? cellH + MEDIA_LABEL_GAP + 20 : cellH;
  const bounds = new Map<string, Bounds>();
  const startX = (ctx.width - cols * cellW) / 2;
  const rows = Math.ceil(n / cols);
  const startY = (ctx.height - rows * rowPitch) / 2;

  for (let i = 0; i < nodeIds.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const box = sizes?.get(nodeIds[i]!) ?? {
      width: Math.round(cellW * 0.85),
      height: Math.round(cellH * 0.75),
    };
    bounds.set(nodeIds[i]!, {
      x: Math.round(startX + col * cellW),
      y: Math.round(startY + row * rowPitch),
      width: box.width,
      height: box.height,
    });
  }

  return bounds;
}