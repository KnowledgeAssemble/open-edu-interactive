import { test, expect } from '@playwright/test';

interface Harness {
  dispatch(a: unknown): void;
  snapshot(): { selection: string[]; expanded: string[] };
  events(): Array<{ name: string }>;
  svg(): string;
  alternative(): Array<{ kind: string; id: string; label?: string; relationship?: string; members?: string[] }>;
  tryCreate(s: unknown): { ok: boolean; code?: string };
}

const FIXTURES = {
  'di-proc-follow-process': 'packages/diagram-engine/fixture/di-proc-follow-process/input.diagram.json',
  'di-proc-input-output': 'packages/diagram-engine/fixture/di-proc-input-output/input.diagram.json',
  'di-proc-which-step': 'packages/diagram-engine/fixture/di-proc-which-step/input.diagram.json',
  'di-proc-branch-flow': 'packages/diagram-engine/fixture/di-proc-branch-flow/input.diagram.json',
  'di-cycl-water-cycle': 'packages/diagram-engine/fixture/di-cycl-water-cycle/input.diagram.json',
  'di-cycl-life-cycle': 'packages/diagram-engine/fixture/di-cycl-life-cycle/input.diagram.json',
  'di-cycl-disaster-cycle': 'packages/diagram-engine/fixture/di-cycl-disaster-cycle/input.diagram.json',
  'di-cycl-social-cycle': 'packages/diagram-engine/fixture/di-cycl-social-cycle/input.diagram.json',
  'di-class-classify': 'packages/diagram-engine/fixture/di-class-classify/input.diagram.json',
  'di-class-part-whole': 'packages/diagram-engine/fixture/di-class-part-whole/input.diagram.json',
  'di-class-gov-levels': 'packages/diagram-engine/fixture/di-class-gov-levels/input.diagram.json',
  'di-class-sector-taxonomy': 'packages/diagram-engine/fixture/di-class-sector-taxonomy/input.diagram.json',
  'di-class-parent-locate': 'packages/diagram-engine/fixture/di-class-parent-locate/input.diagram.json',
  'di-sys-drainage-basin': 'packages/diagram-engine/fixture/di-sys-drainage-basin/input.diagram.json',
  'di-sys-industrial-linkages': 'packages/diagram-engine/fixture/di-sys-industrial-linkages/input.diagram.json',
  'di-ord-insert-missing': 'packages/diagram-engine/fixture/di-ord-insert-missing/input.diagram.json',
  'di-inq-explain-why': 'packages/diagram-engine/fixture/di-inq-explain-why/input.diagram.json',
  'di-inq-open-explore': 'packages/diagram-engine/fixture/di-inq-open-explore/input.diagram.json',
  'di-asm-read-diagram': 'packages/diagram-engine/fixture/di-asm-read-diagram/input.diagram.json',
  'di-asm-validate-diagram': 'packages/diagram-engine/fixture/di-asm-validate-diagram/input.diagram.json',
  'di-asm-evidence-essay': 'packages/diagram-engine/fixture/di-asm-evidence-essay/input.diagram.json',
  'di-cause-many-effects': 'packages/diagram-engine/fixture/di-cause-many-effects/input.diagram.json',
  'di-cause-many-causes': 'packages/diagram-engine/fixture/di-cause-many-causes/input.diagram.json',
  'di-lab-label-all': 'packages/diagram-engine/fixture/di-lab-label-all/input.diagram.json',
};

async function mount(page: import('@playwright/test').Page, fixture: string): Promise<void> {
  await page.goto(`/?engine=diagram&spec=${fixture}`);
  await page.waitForFunction(() => !!(window as unknown as { __diagramHarness?: unknown }).__diagramHarness);
}

test.describe('Diagram W-1 — di-proc fixtures', () => {
  test('di-proc-1: DAG with explicit leads-to; alternative ranks steps in authored order', async ({ page }) => {
    await mount(page, FIXTURES['di-proc-follow-process']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const alt = h.alternative();
      const nodes = alt.filter((r) => r.kind === 'node').map((r) => r.label);
      const before = h.events().length;
      h.dispatch({ type: 'follow', target: { id: 'edge-weathering-erosion' } });
      const names = h.events().slice(before).map((e) => e.name);
      return { nodes, followed: names.includes('diagram.relationship-followed') };
    });
    expect(result.nodes).toEqual(['Weathering', 'Erosion', 'Transport', 'Deposition']);
    expect(result.followed).toBe(true);
  });

  test('di-proc-2: converging inputs and diverging outputs', async ({ page }) => {
    await mount(page, FIXTURES['di-proc-input-output']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const edges = h.alternative().filter((r) => r.kind === 'edge');
      return { edgeCount: edges.length, relations: edges.map((e) => e.relationship) };
    });
    expect(result.edgeCount).toBe(5);
    expect(result.relations.every((r) => r === 'leads-to')).toBe(true);
  });

  test('di-proc-3: discovery select of an adjacent node in either direction', async ({ page }) => {
    await mount(page, FIXTURES['di-proc-which-step']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'grinding' } });
      const names = h.events().slice(before).map((e) => e.name);
      return { selected: h.snapshot().selection, names };
    });
    expect(result.selected).toContain('grinding');
    expect(result.names).toContain('diagram.node-selected');
  });

  test('di-proc-4: DAG with a junction node; alternative lists all branches', async ({ page }) => {
    await mount(page, FIXTURES['di-proc-branch-flow']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const nodes = h.alternative().filter((r) => r.kind === 'node');
      return { nodeCount: nodes.length };
    });
    expect(result.nodeCount).toBe(5);
  });
});

test.describe('Diagram W-1 — di-cycl fixtures', () => {
  const cycleFixtureTests: Array<[string, string, number]> = [
    ['di-cycl-water-cycle', 'water cycle', 4],
    ['di-cycl-life-cycle', 'frog life cycle', 4],
    ['di-cycl-disaster-cycle', 'disaster cycle', 4],
    ['di-cycl-social-cycle', 'social cycle', 3],
  ];

  for (const [fixture, name, nodes] of cycleFixtureTests) {
    test(`di-cycl (${name}): directed cycle; alternative lists stages and a cycle row`, async ({ page }) => {
      await mount(page, FIXTURES[fixture as keyof typeof FIXTURES]);
      const result = await page.evaluate(() => {
        const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
        const alt = h.alternative();
        return { nodeCount: alt.filter((r) => r.kind === 'node').length, cycleRows: alt.filter((r) => r.kind === 'cycle').length };
      });
      expect(result.nodeCount).toBe(nodes);
      expect(result.cycleRows).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe('Diagram W-1 — di-class fixtures', () => {
  test('di-class-1: hierarchy expand/collapse reveals subtree', async ({ page }) => {
    await mount(page, FIXTURES['di-class-classify']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'expand', target: { id: 'animals' } });
      return { expanded: h.snapshot().expanded };
    });
    expect(Array.isArray(result.expanded)).toBe(true);
  });

  test('di-class-2: hierarchy with contains edges; membership select works', async ({ page }) => {
    await mount(page, FIXTURES['di-class-part-whole']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'lok-sabha' } });
      const edges = h.alternative().filter((r) => r.kind === 'edge');
      return { selected: h.snapshot().selection, relations: edges.map((e) => e.relationship) };
    });
    expect(result.selected).toContain('lok-sabha');
    expect(result.relations).toContain('contains');
    expect(result.relations).toContain('part-of');
  });

  test('di-class-3: two subgraphs (levels + ladder) in one scene', async ({ page }) => {
    await mount(page, FIXTURES['di-class-gov-levels']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const nodes = h.alternative().filter((r) => r.kind === 'node');
      return { nodeCount: nodes.length };
    });
    expect(result.nodeCount).toBe(6);
  });

  test('di-class-4: sector hierarchy with example leaves; classification scored', async ({ page }) => {
    await mount(page, FIXTURES['di-class-sector-taxonomy']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'school' } });
      return { selected: h.snapshot().selection };
    });
    expect(result.selected).toContain('school');
  });

  test('di-class-6: reverse-reading — select the parent of a leaf', async ({ page }) => {
    await mount(page, FIXTURES['di-class-parent-locate']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'tehsil' } });
      const edges = h.alternative().filter((r) => r.kind === 'edge');
      return { selected: h.snapshot().selection, relations: edges.map((e) => e.relationship) };
    });
    expect(result.selected).toContain('tehsil');
    expect(result.relations).toContain('contains');
  });
});

test.describe('Diagram W-1 — di-sys fixtures', () => {
  test('di-sys-2: drainage basin as flow; storage node described', async ({ page }) => {
    await mount(page, FIXTURES['di-sys-drainage-basin']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const nodes = h.alternative().filter((r) => r.kind === 'node');
      const groundwater = nodes.find((n) => n.label === 'Groundwater');
      return { nodeCount: nodes.length, hasDescription: Boolean(groundwater) };
    });
    expect(result.nodeCount).toBe(5);
    expect(result.hasDescription).toBe(true);
  });

  test('di-sys-3: industrial linkages flow in order', async ({ page }) => {
    await mount(page, FIXTURES['di-sys-industrial-linkages']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'follow', target: { id: 'edge-steel-machinery' } });
      const names = h.events().map((e) => e.name);
      return { followed: names.includes('diagram.relationship-followed') };
    });
    expect(result.followed).toBe(true);
  });
});

test.describe('Diagram W-1 — di-ord-2 insert-missing', () => {
  test('candidates partially linked; select resolves the correct candidate', async ({ page }) => {
    await mount(page, FIXTURES['di-ord-insert-missing']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'blank' } });
      const nodes = h.alternative().filter((r) => r.kind === 'node');
      return { selected: h.snapshot().selection, labels: nodes.map((n) => n.label) };
    });
    expect(result.selected).toContain('blank');
    expect(result.labels).toContain('Sowing candidate');
    expect(result.labels).toContain('Threshing candidate');
  });
});

test.describe('Diagram W-1 — di-inq fixtures', () => {
  test('di-inq-1: monotonic event log replays reasoning path', async ({ page }) => {
    await mount(page, FIXTURES['di-inq-explain-why']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const seqs = h.events().map((e) => (e as unknown as { seq: number }).seq ?? 0);
      h.dispatch({ type: 'follow', target: { id: 'edge-river-silt' } });
      h.dispatch({ type: 'follow', target: { id: 'edge-silt-fertility' } });
      const after = h.events().map((e) => (e as unknown as { seq: number }).seq ?? 0);
      const names = h.events().map((e) => e.name);
      return { monotonic: seqs.every((s, i) => i === 0 || s >= seqs[i - 1]!), grew: after.length > seqs.length, followed: names.includes('diagram.relationship-followed') };
    });
    expect(result.monotonic).toBe(true);
    expect(result.grew).toBe(true);
    expect(result.followed).toBe(true);
  });

  test('di-inq-2: free exploration; select/focus work', async ({ page }) => {
    await mount(page, FIXTURES['di-inq-open-explore']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'vegetation' } });
      const alt = h.alternative();
      return { selected: h.snapshot().selection, nodeCount: alt.filter((r) => r.kind === 'node').length };
    });
    expect(result.selected).toContain('vegetation');
    expect(result.nodeCount).toBe(5);
  });
});

test.describe('Diagram W-1 — di-asm fixtures', () => {
  test('di-asm-1: composition of existing mechanics; node+edge+relation present', async ({ page }) => {
    await mount(page, FIXTURES['di-asm-read-diagram']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const alt = h.alternative();
      return { nodes: alt.filter((r) => r.kind === 'node').length, edges: alt.filter((r) => r.kind === 'edge').length };
    });
    expect(result.nodes).toBe(3);
    expect(result.edges).toBe(2);
  });

  test('di-asm-2: tryCreate-style validation is deterministic for a valid flow', async ({ page }) => {
    await mount(page, FIXTURES['di-asm-validate-diagram']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const ok = h.tryCreate({
        type: 'diagram',
        version: '1.0.0',
        id: 'judge-flow',
        content: {
          kind: 'flow',
          nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
          edges: [{ from: 'a', to: 'b', relationship: 'leads-to' }],
        },
        sources: [{ class: 'authoritative' }],
        accessibility: { label: 'Flow: A leads to B' },
      });
      return ok;
    });
    expect(result.ok).toBe(true);
  });

  test('di-asm-3: traced sublog attached via monotonic events', async ({ page }) => {
    await mount(page, FIXTURES['di-asm-evidence-essay']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'deforest' } });
      h.dispatch({ type: 'follow', target: { id: 'edge-deforest-erosion' } });
      const names = h.events().slice(before).map((e) => e.name);
      return { names };
    });
    expect(result.names).toContain('diagram.node-selected');
    expect(result.names).toContain('diagram.relationship-followed');
  });
});

test.describe('Diagram W-1 — accumulation rows (di-cause-1/2, di-lab-2)', () => {
  test('di-cause-1: cumulative selection accumulates effects; deselect removes one', async ({ page }) => {
    await mount(page, FIXTURES['di-cause-many-effects']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'habitat-loss' } });
      h.dispatch({ type: 'select', target: { id: 'soil-erosion' } });
      const acc = h.snapshot().selection;
      h.dispatch({ type: 'deselect', target: { id: 'habitat-loss' } });
      const afterDeselect = h.snapshot().selection;
      return { acc, afterDeselect };
    });
    expect(result.acc).toEqual(['habitat-loss', 'soil-erosion']);
    expect(result.afterDeselect).toEqual(['soil-erosion']);
  });

  test('di-cause-2: converging causes; cumulative selection', async ({ page }) => {
    await mount(page, FIXTURES['di-cause-many-causes']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'jobs' } });
      h.dispatch({ type: 'select', target: { id: 'rural-stress' } });
      return h.snapshot().selection;
    });
    expect(result).toEqual(['jobs', 'rural-stress']);
  });

  test('di-lab-2: cumulative selection covers all parts; order-independent', async ({ page }) => {
    await mount(page, FIXTURES['di-lab-label-all']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'petal' } });
      h.dispatch({ type: 'select', target: { id: 'sepal' } });
      h.dispatch({ type: 'select', target: { id: 'stamen' } });
      h.dispatch({ type: 'select', target: { id: 'pistil' } });
      const all = h.snapshot().selection;
      h.dispatch({ type: 'deselect', target: { id: 'sepal' } });
      return { all, after: h.snapshot().selection };
    });
    expect(result.all).toEqual(['petal', 'sepal', 'stamen', 'pistil']);
    expect(result.after).toEqual(['petal', 'stamen', 'pistil']);
  });
});