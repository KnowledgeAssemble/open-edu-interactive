import { test, expect, type Page } from '@playwright/test';

const VISUAL_SURFACE = '[data-oedu-root="visual-independence"]';
const VISUAL_INTERACTIVE = `${VISUAL_SURFACE} [data-oedu-interactive="true"]`;

declare global {
  interface Window {
    __lessonHarness?: {
      events(): Array<{ name: string }>;
      snapshot(id: string): { selection?: string[] };
      svg(id: string): string;
    };
  }
}

async function tabToVisualInteractive(page: Page, maxPresses = 60): Promise<string> {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate((surface) => {
      const active = document.activeElement as Element | null;
      return active?.closest(surface) ? active.id : '';
    }, VISUAL_SURFACE);
    if (id) return id;
  }
  return '';
}

test.describe('SVG surface — real browser keyboard reachability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?engine=lesson');
    await page.waitForFunction(() => !!window.__lessonHarness);
    await expect(page.locator('[data-interactive-lesson]')).toBeVisible();
  });

  test('every interactive SVG node carries a runtime tabindex', async ({ page }) => {
    const counts = await page.evaluate((sel) => {
      const nodes = Array.from(document.querySelectorAll(sel));
      return { total: nodes.length, missing: nodes.filter((n) => !n.getAttribute('tabindex')).length };
    }, VISUAL_INTERACTIVE);
    expect(counts.total).toBeGreaterThan(0);
    expect(counts.missing).toBe(0);
  });

  test('Tab reaches a visual interactive node and paints the focus ring', async ({ page }) => {
    const id = await tabToVisualInteractive(page);
    expect(id).not.toBe('');

    const outline = await page.evaluate((focusedId) => {
      const style = getComputedStyle(document.getElementById(focusedId)!);
      return { style: style.outlineStyle, width: style.outlineWidth };
    }, id);
    expect(outline.style).toBe('solid');
    expect(outline.width).not.toBe('0px');
  });

  test('a real mouse click selects without painting a focus ring', async ({ page }) => {
    const id = await page.evaluate((sel) => document.querySelector(sel)!.id, VISUAL_INTERACTIVE);
    await page.locator(VISUAL_INTERACTIVE).first().click();

    const state = await page.evaluate((nodeId) => {
      const el = document.getElementById(nodeId)!;
      return { selected: el.getAttribute('data-oedu-selected'), style: getComputedStyle(el).outlineStyle };
    }, id);
    expect(state.selected).toBe('true');
    expect(state.style).toBe('none');
  });

  test('Enter on a keyboard-focused node selects, then deselects', async ({ page }) => {
    const id = await tabToVisualInteractive(page);
    expect(id).not.toBe('');

    await page.keyboard.press('Enter');
    const afterFirst = await page.evaluate(() => window.__lessonHarness!.snapshot('visual-independence'));
    expect(afterFirst.selection).toContain(id);

    await page.keyboard.press('Enter');
    const afterSecond = await page.evaluate(() => window.__lessonHarness!.snapshot('visual-independence'));
    expect(afterSecond.selection).not.toContain(id);
  });

  test('a held Enter key does not strobe the toggle', async ({ page }) => {
    const id = await tabToVisualInteractive(page);
    expect(id).not.toBe('');

    await page.keyboard.down('Enter');
    await page.waitForTimeout(150);
    await page.keyboard.up('Enter');

    const names = await page.evaluate(() => window.__lessonHarness!.events().map((e) => e.name));
    const forTarget = names.filter((n) => n === `visual.${id}-selected` || n === `visual.${id}-deselected`);
    expect(forTarget).toEqual([`visual.${id}-selected`]);
  });

  test('renderer output stays free of runtime selection and focus attributes', async ({ page }) => {
    const svg = await page.evaluate(() => window.__lessonHarness!.svg('visual-independence'));
    expect(svg).not.toContain('aria-pressed');
    expect(svg).not.toContain('tabindex');
    expect(svg).not.toContain('data-oedu-selected');
  });
});
