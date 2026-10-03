import { escapeXml, fmt } from './base.js';
import { nodeAttrs } from './attrs.js';
import type { AttrsNode } from './attrs.js';

export const MEDIA_BOX = { width: 220, height: 120 } as const;
export const MEDIA_LABEL_GAP = 14;

export interface MediaSlot extends AttrsNode {
  bounds: { x: number; y: number; width: number; height: number };
  fontSize?: number;
  labelGap?: number;
  tail?: Record<string, string>;
}

export function mediaSlot(node: MediaSlot, indent = 0): string {
  const pad = '  '.repeat(indent);
  const gap = node.labelGap ?? MEDIA_LABEL_GAP;
  const b = node.bounds;
  const attrs = nodeAttrs(node, { value: true, bounds: true, tail: node.tail, mid: { 'data-oedu-media': 'slot' } });
  const fontSize = node.fontSize === undefined ? '' : ` font-size="${fmt(node.fontSize)}"`;
  const labelY = b.y + b.height + gap;
  const cx = b.x + b.width / 2;
  const rect = `<rect x="${fmt(b.x)}" y="${fmt(b.y)}" width="${fmt(b.width)}" height="${fmt(b.height)}" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>`;
  const text = node.label
    ? `<text x="${fmt(cx)}" y="${fmt(labelY)}" text-anchor="middle" fill="currentColor"${fontSize}>${escapeXml(node.label)}</text>`
    : '';
  const inner = text === '' ? rect : `${rect}\n${pad}  ${text}`;
  return `${pad}<g ${attrs}>\n${pad}  ${inner}\n${pad}</g>`;
}