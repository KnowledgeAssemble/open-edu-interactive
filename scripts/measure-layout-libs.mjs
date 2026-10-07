#!/usr/bin/env node
/**
 * Reproduces the layout-library comparison in docs/PLAN-P8.md section 8a.
 *
 * The candidates are third-party packages, so they are NOT repo dependencies —
 * installing them would contradict the decision this script documents. It
 * resolves them from a scratch directory outside the repo so a clean checkout
 * stays dependency-free, and is therefore NOT part of the exit gate.
 *
 *   node scripts/measure-layout-libs.mjs
 *   node scripts/measure-layout-libs.mjs --in-repo   # measure the shipped ring only
 *
 * --in-repo needs nothing installed and re-derives the in-repo numbers in the
 * table, which is the half of section 8a that CI already asserts.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const IN_REPO_ONLY = process.argv.includes('--in-repo');

/** The failing fixture: a 5-node media cycle. */
const CYCLE = ['a', 'b', 'c', 'd', 'e'];
const EDGES = CYCLE.map((from, i) => ({ from, to: CYCLE[(i + 1) % CYCLE.length] }));
const DOT = `digraph G { node [shape=box, fixedsize=true, width=2.2, height=1.2]; ${CYCLE.map(
  (id) => `${id} [label="${id}"]`,
).join('; ')}; ${EDGES.map((e) => `${e.from} -> ${e.to}`).join('; ')}; }`;

const CANDIDATES = [
  { pkg: '@hpcc-js/wasm', engines: ['circo', 'dot', 'twopi', 'neato', 'fdp'], via: 'Graphviz' },
  { pkg: 'elkjs', engines: ['radial', 'layered', 'stress', 'mrtree'], via: 'default' },
];

const ratio = (l) => (l.length ? Math.max(...l) / Math.min(...l) : NaN);
const fixed = (v) => (Number.isFinite(v) ? v.toFixed(2) : 'n/a');

// ---------------------------------------------------------------- in-repo ---

/** Re-implements the shipped border-anchored ring maths (radial.ts). */
function inRepoRing(width, height, box, radius) {
  const n = CYCLE.length;
  const bounds = new Map();
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    bounds.set(CYCLE[i], {
      x: Math.round(width / 2 + radius * Math.cos(a) - box.width / 2),
      y: Math.round(height / 2 + radius * Math.sin(a) - box.height / 2),
      width: box.width,
      height: box.height,
    });
  }
  return EDGES.map(({ from, to }) => {
    const f = bounds.get(from);
    const t = bounds.get(to);
    const dx = t.x + t.width / 2 - (f.x + f.width / 2);
    const dy = t.y + t.height / 2 - (f.y + f.height / 2);
    const vertical = Math.abs(dy) >= Math.abs(dx);
    const p = vertical
      ? dy >= 0
        ? { x: f.x + f.width / 2, y: f.y + f.height }
        : { x: f.x + f.width / 2, y: f.y }
      : dx >= 0
        ? { x: f.x + f.width, y: f.y + f.height / 2 }
        : { x: f.x, y: f.y + f.height / 2 };
    const q = vertical
      ? dy >= 0
        ? { x: t.x + t.width / 2, y: t.y }
        : { x: t.x + t.width / 2, y: t.y + t.height }
      : dx >= 0
        ? { x: t.x, y: t.y + t.height / 2 }
        : { x: t.x + t.width, y: t.y + t.height / 2 };
    return Math.hypot(q.x - p.x, q.y - p.y);
  });
}

console.log('# In-repo ring (asserted by test/media-layout.test.ts)\n');
console.log('Fixed radius 216, 800x600, 5-node ring — vary only the slot aspect:\n');
for (const box of [
  { width: 220, height: 120 },
  { width: 170, height: 170 },
  { width: 152, height: 152 },
  { width: 120, height: 120 },
]) {
  const l = inRepoRing(800, 600, box, 216);
  console.log(
    `  ${String(`${box.width}x${box.height}`).padEnd(9)} ${l.map((v) => v.toFixed(0).padStart(4)).join(',')}  ratio=${fixed(ratio(l))}`,
  );
}
console.log('\nFixed 220x120 slot — vary only the radius (the ratio is NOT size-invariant):\n');
for (const r of [156, 180, 216, 250, 300]) {
  const l = inRepoRing(800, 600, { width: 220, height: 120 }, r);
  console.log(`  radius ${String(r).padEnd(4)} ${l.map((v) => v.toFixed(0).padStart(4)).join(',')}  ratio=${fixed(ratio(l))}`);
}

if (IN_REPO_ONLY) process.exit(0);

// -------------------------------------------------------------- candidates ---

const dir = mkdtempSync(join(tmpdir(), 'layout-bench-'));
const clean = () => rmSync(dir, { recursive: true, force: true });
process.on('exit', clean);

console.log('\n# Third-party candidates\n');
console.log('Pinned versions and package sizes:\n');
for (const c of CANDIDATES) {
  try {
    const v = execFileSync('npm', ['view', c.pkg, 'version'], { encoding: 'utf8' }).trim();
    const size = execFileSync('npm', ['view', c.pkg, 'dist.unpackedSize'], { encoding: 'utf8' }).trim();
    console.log(`  ${c.pkg}@${v}  unpacked=${(Number(size) / 1e6).toFixed(1)} MB`);
  } catch (e) {
    console.log(`  ${c.pkg} — version lookup failed: ${e.message.split('\n')[0]}`);
  }
}

for (const c of CANDIDATES) {
  console.log(`\n## ${c.pkg}\n`);
  try {
    execFileSync('npm', ['install', c.pkg, '--silent', '--no-audit', '--no-fund'], {
      cwd: dir,
      stdio: 'pipe',
    });
  } catch (e) {
    console.log(`  install failed: ${e.message.split('\n')[0]}`);
    continue;
  }

  const runner = join(dir, 'run.mjs');
  if (c.via === 'Graphviz') {
    writeFileSync(
      runner,
      `import { createRequire } from 'node:module';
const { Graphviz } = createRequire(import.meta.url)('@hpcc-js/wasm');
const gv = await Graphviz.load();
const PX = 96 / 72, W = 2.2 * 72, H = 1.2 * 72;
const ratio = (l) => (l.length ? Math.max(...l) / Math.min(...l) : NaN);
for (const eng of ${JSON.stringify(c.engines)}) {
  try {
    const r = JSON.parse(gv.layout(${JSON.stringify(DOT)}, 'json', eng));
    const bb = String(r.bb).split(',').map(Number);
    const pos = {};
    for (const o of r.objects ?? []) if (o.pos) pos[o.name] = o.pos.split(',').map(Number);
    const keys = Object.keys(pos);
    const centre = {};
    for (const k of keys) centre[k] = { x: pos[k][0] * PX, y: (bb[3] - pos[k][1]) * PX };
    const arrows = [];
    for (const ed of r.edges ?? []) {
      const dr = (ed._draw_ ?? []).find((d) => d.op === 'b');
      if (!dr) continue;
      const pts = dr.points.map((p) => ({ x: p[0] * PX, y: (bb[3] - p[1]) * PX }));
      let L = 0;
      for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      arrows.push(L);
    }
    const cx = keys.reduce((s, k) => s + centre[k].x, 0) / (keys.length || 1);
    const cy = keys.reduce((s, k) => s + centre[k].y, 0) / (keys.length || 1);
    const radii = keys.map((k) => Math.hypot(centre[k].x - cx, centre[k].y - cy));
    const spread = radii.length ? Math.max(...radii) - Math.min(...radii) : NaN;
    const ext = { w: (bb[2] - bb[0]) * PX, h: (bb[3] - bb[1]) * PX };
    console.log('  ' + eng.padEnd(8) +
      'extent=' + ext.w.toFixed(0) + 'x' + ext.h.toFixed(0) +
      ' fits800x600=' + (ext.w <= 800 && ext.h <= 600) +
      ' ringSpread=' + spread.toFixed(1) +
      ' ratio=' + (Number.isFinite(ratio(arrows)) ? ratio(arrows).toFixed(2) : 'n/a'));
  } catch (e) {
    console.log('  ' + eng.padEnd(8) + 'ERR ' + String(e.message).slice(0, 70));
  }
}
`,
    );
  } else {
    writeFileSync(
      runner,
      `import ELK from 'elkjs';
const elk = new ELK();
const PX = 96, W = 220, H = 120;
const ratio = (l) => (l.length ? Math.max(...l) / Math.min(...l) : NaN);
const children = ${JSON.stringify(CYCLE)}.map((id) => ({ id, width: W, height: H }));
const edges = ${JSON.stringify(EDGES)}.map(({ from, to }, i) => ({ id: 'e' + i, sources: [from], targets: [to] }));
for (const layout of ${JSON.stringify(c.engines)}) {
  try {
    const g = { id: 'root', layoutOptions: { 'elk.algorithm': layout, 'elk.spacing.nodeNode': '20' }, children, edges };
    const r = await elk.layout(g);
    const b = new Map(r.children.map((n) => [n.id, n]));
    const side = (n, s) => ({
      x: s === 'left' ? n.x : s === 'right' ? n.x + n.width : n.x + n.width / 2,
      y: s === 'top' ? n.y : s === 'bottom' ? n.y + n.height : n.y + n.height / 2,
    });
    const arrows = [];
    for (const e of r.edges ?? []) {
      const f = b.get(e.sources[0]), t = b.get(e.targets[0]);
      if (!f || !t) continue;
      const dx = t.x + t.width / 2 - (f.x + f.width / 2), dy = t.y + t.height / 2 - (f.y + f.height / 2);
      const vertical = Math.abs(dy) >= Math.abs(dx);
      const p = vertical ? (dy >= 0 ? { x: f.x + f.width / 2, y: f.y + f.height } : { x: f.x + f.width / 2, y: f.y })
                         : (dx >= 0 ? { x: f.x + f.width, y: f.y + f.height / 2 } : { x: f.x, y: f.y + f.height / 2 });
      const q = vertical ? (dy >= 0 ? { x: t.x + t.width / 2, y: t.y } : { x: t.x + t.width / 2, y: t.y + t.height })
                         : (dx >= 0 ? { x: t.x, y: t.y + t.height / 2 } : { x: t.x + t.width, y: t.y + t.height / 2 });
      arrows.push(Math.hypot(q.x - p.x, q.y - p.y));
    }
    const xs = r.children.map((n) => n.x), ys = r.children.map((n) => n.y);
    const w = Math.max(...xs) - Math.min(...xs) + W, h = Math.max(...ys) - Math.min(...ys) + H;
    console.log('  ' + layout.padEnd(8) + 'extent=' + w + 'x' + h +
      ' fits800x600=' + (w <= 800 && h <= 600) +
      ' ratio=' + (Number.isFinite(ratio(arrows)) ? ratio(arrows).toFixed(2) : 'n/a'));
  } catch (e) {
    console.log('  ' + layout.padEnd(8) + 'ERR ' + String(e.message).replace(/\\s+/g, ' ').slice(0, 70));
  }
}
`,
    );
  }
  try {
    const out = execFileSync('node', [runner], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
    process.stdout.write(out);
  } catch (e) {
    console.log(`  run failed: ${(e.stderr || e.message).split('\n')[0]}`);
  }
}