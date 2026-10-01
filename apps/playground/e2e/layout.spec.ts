import { expect, test, type Page } from '@playwright/test';

/**
 * Layout regression guard for the compare view. Engines emit SVGs with fixed
 * width/height attributes, and the sidebar is a fixed 240px, so both panes are
 * easy to crush at narrow widths. These assertions are DOM geometry only.
 */

const ENGINE_ROUTE = '/engine/visual/clock';

type Geometry = {
  specChars: number;
  svgCount: number;
  overlappingSvgs: number;
  minSvgWidth: number | null;
  worstRatioError: number | null;
  asideBorderRight: string | null;
  sidebarStackedAboveMain: boolean | null;
  horizontalScroll: boolean;
};

async function readGeometry(page: Page): Promise<Geometry> {
  // Lesson mounts are async; wait for the inspector panel and any engine SVG.
  await page.waitForFunction(() => {
    const hasPanel = [...document.querySelectorAll('details')].some(
      (d) => d.querySelector('summary')?.textContent === 'Input Spec',
    );
    return hasPanel && document.querySelector('[data-oedu-root] svg') !== null;
  });

  return page.evaluate(() => {
    const aside = document.querySelector('aside');
    const main = document.querySelector('main');
    const svgs = [...document.querySelectorAll('[data-oedu-root] svg')];

    let specPre: HTMLElement | null = null;
    for (const details of document.querySelectorAll('details')) {
      if (details.querySelector('summary')?.textContent === 'Input Spec') {
        specPre = details.querySelector('pre');
      }
    }

    const intersects = (a: DOMRect, b: DOMRect): boolean =>
      Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

    const asideRect = aside?.getBoundingClientRect() ?? null;
    const mainRect = main?.getBoundingClientRect() ?? null;
    const specRect = specPre?.getBoundingClientRect() ?? null;

    let overlappingSvgs = 0;
    let minSvgWidth: number | null = null;
    let worstRatioError: number | null = null;

    for (const svg of svgs) {
      const rect = svg.getBoundingClientRect();
      if (specRect && intersects(rect, specRect)) overlappingSvgs += 1;

      const width = rect.width;
      minSvgWidth = minSvgWidth === null ? width : Math.min(minSvgWidth, width);

      const viewBox = svg.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? null;
      if (viewBox && viewBox[2] && viewBox[3] && rect.height > 0) {
        const error = Math.abs(width / rect.height / (viewBox[2] / viewBox[3]) - 1);
        worstRatioError = worstRatioError === null ? error : Math.max(worstRatioError, error);
      }
    }

    return {
      specChars: specPre?.textContent?.length ?? 0,
      svgCount: svgs.length,
      overlappingSvgs,
      minSvgWidth,
      worstRatioError,
      asideBorderRight: aside ? getComputedStyle(aside).borderRightWidth : null,
      sidebarStackedAboveMain:
        asideRect && mainRect ? mainRect.top >= asideRect.bottom - 1 : null,
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

const WIDTHS = [1600, 1440, 1280, 1100, 900, 760, 500, 380] as const;

for (const route of [ENGINE_ROUTE, '/lesson/narrative-timeline-visual']) {
  test.describe(`compare layout: ${route}`, () => {
    for (const width of WIDTHS) {
      test(`no overlap or distortion at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);

        const g = await readGeometry(page);

        expect(g.svgCount, 'engine output rendered').toBeGreaterThan(0);
        expect(g.specChars, 'Input Spec shows the spec JSON').toBeGreaterThan(0);
        expect(g.overlappingSvgs, 'rendered interactive does not overlap the spec pane').toBe(0);
        expect(g.horizontalScroll, 'no horizontal page scroll').toBe(false);

        if (g.worstRatioError !== null) {
          expect(g.worstRatioError, 'SVG aspect ratio matches viewBox').toBeLessThan(0.02);
        }
      });
    }

    test('sidebar stacks above main below 720px', async ({ page }) => {
      await page.setViewportSize({ width: 380, height: 900 });
      await page.goto(route);
      const g = await readGeometry(page);
      expect(g.sidebarStackedAboveMain, 'sidebar wraps above the main pane').toBe(true);
      expect(g.asideBorderRight, 'sidebar drops its vertical divider').toBe('0px');
    });

    test('sidebar stays beside main above 720px', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(route);
      const g = await readGeometry(page);
      expect(g.sidebarStackedAboveMain, 'sidebar sits beside the main pane').toBe(false);
      expect(g.asideBorderRight, 'sidebar keeps its vertical divider').toBe('1px');
    });
  });
}

test('interactive stays legible at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await page.goto(ENGINE_ROUTE);
  const g = await readGeometry(page);
  // With the sidebar stacked rather than inline, the pane keeps real width.
  expect(g.minSvgWidth, 'interactive is not crushed to a sliver').toBeGreaterThan(300);
});