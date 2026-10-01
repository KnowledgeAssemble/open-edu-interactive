import { a11yTreeOf, createPlatformInstance } from '@knowledgeassemble/interactive-engine';
import type { EngineAction, EngineSpec } from '@knowledgeassemble/interactive-engine';
import { mountEngine, exposeHarness, loadSpec, engineHarnessExtras } from '@knowledgeassemble/dev-harness';

interface HarnessRemote {
  dispatch(arg1: unknown, arg2?: unknown): void;
  snapshot(arg?: unknown): unknown;
  events(): Array<{ seq: number; name: string; action?: unknown }>;
  tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string };
  svg?(): string;
}

interface ChartHarnessRemote extends HarnessRemote {
  tabular(): Array<{ rowLabel: string; values: Array<{ measureId: string; value: number | null; unit?: string }> }>;
}

interface GeomapHarnessRemote extends HarnessRemote {
  alternative(): Array<{ kind: string; id: string; label?: string }>;
}

interface TimelineHarnessRemote extends HarnessRemote {
  linear(): Array<{ id: string; label: string; date: string }>;
}

interface DiagramHarnessRemote extends HarnessRemote {
  alternative(): Array<{ kind: string; id: string; label?: string; from?: string; relationship?: string; to?: string }>;
}

interface LessonHarnessRemote extends HarnessRemote {}

interface CompositionHarnessRemote extends HarnessRemote {}

declare global {
  interface Window {
    __harness?: HarnessRemote;
    __visualHarness?: HarnessRemote;
    __chartHarness?: ChartHarnessRemote;
    __geomapHarness?: GeomapHarnessRemote;
    __timelineHarness?: TimelineHarnessRemote;
    __diagramHarness?: DiagramHarnessRemote;
    __lessonHarness?: LessonHarnessRemote;
    __compositionHarness?: CompositionHarnessRemote;
  }
}

function makeHost(emitted: Array<{ seq: number; name: string; action?: unknown }>): Parameters<typeof createPlatformInstance>[1] {
  return {
    locale: 'en',
    tokens: {},
    reducedMotion: false,
    announce: (message: string) => console.log('[announce]', message),
    onEvent: (event: { seq: number; name: string; action?: unknown }) => {
      if (emitted.length < 200) {
        emitted.push({ seq: event.seq, name: event.name, action: event.action });
      }
    },
    resolveAsset: (id: string) => id,
  };
}

const app = document.getElementById('app');
if (!app) {
  throw new Error('conformance: missing #app element');
}

const engineParam = new URLSearchParams(window.location.search).get('engine') ?? 'core';

const ENGINE_FIXTURES: Record<string, string> = {
  chart: 'packages/chart-engine/fixture/bar/input.chart.json',
  geomap: 'packages/geomap-engine/fixture/odisha-coastal/input.geomap.json',
  timeline: 'packages/timeline-engine/fixture/independence/input.timeline.json',
  diagram: 'packages/diagram-engine/fixture/water-cycle/input.diagram.json',
  visual: 'packages/visual-engine/fixture/number-line/input.visual.json',
};

if (engineParam === 'core') {
  const SPEC: EngineSpec = {
    type: 'visual',
    version: '1.0.0',
    id: 'number-line-conformance',
    metadata: { title: 'Number Line' },
    purpose: { learningObjective: 'Select the highlighted value on the number line' },
    interaction: { actions: ['select', 'focus', 'reset'] },
    content: {},
  };

  const emitted: Array<{ seq: number; name: string; action?: unknown }> = [];
  const host = makeHost(emitted);
  const instance = createPlatformInstance(SPEC, host);
  const t0 = a11yTreeOf(instance.snapshot());

  const rootEl = document.createElement('div');
  rootEl.id = t0.id;
  rootEl.setAttribute('role', t0.role);
  rootEl.setAttribute('aria-label', t0.label ?? t0.id);
  rootEl.textContent = 'Number line conformance scene';
  app.appendChild(rootEl);

  window.__harness = {
    dispatch(action: { type: string; target?: { id: string }; payload?: unknown }): void {
      instance.dispatch(action as EngineAction);
    },
    snapshot(): unknown {
      return instance.snapshot();
    },
    events() {
      return [...emitted];
    },
    tryCreate(spec: unknown): { ok: boolean; code?: string; message?: string } {
      try {
        const created = createPlatformInstance(spec as EngineSpec, host);
        created.teardown();
        return { ok: true };
      } catch (error) {
        const err = error as { code?: string; message?: string };
        return { ok: false, code: err.code, message: err.message };
      }
    },
  };
} else if (engineParam === 'lesson') {
  const { mountLesson } = await import('./lesson.js');
  mountLesson(app);
} else if (engineParam === 'composition') {
  const { mountComposition } = await import('./composition.js');
  mountComposition(app);
} else {
  const specParam = new URLSearchParams(window.location.search).get('spec');
  const specPath = specParam ?? ENGINE_FIXTURES[engineParam];
  if (!specPath) {
    throw new Error(`Unknown engine: ${engineParam}`);
  }
  const spec = loadSpec(specPath) as never;
  const result = mountEngine(spec, app);
  const extras = engineHarnessExtras(result);
  exposeHarness(window, result, extras);
  const harness = window.__harness as HarnessRemote;
  (window as unknown as Record<string, HarnessRemote>)[`__${engineParam}Harness`] = harness;
  if (engineParam === 'visual') {
    window.__visualHarness = harness;
  }
}
