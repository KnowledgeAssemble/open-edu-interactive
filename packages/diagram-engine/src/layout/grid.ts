import type { Bounds } from '../scene/types.js';
import { LABEL_ALLOWANCE, fitMediaBox } from './fit.js';

export function gridLayout(
  nodeIds: string[],
  ctx: { width: number; height: number; minTouchTarget: number },
  sizes?: Map<string, { width: number; height: number }>,
): Map<string, Bounds> {
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.ceil(n / cols);
  const hasMedia = sizes !== undefined && sizes.size > 0;

  // Media boxes must fit the canvas rather than dictate the cell: the previous
  // max(..., MEDIA_BOX.width) let a 220px cell overflow a narrower canvas.
  const mediaBox = hasMedia
    ? fitMediaBox(ctx.width / cols, (ctx.height - (rows - 1) * LABEL_ALLOWANCE) / rows)
    : null;

  const cellW = mediaBox ? mediaBox.width : Math.max(ctx.minTouchTarget, Math.min(ctx.width / cols, 160));
  const plainH = mediaBox ? mediaBox.height : Math.max(ctx.minTouchTarget, 60);
  const rowPitch = mediaBox ? mediaBox.height + LABEL_ALLOWANCE : plainH;

  const bounds = new Map<string, Bounds>();
  const startX = (ctx.width - cols * cellW) / 2;
  const startY = (ctx.height - rows * rowPitch) / 2;

  for (let i = 0; i < nodeIds.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const id = nodeIds[i]!;
    const box = hasMedia && sizes!.has(id)
      ? mediaBox!
      : { width: Math.round(cellW * 0.85), height: Math.round(plainH * 0.75) };
    bounds.set(id, {
      x: Math.round(startX + col * cellW),
      y: Math.round(startY + row * rowPitch),
      width: box.width,
      height: box.height,
    });
  }

  return bounds;
}
