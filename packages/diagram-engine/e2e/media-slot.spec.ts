import { test, expect } from '@playwright/test';

const MEDIA_FIXTURE = 'packages/diagram-engine/fixture/di-media-cycle/input.diagram.json';

test.describe('Diagram media slots — di-media-cycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/?engine=diagram&spec=${MEDIA_FIXTURE}`);
    await page.waitForFunction(() => !!(window as unknown as { __diagramHarness?: unknown }).__diagramHarness);
  });

  test('mounts five media slots, each with bounds and a media-sized box', async ({ page }) => {
    const result = await page.evaluate(() => {
      const slots = Array.from(document.querySelectorAll('[data-oedu-media="slot"]'));
      return slots.map((slot) => {
        const rect = slot.querySelector('rect');
        const width = rect ? rect.getBoundingClientRect().width : 0;
        return { hasBounds: slot.hasAttribute('data-oedu-bounds'), width };
      });
    });
    expect(result.length).toBe(5);
    for (const box of result) {
      expect(box.hasBounds).toBe(true);
      expect(box.width).toBeGreaterThan(100);
    }
  });

  test('label text renders below its frame in screen coordinates', async ({ page }) => {
    const result = await page.evaluate(() => {
      const slots = Array.from(document.querySelectorAll('[data-oedu-media="slot"]'));
      return slots.map((slot) => {
        const rect = slot.querySelector('rect');
        const text = slot.querySelector('text');
        if (!rect || !text) return null;
        return {
          below: text.getBoundingClientRect().top > rect.getBoundingClientRect().bottom,
          textTop: text.getBoundingClientRect().top,
          frameBottom: rect.getBoundingClientRect().bottom,
        };
      });
    });
    expect(result.length).toBe(5);
    for (const r of result) {
      expect(r).not.toBeNull();
      expect(r!.below).toBe(true);
      expect(r!.textTop).toBeGreaterThan(r!.frameBottom);
    }
  });
});