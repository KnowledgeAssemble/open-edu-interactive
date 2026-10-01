import { describe, expect, it } from 'vitest';
import { validateSemantic } from '../src/validation/semantic.js';
import { validateLayout } from '../src/validation/layout.js';
import { validateAccessibility } from '../src/validation/accessibility.js';
import type { VisualSpec } from '../src/schema.js';

const VALID_SPEC: VisualSpec = {
  type: 'visual',
  version: '1.0.0',
  id: 'test-nl',
  content: {
    kind: 'number-line',
    range: { min: 0, max: 10, step: 1 },
    highlight: [7],
    components: [{ id: 'nl', type: 'number-line', props: { min: 0, max: 10, step: 1, highlight: [7] } }],
  },
  accessibility: { label: 'Number line', description: '7 is highlighted' },
};

describe('validateSemantic (L2)', () => {
  it('passes on valid number-line spec', () => {
    const result = validateSemantic(VALID_SPEC);
    expect(result.valid).toBe(true);
  });

  it('rejects unknown kind', () => {
    const result = validateSemantic({ ...VALID_SPEC, content: { ...VALID_SPEC.content, kind: 'timeline' as never } });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_ENTITY');
  });

  it('rejects broken relationship reference', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        ...VALID_SPEC.content,
        elements: [{ id: 'a', type: 'circle' }],
        relationships: [{ type: 'labels', source: 'a', target: 'nonexistent' }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_REFERENCE');
  });

  it('rejects invalid highlightHand at L2', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        kind: 'clock',
        components: [{ id: 'ck', type: 'clock', props: { hour: 3, minute: 0, highlightHand: 'second' } }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_SPEC');
    expect(result.issues[0]!.message).toContain('highlightHand');
  });

  it('rejects coordinate-grid missing point ids when highlightPoints set', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        kind: 'coordinate-grid',
        components: [{
          id: 'cg', type: 'coordinate-grid', props: {
            x: { min: 0, max: 6, step: 1 },
            y: { min: 0, max: 6, step: 1 },
            points: [{ x: 1, y: 2 }],
            highlightPoints: ['target'],
          },
        }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_SPEC');
  });

  it('rejects geometry conflicting highlight flags', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        kind: 'geometry',
        components: [{
          id: 'geo', type: 'geometry', props: {
            shape: 'triangle',
            highlight: true,
            highlightVertices: true,
          },
        }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_SPEC');
    expect(result.issues[0]!.message).toContain('at most one');
  });

  it('rejects geometry highlightVertices without showVertices', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        kind: 'geometry',
        components: [{
          id: 'geo', type: 'geometry', props: {
            shape: 'triangle',
            highlightVertices: true,
          },
        }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_SPEC');
    expect(result.issues[0]!.message).toContain('highlightVertices requires');
  });

  it('rejects fraction-circle denominator below 2', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        kind: 'fraction-circle',
        components: [{ id: 'fc', type: 'fraction-circle', props: { numerator: 1, denominator: 1 } }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_ENTITY');
    expect(result.issues[0]!.message).toContain('denominator must be at least 2');
  });

  it('rejects a negative maxSelection on counting-set with INVALID_SPEC', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        kind: 'counting-set',
        components: [{ id: 'cs', type: 'counting-set', props: { count: 3, object: 'star', arrangement: 'row', maxSelection: -1 } }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('INVALID_SPEC');
    expect(result.issues[0]!.message).toContain('maxSelection');
  });
});

describe('validateAccessibility (L4)', () => {
  it('passes when accessibility label is present', () => {
    const result = validateAccessibility(VALID_SPEC);
    expect(result.valid).toBe(true);
  });

  it('fails when envelope accessibility.label is missing', () => {
    const result = validateAccessibility({ ...VALID_SPEC, accessibility: {} });
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('ACCESSIBILITY_ERROR');
  });

  it('fails on color-only interactive element without role', () => {
    const spec: VisualSpec = {
      ...VALID_SPEC,
      content: {
        ...VALID_SPEC.content,
        elements: [{ id: 'x', type: 'circle', interactive: true, style: { fill: 'red' } }],
      },
    };
    const result = validateAccessibility(spec);
    expect(result.valid).toBe(false);
    expect(result.issues[0]!.code).toBe('ACCESSIBILITY_ERROR');
  });
});

describe('validateLayout (L3)', () => {
  it('passes on typical number-line', () => {
    const result = validateLayout(VALID_SPEC);
    expect(result.valid).toBe(true);
  });
});