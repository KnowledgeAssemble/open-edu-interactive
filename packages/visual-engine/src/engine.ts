import {
  runPipeline,
  type Engine,
  type EngineInstance,
  type EngineType,
  type EngineSpec,
  type EngineHost,
  type ValidationResult,
  type EngineAction,
  EngineError,
  initialState,
  baseReducer,
  EventLog,
} from '@knowledgeassemble/interactive-engine';
import type { VisualSpec } from './schema.js';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';
import { validateAccessibility } from './validation/accessibility.js';
import { buildScene } from './scene/build.js';
import { layout } from './layout/engine.js';
import { svgFrom } from './render/svg.js';
import type { SvgResult } from './render/types.js';

export { SvgResult };

export class VisualEngine implements Engine {
  readonly type: EngineType = 'visual';

  validate(spec: EngineSpec): ValidationResult {
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as VisualSpec),
      layout: (s) => validateLayout(s as unknown as VisualSpec),
      accessibility: (s) => validateAccessibility(s as unknown as VisualSpec),
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const validation = this.validate(spec);
    if (!validation.valid) {
      throw new EngineError(
        'INVALID_SPEC',
        `visual engine validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const instanceId = id ?? spec.id;
    const visualSpec = spec as unknown as VisualSpec;
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    let state = initialState(instanceId, this.type);
    state = { ...state, phase: 'running' };

    function emit(event: Parameters<EngineHost['onEvent']>[0]): void {
      host.onEvent(event);
      for (const listener of listeners) {
        listener(event);
      }
    }

    // Build scene + layout + SVG (deterministic; computed once at instantiation)
    const baseScene = layout(buildScene(visualSpec.content), {
      width: 800,
      height: 600,
      minTouchTarget: 44,
      textStyle: 'normal',
    });
    const ctx: { width: number; height: number; minTouchTarget: number; textStyle: string } = {
      width: 800,
      height: 600,
      minTouchTarget: 44,
      textStyle: 'normal',
    };
    const svgCtx = ctx;

    let scene = baseScene;
    let svgResult = svgFrom(scene, svgCtx, visualSpec.accessibility?.label, visualSpec.accessibility?.description);

    function rederive(): void {
      scene = structuredClone(baseScene);
      walkNodes(scene.nodes, (node) => {
        if (node.role === 'fraction-part') {
          node.metadata = {
            ...node.metadata,
            filled: state.selection.includes(node.id) === true,
          };
        }
      });
      svgResult = svgFrom(scene, svgCtx, visualSpec.accessibility?.label, visualSpec.accessibility?.description);
    }

    function walkNodes(nodes: import('./scene/types.js').SceneNode[], fn: (n: import('./scene/types.js').SceneNode) => void): void {
      for (const node of nodes) {
        fn(node);
        walkNodes(node.children, fn);
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

    const maxSelectionByComponent = new Map<string, number>();
    for (const comp of visualSpec.content?.components ?? []) {
      if (comp.type === 'counting-set') {
        const props = comp.props as Record<string, unknown> | undefined;
        const maxSelection = props?.maxSelection as number | undefined;
        if (maxSelection !== undefined && Number.isInteger(maxSelection) && maxSelection >= 0) {
          maxSelectionByComponent.set(comp.id, maxSelection);
        }
      }
    }

    function componentOf(targetId: string): string | undefined {
      for (const compId of maxSelectionByComponent.keys()) {
        if (targetId.startsWith(`${compId}-object-`)) return compId;
      }
      return undefined;
    }

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        if (action.type === 'select' && action.target?.id) {
          const compId = componentOf(action.target.id);
          const cap = compId ? maxSelectionByComponent.get(compId) : undefined;
          if (cap !== undefined && !state.selection.includes(action.target.id) && state.selection.length >= cap) {
            throw new EngineError('INVALID_ACTION', `counting-set "${compId}" maxSelection ${cap} reached`);
          }
        }
        const reduced = baseReducer(state, action);
        state = reduced;
        if (action.type === 'select' || action.type === 'deselect') {
          rederive();
        }

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        const suffix = resultSuffix[action.type] ?? action.type;
        const evtName = `visual.${action.target?.id ?? 'unknown'}-${suffix}`;
        const nsEvent = log.append(evtName, instanceId, { selection: state.selection }, action);
        emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);

        const completed = log.append('interaction-completed', instanceId, undefined, action);
        emit(completed as Parameters<EngineHost['onEvent']>[0]);

        if (host.reducedMotion) {
          if (action.type === 'select') {
            host.announce(`Selected ${action.target?.id ?? 'unknown'}`);
          } else if (action.type === 'focus') {
            host.announce(`Focused ${action.target?.id ?? 'unknown'}`);
          }
        }
      },
      snapshot() {
        return {
          ...state,
          scene,
          svgResult,
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