import { describe, expect, it } from 'vitest';
import { escapeXml, centerOf, fmt, polygonPoints, starPoints } from '../src/base.js';

describe('escapeXml', () => {
  it('escapes & < > and double quotes', () => {
    expect(escapeXml('& < > "')).toBe('&amp; &lt; &gt; &quot;');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeXml('plain')).toBe('plain');
  });
});

describe('centerOf', () => {
  it('returns the center of a bounds rect', () => {
    expect(centerOf({ x: 0, y: 0, width: 10, height: 20 })).toEqual({ cx: 5, cy: 10 });
    expect(centerOf({ x: 2, y: 4, width: 6, height: 8 })).toEqual({ cx: 5, cy: 8 });
  });
});

describe('fmt', () => {
  it('rounds to two decimal places', () => {
    expect(fmt(1)).toBe('1');
    expect(fmt(1.5)).toBe('1.5');
    expect(fmt(1.234)).toBe('1.23');
    expect(fmt(0)).toBe('0');
  });
});

describe('polygonPoints', () => {
  it('returns a single center point when sides < 3', () => {
    expect(polygonPoints(0, 0, 10, 2)).toEqual([{ x: 0, y: 0 }]);
  });

  it('produces the expected number of vertices on the radius', () => {
    const pts = polygonPoints(0, 0, 10, 3);
    expect(pts).toHaveLength(3);
    for (const p of pts) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(10);
    }
  });
});

describe('starPoints', () => {
  it('produces points * 2 vertices alternating radius', () => {
    const pts = starPoints(0, 0, 10, 4, 5);
    expect(pts).toHaveLength(10);
    expect(Math.hypot(pts[0]!.x, pts[0]!.y)).toBeCloseTo(10);
    expect(Math.hypot(pts[1]!.x, pts[1]!.y)).toBeCloseTo(4);
  });
});