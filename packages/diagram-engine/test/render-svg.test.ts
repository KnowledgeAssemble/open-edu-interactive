import { describe, it, expect } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import type { DiagramContent } from '../src/schema.js';

const WATER_CYCLE: DiagramContent = {
  kind: 'cycle',
  nodes: [
    { id: 'evaporation', label: 'Evaporation' },
    { id: 'condensation', label: 'Condensation' },
    { id: 'precipitation', label: 'Precipitation' },
    { id: 'collection', label: 'Collection' },
  ],
  edges: [
    { from: 'evaporation', to: 'condensation', relationship: 'leads-to' },
    { from: 'condensation', to: 'precipitation', relationship: 'leads-to' },
    { from: 'precipitation', to: 'collection', relationship: 'leads-to' },
    { from: 'collection', to: 'evaporation', relationship: 'leads-to' },
  ],
};

describe('layout edge geometry', () => {
  it('assigns edge geometry with endpoints inside canvas', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const root = laidOut.nodes.find(n => n.kind === 'diagram');
    const edges = root ? root.children.filter(n => n.kind === 'edge') : [];
    expect(edges.length).toBe(4);
    for (const edge of edges) {
      const geo = edge.metadata?.edgeGeometry as { points?: Array<{ x: number; y: number }> } | undefined;
      expect(geo).toBeDefined();
      expect(geo?.points).toBeDefined();
      for (const p of geo!.points!) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(ctx.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(ctx.height);
      }
    }
  });
});

describe('svgFrom edge rendering', () => {
  it('renders real edges with arrowhead and data-oedu-relationship', () => {
    const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, ctx, 'radial');
    const result = svgFrom(laidOut, ctx, 'Water Cycle', 'Test');
    expect(result.svg).toContain('marker-end="url(#arrowhead)"');
    expect(result.svg).toContain('data-oedu-relationship="leads-to"');
    expect(result.svg).not.toContain('<g>');
    const edgeCount = result.svg.split('data-oedu-relationship').length - 1;
    expect(edgeCount).toBe(4);
  });
});

const MEDIA_CYCLE: DiagramContent = {
  kind: 'cycle',
  nodes: [
    { id: 'a', label: 'Alpha', media: { kind: 'figure' } },
    { id: 'b', label: 'Beta', description: 'A caption', media: { kind: 'figure' } },
  ],
  edges: [
    { from: 'a', to: 'b', relationship: 'leads-to' },
    { from: 'b', to: 'a', relationship: 'leads-to' },
  ],
};

describe('media node rendering', () => {
  const CTX = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

  function renderMediaSvg(): string {
    const scene = buildScene(MEDIA_CYCLE);
    const laidOut = layout(scene, CTX, 'radial');
    return svgFrom(laidOut, CTX, 'Media', 'Test').svg;
  }

  it('emits data-oedu-media and data-oedu-bounds with mid before aria-label and tail last', () => {
    const svg = renderMediaSvg();
    const b = /id="node-b"[^>]*>/.exec(svg);
    expect(b).not.toBeNull();
    const tag = b![0];
    expect(tag.indexOf('data-oedu-media="slot"')).toBeGreaterThanOrEqual(0);
    expect(tag.indexOf('data-oedu-media="slot"')).toBeLessThan(tag.indexOf('aria-label="Beta"'));
    expect(tag.indexOf('aria-label="Beta"')).toBeLessThan(tag.indexOf('data-oedu-bounds'));
    expect(tag.indexOf('title="A caption"')).toBeGreaterThan(tag.indexOf('data-oedu-bounds'));
  });

  it('renders a faint frame with no solid fill and no white ink', () => {
    const svg = renderMediaSvg();
    expect(svg).toContain('opacity="0.15"');
    expect(svg).not.toContain('opacity="0.85"');
    expect(svg).not.toContain('fill="white"');
  });

  it('places the label below the box', () => {
    const svg = renderMediaSvg();
    const b = /data-oedu-bounds="(\d+),(\d+),(\d+),(\d+)"/.exec(svg);
    expect(b).not.toBeNull();
    const y = Number(b![2]);
    const height = Number(b![4]);
    const text = /<text[^>]*y="(\d+)"[^>]*>Alpha<\/text>/.exec(svg);
    expect(text).not.toBeNull();
    expect(Number(text![1])).toBeGreaterThan(y + height);
  });

  it('forwards a description into a title attribute (tail not dropped)', () => {
    const svg = renderMediaSvg();
    expect(svg).toContain('title="A caption"');
  });

  it('non-media node SVG is unchanged from before media support', () => {
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, CTX, 'radial');
    const svg = svgFrom(laidOut, CTX, 'Water Cycle', 'Test').svg;
    const line = svg.split('\n').find((l) => l.includes('id="node-evaporation"'));
    expect(line).toBe(
      '    <rect id="node-evaporation" data-oedu-role="selectable" data-oedu-interactive="true" aria-label="Evaporation" x="610" y="270" width="60" height="60" rx="6" fill="currentColor" opacity="0.85" stroke="currentColor" stroke-width="1.5"/>',
    );
  });

  it('never emits <image or xlink:href for any variant', () => {
    const mediaSvg = renderMediaSvg();
    expect(mediaSvg).not.toContain('<image');
    expect(mediaSvg).not.toContain('xlink:href');
    const scene = buildScene(WATER_CYCLE);
    const laidOut = layout(scene, CTX, 'radial');
    const plainSvg = svgFrom(laidOut, CTX, 'Water Cycle', 'Test').svg;
    expect(plainSvg).not.toContain('<image');
    expect(plainSvg).not.toContain('xlink:href');
  });
});