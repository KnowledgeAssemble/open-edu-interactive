import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TimelineEngine } from '../src/engine.js';
import type { EngineSpec } from '@knowledgeassemble/interactive-engine';

const FIXTURE_DIR = new URL('../fixture/', import.meta.url);
const SUITES = ['events', 'periods', 'tracks', 'independence', 'duration-events', 'events-gated'];
const SKILL_EXAMPLE_URL = new URL('../../../docs/fixtures/timeline/skill-example.json', import.meta.url);

function loadFixture(name: string): EngineSpec {
  const url = new URL(`${name}/input.timeline.json`, FIXTURE_DIR);
  return JSON.parse(readFileSync(url, 'utf8')) as EngineSpec;
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

function goldenPath(name: string, file: string): URL {
  return new URL(`${name}/${file}`, FIXTURE_DIR);
}

describe('fixture round-trip', () => {
  for (const suite of SUITES) {
    it(`${suite}: validates and instantiates`, () => {
      const spec = loadFixture(suite);
      const engine = new TimelineEngine();
      const result = engine.validate(spec);
      expect(result.valid, `fixture "${suite}" validation failed: ${result.issues.map((i) => i.message).join('; ')}`).toBe(true);

      const expected = JSON.parse(readFileSync(new URL(`${suite}/validation.json`, FIXTURE_DIR), 'utf8')) as { valid: boolean; issues: Array<unknown> };
      expect(result.valid).toBe(expected.valid);
      expect(result.issues).toEqual(expected.issues);

      const host = { locale: 'en', tokens: {}, reducedMotion: false, announce: () => undefined, onEvent: () => undefined, resolveAsset: (id: string) => id };
      const instance = engine.instantiate(spec, host, `fixture-${suite}`);
      const snap = instance.snapshot() as Record<string, unknown>;
      expect(snap).toHaveProperty('scene');
      expect(snap).toHaveProperty('svgResult');
      expect(snap).toHaveProperty('linear');
      instance.teardown();
    });

    it(`${suite}: golden expected artifacts are byte-stable`, () => {
      const spec = loadFixture(suite);
      const engine = new TimelineEngine();
      const inst = engine.instantiate(spec, stubHost(), `timeline-${suite}-golden`);
      const snap = inst.snapshot() as unknown as {
        scene: unknown;
        svgResult: { svg: string; a11y: unknown; interactive: unknown };
      };

      const expectedSvg = readFileSync(goldenPath(suite, 'expected.svg'), 'utf-8');
      const expectedScene = readFileSync(goldenPath(suite, 'expected.scene.json'), 'utf-8');
      const expectedA11y = readFileSync(goldenPath(suite, 'expected.a11y.json'), 'utf-8');

      expect(snap.svgResult.svg).toBe(expectedSvg);
      expect(JSON.stringify(snap.scene, null, 2) + '\n').toBe(expectedScene);
      expect(JSON.stringify({ a11y: snap.svgResult.a11y, interactive: snap.svgResult.interactive }, null, 2) + '\n').toBe(expectedA11y);
    });
  }

  it('skill example validates through TimelineEngine', () => {
    const spec = JSON.parse(readFileSync(SKILL_EXAMPLE_URL, 'utf8')) as EngineSpec;
    const engine = new TimelineEngine();
    const result = engine.validate(spec);
    expect(result.valid, `skill example validation failed: ${result.issues.map((i) => i.message).join('; ')}`).toBe(true);
  });
});