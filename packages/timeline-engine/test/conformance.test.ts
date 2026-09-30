import { describe, it } from 'vitest';
import { runEngineConformance, assertEngineConformance, type EngineConformanceResult } from '@knowledgeassemble/interactive-engine';
import { TimelineEngine } from '../src/engine.js';

describe('N4 — timeline conformance', () => {
  it('events timeline conforms: validates, monotonic log, non-D5 action rejected, stable snapshot', () => {
    const result: EngineConformanceResult = runEngineConformance(
      new TimelineEngine(),
      {
        type: 'timeline',
        version: '1.0.0',
        id: 'cv-timeline',
        content: { kind: 'events', events: [{ id: 'e1', label: 'A', date: '1900' }] },
        sources: [{ class: 'authoritative' }],
        accessibility: { label: 'Timeline' },
      } as never,
      { type: 'select', target: { id: 'e1' } },
    );
    assertEngineConformance(result);
  });
});