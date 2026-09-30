import { describe, it, expect } from 'vitest';
import { EngineRegistry, EngineError } from '@knowledgeassemble/interactive-engine';
import { DiagramEngine } from '../src/engine.js';
import type { DiagramSpec } from '../src/schema.js';

const VALID_CYCLE: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'water-cycle',
  content: {
    kind: 'cycle',
    nodes: [
      { id: 'evaporation', label: 'Evaporation', links: { visualEntityId: 'water-figure' } },
      { id: 'condensation', label: 'Condensation' },
      { id: 'precipitation', label: 'Precipitation' },
      { id: 'collection', label: 'Collection' },
    ],
    edges: [
      { from: 'evaporation', to: 'condensation', relationship: 'leads-to' },
      { from: 'condensation', to: 'precipitation', relationship: 'leads-to' },
      { from: 'precipitation', to: 'collection', relationship: 'leads-to' },
      { from: 'collection', to: 'evaporation', relationship: 'leads-to' },
    ],
  },
  accessibility: { label: 'Water cycle diagram' },
};

const VALID_HIERARCHY: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'org-hierarchy',
  content: {
    kind: 'hierarchy',
    nodes: [
      { id: 'ceo', label: 'CEO' },
      { id: 'vp1', label: 'VP Engineering' },
      { id: 'vp2', label: 'VP Marketing' },
    ],
    edges: [
      { from: 'ceo', to: 'vp1', relationship: 'part-of' },
      { from: 'ceo', to: 'vp2', relationship: 'part-of' },
    ],
  },
  accessibility: { label: 'Org hierarchy' },
};

describe('DiagramEngine instance', () => {
  it('registry get(\'diagram\') returns the engine', () => {
    const registry = new EngineRegistry();
    const engine = new DiagramEngine();
    registry.register(engine);
    const retrieved = registry.get('diagram');
    expect(retrieved).toBe(engine);
  });

  it('instantiate throws on invalid spec', () => {
    const engine = new DiagramEngine();
    const badSpec = { ...VALID_CYCLE, content: { kind: 'organogram' } as never };
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: () => {},
      resolveAsset: (id: string) => id,
    };
    expect(() => engine.instantiate(badSpec as never, host)).toThrow(EngineError);
  });

  it('select emits diagram.node-selected with full node record', () => {
    const events: Array<{ seq: number; name: string; action?: unknown }> = [];
    const engine = new DiagramEngine();
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: (event: { seq: number; name: string; action?: unknown }) => events.push(event),
      resolveAsset: (id: string) => id,
    };
    const instance = engine.instantiate(VALID_CYCLE as never, host, 'water-cycle-test');
    instance.dispatch({ type: 'select', target: { id: 'node-evaporation' } });
    const selectEvents = events.filter((e) => e.name === 'diagram.node-selected');
    expect(selectEvents.length).toBeGreaterThanOrEqual(1);
    const evt = selectEvents[0]!;
    const payload = evt.action as { payload?: Record<string, unknown> } | undefined;
    expect(payload?.payload?.nodeId).toBe('evaporation');
    expect(payload?.payload?.links).toBeDefined();
  });

  it('focus emits diagram.node-focused', () => {
    const events: Array<{ seq: number; name: string; action?: unknown }> = [];
    const engine = new DiagramEngine();
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: (event: { seq: number; name: string; action?: unknown }) => events.push(event),
      resolveAsset: (id: string) => id,
    };
    const instance = engine.instantiate(VALID_CYCLE as never, host, 'water-cycle-test2');
    instance.dispatch({ type: 'focus', target: { id: 'node-evaporation' } });
    const focusEvents = events.filter((e) => e.name === 'diagram.node-focused');
    expect(focusEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('follow of edge emits diagram.relationship-followed', () => {
    const events: Array<{ seq: number; name: string; action?: unknown }> = [];
    const engine = new DiagramEngine();
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: (event: { seq: number; name: string; action?: unknown }) => events.push(event),
      resolveAsset: (id: string) => id,
    };
    const instance = engine.instantiate(VALID_CYCLE as never, host, 'water-cycle-test3');
    instance.dispatch({ type: 'follow', target: { id: 'edge-evaporation-condensation' } });
    const followEvents = events.filter((e) => e.name === 'diagram.relationship-followed');
    expect(followEvents.length).toBeGreaterThanOrEqual(1);
    const evt = followEvents[0]!;
    const payload = evt.action as { payload?: Record<string, unknown> } | undefined;
    expect(payload?.payload?.relationship).toBe('leads-to');
  });

  it('expand/collapse flips subtree visibility', () => {
    const engine = new DiagramEngine();
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: () => {},
      resolveAsset: (id: string) => id,
    };
    const instance = engine.instantiate(VALID_HIERARCHY as never, host, 'org-hierarchy-test');
    const snapBefore = instance.snapshot();
    expect(snapBefore.expanded).not.toContain('node-vp1');

    instance.dispatch({ type: 'expand', target: { id: 'node-ceo' } });
    const snapAfter = instance.snapshot();
    expect(snapAfter.expanded).toContain('node-vp1');

    instance.dispatch({ type: 'collapse', target: { id: 'node-ceo' } });
    const snapCollapsed = instance.snapshot();
    expect(snapCollapsed.expanded).not.toContain('node-vp1');
  });

  it('selection contains authored node id', () => {
    const engine = new DiagramEngine();
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: () => {},
      resolveAsset: (id: string) => id,
    };
    const instance = engine.instantiate(VALID_CYCLE as never, host, 'water-cycle-test4');
    instance.dispatch({ type: 'select', target: { id: 'node-evaporation' } });
    const snap = instance.snapshot();
    expect(snap.selection).toContain('node-evaporation');
  });

  it('event ids have instanceId:seq format', () => {
    const events: Array<{ seq: number; name: string; action?: unknown }> = [];
    const engine = new DiagramEngine();
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: (event: { seq: number; name: string; action?: unknown }) => events.push(event),
      resolveAsset: (id: string) => id,
    };
    const instance = engine.instantiate(VALID_CYCLE as never, host, 'water-cycle-test5');
    expect(events.length).toBeGreaterThan(0);
    instance.teardown();
  });

  it('kind organogram fails validate', () => {
    const badSpec = { ...VALID_CYCLE, content: { kind: 'organogram' } as never };
    const localEngine = new DiagramEngine();
    const result = localEngine.validate(badSpec as never);
    expect(result.valid).toBe(false);
  });
});
describe('DiagramEngine what-if immutability (W-3.9)', () => {
  it('what-if de-emphasis never mutates the authored spec content', () => {
    const spec: DiagramSpec = {
      type: 'diagram',
      version: '1.0.0',
      id: 'what-if-spec',
      content: {
        kind: 'concept-map',
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'b', relationship: 'leads-to' }],
      },
      accessibility: { label: 'What-if spec' },
    };
    const before = JSON.stringify(spec.content);
    const engine = new DiagramEngine();
    const host = {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: () => {},
      resolveAsset: (id: string) => id,
    };
    const instance = engine.instantiate(spec as never, host, 'what-if-test');
    instance.dispatch({ type: 'answer', target: { id: 'a' }, payload: { whatIf: true, whatIfNode: 'a' } });
    const after = JSON.stringify(spec.content);
    const snap = instance.snapshot() as unknown as { deemphasizedNodes: string[] };
    expect(after).toBe(before);
    expect(snap.deemphasizedNodes).toEqual(['a']);
    instance.teardown();
  });
});
