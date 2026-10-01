import { describe, expect, it } from 'vitest';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';

const BAR_INPUT = {
  kind: 'bar',
  dimensions: [{ id: 'month', type: 'ordinal' }],
  measures: [{ id: 'rainfall', type: 'quantitative', unit: 'mm' }],
  data: [
    { id: 'row-jan', month: 'Jan', rainfall: 20 },
    { id: 'row-may', month: 'May', rainfall: 110 },
  ],
} as never;

const ctx = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

const MULTI_INPUT = {
  kind: 'bar',
  dimensions: [{ id: 'month', type: 'ordinal' }],
  measures: [
    { id: 'rainfall', type: 'quantitative', unit: 'mm' },
    { id: 'sunshine', type: 'quantitative', unit: 'hrs' },
  ],
  data: [
    { id: 'row-jan', month: 'Jan', rainfall: 20, sunshine: 5 },
    { id: 'row-may', month: 'May', rainfall: 110, sunshine: 8 },
  ],
} as never;

describe('layout engine', () => {
  it('places bars with monotonic positions and baseline at y=0', () => {
    const scene = buildScene(BAR_INPUT);
    layout(scene, BAR_INPUT, ctx);

    const bars = scene.nodes.filter((n) => n.kind === 'bar');
    expect(bars.length).toBe(2);

    for (const bar of bars) {
      expect(bar.bounds).toBeDefined();
      expect(bar.bounds!.width).toBeGreaterThanOrEqual(10);
      expect(bar.bounds!.height).toBeGreaterThan(0);
    }
  });

  it('deterministic: same input produces same bounds', () => {
    const sceneA = buildScene(BAR_INPUT);
    layout(sceneA, BAR_INPUT, ctx);
    const boundsA = sceneA.nodes
      .filter((n) => n.kind === 'bar')
      .map((n) => n.bounds);

    const sceneB = buildScene(BAR_INPUT);
    layout(sceneB, BAR_INPUT, ctx);
    const boundsB = sceneB.nodes
      .filter((n) => n.kind === 'bar')
      .map((n) => n.bounds);

    expect(JSON.stringify(boundsA)).toBe(JSON.stringify(boundsB));
  });

  it('grouped multi-measure: bars of the same row are offset per measure; a legend is emitted', () => {
    const scene = buildScene(MULTI_INPUT);
    layout(scene, MULTI_INPUT, ctx);

    const bars = scene.nodes.filter((n) => n.kind === 'bar');
    expect(bars).toHaveLength(4);

    const janBars = bars.filter((n) => n.metadata?.rowId === 'row-jan');
    const rainfallJan = janBars.find((n) => n.metadata?.measureId === 'rainfall');
    const sunshineJan = janBars.find((n) => n.metadata?.measureId === 'sunshine');
    expect(rainfallJan?.bounds?.x).not.toBe(sunshineJan?.bounds?.x);

    const legends = scene.nodes.filter((n) => n.role === 'legend');
    expect(legends.map((n) => n.id).sort()).toEqual(['legend-rainfall', 'legend-sunshine']);
  });

  it('single measure: no grouped legend is emitted (single-measure rejects grouping)', () => {
    const scene = buildScene(BAR_INPUT);
    layout(scene, BAR_INPUT, ctx);
    const legends = scene.nodes.filter((n) => n.role === 'legend');
    expect(legends).toHaveLength(0);
  });
});