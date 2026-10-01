import { describe, it } from 'vitest';
import { runEngineConformance, assertEngineConformance, type EngineConformanceResult } from '@knowledgeassemble/interactive-engine';
import { GeoMapEngine } from '../src/engine.js';

describe('N4 — geomap conformance', () => {
  it('marker map conforms: validates, monotonic log, non-D5 action rejected, stable snapshot', () => {
    const result: EngineConformanceResult = runEngineConformance(
      new GeoMapEngine(),
      {
        type: 'geomap',
        version: '1.0.0',
        id: 'cv-geomap',
        content: {
          projection: { type: 'equirectangular' },
          geography: { sources: [{ id: 'src', type: 'geojson', class: 'illustrative', data: { type: 'FeatureCollection', features: [] } }] },
          entities: [{ id: 'pt', type: 'city', name: 'Pt', location: { coordinates: { lat: 0, lon: 0 } } }],
          layers: [{ id: 'l', type: 'marker', items: [{ entity: 'pt', interactive: true }] }],
        },
        sources: [{ class: 'illustrative' }],
        accessibility: { label: 'Map' },
      } as never,
      { type: 'select', target: { id: 'geom-l-pt' } },
    );
    assertEngineConformance(result);
  });
});