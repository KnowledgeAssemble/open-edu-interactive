import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TimelineEngine } from '../src/engine.js';
import type { EngineSpec } from '@knowledgeassemble/interactive-engine';

const FIXTURE_DIR = new URL('../fixture/', import.meta.url);

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

function loadSpec(name: string): EngineSpec {
  const url = new URL(`${name}/input.timeline.json`, FIXTURE_DIR);
  return JSON.parse(readFileSync(url, 'utf8')) as EngineSpec;
}

function laneRects(svg: string): Array<{ y: number; height: number }> {
  const out: Array<{ y: number; height: number }> = [];
  const re = /<rect[^>]*data-oedu-role="track-lane"[^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/g;
  for (const match of svg.matchAll(re)) {
    out.push({ y: Number(match[1]), height: Number(match[2]) });
  }
  return out;
}

describe('TimelineEngine — render output has visible primitives (N1.7)', () => {
  it('events fixture SVG contains <circle> event markers and <text> labels', () => {
    const spec = loadSpec('events');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-events-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toContain('<circle');
    expect(svg).toContain('<text');
    expect(svg).toContain('data-oedu-role="track-lane"');
    expect(svg).toMatch(/<text[^>]*aria-label="[^"]+"/);
    expect(svg).toContain('<title');
  });

  it('periods fixture SVG contains <rect> period bands and <circle> events', () => {
    const spec = loadSpec('periods');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-periods-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toContain('<rect');
    expect(svg).toContain('<circle');
  });

  it('duration events (W-2.5): a span bar renders as a rect and the linear alternative exposes the span', () => {
    const spec = loadSpec('duration-events');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-duration-render');
    const snap = inst.snapshot() as unknown as { svgResult: { svg: string; linear: Array<{ kind: string; id: string; from?: string; to?: string }> } };

    expect(snap.svgResult.svg).toContain('data-oedu-role="period-band"');
    expect(snap.svgResult.svg).toContain('id="war-span"');
    const spans = snap.svgResult.linear.filter((r) => r.kind === 'span');
    expect(spans.length).toBeGreaterThanOrEqual(1);
    expect(spans[0]?.from).toBeDefined();
    expect(spans[0]?.to).toBeDefined();
  });

  it('tracks fixture SVG shows labeled track lanes and event markers', () => {
    const spec = loadSpec('tracks');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-tracks-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    const lanes = laneRects(svg);
    expect(lanes.length).toBeGreaterThanOrEqual(2);
    expect(svg).toMatch(/<text[^>]*data-oedu-role="label"[^>]*aria-label="[^"]+"/);
    expect(svg).toContain('<circle');
  });

  it('independence fixture SVG has non-overlapping track lanes with events and periods', () => {
    const spec = loadSpec('independence');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-independence-render');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    expect(svg).toContain('<circle');
    expect(svg).toContain('<rect');
    expect(svg).toMatch(/data-oedu-role/);

    const lanes = laneRects(svg).sort((a, b) => a.y - b.y);
    expect(lanes.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < lanes.length; i += 1) {
      expect(lanes[i]!.y).toBeGreaterThanOrEqual(lanes[i - 1]!.y + lanes[i - 1]!.height);
    }
  });

  it('events fixture SVG is not hollow (has meaningful content)', () => {
    const spec = loadSpec('events');
    const engine = new TimelineEngine();
    const inst = engine.instantiate(spec, stubHost(), 'tl-events-nonhollow');
    const svg = (inst.snapshot() as unknown as { svgResult: { svg: string } }).svgResult.svg;

    const hollowPattern = /^<svg[^>]*>\s*<title>[^<]*<\/title>\s*<desc>[^<]*<\/desc>\s*<g[^>]*>\s*<\/g>\s*<\/svg>\s*$/;
    expect(svg).not.toMatch(hollowPattern);
  });
});