import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EngineError,
  type EngineAction,
  type EngineEvent,
} from '../src/index.js';
import { Lesson } from '../src/composition/lesson.js';
import { makeHost, makeRegistry } from './helpers/composition.js';

const FIXTURE_URL = new URL('../../../docs/fixtures/composition/narrative-timeline-visual.json', import.meta.url);
const canonicalFixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as {
  id: string;
  engines: Array<{
    instanceId: string;
    engine: string;
    spec: { type: string; version: string; id: string; content: { kind: string; events?: Array<{ id: string; label: string; date: string; links?: Record<string, string> }>; entities?: Array<{ id: string; label: string }> } };
  }>;
  bindings: Array<{ on: string; from: string; dispatch: { to: string; action: string; targetIdFrom: string } }>;
};

describe('Lesson (composition runtime)', () => {
  it('load(canonicalFixture) validates', () => {
    const lesson = Lesson.load(canonicalFixture as never, makeRegistry());
    expect(lesson).toBeInstanceOf(Lesson);
  });

  it('select on timeline instances routes focus to the visual instance', () => {
    const registry = makeRegistry();
    const lesson = Lesson.load(canonicalFixture as never, registry);
    const { host } = makeHost();
    const runtime = lesson.start(host);

    runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);

    const visualSnapshot = runtime.snapshot('visual-independence') as { focus: string | null };
    expect(visualSnapshot.focus).toBe('figure-independence');

    const eventNames = runtime.events().map((e) => e.name);
    const tIdx = eventNames.indexOf('timeline.event-selected');
    const vIdx = eventNames.indexOf('visual.figure-independence-focused');
    expect(tIdx).toBeGreaterThan(0);
    expect(vIdx).toBeGreaterThan(tIdx);

    const selected = runtime.events().find((e) => e.name === 'timeline.event-selected');
    const payload = selected?.action?.payload as { links?: { visualEntityId?: string }; id?: string };
    expect(payload.id).toBe('event-1947');
    expect(payload.links?.visualEntityId).toBe('figure-independence');
    runtime.stop();
  });

  // The canonical fixture is timeline→visual, so the router never reads a diagram payload.
  // W-3.2 claims nodes[].links resolves through a binding, which only this case proves.
  it('select on a diagram node routes focus via targetIdFrom on links.visualEntityId', () => {
    const lessonDef = {
      id: 'diagram-links-binding',
      engines: [
        {
          instanceId: 'cycle',
          engine: 'diagram',
          spec: {
            type: 'diagram',
            version: '1.0.0',
            id: 'di-cycl-links',
            content: {
              kind: 'cycle',
              nodes: [
                {
                  id: 'a',
                  label: 'Stage A',
                  links: { visualEntityId: 'figure-a' },
                },
                { id: 'b', label: 'Stage B' },
              ],
              edges: [
                { from: 'a', to: 'b', relationship: 'transforms-to' },
                { from: 'b', to: 'a', relationship: 'produces' },
              ],
            },
            accessibility: { label: 'Two-stage cycle' },
          },
        },
        {
          instanceId: 'figures',
          engine: 'visual',
          spec: {
            type: 'visual',
            version: '1.0.0',
            id: 'visual-figures',
            content: {
              kind: 'illustration',
              entities: [{ id: 'figure-a', label: 'Figure A' }],
            },
            accessibility: { label: 'Stage figures' },
          },
        },
      ],
      bindings: [
        {
          on: 'diagram.node-selected',
          from: 'cycle',
          dispatch: { to: 'figures', action: 'focus', targetIdFrom: 'links.visualEntityId' },
        },
      ],
    };
    const lesson = Lesson.load(lessonDef as never, makeRegistry());
    const runtime = lesson.start(makeHost().host);

    runtime.dispatch('cycle', { type: 'select', target: { id: 'node-a' } } as EngineAction);

    const visualSnapshot = runtime.snapshot('figures') as { focus: string | null };
    expect(visualSnapshot.focus).toBe('figure-a');

    const eventNames = runtime.events().map((e) => e.name);
    expect(eventNames.indexOf('visual.figure-a-focused')).toBeGreaterThan(
      eventNames.indexOf('diagram.node-selected'),
    );
    runtime.stop();
  });

  it('EventLog replay from the host stream reproduces the same final snapshot', () => {
    const registry = makeRegistry();
    const lesson = Lesson.load(canonicalFixture as never, registry);

    const run = (): { snapshot: string; log: readonly EngineEvent[] } => {
      const { host } = makeHost();
      const runtime = lesson.start(host);
      runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
      const visual = runtime.snapshot('visual-independence') as { focus: string | null; selection: string[] };
      const events = runtime.events();
      runtime.stop();
      return { snapshot: JSON.stringify({ focus: visual.focus, selection: visual.selection }), log: events };
    };

    const first = run();
    const second = run();
    expect(first.snapshot).toBe(second.snapshot);
    expect(first.log.map((e) => e.name)).toEqual(second.log.map((e) => e.name));
  });

  it('rejects a lesson whose engines[].engine !== spec.type with INVALID_SPEC', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.engines[0] as { engine: string }).engine = 'visual';
    let caught: EngineError | null = null;
    try {
      Lesson.load(bad as never, makeRegistry());
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_SPEC');
  });

  it('rejects an unknown binding target instance with INVALID_REFERENCE', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { to: string } }).dispatch.to = 'no-such-instance';
    let caught: EngineError | null = null;
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      lesson.start(makeHost().host);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_REFERENCE');
  });

  it('an unresolved targetIdFrom raises INVALID_REFERENCE without truncating the source stream', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { targetIdFrom: string } }).dispatch.targetIdFrom = 'links.missingField';
    let caught: EngineError | null = null;
    const { host, events } = makeHost();
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      const runtime = lesson.start(host);
      runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_REFERENCE');
    const names = events.map((e) => e.name);
    expect(names.filter((n) => n === 'interaction-completed')).toHaveLength(1);
    expect(names.indexOf('timeline.event-selected')).toBeLessThan(names.indexOf('interaction-completed'));
  });

  it('unknown from instance on the binding rejects at start', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { from: string }).from = 'no-such-instance';
    let caught: EngineError | null = null;
    try {
      const lesson = Lesson.load(bad as never, makeRegistry());
      lesson.start(makeHost().host);
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_REFERENCE');
  });

  it('rejects a binding dispatch action not declared on the target with INVALID_ACTION', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { action: string } }).dispatch.action = 'step';
    let caught: EngineError | null = null;
    try {
      Lesson.load(bad as never, makeRegistry());
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_ACTION');
  });

  it('rejects a binding with both targetIdFrom and targetId with INVALID_SPEC', () => {
    const bad = structuredClone(canonicalFixture);
    (bad.bindings[0] as { dispatch: { targetIdFrom: string } }).dispatch.targetIdFrom = 'links.visualEntityId';
    (bad.bindings[0] as { dispatch: { targetId?: string } }).dispatch.targetId = 'figure-independence';
    let caught: EngineError | null = null;
    try {
      Lesson.load(bad as never, makeRegistry());
    } catch (e) {
      caught = e as EngineError;
    }
    expect(caught).toBeInstanceOf(EngineError);
    expect(caught!.code).toBe('INVALID_SPEC');
  });

  it('routes a static targetId binding to the declared target', () => {
    const fixture = structuredClone(canonicalFixture);
    const dispatch = (fixture.bindings[0] as { dispatch: { targetIdFrom?: string; targetId?: string } }).dispatch;
    delete dispatch.targetIdFrom;
    dispatch.targetId = 'figure-independence';
    const lesson = Lesson.load(fixture as never, makeRegistry());
    const { host } = makeHost();
    const runtime = lesson.start(host);
    runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
    const visualSnapshot = runtime.snapshot('visual-independence') as { focus: string | null };
    expect(visualSnapshot.focus).toBe('figure-independence');
    runtime.stop();
  });
});
