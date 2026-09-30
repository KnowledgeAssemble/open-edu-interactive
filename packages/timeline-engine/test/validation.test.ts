import { describe, expect, it } from 'vitest';
import { validateSemantic } from '../src/validation/semantic.js';
import { validateTemporal } from '../src/validation/temporal.js';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { validateLayout } from '../src/validation/layout.js';
import { TimelineEngine } from '../src/engine.js';
import type { LayoutContext } from '../src/layout/engine.js';
import type { TimelineContent, TimelineSpec } from '../src/schema.js';

const CTX: LayoutContext = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };

const validSpec = (overrides?: Partial<TimelineContent>): TimelineSpec => ({
  type: 'timeline',
  version: '1.0.0',
  id: 'test',
  content: {
    kind: 'events',
    events: [{ id: 'e1', label: 'A', date: '1900' }],
    ...overrides,
  },
  accessibility: { label: 'Test timeline' },
  sources: [{ class: 'authoritative' } as { class: 'authoritative' }],
});

describe('validation', () => {
  it('valid spec passes semantic validation', () => {
    const result = validateSemantic(validSpec());
    expect(result.valid).toBe(true);
  });

  it('date:"yesterday" fails temporal validation', () => {
    const temporalIssues = validateTemporal({ events: [{ date: 'yesterday' }] });
    expect(temporalIssues.length).toBeGreaterThan(0);
    expect(temporalIssues[0]?.code).toBe('INVALID_ENTITY');
  });

  it('out-of-range calendar dates fail temporal validation', () => {
    for (const bad of ['1947-13-01', '1947-04-31', '1900-02-29']) {
      const issues = validateTemporal({ events: [{ date: bad }] });
      expect(issues.length, `"${bad}" should be rejected`).toBeGreaterThan(0);
    }
    const ok = validateTemporal({ events: [{ date: '2024-02-29' }] });
    expect(ok.length).toBe(0);
  });

  it('period from>to fails validation', () => {
    const spec = validSpec({ periods: [{ id: 'p1', label: 'P', from: '1950', to: '1900' }] });
    const result = validateSemantic(spec);
    const temporalIssues = [...result.issues];
    expect(temporalIssues.length).toBeGreaterThan(0);
  });

  it('event duration not after date fails validation (inverted span)', () => {
    const spec = validSpec({ events: [{ id: 'e1', label: 'A', date: '1950', duration: '1900' }] });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY' && /duration/.test(i.message))).toBe(true);
  });

  it('event duration equal to date fails validation (missing span)', () => {
    const spec = validSpec({ events: [{ id: 'e1', label: 'A', date: '1950', duration: '1950' }] });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY' && /duration/.test(i.message))).toBe(true);
  });

  it('unparsable event duration fails validation', () => {
    const spec = validSpec({ events: [{ id: 'e1', label: 'A', date: '1950', duration: 'yesterday' }] });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC' && /duration/.test(i.message))).toBe(true);
  });

  it('a valid duration after date passes validation', () => {
    const spec = validSpec({ events: [{ id: 'e1', label: 'A', date: '1950', duration: '1960' }] });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(true);
  });

  it('unknown content keys fail with INVALID_SPEC (strict schema)', () => {
    const spec = validSpec({ timeline: [] } as Partial<TimelineContent>);
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC')).toBe(true);
  });

  it('track referencing unknown event fails INVALID_REFERENCE', () => {
    const spec = validSpec({ tracks: [{ id: 't1', label: 'T', events: ['e-unknown'] }] });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE')).toBe(true);
  });

  it('event belonging to two tracks fails INVALID_ENTITY (not silently valid)', () => {
    const spec = validSpec({
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1910' },
      ],
      tracks: [
        { id: 't1', label: 'T1', events: ['e1', 'e2'] },
        { id: 't2', label: 'T2', events: ['e1'] },
      ],
    });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY' && i.message.includes('multiple tracks'))).toBe(true);
  });

  it('event with unknown event.trackId fails INVALID_REFERENCE', () => {
    const spec = validSpec({
      events: [{ id: 'e1', label: 'A', date: '1900', trackId: 'ghost' }],
    });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE')).toBe(true);
  });

  it('a spec whose event id collides with a generated period-node id fails INVALID_ENTITY', () => {
    const spec = validSpec({
      events: [{ id: 'period-p1', label: 'A', date: '1900' }],
      periods: [{ id: 'p1', label: 'P', from: '1850', to: '1950' }],
    });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
  });

  it('a track id of "track-default" is reserved', () => {
    const spec = validSpec({ tracks: [{ id: 'track-default', label: 'T', events: ['e1'] }] });
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
  });

  it('sources[] is required (provenance, DESIGN §9)', () => {
    const spec: TimelineSpec = {
      type: 'timeline', version: '1.0.0', id: 'x',
      content: { kind: 'events', events: [{ id: 'e1', label: 'A', date: '1900' }] },
      accessibility: { label: 'ok' },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC' && i.message.includes('sources'))).toBe(true);
  });

  it('event in two tracks fails engine.validate (valid:false, never valid:true)', () => {
    const engine = new TimelineEngine();
    const spec = validSpec({
      events: [
        { id: 'e1', label: 'A', date: '1900' },
        { id: 'e2', label: 'B', date: '1910' },
      ],
      tracks: [
        { id: 't1', label: 'T1', events: ['e1', 'e2'] },
        { id: 't2', label: 'T2', events: ['e1'] },
      ],
    });
    const result = engine.validate(spec as never);
    expect(result.valid).toBe(false);
  });

  it('validate() never throws for render-blocking specs (returns INVALID issues)', () => {
    const engine = new TimelineEngine();
    const specs = [
      validSpec({ events: [{ id: 'period-p1', label: 'A', date: '1900' }], periods: [{ id: 'p1', label: 'P', from: '1850', to: '1950' }] }),
      validSpec({ events: [{ id: 'e1', label: 'A', date: '1900', trackId: 'ghost' }] }),
    ];
    for (const spec of specs) {
      let result;
      expect(() => { result = engine.validate(spec as never); }).not.toThrow();
      expect(result!.valid).toBe(false);
    }
  });

  it('L4: engine.validate rejects a spec without accessibility.label', () => {
    const engine = new TimelineEngine();
    const spec = {
      type: 'timeline', version: '1.0.0', id: 'x',
      content: { kind: 'events', events: [{ id: 'e1', label: 'A', date: '1900' }] },
      sources: [{ class: 'authoritative' }],
    };
    const result = engine.validate(spec as never);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'ACCESSIBILITY_ERROR')).toBe(true);
  });

  it('in-canvas check passes for valid layout', () => {
    const content: TimelineContent = { kind: 'events', events: [{ id: 'e1', label: 'A', date: '1900' }] };
    const scene = layout(buildScene(content), CTX);
    const result = validateLayout(scene, CTX);
    expect(result.valid).toBe(true);
  });
});