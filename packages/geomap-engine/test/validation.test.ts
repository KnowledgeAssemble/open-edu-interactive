import { describe, it, expect } from 'vitest';
import { validateSemantic } from '../src/validation/semantic.js';
import { validateLayout } from '../src/validation/layout.js';
import { validateAccessibility } from '../src/validation/accessibility.js';
import { buildScene } from '../src/scene/build.js';
import { layout } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import { GeoMapEngine } from '../src/engine.js';
import type { GeoMapSpec, GeoMapContent } from '../src/schema.js';

const ENGINE = new GeoMapEngine();

function identityAsset(id: string): string { return id; }

const validSpec: GeoMapSpec = {
  type: 'geomap',
  version: '1.0.0',
  id: 'test-map',
  metadata: { title: 'Test' },
  purpose: { learningObjective: 'Test' },
  content: {
    projection: { type: 'equirectangular' },
    geography: {
      sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }],
    },
    entities: [
      { id: 'pt', type: 'city', name: 'Point', location: { coordinates: { lat: 20, lon: 85 } } },
    ],
    layers: [
      { id: 'markers', type: 'marker', items: [{ entity: 'pt' }] },
    ],
  },
  interaction: { mode: 'explore', actions: ['select', 'focus'] },
  questions: [],
  sources: [{ class: 'illustrative' }],
  accessibility: { label: 'Test map' },
};

describe('validateSemantic', () => {
  it('returns valid for a correct spec', () => {
    const result = validateSemantic(validSpec);
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('fails for lat 91 (INVALID_ENTITY)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        entities: [{ id: 'bad', type: 'city', name: 'Bad', location: { coordinates: { lat: 91, lon: 0 } } }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('fails for lon -181 (INVALID_ENTITY)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        entities: [{ id: 'bad', type: 'city', name: 'Bad', location: { coordinates: { lat: 0, lon: -181 } } }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('fails for unknown projection type (INVALID_ENTITY)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: { ...validSpec.content!, projection: { type: 'orthographic' as 'equirectangular' } },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('accepts mercator and albers projection types', () => {
    for (const type of ['mercator', 'albers'] as const) {
      const spec: GeoMapSpec = {
        ...validSpec,
        content: { ...validSpec.content!, projection: { type } },
      };
      const result = validateSemantic(spec);
      expect(result.valid).toBe(true);
    }
  });

  it('fails for unknown entity type (INVALID_ENTITY)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        entities: [{ id: 'bad', type: 'empire' as 'city', name: 'Bad', location: { coordinates: { lat: 0, lon: 0 } } }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('fails for route with 1 entity (INVALID_ENTITY)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        entities: [
          { id: 'a', type: 'city', name: 'A', location: { coordinates: { lat: 10, lon: 20 } } },
        ],
        layers: [
          { id: 'r', type: 'route', items: [{ id: 'r1', path: ['a'] }] },
        ],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('fails for missing featureId ref (INVALID_REFERENCE) at validateSemantic', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
        entities: [{ id: 'ghost', type: 'state', name: 'Ghost', location: { source: 'src', featureId: 'nonexistent' } }],
        layers: [{ id: 'l', type: 'region', items: [{ entity: 'ghost' }] }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE')).toBe(true);
  });

  it('fails for unknown layer type "flow" (INVALID_ENTITY)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        layers: [{ id: 'l', type: 'flow' as 'region', items: [{ entity: 'pt' }] }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ENTITY')).toBe(true);
  });

  it('fails for action outside D5 set (INVALID_ACTION)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      interaction: { mode: 'explore', actions: ['click' as 'select'] },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ACTION')).toBe(true);
  });

  it('requires envelope sources[] (INVALID_SPEC, provenance DESIGN §9)', () => {
    const spec: GeoMapSpec = { ...validSpec, sources: undefined };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC' && /sources\[\] is required/.test(i.message))).toBe(true);
  });

  it('fails for compass referenceEntityId not found (INVALID_REFERENCE)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        compass: { referenceEntityId: 'ghost', window: { label: 'North', from: 315, to: 45 } },
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE' && /compass referenceEntityId/.test(i.message))).toBe(true);
  });

  it('fails for compass reference without explicit coordinates (INVALID_REFERENCE)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        entities: [{ id: 'ref', type: 'city', name: 'Ref', location: { source: 'src', featureId: 'f1' } }],
        compass: { referenceEntityId: 'ref', window: { label: 'North', from: 315, to: 45 } },
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE' && /must have explicit coordinates/.test(i.message))).toBe(true);
  });

  it('fails when the compass reference is its own candidate (INVALID_REFERENCE)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        entities: [
          { id: 'ref', type: 'city', name: 'Ref', location: { coordinates: { lat: 20, lon: 85 } } },
        ],
        layers: [{ id: 'markers', type: 'marker', items: [{ entity: 'ref' }] }],
        compass: { referenceEntityId: 'ref', window: { label: 'North', from: 315, to: 45 } },
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE' && /cannot be the candidate itself/.test(i.message))).toBe(true);
  });
});

describe('GeoMapEngine.validate never throws', () => {
  it('accepts a uri-backed source at validate time (no throw, valid)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        geography: { sources: [{ id: 'remote', type: 'geojson', class: 'illustrative', uri: 'geo://india' }] },
        entities: [{ id: 'state', type: 'state', name: 'State', location: { source: 'remote', featureId: 'unknown' } }],
        layers: [{ id: 'regions', type: 'region', items: [{ entity: 'state' }] }],
      },
    };
    const result = ENGINE.validate(spec as never);
    expect(result.valid).toBe(true);
  });

  it('rejects a source with neither data nor uri without throwing (INVALID_SPEC)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        geography: { sources: [{ id: 'empty', type: 'geojson', class: 'illustrative' }] },
        entities: [{ id: 'e', type: 'city', name: 'E', location: { coordinates: { lat: 0, lon: 0 } } }],
        layers: [{ id: 'l', type: 'marker', items: [{ entity: 'e' }] }],
      },
    };
    expect(() => ENGINE.validate(spec as never)).not.toThrow();
    const result = ENGINE.validate(spec as never);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC')).toBe(true);
  });

  it('flags overlapping interactive regions without throwing (INVALID_STATE)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        geography: {
          sources: [{
            id: 'src',
            type: 'geojson',
            class: 'illustrative',
            data: {
              type: 'FeatureCollection',
              features: [
                { id: 'a', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } },
                { id: 'b', type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]]] } },
              ],
            },
          }],
        },
        entities: [
          { id: 'a', type: 'region', name: 'A', location: { source: 'src', featureId: 'a' } },
          { id: 'b', type: 'region', name: 'B', location: { source: 'src', featureId: 'b' } },
        ],
        layers: [
          { id: 'regions', type: 'region', items: [{ entity: 'a', interactive: true }, { entity: 'b', interactive: true }] },
        ],
      },
    };
    expect(() => ENGINE.validate(spec as never)).not.toThrow();
    const result = ENGINE.validate(spec as never);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_STATE' && /overlaps region/.test(i.message))).toBe(true);
  });
});

describe('validateLayout', () => {
  it('returns valid when nodes are within canvas', () => {
    const content = validSpec.content!;
    const scene = buildScene(content as GeoMapContent, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = validateLayout(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    expect(result.valid).toBe(true);
  });
});

describe('validateAccessibility', () => {
  it('returns valid when label is present and alternatives exist', () => {
    const content = validSpec.content!;
    const scene = buildScene(content as GeoMapContent, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const svgResult = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = validateAccessibility(validSpec, svgResult);
    expect(result.valid).toBe(true);
  });

  it('fails for missing accessibility.label (ACCESSIBILITY_ERROR)', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      accessibility: undefined,
    };
    const content = (spec.content ?? validSpec.content)! as GeoMapContent;
    const scene = buildScene(content, identityAsset);
    const laidOut = layout(scene, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const svgResult = svgFrom(laidOut, { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' });
    const result = validateAccessibility(spec, svgResult);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'ACCESSIBILITY_ERROR')).toBe(true);
  });
});
describe('period-slice provenance (W-4.1)', () => {
  it('a period slice with empty sources fails INVALID_SPEC', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        periods: [{ id: 'p1', label: 'P', from: '1700', to: '1750', sources: [], regionEntityIds: ['pt'] }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_SPEC' && /period.*sources/.test(i.message))).toBe(true);
  });

  it('a period slice referencing an unknown region fails INVALID_REFERENCE', () => {
    const spec: GeoMapSpec = {
      ...validSpec,
      content: {
        ...validSpec.content!,
        periods: [{ id: 'p1', label: 'P', from: '1700', to: '1750', sources: [{ class: 'authoritative' }], regionEntityIds: ['ghost'] }],
      },
    };
    const result = validateSemantic(spec);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_REFERENCE' && /period.*region/.test(i.message))).toBe(true);
  });
});
