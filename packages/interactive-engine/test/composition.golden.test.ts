import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type EngineAction } from '../src/index.js';
import { Lesson } from '../src/composition/lesson.js';
import { makeHost, makeRegistry } from './helpers/composition.js';

const FIXTURE_URL = new URL('../../../docs/fixtures/composition/narrative-timeline-visual.json', import.meta.url);
const GOLDEN_URL = new URL('./fixtures/composition/narrative-timeline-visual.golden.json', import.meta.url);
const canonicalFixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8'));

function runSmoke(): unknown {
  const registry = makeRegistry();
  const lesson = Lesson.load(canonicalFixture, registry);
  const { host } = makeHost();
  const runtime = lesson.start(host);
  runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
  const visual = runtime.snapshot('visual-independence') as { focus: string | null; selection: string[] };
  const events = runtime.events().map((e) => ({
    id: e.id,
    seq: e.seq,
    name: e.name,
    instanceId: e.instanceId,
    action: e.action ? { type: e.action.type, target: e.action.target } : undefined,
    data: e.data,
  }));
  runtime.stop();
  return { snapshot: { focus: visual.focus, selection: visual.selection }, events };
}

describe('Golden event log parity', () => {
  it('deterministic: two runs of the smoke interaction produce identical output', () => {
    const first = JSON.stringify(runSmoke());
    const second = JSON.stringify(runSmoke());
    expect(first).toBe(second);
  });

  it('output byte-matches the checked-in golden file', () => {
    const output = runSmoke();
    const outputStr = JSON.stringify(output, null, 2) + '\n';
    const golden = readFileSync(GOLDEN_URL, 'utf8');
    expect(outputStr).toBe(golden);
  });

  it('links vocabulary (W-3.2): timeline.event-selected routes to the diagram node via links.timelineEventId', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../../docs/fixtures/composition/timeline-diagram-links.json', import.meta.url), 'utf8'));
    const registry = makeRegistry();
    const lesson = Lesson.load(fixture, registry);
    const { host } = makeHost();
    const runtime = lesson.start(host);
    runtime.dispatch('timeline-events', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
    const diagram = runtime.snapshot('diagram-chain') as { focus: string | null; selection: string[] };
    const routed = runtime.events().some((e) => e.name === 'diagram.node-focused');
    runtime.stop();
    expect(diagram.focus).toBe('outcome');
    expect(routed).toBe(true);
  });
});
