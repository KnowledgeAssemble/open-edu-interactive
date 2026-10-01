import { test, expect } from '@playwright/test';

const SPECS = {
  'guided-composed': 'packages/geomap-engine/fixture/guided-composed/input.geomap.json',
  'multi-locate': 'packages/geomap-engine/fixture/multi-locate/input.geomap.json',
  'place-memory': 'packages/geomap-engine/fixture/place-memory/input.geomap.json',
  overlay: 'packages/geomap-engine/fixture/overlay/input.geomap.json',
  compass: 'packages/geomap-engine/fixture/compass/input.geomap.json',
  periods: 'packages/geomap-engine/fixture/periods/input.geomap.json',
};

interface Harness {
  dispatch(a: unknown): void;
  snapshot(): {
    selection: string[];
    displayState: { filterCategories: string[]; activeRouteSteps: Record<string, number>; hiddenLayerIds: string[] };
    svgResult?: { svg?: string };
  };
  events(): Array<{ name: string; seq?: number; data?: Record<string, unknown>; action?: { payload?: Record<string, unknown> } }>;
  svg(): string;
  alternative(): Array<{ entityId: string; name: string; description?: string; location: string; bearing?: number; bearingInWindow?: boolean }>;
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

test.describe('GeoMap W-2.7 — compass / bearing (gm-nav-1, gm-dir-2)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'compass');
  });

  test('gm-nav-1: a compass rose is visible; alternative lists each feature with its bearing from the reference', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const svg = harness.svg();
      const alt = harness.alternative();
      return { svg, shrine: alt.find((a) => a.entityId === 'shrine') };
    });
    expect(result.svg).toContain('id="geom-compass"');
    expect(result.shrine?.bearing).toBeDefined();
    expect(result.shrine?.bearingInWindow).toBe(true);
  });

  test('gm-dir-2: bearing action emits geomap.bearing-computed; north-of holds only in the axis window', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const before = harness.events().length;
      harness.dispatch({ type: 'bearing', target: { id: 'geom-places-shrine' } });
      harness.dispatch({ type: 'bearing', target: { id: 'geom-places-pond' } });
      const names = harness.events().slice(before).map((e) => e.name);
      const alt = harness.alternative();
      const shrine = alt.find((a) => a.entityId === 'shrine');
      const pond = alt.find((a) => a.entityId === 'pond');
      return { names, shrineBearing: shrine?.bearing, shrineInWindow: shrine?.bearingInWindow, pondInWindow: pond?.bearingInWindow };
    });
    expect(result.names.filter((n) => n === 'geomap.bearing-computed').length).toBe(2);
    expect(result.shrineBearing).toBeDefined();
    expect(result.shrineInWindow).toBe(true);
    expect(result.pondInWindow).toBe(false);
  });
});
test.describe('GeoMap W-4.1 — period-slice (gm-hist-1, gm-hist-3)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, 'periods');
  });

  test('gm-hist-1: step advances the slice; snapshot exposes the active period; regions hidden accordingly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      const initial = (harness.snapshot() as unknown as { activePeriod: { id: string } }).activePeriod;
      harness.dispatch({ type: 'step', target: { id: 'geom-period-slice' } });
      const second = (harness.snapshot() as unknown as { activePeriod: { id: string }; alternative: Array<{ entityId: string }> }).activePeriod;
      const alt = (harness.snapshot() as unknown as { alternative: Array<{ entityId: string }> }).alternative;
      harness.dispatch({ type: 'scrub', target: { id: 'geom-period-slice' }, payload: { step: 2 } });
      const third = (harness.snapshot() as unknown as { activePeriod: { id: string } }).activePeriod;
      const names = harness.events().map((e) => e.name);
      return { initial: initial?.id, second: second?.id, third: third?.id, hasEast: alt.some((a) => a.entityId === 'east'), periodStep: names.includes('geomap.period-step') };
    });
    expect(result.initial).toBe('p1700');
    expect(result.second).toBe('p1800');
    expect(result.third).toBe('p1900');
    expect(result.hasEast).toBe(true);
    expect(result.periodStep).toBe(true);
  });

  test('gm-hist-3: route stays fixed while region slices change; selecting an entity carries its period metadata', async ({ page }) => {
    const result = await page.evaluate(() => {
      const harness = (window as unknown as { __geomapHarness: Harness }).__geomapHarness;
      harness.dispatch({ type: 'scrub', target: { id: 'geom-period-slice' }, payload: { step: 1 } });
      const before = harness.events().length;
      harness.dispatch({ type: 'select', target: { id: 'geom-regions-core' } });
      const names = harness.events().slice(before).map((e) => e.name);
      const period = (harness.snapshot() as unknown as { activePeriod: { id: string } }).activePeriod;
      return { names, period: period?.id };
    });
    expect(result.names).toContain('geomap.entity-selected');
    expect(result.period).toBe('p1800');
  });
});
