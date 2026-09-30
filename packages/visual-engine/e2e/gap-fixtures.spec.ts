import { test, expect } from '@playwright/test';

test.describe('Visual Engine — W-1 gap fixtures e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=visual&spec=packages/visual-engine/fixture/number-line-compare-distance/input.visual.json');
    await page.waitForFunction(() => !!(window as unknown as { __harness?: unknown }).__harness);
  });

  test('nl-compare-distance: two distinct emphases, no extra marker clutter, events distinguish id', async ({ page }) => {
    const svg = await page.evaluate(() => (window as unknown as { __harness: { svg(): string } }).__harness.svg());
    const markers = svg.match(/data-oedu-role="marker"/g) ?? [];
    expect(markers).toHaveLength(2);

    const result = await page.evaluate(() => {
      const h = (window as unknown as { __harness: { dispatch(a: unknown): void; events(): Array<{ name: string }> } }).__harness;
      h.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
      const names = h.events().map((e) => e.name);
      return { selected7: names.some((n) => n === 'visual.nl-marker-7-selected'), selected3: names.some((n) => n === 'visual.nl-marker-3-selected') };
    });
    expect(result.selected7).toBe(true);
    expect(result.selected3).toBe(false);
  });
});

test.describe('Visual Engine — clock-discovery-minute e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=visual&spec=packages/visual-engine/fixture/clock-discovery-minute/input.visual.json');
    await page.waitForFunction(() => !!(window as unknown as { __harness?: unknown }).__harness);
  });

  test('ck-which-hand: both hands interactive in discovery', async ({ page }) => {
    const svg = await page.evaluate(() => (window as unknown as { __harness: { svg(): string } }).__harness.svg());
    expect(svg).toContain('id="ck-hour-hand"');
    expect(svg).toContain('id="ck-minute-hand"');

    const result = await page.evaluate(() => {
      const h = (window as unknown as { __harness: { dispatch(a: unknown): void; snapshot(): { selection: string[] } } }).__harness;
      h.dispatch({ type: 'select', target: { id: 'ck-minute-hand' } });
      return h.snapshot().selection;
    });
    expect(result).toContain('ck-minute-hand');
  });
});

test.describe('Visual Engine — geometry-discovery-vertex e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=visual&spec=packages/visual-engine/fixture/geometry-discovery-vertex/input.visual.json');
    await page.waitForFunction(() => !!(window as unknown as { __harness?: unknown }).__harness);
  });

  test('geo-identify-vertex: only target-type vertices are candidates, not sides', async ({ page }) => {
    const snapshot = await page.evaluate(() => {
      return (window as unknown as { __harness: { snapshot(): { svgResult?: { interactive?: Array<{ id: string }> } } } }).__harness.snapshot();
    });
    const ids = [...new Set((snapshot.svgResult?.interactive ?? []).map((i) => i.id))].sort();
    expect(ids).toEqual(['geo-shape-vertex-0', 'geo-shape-vertex-1', 'geo-shape-vertex-2']);
    expect(ids.some((id) => id.includes('side'))).toBe(false);
  });
});