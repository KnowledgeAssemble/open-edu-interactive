import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeoMapEngine } from '../src/engine.js';
import { buildScene } from '../src/scene/build.js';
import type { SceneNode } from '../src/scene/types.js';
import { layout, fitScene } from '../src/layout/engine.js';
import type { LayoutContext } from '../src/layout/engine.js';
import { svgFrom } from '../src/render/svg.js';
import { deriveDisplay, emptyMaps, computeScaleBar, makeScaleBarNode } from '../src/scene/derive.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(HERE, '..', 'fixture');
const DOCS_FIXTURE_DIR = join(HERE, '..', '..', '..', 'docs', 'fixtures', 'geomap');

const GENERATE = process.env.GENERATE === '1';
const CTX: LayoutContext = { width: 800, height: 600, minTouchTarget: 44, textStyle: 'normal' };
const ENGINE = new GeoMapEngine();

function specFrom(relPath: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, relPath), 'utf8')) as unknown;
}

function expectationFiles(name: string, dir: string): { scene: string; svg: string; a11y: string; alternative: string } {
  return {
    scene: join(dir, name, 'expected.scene.json'),
    svg: join(dir, name, 'expected.svg'),
    a11y: join(dir, name, 'expected.a11y.json'),
    alternative: join(dir, name, 'expected.alternative.json'),
  };
}

function renderResult(spec: Record<string, unknown>) {
  const content = spec['content'] as Record<string, unknown>;
  const accessibility = spec['accessibility'] as { label?: string; description?: string } | undefined;
  const projectionType = (content['projection'] as { type?: string } | undefined)?.type as 'equirectangular' | 'mercator' | 'albers' | undefined;
  const scene = buildScene(content as never, (id: string) => id);
  const laidOut = layout(scene, CTX, (content['viewport'] as never) ?? undefined, projectionType);
  const fit = fitScene(scene, CTX, (content['viewport'] as never) ?? undefined, projectionType);
  const scaleBarCfg = (content['scaleBar'] as { visible?: boolean; unit?: 'km' | 'mi' } | undefined) ?? {};
  const scaleBarUnit = scaleBarCfg.unit ?? 'km';
  const centerLat = (content['viewport'] as { center?: { lat?: number } } | undefined)?.center?.lat ?? fit.centerLat;
  const scaleBarVisible = scaleBarCfg.visible !== false;
  const scaleBarConfig = computeScaleBar(CTX, centerLat, fit.projector, scaleBarUnit);
  const scaleBarNode = scaleBarVisible ? makeScaleBarNode(scaleBarConfig, CTX.minTouchTarget, CTX.height) : undefined;
  const displayScene = deriveDisplay(emptyMaps(), laidOut, scaleBarNode);
  const periods = (content['periods'] as Array<{ regionEntityIds: string[] }> | undefined) ?? [];
  if (periods.length > 0) {
    const regionIds = new Set(periods[0]!.regionEntityIds);
    for (const node of displayScene.nodes) {
      walk(node, (n) => {
        if (n.role === 'region' && n.metadata) {
          const entityId = n.metadata.entityId as string | undefined;
          if (entityId && !regionIds.has(entityId)) n.hidden = true;
        }
      });
    }
  }
  const result = svgFrom(displayScene, CTX, accessibility?.label, accessibility?.description);
  return { scene: displayScene, result };
}

function walk(node: SceneNode, fn: (n: SceneNode) => void): void {
  fn(node);
  for (const child of node.children) {
    walk(child, fn);
  }
}

function writeOrCompare(name: string, dir: string, spec: Record<string, unknown>) {
  const { scene, result } = renderResult(spec);
  const files = expectationFiles(name, dir);
  const safeJson = (s: string) => s + '\n';
  const renders = [
    { file: files.scene, payload: safeJson(JSON.stringify(scene, null, 2)) },
    { file: files.svg, payload: result.svg },
    { file: files.a11y, payload: safeJson(JSON.stringify(result.a11y, null, 2)) },
    { file: files.alternative, payload: safeJson(JSON.stringify(result.alternative, null, 2)) },
  ];
  if (GENERATE) {
    for (const r of renders) {
      mkdirSync(dirname(r.file), { recursive: true });
      writeFileSync(r.file, r.payload);
    }
    return;
  }
  for (const r of renders) {
    expect(existsSync(r.file), `missing golden file ${r.file}`).toBe(true);
    expect(readFileSync(r.file, 'utf8')).toBe(r.payload);
  }
}

const FIXTURES = ['region', 'marker', 'route', 'odisha-coastal', 'encoding', 'overlay', 'route-step', 'linear', 'guided-composed', 'multi-locate', 'place-memory', 'region-adjacency', 'compass', 'periods', 'misconception-encoding'];

function validateFixture(name: string, spec: unknown) {
  const result = ENGINE.validate(spec as never);
  if (GENERATE) {
    if (!result.valid) {
      console.log(`INVALID (${name}):`, JSON.stringify(result.issues, null, 2));
    }
    return result;
  }
  const expected = JSON.parse(readFileSync(join(FIXTURE_DIR, name, 'validation.json'), 'utf8')) as {
    valid: boolean;
    issues: unknown;
  };
  expect(result.valid).toBe(expected.valid);
  expect(result.issues).toEqual(expected.issues);
  if (!result.valid) {
    console.log(`ISSUES (${name}):`, JSON.stringify(result.issues, null, 2));
  }
  return result;
}

beforeAll(() => {
  if (!GENERATE) {
    for (const name of FIXTURES) {
      for (const rel of ['expected.scene.json', 'expected.svg', 'expected.a11y.json', 'expected.alternative.json']) {
        expect(existsSync(join(FIXTURE_DIR, name, rel)), `missing ${name}/${rel}`).toBe(true);
      }
    }
    const skillExpected = expectationFiles('skill-example', DOCS_FIXTURE_DIR);
    for (const rel of Object.values(skillExpected)) {
      expect(existsSync(rel), `missing ${rel}`).toBe(true);
    }
  }
});

describe('Golden fixture round-trips', () => {
  for (const name of FIXTURES) {
    it(`${name} validates and matches golden output`, () => {
      const spec = specFrom(join(name, 'input.geomap.json')) as Record<string, unknown>;
      const result = validateFixture(name, spec);
      if (!result.valid) return;
      writeOrCompare(name, FIXTURE_DIR, spec);
    });
  }

  it('skill-example (docs) validates and matches golden output', () => {
    const raw = readFileSync(join(DOCS_FIXTURE_DIR, 'skill-example.json'), 'utf8');
    const spec = JSON.parse(raw) as Record<string, unknown>;
    const result = ENGINE.validate(spec as never);
    if (GENERATE) {
      writeOrCompare('skill-example', DOCS_FIXTURE_DIR, spec);
      return;
    }
    expect(result.valid).toBe(true);
    if (!result.valid) {
      console.log('SKILL ISSUES:', JSON.stringify(result.issues, null, 2));
    }
    writeOrCompare('skill-example', DOCS_FIXTURE_DIR, spec);
  });
});