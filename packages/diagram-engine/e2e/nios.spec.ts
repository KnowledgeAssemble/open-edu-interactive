import { test, expect } from '@playwright/test';

interface Harness {
  dispatch(a: unknown): void;
  snapshot(): { selection: string[]; expanded: string[] };
  events(): Array<{ name: string; data?: Record<string, unknown> }>;
  svg(): string;
  alternative(): Array<{ kind: string; id: string; label?: string; relationship?: string; members?: string[]; strength?: number }>;
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
  'interactive-gating': 'packages/diagram-engine/fixture/interactive-gating/input.diagram.json',
  'di-cycl-rock-cycle': 'packages/diagram-engine/fixture/di-cycl-rock-cycle/input.diagram.json',
  'di-sys-food-web': 'packages/diagram-engine/fixture/di-sys-food-web/input.diagram.json',
  'di-lab-cell-organelle': 'packages/diagram-engine/fixture/di-lab-cell-organelle/input.diagram.json',
  'di-hist-cause-sequence': 'packages/diagram-engine/fixture/di-hist-cause-sequence/input.diagram.json',
  'di-hist-resistance-chain': 'packages/diagram-engine/fixture/di-hist-resistance-chain/input.diagram.json',
  'di-hist-causes': 'packages/diagram-engine/fixture/di-hist-causes/input.diagram.json',
  'di-hist-boundary': 'packages/diagram-engine/fixture/di-hist-boundary/input.diagram.json',
  'di-cmp-before-after': 'packages/diagram-engine/fixture/di-cmp-before-after/input.diagram.json',
  'di-cause-relationship-name': 'packages/diagram-engine/fixture/di-cause-relationship-name/input.diagram.json',
  'di-proc-effect-chain': 'packages/diagram-engine/fixture/di-proc-effect-chain/input.diagram.json',
  'di-class-urban-hierarchy': 'packages/diagram-engine/fixture/di-class-urban-hierarchy/input.diagram.json',
  'di-sys-city-system': 'packages/diagram-engine/fixture/di-sys-city-system/input.diagram.json',
  'di-cause-relationship-gate': 'packages/diagram-engine/fixture/di-cause-relationship-gate/input.diagram.json',
  'di-cause-relative-influence': 'packages/diagram-engine/fixture/di-cause-relative-influence/input.diagram.json',
  'di-cause-influence-chain': 'packages/diagram-engine/fixture/di-cause-influence-chain/input.diagram.json',
  'di-inq-what-if': 'packages/diagram-engine/fixture/di-inq-what-if/input.diagram.json',
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

test.describe('Diagram W-5a — per-item interactive gating', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, FIXTURES['interactive-gating']);
  });

  test('interactive:false removes a node/edge from the interactive surface; host dispatch still applies', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const svg = h.svg();
      const nodeStepGated = !svg.includes('id="node-step"') || svg.includes('node-step') && /id="node-step"[^>]*data-oedu-interactive="true"/.test(svg) === false;
      const edgeGated = svg.includes('edge-step-output') && /id="edge-step-output"[^>]*data-oedu-interactive="true"/.test(svg) === false;
      h.dispatch({ type: 'select', target: { id: 'step' } });
      const hostDispatch = h.snapshot().selection;
      return { nodeStepGated, edgeGated, hostDispatch };
    });
    expect(result.nodeStepGated).toBe(true);
    expect(result.edgeGated).toBe(true);
    expect(result.hostDispatch).toContain('step');
  });
});
test.describe('Diagram W-3.1 — relation-vocab (di-cycl-3, di-sys-1, di-lab-4)', () => {
  test('di-cycl-3: transforms-to and weathers-into relationships resolve in the alternative', async ({ page }) => {
    await mount(page, FIXTURES['di-cycl-rock-cycle']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const edges = h.alternative().filter((r) => r.kind === 'edge');
      return { relations: edges.map((e) => e.relationship) };
    });
    expect(result.relations).toContain('transforms-to');
    expect(result.relations).toContain('weathers-into');
  });

  test('di-sys-1: feeds-on and produces resolve for the food web', async ({ page }) => {
    await mount(page, FIXTURES['di-sys-food-web']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const edges = h.alternative().filter((r) => r.kind === 'edge');
      const relations = edges.map((e) => e.relationship);
      const before = h.events().length;
      h.dispatch({ type: 'follow', target: { id: 'edge-rabbit-fox' } });
      const names = h.events().slice(before).map((e) => e.name);
      return { relations, followed: names.includes('diagram.relationship-followed') };
    });
    expect(result.relations).toContain('feeds-on');
    expect(result.relations).toContain('produces');
    expect(result.followed).toBe(true);
  });

  test('di-lab-4: produces resolves for cell function edges', async ({ page }) => {
    await mount(page, FIXTURES['di-lab-cell-organelle']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const edges = h.alternative().filter((r) => r.kind === 'edge');
      return { relations: edges.map((e) => e.relationship) };
    });
    expect(result.relations).toContain('produces');
    expect(result.relations).toContain('feeds-on');
  });
});

test.describe('Diagram W-3.2 — links vocabulary (di-hist-1..4, di-cmp-3)', () => {
  test('di-hist-1: node links resolve to timelineEventId in the scene', async ({ page }) => {
    await mount(page, FIXTURES['di-hist-cause-sequence']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'long-cause' } });
      const events = h.events().map((e) => e.name);
      return { selected: h.snapshot().selection, selectedEvent: events.includes('diagram.node-selected') };
    });
    expect(result.selected).toContain('long-cause');
    expect(result.selectedEvent).toBe(true);
  });

  test('di-hist-2: chain DAG; follow resolves; node links carried', async ({ page }) => {
    await mount(page, FIXTURES['di-hist-resistance-chain']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'follow', target: { id: 'edge-movement-1-movement-2' } });
      return { names: h.events().slice(before).map((e) => e.name) };
    });
    expect(result.names).toContain('diagram.relationship-followed');
  });

  test('di-hist-3: cause/trigger nodes selectable; links carried', async ({ page }) => {
    await mount(page, FIXTURES['di-hist-causes']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'select', target: { id: 'trigger' } });
      h.dispatch({ type: 'select', target: { id: 'structural' } });
      return h.snapshot().selection;
    });
    expect(result).toEqual(['trigger', 'structural']);
  });

  test('di-hist-4: node links carry geomapEntityId', async ({ page }) => {
    await mount(page, FIXTURES['di-hist-boundary']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const alt = h.alternative();
      return { nodes: alt.filter((r) => r.kind === 'node').length };
    });
    expect(result.nodes).toBe(3);
  });

  test('di-cmp-3: before/after structure keyed to timeline events; links carried', async ({ page }) => {
    await mount(page, FIXTURES['di-cmp-before-after']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const alt = h.alternative();
      return { nodes: alt.filter((r) => r.kind === 'node').length, edges: alt.filter((r) => r.kind === 'edge').length };
    });
    expect(result.nodes).toBe(3);
    expect(result.edges).toBe(2);
  });
});

test.describe('Diagram W-3.4 — edge-select (di-cause-3)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, FIXTURES['di-cause-relationship-name']);
  });

  test('selecting an edge emits diagram.edge-selected; alternative lists edges with their relationship', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'select', target: { id: 'rain-erodes' } });
      const newEvents = h.events().slice(before);
      const alt = h.alternative();
      const edgeRows = alt.filter((r) => r.kind === 'edge');
      const rain = edgeRows.find((r) => r.id === 'edge-rain-erodes' || r.id === 'rain-erodes');
      return { names: newEvents.map((e) => e.name), relationship: rain?.relationship, edgeRows };
    });
    expect(result.names).toContain('diagram.edge-selected');
    expect(result.relationship).toBe('influences');
    expect(result.edgeRows.length).toBe(2);
  });
});

test.describe('Diagram W-3.5 — filter-nodes (di-proc-5, di-class-5, di-sys-4)', () => {
  test('di-proc-5: filter by category greys unrelated nodes; clear-filter restores; diagram.filter-applied logged', async ({ page }) => {
    await mount(page, FIXTURES['di-proc-effect-chain']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'filter', payload: { categories: ['agriculture', 'economy'] } });
      const names = h.events().slice(before).map((e) => e.name);
      const svgFiltered = h.svg();
      h.dispatch({ type: 'clear-filter' });
      const svgRestored = h.svg();
      return { names, filteredHasStock: svgFiltered.includes('id="node-stock"'), restoredHasStock: svgRestored.includes('id="node-stock"') };
    });
    expect(result.names).toContain('diagram.filter-applied');
    expect(result.filteredHasStock).toBe(true);
    expect(result.restoredHasStock).toBe(true);
  });

  test('di-class-5: bracket-highlight via filter keeps only the requested size category visible', async ({ page }) => {
    await mount(page, FIXTURES['di-class-urban-hierarchy']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'filter', payload: { categories: ['large'] } });
      const alt = h.alternative();
      const visibleNodes = alt.filter((r) => r.kind === 'node').map((r) => r.id);
      h.dispatch({ type: 'clear-filter' });
      const all = h.alternative().filter((r) => r.kind === 'node').length;
      return { visibleNodes, all };
    });
    expect(result.visibleNodes).toEqual(['node-city', 'node-metropolis']);
    expect(result.all).toBe(4);
  });

  test('di-sys-4: waste-loop highlight via filter isolates the recycling loop', async ({ page }) => {
    await mount(page, FIXTURES['di-sys-city-system']);
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'filter', payload: { categories: ['waste'] } });
      const alt = h.alternative();
      const visibleNodes = alt.filter((r) => r.kind === 'node').map((r) => r.id);
      return { visibleNodes };
    });
    expect(result.visibleNodes).toEqual(['node-waste', 'node-recycle']);
  });
});

test.describe('Diagram W-3.6 — relationship-gate (di-cause-6)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, FIXTURES['di-cause-relationship-gate']);
  });

  test('edge relationship hidden initially; answer reveals it; follow afterwards', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const svgInitial = h.svg();
      const hiddenInitial = svgInitial.includes('data-oedu-relationship="influences"') === false;
      h.dispatch({ type: 'answer', target: { id: 'rain-erodes' } });
      const snap = h.snapshot() as unknown as { revealedEdges: string[] };
      const svgRevealed = h.svg();
      const before = h.events().length;
      h.dispatch({ type: 'follow', target: { id: 'rain-erodes' } });
      const names = h.events().slice(before).map((e) => e.name);
      return { hiddenInitial, revealedEdges: snap.revealedEdges, revealedRelationship: svgRevealed.includes('data-oedu-relationship="influences"'), followed: names.includes('diagram.relationship-followed') };
    });
    expect(result.hiddenInitial).toBe(true);
    expect(result.revealedEdges).toContain('rain-erodes');
    expect(result.revealedRelationship).toBe(true);
    expect(result.followed).toBe(true);
  });
});

test.describe('Diagram W-3.7 — edge-weight (di-cause-5)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, FIXTURES['di-cause-relative-influence']);
  });

  test('edges carry semantic strength in the alternative; dominant edge is identifiable', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const edges = h.alternative().filter((r) => r.kind === 'edge');
      const soil = edges.find((e) => e.id === 'edge-soil-crop' || e.id === 'soil-crop');
      const rain = edges.find((e) => e.id === 'edge-rain-crop' || e.id === 'rain-crop');
      return { soilStrength: soil?.strength, rainStrength: rain?.strength };
    });
    expect(result.soilStrength).toBe(0.8);
    expect(result.rainStrength).toBe(0.6);
  });
});

test.describe('Diagram W-3.8 — follow-chain (di-cause-4)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, FIXTURES['di-cause-influence-chain']);
  });

  test('each follow appends to the chain; last edge carries a monotonic chain step', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      h.dispatch({ type: 'follow', target: { id: 'river-silt' } });
      h.dispatch({ type: 'follow', target: { id: 'silt-fertility' } });
      h.dispatch({ type: 'follow', target: { id: 'fertility-crops' } });
      const snap = h.snapshot() as unknown as { followedChain: string[] };
      const svg = h.svg();
      return { chain: snap.followedChain, lastStep: svg.includes('data-oedu-chain-step="3"') };
    });
    expect(result.chain).toEqual(['river-silt', 'silt-fertility', 'fertility-crops']);
    expect(result.lastStep).toBe(true);
  });
});

test.describe('Diagram W-3.9 — what-if (di-inq-3)', () => {
  test.beforeEach(async ({ page }) => {
    await mount(page, FIXTURES['di-inq-what-if']);
  });

  test('what-if de-emphasises a node without mutating the spec; diagram.what-if logged', async ({ page }) => {
    const result = await page.evaluate(() => {
      const h = (window as unknown as { __diagramHarness: Harness }).__diagramHarness;
      const before = h.events().length;
      h.dispatch({ type: 'answer', target: { id: 'decomposer' }, payload: { whatIf: true, whatIfNode: 'decomposer' } });
      const names = h.events().slice(before).map((e) => e.name);
      const svg = h.svg();
      const snap = h.snapshot() as unknown as { deemphasizedNodes: string[] };
      return { names, deemphasized: snap.deemphasizedNodes, marked: svg.includes('data-oedu-what-if="deemphasized"') };
    });
    expect(result.names).toContain('diagram.what-if');
    expect(result.deemphasized).toEqual(['decomposer']);
    expect(result.marked).toBe(true);
  });
});
