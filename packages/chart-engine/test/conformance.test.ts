import { describe, it } from 'vitest';
import { runEngineConformance, assertEngineConformance, type EngineConformanceResult } from '@knowledgeassemble/interactive-engine';
import { ChartEngine } from '../src/engine.js';

describe('N4 — chart conformance', () => {
  it('bar chart conforms: validates, monotonic log, non-D5 action rejected, stable snapshot', () => {
    const result: EngineConformanceResult = runEngineConformance(
      new ChartEngine(),
      {
        type: 'chart',
        version: '1.0.0',
        id: 'cv-bar',
        content: { kind: 'bar', dimensions: [{ id: 'm', type: 'ordinal' }], measures: [{ id: 'v', type: 'quantitative' }], data: [{ id: 'r1', m: 'A', v: 3 }] },
        accessibility: { label: 'Bar chart' },
        sources: [{ class: 'authoritative' }],
      } as never,
      { type: 'select', target: { id: 'v-bar-r1' } },
    );
    assertEngineConformance(result);
  });
});