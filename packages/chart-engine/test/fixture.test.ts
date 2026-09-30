import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChartEngine } from '../src/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(name: string): { spec: Record<string, unknown>; expected: { valid: boolean; issues: unknown[] } } {
  const specPath = resolve(__dirname, '..', 'fixture', name, 'input.chart.json');
  const validationPath = resolve(__dirname, '..', 'fixture', name, 'validation.json');
  const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as Record<string, unknown>;
  const expected = JSON.parse(readFileSync(validationPath, 'utf-8')) as { valid: boolean; issues: unknown[] };
  return { spec, expected };
}

function stubHost() {
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (id: string) => id,
  };
}

const FIXTURES = ['bar', 'line', 'line-time', 'bar-guided-narrow'];

describe('chart engine golden fixtures', () => {
  for (const name of FIXTURES) {
    it(`validates ${name} fixture`, () => {
      const { spec, expected } = loadFixture(name);
      const engine = new ChartEngine();
      const result = engine.validate(spec as never);
      expect(result.valid).toBe(expected.valid);
      expect(result.issues).toEqual(expected.issues);
    });

    it(`${name}: golden expected artifacts are byte-stable`, () => {
      const { spec } = loadFixture(name);
      const engine = new ChartEngine();
      const inst = engine.instantiate(spec as never, stubHost(), `chart-${name}-golden`);
      const snap = inst.snapshot() as unknown as {
        scene: unknown;
        svgResult: { svg: string; a11y: unknown; interactive: unknown };
      };

      expect(snap.svgResult.svg).toBe(readFileSync(resolve(__dirname, '..', 'fixture', name, 'expected.svg'), 'utf-8'));
      expect(JSON.stringify(snap.scene, null, 2) + '\n').toBe(
        readFileSync(resolve(__dirname, '..', 'fixture', name, 'expected.scene.json'), 'utf-8'),
      );
      expect(JSON.stringify({ a11y: snap.svgResult.a11y, interactive: snap.svgResult.interactive }, null, 2) + '\n').toBe(
        readFileSync(resolve(__dirname, '..', 'fixture', name, 'expected.a11y.json'), 'utf-8'),
      );
    });
  }
});