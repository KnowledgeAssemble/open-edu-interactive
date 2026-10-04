import { describe, it, expect } from 'vitest';
import {
  centerOf,
  clampPoint,
  computeEdgeGeometry,
  dominantSides,
  sideAnchor,
} from '../src/layout/edge-geometry.js';
import type { Point } from '../src/layout/edge-geometry.js';
import type { Bounds } from '../src/scene/types.js';

/** Strictly-inside test; local to the test so src/ carries no test-only export. */
function pointInInterior(b: Bounds, p: Point): boolean {
  return p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height;
}

const CANVAS = { width: 800, height: 600 };

function box(x: number, y: number, width = 100, height = 50): Bounds {
  return { x, y, width, height };
}

describe('centerOf', () => {
  it('returns the box midpoint', () => {
    expect(centerOf(box(40, 60, 220, 120))).toEqual({ x: 150, y: 120 });
  });
});

describe('dominantSides', () => {
  it('picks bottom-to-top when the target is directly below', () => {
    expect(dominantSides(box(0, 0, 100, 50), box(0, 200, 100, 50))).toEqual({ from: 'bottom', to: 'top' });
  });

  it('picks top-to-bottom when the target is directly above', () => {
    expect(dominantSides(box(0, 200, 100, 50), box(0, 0, 100, 50))).toEqual({ from: 'top', to: 'bottom' });
  });

  it('picks right-to-left when the target is directly right', () => {
    expect(dominantSides(box(0, 0, 100, 50), box(400, 0, 100, 50))).toEqual({ from: 'right', to: 'left' });
  });

  it('picks left-to-right when the target is directly left', () => {
    expect(dominantSides(box(400, 0, 100, 50), box(0, 0, 100, 50))).toEqual({ from: 'left', to: 'right' });
  });

  it('breaks an exact diagonal tie toward the vertical axis, deterministically', () => {
    const from = box(0, 0, 100, 50);
    const to = box(100, 100, 100, 50);
    expect(dominantSides(from, to)).toEqual({ from: 'bottom', to: 'top' });
    expect(dominantSides(from, to)).toEqual(dominantSides(from, to));
  });
});

describe('sideAnchor', () => {
  it('returns the midpoint of each side', () => {
    const b = box(40, 60, 220, 120);
    expect(sideAnchor(b, 'top')).toEqual({ x: 150, y: 60 });
    expect(sideAnchor(b, 'bottom')).toEqual({ x: 150, y: 180 });
    expect(sideAnchor(b, 'left')).toEqual({ x: 40, y: 120 });
    expect(sideAnchor(b, 'right')).toEqual({ x: 260, y: 120 });
  });

  it('always lands exactly on the box boundary', () => {
    const b = box(40, 60, 220, 120);
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      expect(pointInInterior(b, sideAnchor(b, side))).toBe(false);
    }
  });
});

describe('pointInInterior', () => {
  it('treats a strictly interior point as interior', () => {
    expect(pointInInterior(box(0, 0, 100, 50), { x: 50, y: 25 })).toBe(true);
  });

  it('treats boundary points as not interior', () => {
    const b = box(0, 0, 100, 50);
    expect(pointInInterior(b, { x: 50, y: 0 })).toBe(false);
    expect(pointInInterior(b, { x: 0, y: 25 })).toBe(false);
    expect(pointInInterior(b, { x: 100, y: 50 })).toBe(false);
  });

  it('treats outside points as not interior', () => {
    expect(pointInInterior(box(0, 0, 100, 50), { x: 500, y: 25 })).toBe(false);
  });
});

describe('computeEdgeGeometry', () => {
  it('anchors a downward edge on the source bottom and target top borders', () => {
    const geo = computeEdgeGeometry(box(40, 57, 220, 120), box(40, 211, 220, 120), CANVAS);
    expect(geo.points).toEqual([{ x: 150, y: 177 }, { x: 150, y: 211 }]);
    expect(geo.path).toBe('M150,177 L150,211');
    expect(geo.type).toBe('line');
  });

  it('never returns a point strictly inside either endpoint box', () => {
    const from = box(40, 57, 220, 120);
    const to = box(40, 211, 220, 120);
    const geo = computeEdgeGeometry(from, to, CANVAS);
    for (const p of geo.points) {
      expect(pointInInterior(from, p)).toBe(false);
      expect(pointInInterior(to, p)).toBe(false);
    }
  });

  it('does not return node centers', () => {
    const from = box(40, 57, 220, 120);
    const to = box(40, 211, 220, 120);
    const geo = computeEdgeGeometry(from, to, CANVAS);
    expect(geo.points).not.toContainEqual(centerOf(from));
    expect(geo.points).not.toContainEqual(centerOf(to));
  });

  it('keeps the target endpoint outside the target interior for a rightward edge', () => {
    const from = box(0, 100, 100, 50);
    const to = box(300, 100, 100, 50);
    const geo = computeEdgeGeometry(from, to, CANVAS);
    expect(geo.points).toEqual([{ x: 100, y: 125 }, { x: 300, y: 125 }]);
  });

  it('produces a non-degenerate segment when boxes touch exactly', () => {
    const from = box(0, 0, 100, 100);
    const to = box(0, 100, 100, 100);
    const geo = computeEdgeGeometry(from, to, CANVAS);
    const [a, b] = geo.points;
    expect(Number.isFinite(a!.x)).toBe(true);
    expect(Number.isFinite(b!.x)).toBe(true);
    const length = Math.hypot(b!.x - a!.x, b!.y - a!.y);
    expect(length).toBeGreaterThan(0);
  });

  it('produces a non-degenerate segment for coincident boxes', () => {
    const b = box(100, 100, 100, 50);
    const geo = computeEdgeGeometry(b, { ...b }, CANVAS);
    const [a, c] = geo.points;
    expect(Number.isFinite(a!.x)).toBe(true);
    expect(Number.isFinite(c!.y)).toBe(true);
    expect(Math.hypot(c!.x - a!.x, c!.y - a!.y)).toBeGreaterThan(0);
  });

  it('clamps endpoints into the canvas when layout degenerates outside it', () => {
    const from = box(-40, -40, 100, 50);
    const to = box(-40, 400, 100, 50);
    const geo = computeEdgeGeometry(from, to, CANVAS);
    for (const p of geo.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(CANVAS.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(CANVAS.height);
    }
  });

  it('is deterministic across repeated calls', () => {
    const from = box(40, 57, 220, 120);
    const to = box(300, 400, 100, 50);
    expect(JSON.stringify(computeEdgeGeometry(from, to, CANVAS))).toBe(
      JSON.stringify(computeEdgeGeometry(from, to, CANVAS)),
    );
  });
});

describe('clampPoint', () => {
  it('clamps into the canvas bounds', () => {
    expect(clampPoint({ x: -10, y: -10 }, CANVAS)).toEqual({ x: 0, y: 0 });
    expect(clampPoint({ x: 9000, y: 9000 }, CANVAS)).toEqual({ x: 800, y: 600 });
    expect(clampPoint({ x: 10, y: 10 }, CANVAS)).toEqual({ x: 10, y: 10 });
  });
});
