import { test, expect } from '@playwright/test';

const SPECS = {
  region: 'packages/geomap-engine/fixture/region/input.geomap.json',
  encoding: 'packages/geomap-engine/fixture/encoding/input.geomap.json',
  overlay: 'packages/geomap-engine/fixture/overlay/input.geomap.json',
  'route-step': 'packages/geomap-engine/fixture/route-step/input.geomap.json',
  linear: 'packages/geomap-engine/fixture/linear/input.geomap.json',
};

interface DisplayState {
  filterCategories: string[];
  activeRouteSteps: Record<string, number>;
  hiddenLayerIds: string[];
}

interface AltRow {
  entityId: string;
  name: string;
  location: string;
  type?: string;
  measureValue?: number;
  encodingBucket?: string;
  adjacentTo?: string[];
}

interface Harness {
  dispatch(a: unknown): void;
  snapshot(): {
    selection: string[];
    displayState: DisplayState;
    svgResult?: { svg?: string };
  };
  events(): Array<{ name: string }>;
  svg(): string;
  alternative(): AltRow[];
}

async function mount(page: import('@playwright/test').Page, fixture: keyof typeof SPECS): Promise<void> {
  await page.goto(`/?engine=geomap&spec=${SPECS[fixture]}`);
  await page.waitForFunction(() => !!(window as unknown as { __geomapHarness?: unknown }).__geomapHarness);
}

test.describe('GeoMap W-1 reconciliation — attr-encoding / filter-category (gm-dist-*, gm-cmp-*, gm-ovl-*, gm-r4)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'encoding');
  });

  test('gm-dist-1 / gm-cmp-2: region fill encodes measure; selection payload carries the measure value', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-eco-r4' } });
      const events = harness.events().map((e) => e.name);
      const alt = harness.alternative();
      const r4 = alt.find((a) => a.entityId === 'r4');
      return { selected: harness.snapshot().selection, hasSelectedEvent: events.includes('geomap.entity-selected'), r4 };
    });
    expect(result.selected).toContain('geom-eco-r4');
    expect(result.hasSelectedEvent).toBe(true);
    expect(result.r4?.measureValue).toBe(500);
    expect(result.r4?.encodingBucket).toBeTruthy();
  });

  test('gm-dist-2: all regions interactive; alternative lists measure values; deterministic encoding', async ({ page }) => {
    const svg = await page.evaluate(() => (window as unknown as { __geomapHarness: Harness }).__geomapHarness.svg());
    for (const id of ['geom-eco-r1', 'geom-eco-r2', 'geom-eco-r3', 'geom-eco-r4', 'geom-eco-r5']) {
      expect(svg).toContain(`id="${id}"`);
      expect(svg).toContain('data-oedu-encoding');
    }
    const alt = await page.evaluate(() => (window as unknown as { __geomapHarness: Harness }).__geomapHarness.alternative());
    const valued = alt.filter((a) => a.measureValue !== undefined);
    expect(valued.length).toBe(5);
    for (const a of valued) expect(a.encodingBucket).toBeTruthy();
  });

  test('gm-dist-4: graduated encoding is deterministic; alternative lists values textually', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const snap = harness.snapshot();
      const alt = harness.alternative();
      return { measureCount: alt.filter((a) => a.measureValue !== undefined).length, svg: snap.svgResult?.svg ?? '' };
    });
    expect(result.measureCount).toBe(5);
    expect(result.svg).toContain('data-oedu-encoding');
  });

  test('gm-cmp-1: two candidate regions comparable; selection payload carries each value', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-eco-r1' } });
      const first = harness.snapshot().selection;
      harness.dispatch({ type: 'select', target: { id: 'geom-eco-r4' } });
      const alt = harness.alternative();
      const r1 = alt.find((a) => a.entityId === 'r1');
      const r4 = alt.find((a) => a.entityId === 'r4');
      return { first, second: harness.snapshot().selection, r1: r1?.measureValue, r4: r4?.measureValue };
    });
    expect(result.first).toContain('geom-eco-r1');
    expect(result.second).toContain('geom-eco-r4');
    expect(result.r1).toBe(10);
    expect(result.r4).toBe(500);
  });

  test('gm-cmp-3: ordered selects emitted in sequence; alternative lists relief hint (measureValue) per region', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'select', target: { id: 'geom-eco-r1' } });
      harness.dispatch({ type: 'select', target: { id: 'geom-eco-r3' } });
      harness.dispatch({ type: 'select', target: { id: 'geom-eco-r4' } });
      const newEvents = harness.events().slice(before);
      const alt = harness.alternative();
      return { hints: alt.map((a) => a.measureValue).filter((v) => v !== undefined), names: newEvents.map((e) => e.name) };
    });
    expect(result.hints).toEqual([10, 150, 300, 500, 50]);
    expect(result.names.filter((n) => n === 'geomap.entity-selected').length).toBe(3);
  });

  test('gm-r4 / gm-dist-3: filter narrows by category; geomap.filter-applied logged; clear-filter restores', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'filter', payload: { categories: ['zone-a'] } });
      const filtered = harness.events().slice(before).map((e) => e.name);
      const cats = harness.snapshot().displayState.filterCategories;
      harness.dispatch({ type: 'clear-filter' });
      const cleared = harness.snapshot().displayState.filterCategories;
      return { filtered, cats, cleared };
    });
    expect(result.filtered).toContain('geomap.filter-applied');
    expect(result.cats).toEqual(['zone-a']);
    expect(result.cleared).toEqual([]);
  });
});

test.describe('GeoMap W-1 reconciliation — layer-visibility / overlay (gm-ovl-*, gm-inq-1)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'overlay');
  });

  test('gm-ovl-1: toggling preserves selection identity; alternative lists visible region sets', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-risk-nz' } });
      const selBefore = harness.snapshot().selection;
      harness.dispatch({ type: 'toggle', target: { id: 'geom-boundary' } });
      const selAfter = harness.snapshot().selection;
      const altWhileVisible = harness.alternative();
      harness.dispatch({ type: 'toggle', target: { id: 'geom-boundary' } });
      const altAfterHide = harness.alternative();
      return { selBefore, selAfter, visible: altWhileVisible.map((a) => a.entityId), hidden: altAfterHide.map((a) => a.entityId) };
    });
    expect(result.selBefore).toContain('geom-risk-nz');
    expect(result.selAfter).toEqual(result.selBefore);
    expect(result.visible).toContain('nz');
    expect(result.visible).toContain('bd');
    expect(result.hidden).toContain('nz');
    expect(result.hidden).not.toContain('bd');
  });

  test('gm-ovl-2: factor layers compose over one basemap; selection event carries layer + entity id', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'select', target: { id: 'geom-risk-nz' } });
      const names = harness.events().slice(before).map((e) => e.name);
      return { selected: harness.snapshot().selection, names };
    });
    expect(result.selected).toContain('geom-risk-nz');
    expect(result.names).toContain('geomap.entity-selected');
  });

  test('gm-ovl-3: hazard regions render as overlays; selection payload + alternative list', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-risk-sz' } });
      const alt = harness.alternative();
      return { selected: harness.snapshot().selection, sz: alt.find((a) => a.entityId === 'sz')?.name };
    });
    expect(result.selected).toContain('geom-risk-sz');
    expect(result.sz).toBe('South Zone');
  });

  test('gm-inq-1: multi-layer explore; alternative gives spatial description', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const alt = harness.alternative();
      return { count: alt.length, named: alt.every((a) => a.name && a.location) };
    });
    expect(result.count).toBeGreaterThan(0);
    expect(result.named).toBe(true);
  });
});

test.describe('GeoMap W-1 reconciliation — route-step (gm-t2, gm-move-1, gm-move-4)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'route-step');
  });

  test('gm-t2: step emphasises segments; geomap.route-step logged; monotonic event log', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'step', target: { id: 'geom-journey-r1' } });
      harness.dispatch({ type: 'step', target: { id: 'geom-journey-r1' } });
      const newEvents = harness.events().slice(before);
      const steps = harness.snapshot().displayState.activeRouteSteps['geom-journey-r1'];
      return { names: newEvents.map((e) => e.name), steps };
    });
    expect(result.names).toContain('geomap.route-step');
    expect(result.steps).toBe(2);
  });

  test('gm-move-1: scrub sets the step; snapshot.step mutates', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const seqBefore = harness.events().length;
      harness.dispatch({ type: 'scrub', target: { id: 'geom-journey-r1' }, payload: { step: 3 } });
      const steps = harness.snapshot().displayState.activeRouteSteps['geom-journey-r1'];
      const seqs = harness.events().slice(seqBefore);
      return { steps, grew: seqs.length > 0 };
    });
    expect(result.steps).toBe(3);
    expect(result.grew).toBe(true);
  });

  test('gm-move-4: directed route stepping; alternative lists the flow order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const alt = harness.alternative();
      return { order: alt.map((a) => a.entityId), count: alt.length };
    });
    expect(result.count).toBeGreaterThan(0);
    expect(result.order[0]).toBe('a');
  });
});

test.describe('GeoMap W-1 reconciliation — linear-feature (gm-loc-1, gm-move-2, gm-move-3)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'linear');
  });

  test('gm-loc-1: route renders as selectable segments; selection emits geomap.entity-selected; alternative lists stops', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-river-main-seg-1' } });
      const names = harness.events().map((e) => e.name);
      const alt = harness.alternative();
      return { selected: harness.snapshot().selection, names, stopCount: alt.filter((a) => a.type !== 'scale-bar').length };
    });
    expect(result.selected).toContain('geom-river-main-seg-1');
    expect(result.names).toContain('geomap.entity-selected');
    expect(result.stopCount).toBe(5);
  });

  test('gm-move-2: named stops selectable; alternative lists ports in route order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-river-main-seg-0' } });
      const alt = harness.alternative();
      return { selected: harness.snapshot().selection, first: alt[0]?.entityId, named: alt.every((a) => a.name) };
    });
    expect(result.selected).toContain('geom-river-main-seg-0');
    expect(result.first).toBe('upstream');
    expect(result.named).toBe(true);
  });

  test('gm-move-3: city markers selectable; alternative lists routes and endpoints', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-places-north' } });
      const names = harness.events().map((e) => e.name);
      return { selected: harness.snapshot().selection, names };
    });
    expect(result.selected).toContain('geom-places-north');
    expect(result.names).toContain('geomap.entity-selected');
  });
});

test.describe('GeoMap W-1 reconciliation — legend-link (gm-leg-1, gm-leg-2)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'linear');
  });

  test('gm-leg-1: choosing a legend row links matching entities without selecting; geomap.legend-linked logged', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'focus', target: { id: 'geom-legend-item-0' } });
      const newEvents = harness.events().slice(before).map((e) => e.name);
      return { names: newEvents, selection: harness.snapshot().selection };
    });
    expect(result.names).toContain('geomap.legend-linked');
    expect(result.selection).toHaveLength(0);
  });

  test('gm-leg-2: legend row focus carries symbol record; alternative exposes caption', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'focus', target: { id: 'geom-legend-item-0' } });
      const names = harness.events().map((e) => e.name);
      const alt = harness.alternative();
      return { names, hasLegend: alt.some((a) => a.name) };
    });
    expect(result.names).toContain('geomap.entity-focused');
    expect(result.hasLegend).toBe(true);
  });
});

test.describe('GeoMap W-1 reconciliation — scale-bar (gm-scale-1, gm-scale-2)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'region');
  });

  test('gm-scale-1: linear-scale node rendered and labelled; alternative provides reference distance', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const svg = harness.svg();
      const alt = harness.alternative();
      const scale = alt.find((a) => a.type === 'scale-bar');
      return { hasScaleBar: svg.includes('scale-bar') || svg.includes('geom-scale-bar'), label: scale?.name };
    });
    expect(result.hasScaleBar).toBe(true);
    expect(result.label).toMatch(/KM/);
  });

  test('gm-scale-2: reference and candidates visible; selection carries entity ids', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-regions-r1' } });
      const names = harness.events().map((e) => e.name);
      return { selected: harness.snapshot().selection, names };
    });
    expect(result.selected).toContain('geom-regions-r1');
    expect(result.names).toContain('geomap.entity-selected');
  });
});

test.describe('GeoMap W-2.6 — adjacency in the alternative list (gm-dir-1, gm-nav-2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=geomap&spec=packages/geomap-engine/fixture/region-adjacency/input.geomap.json');
    await page.waitForFunction(() => !!(window as unknown as { __geomapHarness?: unknown }).__geomapHarness);
  });

  test('gm-dir-1: target emphasised without being selectable; neighbour selection emits entity-selected; alternative lists neighbours', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'select', target: { id: 'geom-regions-r2' } });
      const names = harness.events().slice(before).map((e) => e.name);
      const alt = harness.alternative();
      const r1 = alt.find((a) => a.entityId === 'r1');
      return { selected: harness.snapshot().selection, names, neighbours: r1?.adjacentTo };
    });
    expect(result.selected).toContain('geom-regions-r2');
    expect(result.names).toContain('geomap.entity-selected');
    expect(result.neighbours).toEqual(['r2', 'r3']);
  });

  test('gm-nav-2: point and region compose in one scene; alternative lists adjacency under the region', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const alt = harness.alternative();
      const withNeighbours = alt.filter((a) => a.adjacentTo !== undefined);
      return { count: withNeighbours.length, allNamed: alt.every((a) => a.name && a.location) };
    });
    expect(result.count).toBeGreaterThanOrEqual(3);
    expect(result.allNamed).toBe(true);
  });
});