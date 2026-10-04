import type { Bounds } from '../scene/types.js';

export interface Point {
  x: number;
  y: number;
}

export type BoxSide = 'top' | 'bottom' | 'left' | 'right';

export interface EdgeGeometry {
  type: 'line' | 'path';
  points: Point[];
  path?: string;
}

interface Canvas {
  width: number;
  height: number;
}

const EPSILON = 1e-9;
const MIN_EDGE_LENGTH = 8;

export function centerOf(b: Bounds): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Midpoint of one edge of the box; always lies on the box boundary. */
export function sideAnchor(b: Bounds, side: BoxSide): Point {
  const c = centerOf(b);
  switch (side) {
    case 'top':
      return { x: c.x, y: b.y };
    case 'bottom':
      return { x: c.x, y: b.y + b.height };
    case 'left':
      return { x: b.x, y: c.y };
    case 'right':
      return { x: b.x + b.width, y: c.y };
  }
}

/**
 * Picks the facing pair of sides for the dominant axis between two boxes.
 * Ties resolve to the vertical axis so output stays deterministic.
 */
export function dominantSides(from: Bounds, to: Bounds): { from: BoxSide; to: BoxSide } {
  const dx = centerOf(to).x - centerOf(from).x;
  const dy = centerOf(to).y - centerOf(from).y;
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' };
  }
  return dx >= 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' };
}

export function clampPoint(p: Point, canvas: Canvas): Point {
  return {
    x: Math.max(0, Math.min(canvas.width, p.x)),
    y: Math.max(0, Math.min(canvas.height, p.y)),
  };
}

/**
 * Anchors an edge on the borders of both endpoint boxes so the stroke and the
 * arrowhead stop at the node outline instead of running through the node.
 */
export function computeEdgeGeometry(
  fromBounds: Bounds,
  toBounds: Bounds,
  canvas: Canvas,
): EdgeGeometry {
  const sides = dominantSides(fromBounds, toBounds);
  const start = sideAnchor(fromBounds, sides.from);
  const end = sideAnchor(toBounds, sides.to);

  const points = resolveSegment(start, end, fromBounds, toBounds).map((p) => clampPoint(p, canvas));

  const first = points[0]!;
  const last = points[1]!;
  return {
    type: 'line',
    points,
    path: `M${first.x},${first.y} L${last.x},${last.y}`,
  };
}

/**
 * Touching or coincident boxes produce identical anchors and a zero-length
 * segment, which would hide the arrowhead. Back the tail off along the
 * dominant axis so the tip still lands on the target border.
 */
function resolveSegment(start: Point, end: Point, fromBounds: Bounds, toBounds: Bounds): [Point, Point] {
  if (Math.hypot(end.x - start.x, end.y - start.y) >= EPSILON) {
    return [start, end];
  }
  const axis = dominantAxis(fromBounds, toBounds);
  const back = axis === 'vertical' ? { x: 0, y: -MIN_EDGE_LENGTH } : { x: -MIN_EDGE_LENGTH, y: 0 };
  const forward = axis === 'vertical' ? { x: 0, y: MIN_EDGE_LENGTH } : { x: MIN_EDGE_LENGTH, y: 0 };
  const goesForward =
    axis === 'vertical'
      ? toBounds.y >= fromBounds.y
      : toBounds.x >= fromBounds.x;
  if (goesForward) {
    return [{ x: start.x + back.x, y: start.y + back.y }, end];
  }
  return [start, { x: end.x + forward.x, y: end.y + forward.y }];
}

function dominantAxis(from: Bounds, to: Bounds): 'vertical' | 'horizontal' {
  const dx = centerOf(to).x - centerOf(from).x;
  const dy = centerOf(to).y - centerOf(from).y;
  return Math.abs(dy) >= Math.abs(dx) ? 'vertical' : 'horizontal';
}
