import { describe, expect, it } from 'vitest';
import { svgFrom } from '../src/render/svg.js';
import type { SceneNode, Scene } from '../src/scene/types.js';

function makeInteractiveLabel(id: string, value: number, emphasized?: boolean): SceneNode {
  return {
    id, role: 'number', kind: 'text', value, label: String(value),
    interactive: true, acceptsActions: ['select', 'focus'],
    metadata: emphasized ? { emphasized: true } : undefined,
    bounds: { x: 20, y: 20, width: 44, height: 44 },
    children: [],
  };
}

describe('svgFrom', () => {
  it('produces valid SVG output', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'number-line-axis',
          role: 'axis',
          kind: 'line',
          children: [],
        },
        {
          id: 'number-line-tick-0',
          role: 'tick',
          kind: 'tick',
          value: 0,
          children: [],
        },
        {
          id: 'number-line-label-7',
          role: 'number',
          kind: 'text',
          value: 7,
          label: '7',
          children: [],
        },
        {
          id: 'number-line-marker-7',
          role: 'marker',
          kind: 'circle',
          value: 7,
          interactive: true,
          acceptsActions: ['select', 'focus'],
          children: [],
        },
      ],
      semantics: {},
    };

    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('data-oedu-role="marker"');
    expect(result.svg).toContain('data-oedu-value="7"');
    expect(result.svg).toContain('aria-label="7"');
    expect(result.svg).not.toContain('onclick');
    expect(result.svg).not.toContain('<script');
  });

  it('is deterministic across two runs', () => {
    const scene: Scene = {
      nodes: [{ id: 'x', role: 'axis', kind: 'line', children: [] }],
      semantics: {},
    };
    const r1 = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const r2 = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(r1.svg).toBe(r2.svg);
  });

  it('produces a11y tree with interactive nodes', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'marker-7',
          role: 'marker',
          kind: 'circle',
          value: 7,
          interactive: true,
          acceptsActions: ['select'],
          children: [],
        },
      ],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.a11y.length).toBeGreaterThan(0);
    expect(result.interactive).toContainEqual({ id: 'marker-7', action: 'select' });
  });

  it('renders wedge as path', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'fc',
          role: 'group',
          kind: 'fraction-circle',
          children: [
            {
              id: 'fc-sector-0', role: 'fraction-part', kind: 'wedge',
              children: [],
              metadata: { cx: 100, cy: 100, r: 50, startAngle: 0, endAngle: 90 },
            },
          ],
        },
      ],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('<path');
    expect(result.svg).toContain('data-oedu-role="fraction-part"');
  });

  it('renders interactive text with data-oedu-interactive attribute', () => {
    const scene: Scene = {
      nodes: [makeInteractiveLabel('nl-label-5', 5)],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('data-oedu-interactive="true"');
    expect(result.svg).toContain('data-oedu-hit-target="true"');
    expect(result.svg).toContain('id="nl-label-5"');
  });

  it('renders emphasized text with font-weight bold', () => {
    const scene: Scene = {
      nodes: [makeInteractiveLabel('nl-label-7', 7, true)],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('font-weight="bold"');
  });

  it('discovery SVG text labels have no marker circles', () => {
    const scene: Scene = {
      nodes: [
        makeInteractiveLabel('nl-label-0', 0),
        makeInteractiveLabel('nl-label-1', 1),
      ],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const circleMatches = result.svg.match(/data-oedu-role="marker"/g) ?? [];
    expect(circleMatches).toHaveLength(0);
  });

  it('renders an entity as a media slot: faint frame, label below, no dominant-baseline', () => {
    const scene: Scene = {
      nodes: [
        {
          id: 'illustration-sun',
          role: 'selectable',
          kind: 'entity',
          label: 'Sun',
          interactive: true,
          acceptsActions: ['select', 'focus'],
          bounds: { x: 40, y: 240, width: 220, height: 120 },
          children: [],
        },
      ],
      semantics: {},
    };
    const result = svgFrom(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.svg).toContain('data-oedu-media="slot"');
    expect(result.svg).toContain('data-oedu-bounds="40,240,220,120"');
    expect(result.svg).toContain('opacity="0.15"');
    expect(result.svg).not.toContain('opacity="0.85"');
    expect(result.svg).not.toContain('fill="white"');
    expect(result.svg).not.toContain('dominant-baseline');
    const text = /<text[^>]*y="(\d+)"[^>]*>Sun<\/text>/.exec(result.svg);
    expect(text).not.toBeNull();
    expect(Number(text![1])).toBeGreaterThan(240 + 120);
    expect(result.svg).not.toContain('<image');
    expect(result.svg).not.toContain('xlink:href');
  });
});