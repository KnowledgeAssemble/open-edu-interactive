import { describe, expect, it } from 'vitest';
import { EngineRegistry } from '@knowledgeassemble/interactive-engine';
import type { EngineHost } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '../src/engine.js';

function stubHost(): EngineHost {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: () => '',
  };
}

const NL_SPEC = {
  type: 'visual',
  version: '1.0.0',
  id: 'number-line-test',
  content: {
    kind: 'number-line',
    components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }],
  },
  accessibility: { label: 'Number line test', description: 'Test number line' },
};

describe('VisualEngine', () => {
  it('registers in EngineRegistry', () => {
    const registry = new EngineRegistry();
    const engine = new VisualEngine();
    registry.register(engine);
    expect(registry.get('visual')).toBe(engine);
  });

  it('validates a correct number-line spec', () => {
    const engine = new VisualEngine();
    const result = engine.validate(NL_SPEC as never);
    expect(result.valid).toBe(true);
  });

  it('rejects an unknown content.kind', () => {
    const engine = new VisualEngine();
    const badSpec = { ...NL_SPEC, content: { kind: 'timeline' } };
    const result = engine.validate(badSpec as never);
    expect(result.valid).toBe(false);
  });

  it('validates an illustration spec with entities', () => {
    const engine = new VisualEngine();
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'illustration-test',
      content: {
        kind: 'illustration',
        entities: [{ id: 'figure-independence', label: 'Independence celebration' }],
      },
      accessibility: { label: 'Historical illustration' },
    };
    const result = engine.validate(spec as never);
    expect(result.valid).toBe(true);
  });

  it('instantiate on an illustration spec yields focusable, labeled entity nodes', () => {
    const engine = new VisualEngine();
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'visual-independence',
      content: {
        kind: 'illustration',
        entities: [{ id: 'figure-independence', label: 'Independence celebration' }],
      },
      accessibility: { label: 'Historical illustration' },
    };
    const instance = engine.instantiate(spec as never, stubHost());
    const snapshot = instance.snapshot() as unknown as { scene: { semantics: Record<string, { acceptsActions?: string[]; label?: string; interactive?: boolean }> } };
    const node = snapshot.scene.semantics['figure-independence'];
    expect(node).toBeDefined();
    expect(node!.acceptsActions).toEqual(['select', 'focus']);
    expect(node!.interactive).toBe(true);
    expect(node!.label).toBe('Independence celebration');
  });

  it('instantiate creates a running instance', () => {
    const engine = new VisualEngine();
    const instance = engine.instantiate(NL_SPEC as never, stubHost());
    expect(instance.id).toBe('number-line-test');
    expect(instance.engine).toBe('visual');
    expect(instance.snapshot().phase).toBe('running');
  });

  it('dispatch select updates selection and emits namespaced events', () => {
    const engine = new VisualEngine();
    const events: Array<{ name: string }> = [];
    const host = stubHost();
    (host as unknown as { onEvent: (e: { name: string }) => void }).onEvent = (e) => { events.push(e); };
    const instance = engine.instantiate(NL_SPEC as never, host);
    instance.dispatch({ type: 'select', target: { id: 'nl-marker-7' } });
    expect(instance.snapshot().selection).toContain('nl-marker-7');
    const nsEvent = events.find((e) => e.name.startsWith('visual.'));
    expect(nsEvent).toBeDefined();
  });

  it('discovery number-line dispatches select on nl-label-7', () => {
    const engine = new VisualEngine();
    const events: Array<{ name: string }> = [];
    const host = stubHost();
    (host as unknown as { onEvent: (e: { name: string }) => void }).onEvent = (e) => { events.push(e); };
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'number-line-identify-marked-test',
      content: {
        kind: 'number-line',
        components: [{
          id: 'nl',
          type: 'number-line',
          props: { min: 0, max: 10, step: 1, interactive: true, highlight: [7] },
        }],
      },
      accessibility: { label: 'Number line', description: 'Identify marked number' },
    };
    const instance = engine.instantiate(spec as never, host);
    instance.dispatch({ type: 'select', target: { id: 'nl-label-7' } });
    expect(instance.snapshot().selection).toContain('nl-label-7');
    expect(events.some((e) => e.name === 'visual.nl-label-7-selected')).toBe(true);
  });

  it('dispatch select on clock hour hand emits visual.ck-hour-hand-selected', () => {
    const engine = new VisualEngine();
    const events: Array<{ name: string }> = [];
    const host = stubHost();
    (host as unknown as { onEvent: (e: { name: string }) => void }).onEvent = (e) => { events.push(e); };
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'clock-practice-test',
      content: {
        kind: 'clock',
        components: [{ id: 'ck', type: 'clock', props: { hour: 3, minute: 30, highlightHand: 'hour' } }],
      },
      accessibility: { label: 'Clock', description: 'Clock practice' },
    };
    const instance = engine.instantiate(spec as never, host);
    instance.dispatch({ type: 'select', target: { id: 'ck-hour-hand' } });
    expect(events.some((e) => e.name === 'visual.ck-hour-hand-selected')).toBe(true);
  });

  it('dispatch select on coordinate-grid point emits visual.cg-point-target-selected', () => {
    const engine = new VisualEngine();
    const events: Array<{ name: string }> = [];
    const host = stubHost();
    (host as unknown as { onEvent: (e: { name: string }) => void }).onEvent = (e) => { events.push(e); };
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'cg-practice-test',
      content: {
        kind: 'coordinate-grid',
        components: [{
          id: 'cg',
          type: 'coordinate-grid',
          props: {
            x: { min: -5, max: 5, step: 1 },
            y: { min: -5, max: 5, step: 1 },
            points: [{ x: 2, y: 3, id: 'target' }],
            highlightPoints: ['target'],
          },
        }],
      },
      accessibility: { label: 'Grid', description: 'Coordinate grid practice' },
    };
    const instance = engine.instantiate(spec as never, host);
    instance.dispatch({ type: 'select', target: { id: 'cg-point-target' } });
    expect(events.some((e) => e.name === 'visual.cg-point-target-selected')).toBe(true);
  });

  it('dispatch select on geometry shape emits visual.hex-shape-selected', () => {
    const engine = new VisualEngine();
    const events: Array<{ name: string }> = [];
    const host = stubHost();
    (host as unknown as { onEvent: (e: { name: string }) => void }).onEvent = (e) => { events.push(e); };
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'geometry-practice-test',
      content: {
        kind: 'geometry',
        components: [{ id: 'hex', type: 'geometry', props: { shape: 'hexagon', highlight: true } }],
      },
      accessibility: { label: 'Hexagon', description: 'Geometry practice' },
    };
    const instance = engine.instantiate(spec as never, host);
    instance.dispatch({ type: 'select', target: { id: 'hex-shape' } });
    expect(events.some((e) => e.name === 'visual.hex-shape-selected')).toBe(true);
  });

  it('dispatch select on fraction-circle sector emits visual.fc-sector-0-selected', () => {
    const engine = new VisualEngine();
    const events: Array<{ name: string }> = [];
    const host = stubHost();
    (host as unknown as { onEvent: (e: { name: string }) => void }).onEvent = (e) => { events.push(e); };
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'fraction-circle-practice-test',
      content: {
        kind: 'fraction-circle',
        components: [{
          id: 'fc',
          type: 'fraction-circle',
          props: { numerator: 3, denominator: 4, interactive: true, highlightedParts: [0, 1, 2] },
        }],
      },
      accessibility: { label: 'Fraction circle', description: 'Fraction circle practice' },
    };
    const instance = engine.instantiate(spec as never, host);
    instance.dispatch({ type: 'select', target: { id: 'fc-sector-0' } });
    expect(events.some((e) => e.name === 'visual.fc-sector-0-selected')).toBe(true);
  });
});

describe('VisualEngine — maxSelection (W-2.1)', () => {
  const CS_SPEC = {
    type: 'visual',
    version: '1.0.0',
    id: 'counting-set-max-test',
    content: {
      kind: 'counting-set',
      components: [{
        id: 'cs',
        type: 'counting-set',
        props: { count: 5, object: 'star', arrangement: 'row', interactive: true, maxSelection: 3 },
      }],
    },
    accessibility: { label: 'Pick three stars', description: 'Counting set with a max of three' },
  };

  it('rejects the fourth select over maxSelection with INVALID_ACTION', () => {
    const engine = new VisualEngine();
    const instance = engine.instantiate(CS_SPEC as never, stubHost());
    instance.dispatch({ type: 'select', target: { id: 'cs-object-0' } });
    instance.dispatch({ type: 'select', target: { id: 'cs-object-1' } });
    instance.dispatch({ type: 'select', target: { id: 'cs-object-2' } });
    expect(instance.snapshot().selection).toEqual(['cs-object-0', 'cs-object-1', 'cs-object-2']);
    expect(() => instance.dispatch({ type: 'select', target: { id: 'cs-object-3' } })).toThrow(/maxSelection/);
    expect(instance.snapshot().selection).toEqual(['cs-object-0', 'cs-object-1', 'cs-object-2']);
  });

  it('deselect frees capacity for a later select', () => {
    const engine = new VisualEngine();
    const instance = engine.instantiate(CS_SPEC as never, stubHost());
    instance.dispatch({ type: 'select', target: { id: 'cs-object-0' } });
    instance.dispatch({ type: 'select', target: { id: 'cs-object-1' } });
    instance.dispatch({ type: 'select', target: { id: 'cs-object-2' } });
    instance.dispatch({ type: 'deselect', target: { id: 'cs-object-1' } });
    instance.dispatch({ type: 'select', target: { id: 'cs-object-3' } });
    expect(instance.snapshot().selection).toEqual(['cs-object-0', 'cs-object-2', 'cs-object-3']);
  });

  it('host dispatch of a non-select action is never rejected by the cap', () => {
    const engine = new VisualEngine();
    const instance = engine.instantiate(CS_SPEC as never, stubHost());
    expect(() => instance.dispatch({ type: 'focus', target: { id: 'cs-object-4' } })).not.toThrow();
    expect(() => instance.dispatch({ type: 'reset' })).not.toThrow();
  });

  it('absent maxSelection means unlimited selection', () => {
    const engine = new VisualEngine();
    const spec = {
      type: 'visual',
      version: '1.0.0',
      id: 'counting-set-unlimited-test',
      content: {
        kind: 'counting-set',
        components: [{
          id: 'cs',
          type: 'counting-set',
          props: { count: 5, object: 'star', arrangement: 'row', interactive: true },
        }],
      },
      accessibility: { label: 'Counting set', description: 'Counting set' },
    };
    const instance = engine.instantiate(spec as never, stubHost());
    for (let i = 0; i < 5; i++) {
      instance.dispatch({ type: 'select', target: { id: `cs-object-${i}` } });
    }
    expect(instance.snapshot().selection).toHaveLength(5);
  });
});
