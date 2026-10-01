import {
  runPipeline,
  type Engine,
  type EngineInstance,
  type EngineType,
  type EngineSpec,
  type EngineHost,
  type ValidationResult,
  type EngineAction,
  type EngineState,
  EngineError,
  initialState,
  baseReducer,
  EventLog,
} from '@knowledgeassemble/interactive-engine';
import type { ChartSpec, ChartContent } from './schema.js';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';
import { validateAccessibility } from './validation/accessibility.js';
import { buildScene } from './scene/build.js';
import { layout } from './layout/engine.js';
import type { LayoutContext } from './layout/engine.js';
import { svgFrom } from './render/svg.js';
import type { Scene } from './scene/types.js';
import type { SvgResult } from './render/types.js';

const DEFAULT_LAYOUT: LayoutContext = {
  width: 800,
  height: 600,
  minTouchTarget: 44,
  textStyle: 'normal',
};

function layoutContextFrom(tokens: Record<string, string>): LayoutContext {
  const numberToken = (key: string, fallback: number): number => {
    const raw = tokens[key];
    const value = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  return {
    width: numberToken('width', DEFAULT_LAYOUT.width),
    height: numberToken('height', DEFAULT_LAYOUT.height),
    minTouchTarget: numberToken('minTouchTarget', DEFAULT_LAYOUT.minTouchTarget),
    textStyle: tokens['textStyle'] ?? DEFAULT_LAYOUT.textStyle,
  };
}

function rowIdOf(row: Record<string, string | number | boolean>, index: number): string {
  const id = row['id'];
  if (typeof id === 'string' && id) return id;
  return String(index).padStart(4, '0');
}

function render(content: ChartContent, ctx: LayoutContext, label?: string, description?: string): { scene: Scene; svgResult: SvgResult } {
  const scene = layout(buildScene(content), content, ctx);
  const svgResult = svgFrom(scene, ctx, label, description);
  return { scene, svgResult };
}

export class ChartEngine implements Engine {
  readonly type: EngineType = 'chart';

  validate(spec: EngineSpec): ValidationResult {
    const chartSpec = spec as unknown as ChartSpec;
    let artifacts: { scene: Scene; svgResult: SvgResult } | null = null;
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as ChartSpec),
      layout: () => {
        if (!artifacts && chartSpec.content) {
          artifacts = render(chartSpec.content, DEFAULT_LAYOUT, chartSpec.accessibility?.label, chartSpec.accessibility?.description);
        }
        if (!artifacts) return { valid: true, issues: [] };
        return validateLayout(artifacts.scene, DEFAULT_LAYOUT);
      },
      accessibility: () => {
        if (!artifacts && chartSpec.content) {
          artifacts = render(chartSpec.content, DEFAULT_LAYOUT, chartSpec.accessibility?.label, chartSpec.accessibility?.description);
        }
        if (!artifacts) return { valid: true, issues: [] };
        return validateAccessibility(chartSpec, artifacts.svgResult);
      },
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const validation = this.validate(spec);
    if (!validation.valid) {
      throw new EngineError(
        'INVALID_SPEC',
        `chart engine validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const instanceId = id ?? spec.id;
    const chartSpec = spec as unknown as ChartSpec;
    const content = chartSpec.content as ChartContent;
    const ctx = layoutContextFrom(host.tokens);
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    let laidOut: Scene = { nodes: [], semantics: {} };
    let svgResult: SvgResult = { svg: '', a11y: [], interactive: [], tabular: [] };

    function recompute(rows: ChartContent['data']): void {
      const filtered = { ...content, data: rows };
      const result = render(filtered, ctx, chartSpec.accessibility?.label, chartSpec.accessibility?.description);
      laidOut = result.scene;
      svgResult = result.svgResult;
    }

    recompute(content.data);

    function emit(event: Parameters<EngineHost['onEvent']>[0]): void {
      host.onEvent(event);
      for (const listener of listeners) {
        listener(event);
      }
    }

    const mounted = log.append('engine-mounted', instanceId);
    const ready = log.append('engine-ready', instanceId);
    emit(mounted as Parameters<EngineHost['onEvent']>[0]);
    emit(ready as Parameters<EngineHost['onEvent']>[0]);

    const resultSuffix: Record<string, string> = {
      select: 'selected',
      deselect: 'deselected',
      focus: 'focused',
      unfocus: 'unfocused',
    };

    function findRowPayload(action: EngineAction): Record<string, unknown> | undefined {
      if (action.type !== 'select' && action.type !== 'focus') return undefined;
      const targetId = action.target?.id;
      if (!targetId) return undefined;
      const node = laidOut.semantics[targetId];
      if (!node) return undefined;
      return node.metadata as Record<string, unknown>;
    }

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        const rowPayload = findRowPayload(action);
        const reduced = baseReducer(state, action);
        state = reduced;

        if (action.type === 'filter') {
          const requested = (action.payload as { ids?: unknown } | undefined)?.ids;
          const ids = new Set(Array.isArray(requested) ? (requested as string[]) : []);
          if (ids.size > 0) {
            const rows = content.data.filter((row) => ids.has(rowIdOf(row as Record<string, string | number | boolean>, content.data.indexOf(row))));
            recompute(rows);
          } else {
            recompute([]);
          }
        } else if (action.type === 'clear-filter') {
          recompute(content.data);
        }

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        if (rowPayload && (action.type === 'select' || action.type === 'focus')) {
          const suffix = resultSuffix[action.type] ?? action.type;
          const evtName = `chart.data-point-${suffix}`;
          const nsEvent = log.append(evtName, instanceId, rowPayload as Record<string, unknown>, {
            ...action,
            payload: rowPayload,
          });
          emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
        }

        const completed = log.append('interaction-completed', instanceId, undefined, action);
        emit(completed as Parameters<EngineHost['onEvent']>[0]);

        if (host.reducedMotion && action.type === 'select') {
          host.announce(`Selected ${action.target?.id ?? 'unknown'}`);
        }
      },
      snapshot() {
        return {
          ...state,
          scene: laidOut,
          svgResult,
          tabular: svgResult.tabular,
        };
      },
      subscribe(fn: Parameters<EngineInstance['subscribe']>[0]): () => void {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
      },
      teardown(): void {
        listeners.clear();
      },
    };
  }
}