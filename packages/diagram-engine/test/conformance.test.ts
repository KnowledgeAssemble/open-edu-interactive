import { describe, it } from 'vitest';
import { runEngineConformance, assertEngineConformance, type EngineConformanceResult } from '@knowledgeassemble/interactive-engine';
import { DiagramEngine } from '../src/engine.js';

describe('N4 — diagram conformance', () => {
  it('flow diagram conforms: validates, monotonic log, non-D5 action rejected, stable snapshot', () => {
    const result: EngineConformanceResult = runEngineConformance(
      new DiagramEngine(),
      {
        type: 'diagram',
        version: '1.0.0',
        id: 'cv-diagram',
        content: {
          kind: 'flow',
          nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
          edges: [{ from: 'a', to: 'b', relationship: 'leads-to' }],
        },
        sources: [{ class: 'illustrative' }],
        accessibility: { label: 'Flow' },
      } as never,
      { type: 'select', target: { id: 'a' } },
    );
    assertEngineConformance(result);
  });
});