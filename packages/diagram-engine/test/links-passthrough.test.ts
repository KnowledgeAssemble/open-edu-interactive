import { describe, it, expect, vi } from 'vitest';
import { DiagramEngine } from '../src/engine.js';
import type { DiagramSpec } from '../src/schema.js';

type SnapshotExtras = {
  scene: { semantics: Record<string, { metadata?: Record<string, unknown> }> };
  svgResult: {
    svg: string;
    alternative: Array<{ kind: 'node' | 'edge' | 'cycle'; id: string; label?: string; description?: string }>;
  };
};

const LINKS_SPEC: DiagramSpec = {
  type: 'diagram',
  version: '1.0.0',
  id: 'di-cycl-links',
  content: {
    kind: 'cycle',
    nodes: [
      { id: 'a', label: 'Stage A', description: 'First stage', links: { visualEntityId: 'figure-a' } },
      { id: 'b', label: 'Stage B', description: 'Second stage', links: { someHostKey: 'opaque-ref' } },
      { id: 'c', label: 'Stage C', description: 'Third stage' },
    ],
    edges: [
      { from: 'a', to: 'b', relationship: 'transforms-to' },
      { from: 'b', to: 'c', relationship: 'transforms-to' },
      { from: 'c', to: 'a', relationship: 'produces' },
    ],
  },
  accessibility: { label: 'Three-stage cycle' },
};

function makeHost(events: Array<{ name: string; action?: unknown }>, resolveAsset = vi.fn((id: string) => id)) {
  return {
    host: {
      locale: 'en' as const,
      tokens: {},
      reducedMotion: false,
      announce: () => {},
      onEvent: (event: { name: string; action?: unknown }) => events.push(event),
      resolveAsset,
    },
    resolveAsset,
  };
}

describe('nodes[].links pass-through (W-3.2, DESIGN §9, P6)', () => {
  it('reaches scene node metadata for a known link key and an unrecognised one', () => {
    const events: Array<{ name: string; action?: unknown }> = [];
    const { host } = makeHost(events);
    const instance = new DiagramEngine().instantiate(LINKS_SPEC as never, host, 'links-scene');
    const snap = instance.snapshot() as unknown as SnapshotExtras;
    expect(snap.scene.semantics['a']!.metadata?.links).toEqual({ visualEntityId: 'figure-a' });
    expect(snap.scene.semantics['b']!.metadata?.links).toEqual({ someHostKey: 'opaque-ref' });
    instance.teardown();
  });

  it('is readable at mount, before any learner dispatch', () => {
    const events: Array<{ name: string; action?: unknown }> = [];
    const { host } = makeHost(events);
    const instance = new DiagramEngine().instantiate(LINKS_SPEC as never, host, 'links-mount');
    const snap = instance.snapshot() as unknown as SnapshotExtras;
    // buildScene registers each node twice — once under its scene id, once under its
    // authored id — so a host walking scene.semantics visits every node twice unless
    // it keys on metadata.nodeId. Edges carry edgeId but no nodeId, so they drop out.
    const seen = new Set<string>();
    const visited: string[] = [];
    for (const n of Object.values(snap.scene.semantics)) {
      const nodeId = n.metadata?.nodeId as string | undefined;
      if (!nodeId || seen.has(nodeId)) continue;
      seen.add(nodeId);
      visited.push(nodeId);
    }
    expect(visited.sort()).toEqual(['a', 'b', 'c']);
    expect(events.filter((e) => e.name.startsWith('diagram.'))).toHaveLength(0);
    instance.teardown();
  });

  it('carries links in the diagram.node-selected payload (what bindings targetIdFrom reads)', () => {
    const events: Array<{ name: string; action?: unknown }> = [];
    const { host } = makeHost(events);
    const instance = new DiagramEngine().instantiate(LINKS_SPEC as never, host, 'links-select');
    instance.dispatch({ type: 'select', target: { id: 'node-a' } });
    const evt = events.find((e) => e.name === 'diagram.node-selected');
    const payload = (evt?.action as { payload?: Record<string, unknown> } | undefined)?.payload;
    expect((payload?.links as { visualEntityId?: string } | undefined)?.visualEntityId).toBe('figure-a');
    instance.teardown();
  });

  it('never resolves a link itself — host.resolveAsset is not called (DESIGN §9)', () => {
    const events: Array<{ name: string; action?: unknown }> = [];
    const { host, resolveAsset } = makeHost(events);
    const instance = new DiagramEngine().instantiate(LINKS_SPEC as never, host, 'links-no-resolve');
    instance.dispatch({ type: 'select', target: { id: 'node-a' } });
    expect(resolveAsset).not.toHaveBeenCalled();
    instance.teardown();
  });

  it('never emits an image or link reference into the SVG (DESIGN §9, P2)', () => {
    const events: Array<{ name: string; action?: unknown }> = [];
    const { host } = makeHost(events);
    const instance = new DiagramEngine().instantiate(LINKS_SPEC as never, host, 'links-svg');
    const snap = instance.snapshot() as unknown as SnapshotExtras;
    expect(snap.svgResult.svg).not.toMatch(/<image|xlink:href|figure-a|opaque-ref/);
    instance.teardown();
  });

  it('alternative rows carry every label and description, so no node depends on an external reference (P6)', () => {
    const events: Array<{ name: string; action?: unknown }> = [];
    const { host } = makeHost(events);
    const instance = new DiagramEngine().instantiate(LINKS_SPEC as never, host, 'links-alt');
    const snap = instance.snapshot() as unknown as SnapshotExtras;
    const rows = snap.svgResult.alternative.filter((r) => r.kind === 'node');
    for (const label of ['Stage A', 'Stage B', 'Stage C']) {
      expect(rows.some((r) => r.label === label)).toBe(true);
    }
    expect(rows.some((r) => r.description === 'Second stage')).toBe(true);
    instance.teardown();
  });
});
