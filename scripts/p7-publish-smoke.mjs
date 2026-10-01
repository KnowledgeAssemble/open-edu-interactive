import { mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const PACKAGE_DIRS = [
  'interactive-engine',
  'svg-kit',
  'chart-engine',
  'diagram-engine',
  'geomap-engine',
  'timeline-engine',
  'visual-engine',
  'interactive-react',
  'engine-skills',
];

function run(command, { cwd = ROOT } = {}) {
  execSync(command, { cwd, stdio: 'inherit' });
}

function write(path, content) {
  writeFileSync(path, content);
  console.log(`  wrote ${path}`);
}

function fail(message) {
  console.error(`\n[p7-publish-smoke] FAILED: ${message}`);
  process.exit(1);
}

console.log('[p7-publish-smoke] building all packages (tsc ESM emit -> dist)');
run('pnpm -r build');

const smokeDir = mkdtempSync(join(tmpdir(), 'p7-publish-smoke-'));
const tarballDir = join(smokeDir, 'tarballs');
mkdirSync(tarballDir, { recursive: true });

const tarballs = {};
console.log('[p7-publish-smoke] packing workspace packages');
for (const name of PACKAGE_DIRS) {
  run(`pnpm pack --pack-destination "${tarballDir}" --silent`, { cwd: join(ROOT, 'packages', name) });
}
for (const name of PACKAGE_DIRS) {
  const files = readdirSync(tarballDir).filter((f) => f.endsWith('.tgz') && f.startsWith(`knowledgeassemble-${name}-`));
  if (files.length !== 1) {
    fail(`expected exactly one packed tarball for ${name}, found ${files.length} (${files.join(', ') || 'none'})`);
  }
  tarballs[`@knowledgeassemble/${name}`] = files[0];
}

const consumerDir = join(smokeDir, 'consumer');
mkdirSync(join(consumerDir, 'src'), { recursive: true });
cpSync(tarballDir, join(consumerDir, 'tarballs'), { recursive: true });

const overrides = Object.fromEntries(
  PACKAGE_DIRS.map((p) => [`@knowledgeassemble/${p}`, `file:./tarballs/${tarballs[`@knowledgeassemble/${p}`]}`]),
);
const dependencyEntries = Object.entries(overrides).map(([name, spec]) => `    "${name}": "${spec}"`);

const consumerPackageJson = `{
  "name": "p7-publish-smoke-consumer",
  "private": true,
  "type": "module",
  "dependencies": {
${dependencyEntries.join(',\n')},
    "react": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/react": "^19.0.0"
  }
}
`;

write(join(consumerDir, 'package.json'), consumerPackageJson);
write(
  join(consumerDir, 'pnpm-workspace.yaml'),
  `overrides:
${PACKAGE_DIRS.map((p) => `  "@knowledgeassemble/${p}": "file:./tarballs/${tarballs[`@knowledgeassemble/${p}`]}"`).join('\n')}
`,
);
write(
  join(consumerDir, 'tsconfig.json'),
  `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
`,
);

const engineReps = JSON.parse(readFileSync(join(ROOT, 'docs', 'fixtures', 'p7', 'engine-reps.json'), 'utf8'));
const composedLesson = JSON.parse(readFileSync(join(ROOT, 'docs', 'fixtures', 'p7', 'composed-lesson.json'), 'utf8'));

const fixtureSource = `import type { EngineSpec } from '@knowledgeassemble/interactive-engine';\n\nexport const engineReps = ${JSON.stringify(engineReps, null, 2)} as Record<string, EngineSpec>;\n\nexport const composedLesson = ${JSON.stringify(composedLesson, null, 2)};\n`;
write(join(consumerDir, 'src', 'fixtures.ts'), fixtureSource);

const consumerSource = `import * as IE from '@knowledgeassemble/interactive-engine';
import type { EngineAction, EngineEvent, LessonDefinition, EngineHost } from '@knowledgeassemble/interactive-engine';
import { VisualEngine } from '@knowledgeassemble/visual-engine';
import { ChartEngine } from '@knowledgeassemble/chart-engine';
import { GeoMapEngine } from '@knowledgeassemble/geomap-engine';
import { TimelineEngine } from '@knowledgeassemble/timeline-engine';
import { DiagramEngine } from '@knowledgeassemble/diagram-engine';
import { InteractiveNode, InteractiveLesson, bridgeToHost } from '@knowledgeassemble/interactive-react';
import { MANIFEST, validateSkillExample } from '@knowledgeassemble/engine-skills';
import type { OpenEduBridge, InteractiveNodeHandle, InteractiveLessonProps } from '@knowledgeassemble/interactive-react';
import { createElement } from 'react';
import { engineReps, composedLesson } from './fixtures.js';

function assert(cond: boolean, message: string): void {
  if (!cond) {
    throw new Error(message);
  }
}

const expectedFunctions = [
  'a11yTreeOf', 'createPlatformInstance', 'validateEnvelope', 'runPipeline',
  'baseReducer', 'initialState', 'EngineRegistry', 'EventLog', 'Lesson', 'Router',
  'EngineError', 'ACTION_TYPES', 'LIFECYCLE_EVENTS', 'ERROR_CODES', 'LessonSchema', 'ENGINE_TYPES', 'COMPOSITION',
];
for (const key of expectedFunctions) {
  assert(typeof (IE as unknown as Record<string, unknown>)[key] !== 'undefined', \`interactive-engine missing public symbol "\${key}"\`);
}

const engines: Record<string, IE.Engine> = {
  visual: new VisualEngine(),
  chart: new ChartEngine(),
  geomap: new GeoMapEngine(),
  timeline: new TimelineEngine(),
  diagram: new DiagramEngine(),
};

const engineTypes = Object.keys(engines);
assert(engineTypes.length === 5, 'expected five engine packages');
for (const engineType of engineTypes) {
  const rep = engineReps[engineType] as IE.EngineSpec;
  const l1 = IE.validateEnvelope(rep);
  assert(l1.valid, \`\${engineType}: L1 envelope validation failed on representative spec\`);
  const l2 = engines[engineType]!.validate(rep);
  assert(l2.valid, \`\${engineType}: engine validation failed: \${l2.issues.map((i) => i.message).join('; ')}\`);
}

const visual = new VisualEngine();
const numberLine = engineReps.visual as IE.EngineSpec;
const vs = visual.validate({ type: 'visual', version: '1.0.0', id: 'greedy', content: { kind: 'timeline' } } as IE.EngineSpec);
assert(!vs.valid, 'visual must reject a timeline kind (closed set / no widening)');

// Engine skills smoke
assert(MANIFEST.engines.length === 6, 'engine-skills manifest must have 6 engines');
for (const eng of MANIFEST.engines) {
  const result = validateSkillExample(eng.type);
  assert(result.valid, eng.type + ' skill-example must validate against its schema: ' + result.errors.join('; '));
  assert(eng.validationContract.package.startsWith('@knowledgeassemble/'), 'validationContract package must be @knowledgeassemble/*');
}

const host: EngineHost = {
  locale: 'en',
  tokens: {},
  reducedMotion: false,
  announce: (m: string) => console.log('[announce]', m),
  onEvent: () => undefined,
  resolveAsset: (id: string) => id,
};

const bridge: OpenEduBridge = {
  locale: 'en',
  tokens: {},
  reducedMotion: false,
  t: (key: string) => key,
  announce: (m: string) => console.log('[announce]', m),
  onEvent: (e: IE.EngineEvent) => { host.onEvent(e); },
  resolveAsset: (id: string) => id,
};
const mappedHost = bridgeToHost(bridge);
assert(mappedHost.locale === 'en', 'bridgeToHost must map locale');

const registry = new IE.EngineRegistry();
for (const engine of Object.values(engines)) {
  registry.register(engine);
}
const lesson = IE.Lesson.load(composedLesson as LessonDefinition, registry);
const runtime = lesson.start(bridgeToHost(bridge));
runtime.dispatch('timeline-independence', { type: 'select', target: { id: 'event-1947' } } as EngineAction);
const visualState = runtime.snapshot('visual-independence') as { focus: string | null };
assert(visualState.focus === 'figure-independence', 'composed lesson: timeline select must route focus to visual entity');
const events = runtime.events();
assert(events.length > 4, 'composed lesson: more than four events expected');
const names = events.map((e) => e.name);
assert(names.includes('timeline.event-selected'), 'composed lesson: timeline.event-selected emitted');
assert(names.includes('visual.figure-independence-focused'), 'composed lesson: visual figure focus emitted');
for (let i = 1; i < events.length; i++) {
  assert(events[i]!.seq > events[i - 1]!.seq, 'composed lesson: events must be seq-monotonic');
}
runtime.stop();

const nodeMarkup = createElement(InteractiveNode, { spec: numberLine, engineType: 'visual', host: bridge });
assert(nodeMarkup !== null, 'InteractiveNode must render from installed package');
const lessonMarkup = createElement(InteractiveLesson, { lesson: composedLesson, host: bridge });
assert(lessonMarkup !== null, 'InteractiveLesson must render from installed package');

console.log('p7-publish-smoke: installed tarballs resolve, validate, compose, and mount from dist — OK');
`;

write(join(consumerDir, 'src', 'index.ts'), consumerSource);

console.log('[p7-publish-smoke] installing into temp consumer');
run('pnpm install --prefer-offline', { cwd: consumerDir });

console.log('[p7-publish-smoke] typechecking consumer against installed packages (dist types)');
run('pnpm exec tsc -p tsconfig.json', { cwd: consumerDir });

console.log('[p7-publish-smoke] running consumer assertions against installed packages (dist js)');
run('node dist/index.js', { cwd: consumerDir });

rmSync(smokeDir, { recursive: true, force: true });
console.log('[p7-publish-smoke] PASSED');