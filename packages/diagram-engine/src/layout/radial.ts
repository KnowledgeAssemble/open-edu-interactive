import type { Bounds } from '../scene/types.js';
import { walkOrder } from './graph.js';
import { LABEL_ALLOWANCE, NODE_GAP, findOverlap, radialBoxCandidatesWithFallback, type CenteredRect } from './fit.js';

const EPS = 1e-9;

interface Size {
  width: number;
  height: number;
}

interface RingCtx {
  width: number;
  height: number;
  minTouchTarget: number;
}

export function radialLayout(
  nodeIds: string[],
  edges: Array<{ from: string; to: string }>,
  ctx: RingCtx,
  sizes?: Map<string, Size>,
): Map<string, Bounds> {
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const ordered = walkOrder(nodeIds, edges);
  const nodeSize = Math.max(ctx.minTouchTarget, 60);
  const hasMedia = sizes !== undefined && sizes.size > 0;

  if (!hasMedia) {
    const radius = Math.min(ctx.width, ctx.height) / 2 - nodeSize;
    const square = ordered.map(() => ({ width: nodeSize, height: nodeSize }));
    return placeRing(ordered, square, radius, ctx);
  }

  const mediaIds = new Set(sizes!.keys());
  const plain: Size = { width: nodeSize, height: nodeSize };
  const isMedia = ordered.map((id) => mediaIds.has(id));

  // Largest media box whose ring keeps every adjacent pair at least NODE_GAP
  // apart and still sits on the canvas. A single radius cannot even out
  // rectangular spacing on its own, so the radius is derived per box instead of
  // guessed from the widest half-dimension.
  let chosen: { box: Size; radius: number } | null = null;

  for (const candidate of radialBoxCandidatesWithFallback()) {
    const attempt = tryRing(candidate, isMedia, plain, ctx);
    if (attempt) {
      chosen = attempt;
      break;
    }
  }

  if (!chosen) {
    const smallest = radialBoxCandidatesWithFallback().at(-1)!;
    const nodeSizes = isMedia.map((m) => (m ? smallest : plain));
    chosen = { box: smallest, radius: gapRadius(nodeSizes, isMedia, NODE_GAP) };
  }

  const nodeSizes = isMedia.map((m) => (m ? chosen!.box : plain));
  return boundsFromRects(ordered, centreRing(nodeSizes, isMedia, chosen.radius, ctx), nodeSizes);
}

/** Largest box that clears the canvas with even gaps, or null when none does. */
function tryRing(
  box: Size,
  isMedia: boolean[],
  plain: Size,
  ctx: RingCtx,
): { box: Size; radius: number } | null {
  const nodeSizes = isMedia.map((m) => (m ? box : plain));
  const radius = gapRadius(nodeSizes, isMedia, NODE_GAP);
  if (radius <= 0) return null;
  const rects = centreRing(nodeSizes, isMedia, radius, ctx);
  if (!rectsInsideCanvas(rects, isMedia, ctx)) return null;
  if (findOverlap(rects) !== null) return null;
  return { box, radius };
}

/**
 * Smallest ring radius that leaves NODE_GAP between every adjacent pair.
 *
 * Adjacent centres sit at angles 2*pi*i/n, so the chord between them has length
 * s = 2*R*sin(pi/n) and splits into |dx| = s*|sin(mid)|, |dy| = s*|cos(mid)|.
 * Two axis-aligned boxes clear each other along whichever axis first exceeds
 * their combined half-extent plus the gap, so each pair constrains s from below.
 */
function gapRadius(nodeSizes: Size[], isMedia: boolean[], gap: number): number {
  const n = nodeSizes.length;
  if (n < 2) return 0;

  const chord = 2 * Math.sin(Math.PI / n);
  let required = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mid = (2 * Math.PI * i) / n + Math.PI / n;
    const alongX = Math.abs(Math.sin(mid));
    const alongY = Math.abs(Math.cos(mid));
    const si = nodeSizes[i]!;
    const sj = nodeSizes[j]!;

    const needX = (si.width + sj.width) / 2 + gap;
    const needY =
      (si.height + (isMedia[i]! ? LABEL_ALLOWANCE : 0) +
        sj.height + (isMedia[j]! ? LABEL_ALLOWANCE : 0)) / 2 + gap;

    let pair = Infinity;
    if (alongX > EPS) pair = Math.min(pair, needX / alongX);
    if (alongY > EPS) pair = Math.min(pair, needY / alongY);
    if (pair < Infinity) required = Math.max(required, pair);
  }

  return required / chord;
}

/** Box centres on the ring, shifted so the composition's reserved bounds are centred. */
function centreRing(nodeSizes: Size[], isMedia: boolean[], radius: number, ctx: RingCtx): CenteredRect[] {
  const n = nodeSizes.length;
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const rects: CenteredRect[] = [];

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const size = nodeSizes[i]!;
    rects.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      width: size.width,
      height: size.height,
    });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!;
    // A media label hangs below its box, so the reserved extent grows downward.
    const bottom = r.y + r.height / 2 + (isMedia[i]! ? LABEL_ALLOWANCE : 0);
    minX = Math.min(minX, r.x - r.width / 2);
    maxX = Math.max(maxX, r.x + r.width / 2);
    minY = Math.min(minY, r.y - r.height / 2);
    maxY = Math.max(maxY, bottom);
  }

  const dx = ctx.width / 2 - (minX + maxX) / 2;
  const dy = ctx.height / 2 - (minY + maxY) / 2;
  return rects.map((r) => ({ ...r, x: r.x + dx, y: r.y + dy }));
}

function rectsInsideCanvas(rects: CenteredRect[], isMedia: boolean[], ctx: RingCtx): boolean {
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!;
    const bottom = r.y + r.height / 2 + (isMedia[i]! ? LABEL_ALLOWANCE : 0);
    // No rounding margin is needed. This check is strict on the float edge, and
    // boundsFromRects rounds the top-left by at most 0.5px on an integer width,
    // so an edge that passes here is emitted at most exactly on the canvas bound.
    if (r.x - r.width / 2 < 0 || r.y - r.height / 2 < 0) return false;
    if (r.x + r.width / 2 > ctx.width || bottom > ctx.height) return false;
  }
  return true;
}

function boundsFromRects(ordered: string[], rects: CenteredRect[], nodeSizes: Size[]): Map<string, Bounds> {
  const bounds = new Map<string, Bounds>();
  for (let i = 0; i < ordered.length; i++) {
    const r = rects[i]!;
    const size = nodeSizes[i]!;
    bounds.set(ordered[i]!, {
      x: Math.round(r.x - size.width / 2),
      y: Math.round(r.y - size.height / 2),
      width: size.width,
      height: size.height,
    });
  }
  return bounds;
}

function placeRing(ordered: string[], nodeSizes: Size[], radius: number, ctx: RingCtx): Map<string, Bounds> {
  const n = ordered.length;
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const bounds = new Map<string, Bounds>();
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const size = nodeSizes[i]!;
    bounds.set(ordered[i]!, {
      x: Math.round(cx + radius * Math.cos(angle) - size.width / 2),
      y: Math.round(cy + radius * Math.sin(angle) - size.height / 2),
      width: size.width,
      height: size.height,
    });
  }
  return bounds;
}