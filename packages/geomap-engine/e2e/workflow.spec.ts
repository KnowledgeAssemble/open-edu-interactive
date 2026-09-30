import { test, expect } from '@playwright/test';

const SPECS = {
  'guided-composed': 'packages/geomap-engine/fixture/guided-composed/input.geomap.json',
  'multi-locate': 'packages/geomap-engine/fixture/multi-locate/input.geomap.json',
  'place-memory': 'packages/geomap-engine/fixture/place-memory/input.geomap.json',
  overlay: 'packages/geomap-engine/fixture/overlay/input.geomap.json',
};

interface Harness {
  dispatch(a: unknown): void;
  snapshot(): {
    selection: string[];
    displayState: { filterCategories: string[]; activeRouteSteps: Record<string, number>; hiddenLayerIds: string[] };
    svgResult?: { svg?: string };
  };
  events(): Array<{ name: string; seq?: number }>;
  svg(): string;
  alternative(): Array<{ entityId: string; name: string; description?: string; location: string }>;
  tryCreate(spec: unknown): { ok: boolean; code?: string };
}

async function mount(page: import('@playwright/test').Page, fixture: keyof typeof SPECS): Promise<void> {
  await page.goto(`/?engine=geomap&spec=${SPECS[fixture]}`);
  await page.waitForFunction(() => !!(window as unknown as { __geomapHarness?: unknown }).__geomapHarness);
}

test.describe('GeoMap W-1 — gm-x2 guided composed', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'guided-composed');
  });

  test('mixed interactive flags across layers; reset clears selection between steps', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-states-odisha' } });
      const afterSelect = harness.snapshot().selection;
      harness.dispatch({ type: 'reset' });
      const afterReset = harness.snapshot().selection;
      harness.dispatch({ type: 'select', target: { id: 'geom-cities-bhubaneswar' } });
      const afterSecond = harness.snapshot().selection;
      return { afterSelect, afterReset, afterSecond };
    });
    expect(result.afterSelect).toContain('geom-states-odisha');
    expect(result.afterReset).toEqual([]);
    expect(result.afterSecond).toContain('geom-cities-bhubaneswar');
  });
});

test.describe('GeoMap W-1 — gm-loc-2 multi-locate', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'multi-locate');
  });

  test('each step resolves to one target; select/reset/select log monotonic; alternative accumulates all features', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-features-capital' } });
      harness.dispatch({ type: 'reset' });
      harness.dispatch({ type: 'select', target: { id: 'geom-features-peak' } });
      const seqs = harness.events().map((e) => e.seq ?? 0);
      const alt = harness.alternative().map((a) => a.entityId);
      return { selection: harness.snapshot().selection, monotonic: seqs.every((s, i) => i === 0 || s > seqs[i - 1]!), alt };
    });
    expect(result.selection).toContain('geom-features-peak');
    expect(result.monotonic).toBe(true);
    expect(result.alt).toContain('capital');
    expect(result.alt).toContain('peak');
    expect(result.alt).toContain('west-sea');
  });
});

test.describe('GeoMap W-1 — gm-hist-2 place memory', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'place-memory');
  });

  test('markers carry event metadata; selection payload includes the event; alternative lists places', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'select', target: { id: 'geom-sites-calcutta' } });
      const sel = harness.events().find((e) => e.name === 'geomap.entity-selected');
      const payload = JSON.stringify((sel as { action?: { payload?: unknown } }).action?.payload ?? '');
      const alt = harness.alternative();
      const calcutta = alt.find((a) => a.entityId === 'calcutta');
      return { payloadHasEvent: payload.includes('Quit India'), desc: calcutta?.description, sourcesRequired: true };
    });
    expect(result.payloadHasEvent).toBe(true);
    expect(result.desc).toContain('Quit India');
  });

  test('historical claims are provenanced: empty sources[] is a validation error', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const spec = {
        type: 'geomap',
        version: '1.0.0',
        id: 'place-memory-no-sources',
        content: {
          projection: { type: 'equirectangular' },
          geography: { sources: [{ id: 'base', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
          entities: [{ id: 'calcutta', type: 'city', name: 'Calcutta', location: { coordinates: { lat: 22.57, lon: 88.36 } } }],
          layers: [{ id: 'sites', type: 'marker', items: [{ entity: 'calcutta', interactive: true }] }],
        },
        interaction: { mode: 'explore', actions: ['select', 'reset'] },
        questions: [],
      };
      return harness.tryCreate(spec);
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_SPEC');
  });
});

test.describe('GeoMap W-1 — gm-asm-1 non-construct remainder (multi-layer explore)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'overlay');
  });

  test('loc/identify/trace half: multi-layer explore over overlay fixture', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'select', target: { id: 'geom-risk-nz' } });
      const newNames = harness.events().slice(before).map((e) => e.name);
      const alt = harness.alternative().map((a) => a.entityId);
      return { selected: harness.snapshot().selection, names: newNames, alt };
    });
    expect(result.selected).toContain('geom-risk-nz');
    expect(result.names).toContain('geomap.entity-selected');
    expect(result.alt).toContain('nz');
    expect(result.alt).toContain('sz');
  });
});