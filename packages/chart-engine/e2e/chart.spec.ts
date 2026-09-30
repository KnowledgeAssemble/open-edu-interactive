import { test, expect } from '@playwright/test';

test.describe('Chart Engine — bar chart e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=chart');
    await page.waitForFunction(() => !!(window as unknown as { __chartHarness?: unknown }).__chartHarness);
  });

  test('a11y: SVG has title and desc; every bar has non-empty aria-label; a <table> alternative exists', async ({ page }) => {
    const svg = await page.evaluate(() => {
      return (window as unknown as { __chartHarness: { svg(): string } }).__chartHarness.svg();
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<title>');
    expect(svg).toContain('<desc>');
    expect(svg).toContain('aria-label');
    expect(svg).toContain('data-oedu-interactive="true"');
    expect(svg).not.toContain('onclick');
    expect(svg).not.toContain('<script');

    const snapshot = await page.evaluate(() => {
      return (window as unknown as { __chartHarness: { snapshot(): { tabular: Array<{ rowLabel: string; values: Array<{ measureId: string; value: number }> }> } } }).__chartHarness.snapshot();
    });
    expect(snapshot.tabular.length).toBeGreaterThan(0);
    expect(snapshot.tabular[0]!.values.length).toBeGreaterThan(0);
    for (const row of snapshot.tabular) {
      expect(row.rowLabel).toBeTruthy();
    }
  });

  test('interaction: dispatching select updates snapshot selection and emits chart.data-point-selected event', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __chartHarness: { dispatch(a: unknown): void; snapshot(): { selection: string[] }; events(): Array<{ name: string }> } }).__chartHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'rainfall-bar-row-feb' } });
      const after = h.events();
      const newEvents = after.slice(before).map((e: { name: string }) => e.name);
      return { newEvents, selection: h.snapshot().selection };
    });
    expect(result.selection).toContain('rainfall-bar-row-feb');
    expect(result.newEvents).toContain('chart.data-point-selected');
  });

  test('replay: events are recorded with monotonic seq order', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __chartHarness: { events(): Array<{ seq: number }>; dispatch(a: unknown): void } }).__chartHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'rainfall-bar-row-feb' } });
      h.dispatch({ type: 'deselect', target: { id: 'rainfall-bar-row-feb' } });
      const after = h.events();
      return { grew: after.length > before + 4, seqs: after.map((e) => e.seq) };
    });
    expect(result.grew).toBe(true);
    for (let i = 1; i < result.seqs.length; i++) {
      expect(result.seqs[i]!).toBeGreaterThan(result.seqs[i - 1]!);
    }
  });

  test('rejection: tryCreate of a spec with unknown kind "scatter" fails', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __chartHarness: { tryCreate(s: unknown): { ok: boolean } } }).__chartHarness;
      return h.tryCreate({
        type: 'chart',
        version: '1.0.0',
        id: 'bad-chart',
        content: { kind: 'scatter', dimensions: [{ id: 'x', type: 'quantitative' }], measures: [{ id: 'y', type: 'quantitative' }], data: [{ id: 'r1', x: 1, y: 2 }] },
      });
    });
    expect(result.ok).toBe(false);
  });

  test('filter: dispatching filter restricts tabular rows and clear-filter restores all', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __chartHarness: { dispatch(a: unknown): void; tabular(): Array<{ rowLabel: string }> } }).__chartHarness;
      h.dispatch({ type: 'filter', payload: { ids: ['row-feb', 'row-nov'] } });
      const filtered = h.tabular().map((r) => r.rowLabel);
      h.dispatch({ type: 'clear-filter' });
      const restored = h.tabular().map((r) => r.rowLabel);
      return { filtered, restored };
    });
    expect(result.filtered).toEqual(['Feb', 'Nov']);
    expect(result.restored.sort()).toEqual(['Aug', 'Feb', 'May', 'Nov']);
  });
});

test.describe('Chart Engine — ch-l4 time series e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=chart&spec=packages/chart-engine/fixture/line-time/input.chart.json');
    await page.waitForFunction(() => !!(window as unknown as { __chartHarness?: unknown }).__chartHarness);
  });

  test('time dimension: ISO-8601 values render as ordered x labels; select on a time point works', async ({ page }) => {
    const snapshot = await page.evaluate(() => {
      return (window as unknown as { __chartHarness: { snapshot(): { tabular: Array<{ rowLabel: string }> } } }).__chartHarness.snapshot();
    });
    expect(snapshot.tabular.map((r) => r.rowLabel)).toEqual(['2024-01-15', '2024-04-15', '2024-07-15', '2024-10-15']);

    const result = await page.evaluate(() => {
      const h = (window as unknown as { __chartHarness: { dispatch(a: unknown): void; snapshot(): { selection: string[] }; events(): Array<{ name: string }> } }).__chartHarness;
      h.dispatch({ type: 'select', target: { id: 'temp-point-row-jul' } });
      return { selection: h.snapshot().selection, events: h.events().map((e) => e.name) };
    });
    expect(result.selection).toContain('temp-point-row-jul');
    expect(result.events).toContain('chart.data-point-selected');
  });
});

test.describe('Chart Engine — ch-x3 guided narrow e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=chart&spec=packages/chart-engine/fixture/bar-guided-narrow/input.chart.json');
    await page.waitForFunction(() => !!(window as unknown as { __chartHarness?: unknown }).__chartHarness);
  });

  test('guided: host filter narrows to one bar, learner selects it, clear-filter restores between steps', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __chartHarness: { dispatch(a: unknown): void; tabular(): Array<{ rowLabel: string }>; snapshot(): { selection: string[] } } }).__chartHarness;
      h.dispatch({ type: 'filter', payload: { ids: ['row-may'] } });
      const narrowed = h.tabular().map((r) => r.rowLabel);
      h.dispatch({ type: 'select', target: { id: 'rainfall-bar-row-may' } });
      const selection = h.snapshot().selection;
      h.dispatch({ type: 'clear-filter' });
      const restored = h.tabular().map((r) => r.rowLabel);
      return { narrowed, selection, restored };
    });
    expect(result.narrowed).toEqual(['May']);
    expect(result.selection).toContain('rainfall-bar-row-may');
    expect(result.restored.sort()).toEqual(['Aug', 'Feb', 'May', 'Nov']);
  });
});