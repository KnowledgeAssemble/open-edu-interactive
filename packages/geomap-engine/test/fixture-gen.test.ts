import { describe, it } from 'vitest';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeoMapEngine } from '../src/engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(__dirname, '..', 'fixture');
const REGEN = process.env.REGEN === '1';

const SKIPPED = new Set([
  'india-coastal',
]);

function makeHost() {
  return {
    locale: 'en' as const,
    tokens: {} as Record<string, string>,
    reducedMotion: false,
    announce: () => {},
    onEvent: () => {},
    resolveAsset: (id: string) => id,
  };
}

function* walkFixtures(dir: string): Generator<{ kind: string; file: string }> {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      yield* walkFixtures(resolve(dir, entry.name));
    } else if (entry.name === 'input.geomap.json') {
      yield { kind: dir.split('/').pop() ?? 'unknown', file: resolve(dir, entry.name) };
    }
  }
}

describe.skipIf(!REGEN)('fixture regeneration (REGEN=1)', () => {
  it('writes golden expected artifacts for every fixture', () => {
    for (const { kind, file } of walkFixtures(fixtureRoot)) {
      if (SKIPPED.has(kind)) continue;
      const spec = JSON.parse(readFileSync(file, 'utf-8'));
      const instance = new GeoMapEngine().instantiate(spec, makeHost(), `gen-${file}`);
      const snap = instance.snapshot() as unknown as {
        scene: unknown;
        svgResult: { svg: string; a11y: unknown; alternative: unknown };
      };
      const dir = dirname(file);
      writeFileSync(resolve(dir, 'expected.scene.json'), `${JSON.stringify(snap.scene, null, 2)}\n`);
      writeFileSync(resolve(dir, 'expected.a11y.json'), `${JSON.stringify(snap.svgResult.a11y, null, 2)}\n`);
      writeFileSync(resolve(dir, 'expected.alternative.json'), `${JSON.stringify(snap.svgResult.alternative, null, 2)}\n`);
      writeFileSync(resolve(dir, 'expected.svg'), snap.svgResult.svg);
      instance.teardown();
    }
  });
});