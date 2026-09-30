import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChartEngine } from '../src/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function stubHost() {
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (id: string) => id,
  };
}

function loadSpec(fixture: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(__dirname, '..', 'fixture', fixture, 'input.chart.json'), 'utf-8')) as Record<string, unknown>;
}

describe('ChartEngine — render output has visible primitives (N1.7)', () => {
  it('bar fixture SVG contains <rect> bars, <text> labels, and aria-labels', () => {
    const spec = loadSpec('bar');
    const engine = new ChartEngine();
    const inst = engine.instantiate(spec as never, stubHost(), 'chart-bar-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toContain('<rect');
    expect(svg).toContain('<text');
    expect(svg).toMatch(/<text[^>]*data-oedu-role="label"[^>]*aria-label="[^"]+"/);
    expect(svg).toMatch(/data-oedu-role="selectable"/);
  });

  it('line fixture SVG renders a series stroke between point markers (W-2.4), markers stay selectable', () => {
    const spec = loadSpec('line');
    const engine = new ChartEngine();
    const inst = engine.instantiate(spec as never, stubHost(), 'chart-line-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    const markers = svg.match(/<circle/g) ?? [];
    expect(markers.length).toBeGreaterThanOrEqual(4);
    expect(svg).toMatch(/<polyline id="series-line"[^>]*data-oedu-role="series"/);
    expect(svg).toMatch(/<polyline[^>]*points="[^"]+"/);
    expect(svg).toContain('<text');
    expect(svg).toMatch(/<text[^>]*data-oedu-role="label"[^>]*aria-label="[^"]+"/);
  });

  it('bar fixture SVG is not hollow (has meaningful content beyond wrappers)', () => {
    const spec = loadSpec('bar');
    const engine = new ChartEngine();
    const inst = engine.instantiate(spec as never, stubHost(), 'chart-bar-nonhollow');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    const hollowPattern = /^<svg[^>]*>\s*<title>[^<]*<\/title>\s*<desc>[^<]*<\/desc>\s*<g[^>]*>\s*<\/g>\s*<\/svg>\s*$/;
    expect(svg).not.toMatch(hollowPattern);
  });
});