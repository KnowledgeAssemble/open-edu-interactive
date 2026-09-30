import { describe, it } from 'vitest';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VisualEngine } from '../src/engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(__dirname, '..', 'fixture');
const REGEN = process.env.REGEN === '1';

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
    } else if (entry.name === 'input.visual.json') {
      yield { kind: dir.split('/').pop() ?? 'unknown', file: resolve(dir, entry.name) };
    }
  }
}

describe.skipIf(!REGEN)('fixture regeneration (REGEN=1)', () => {
  it('writes golden expected artifacts for every fixture', () => {
    for (const { file } of walkFixtures(fixtureRoot)) {
      const spec = JSON.parse(readFileSync(file, 'utf-8'));
      const instance = new VisualEngine().instantiate(spec, makeHost(), `gen-${file}`);
      const snap = instance.snapshot() as unknown as {
        scene: unknown;
        svgResult: { svg: string; a11y: unknown; interactive: unknown };
      };
      const dir = dirname(file);
      writeFileSync(resolve(dir, 'expected.scene.json'), `${JSON.stringify(snap.scene, null, 2)}\n`);
      writeFileSync(
        resolve(dir, 'expected.a11y.json'),
        `${JSON.stringify({ a11y: snap.svgResult.a11y, interactive: snap.svgResult.interactive }, null, 2)}\n`,
      );
      writeFileSync(resolve(dir, 'expected.svg'), snap.svgResult.svg);
      instance.teardown();
    }
  });
});