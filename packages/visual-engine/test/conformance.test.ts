import { describe, it } from 'vitest';
import { runEngineConformance, assertEngineConformance, type EngineConformanceResult } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '../src/engine.js';

describe('N4 — visual conformance', () => {
  it('number-line conforms: validates, monotonic log, non-D5 action rejected, stable snapshot', () => {
    const result: EngineConformanceResult = runEngineConformance(
      new VisualEngine(),
      {
        type: 'visual',
        version: '1.0.0',
        id: 'cv-number-line',
        content: { kind: 'number-line', components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }] },
        accessibility: { label: 'Number line' },
      } as never,
      { type: 'select', target: { id: 'nl-marker-7' } },
    );
    assertEngineConformance(result);
  });
});