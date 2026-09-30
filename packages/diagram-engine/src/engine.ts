import {
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
  runPipeline,
  EventLog,
} from '@knowledgeassemble/interactive-engine';
import type { DiagramSpec, DiagramContent } from './schema.js';
import { DIAGRAM_EVENT_SELECTED, DIAGRAM_EVENT_FOCUSED, DIAGRAM_EVENT_FOLLOWED, DIAGRAM_EVENT_EDGE_SELECTED, defaultLayoutType } from './schema.js';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';
import { validateAccessibility } from './validation/accessibility.js';
import { buildScene } from './scene/build.js';
import { layout } from './layout/engine.js';
import type { LayoutContext } from './layout/engine.js';
import { svgFrom } from './render/svg.js';
import type { Scene, SceneNode } from './scene/types.js';
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

function render(
  content: DiagramContent,
  ctx: LayoutContext,
  spec: DiagramSpec,
  label?: string,
  description?: string,
  filterCategories?: string[],
): { scene: Scene; svgResult: SvgResult } {
  const s = buildScene(content);
  const laidOut = layout(s, ctx, spec.layout?.type ?? defaultLayoutType(content.kind));
  if (filterCategories && filterCategories.length > 0) {
    for (const node of laidOut.nodes) {
      walkHide(node, (n) => {
        if (n.kind === 'node' && n.metadata) {
          const cats = n.metadata.categories as string[] | undefined;
          const matches = Array.isArray(cats) && cats.some((c) => filterCategories.includes(c));
          if (!matches) n.hidden = true;
        }
      });
    }
  }
  const svgResult = svgFrom(laidOut, ctx, label, description);
  return { scene: laidOut, svgResult };
}

function walkHide(node: SceneNode, fn: (n: SceneNode) => void): void {
  fn(node);
  for (const child of node.children) {
    walkHide(child, fn);
  }
}

function renderForValidation(
  content: DiagramContent,
  spec: DiagramSpec,
  label?: string,
  description?: string,
): { scene: Scene; svgResult: SvgResult } | ValidationResult | null {
  try {
    return render(content, DEFAULT_LAYOUT, spec, label, description);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    return {
      valid: false,
      issues: [
        {
          level: 'L2',
          code: (err.code as ValidationResult['issues'][number]['code']) ?? 'INVALID_STATE',
          path: 'content',
          message: err.message ?? String(error),
        },
      ],
    };
  }
}

export class DiagramEngine implements Engine {
  readonly type: EngineType = 'diagram';

  validate(spec: EngineSpec): ValidationResult {
    const diagramSpec = spec as unknown as DiagramSpec;
    let artifacts: { scene: Scene; svgResult: SvgResult } | null = null;
    const renderOrExisting = () => {
      if (!artifacts && diagramSpec.content) {
        const rendered = renderForValidation(
          diagramSpec.content,
          diagramSpec,
          diagramSpec.accessibility?.label,
          diagramSpec.accessibility?.description,
        );
        if (rendered === null || 'valid' in rendered) {
          return rendered ?? { valid: true, issues: [] };
        }
        artifacts = rendered;
      }
      return null;
    };
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as DiagramSpec),
      layout: () => {
        const rendered = renderOrExisting();
        if (rendered !== null) return rendered;
        if (!artifacts) return { valid: true, issues: [] };
        return validateLayout(artifacts.scene, DEFAULT_LAYOUT);
      },
      accessibility: () => {
        const rendered = renderOrExisting();
        if (rendered !== null) return rendered;
        if (!artifacts) return { valid: true, issues: [] };
        return validateAccessibility(diagramSpec, artifacts.svgResult);
      },
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const validation = this.validate(spec);
    if (!validation.valid) {
      throw new EngineError(
        'INVALID_SPEC',
        `diagram engine validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const instanceId = id ?? spec.id;
    const diagramSpec = spec as unknown as DiagramSpec;
    const content = diagramSpec.content as DiagramContent;
    const ctx = layoutContextFrom(host.tokens);
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };

    let laidOut: Scene = { nodes: [], semantics: {} };
    let svgResult: SvgResult = { svg: '', a11y: [], interactive: [], alternative: [] };

    function recompute(): void {
    const filter = state.filter as string[] | undefined;
    const result = render(content, ctx, diagramSpec, diagramSpec.accessibility?.label, diagramSpec.accessibility?.description, filter);
    laidOut = result.scene;
    svgResult = result.svgResult;
  }

    recompute();

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

    function findEntityPayload(action: EngineAction): Record<string, unknown> | undefined {
      if (action.type !== 'select' && action.type !== 'focus' && action.type !== 'follow') return undefined;
      const targetId = action.target?.id;
      if (!targetId) return undefined;
      // The target id could be a node-id or edge-id in scene or authored id
      const node = laidOut.semantics[targetId];
      if (!node) {
        // Try as authored node id
        const nodeByMeta = Object.values(laidOut.semantics).find(
          (n) => n.metadata?.nodeId === targetId,
        );
        if (nodeByMeta) return nodeByMeta.metadata as Record<string, unknown>;
        return undefined;
      }
      return node.metadata as Record<string, unknown>;
    }

    // Build subtree mapping for expand/collapse
    function buildSubtreeAdjacency(): Map<string, string[]> {
      const childrenOf = new Map<string, string[]>();
      for (const edge of content.edges) {
        if (edge.relationship === 'contains' || edge.relationship === 'part-of') {
          const list = childrenOf.get(edge.from) ?? [];
          list.push(edge.to);
          childrenOf.set(edge.from, list);
        }
      }
      return childrenOf;
    }

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        const entityPayload = findEntityPayload(action);
        const subtreeAdj = buildSubtreeAdjacency();

        // Expand/collapse handling
        if (action.type === 'expand' || action.type === 'collapse') {
          const nodeId = action.target?.id;
          if (nodeId) {
            // Find authored node id from scene
            const n = laidOut.semantics[nodeId];
            const authoredId = n?.metadata?.nodeId as string ?? nodeId;
            const children = subtreeAdj.get(authoredId) ?? [];
            if (children.length > 0) {
              const childIds = children.map((c) => `node-${c}`);
              if (action.type === 'expand') {
                state = {
                  ...state,
                  expanded: [...new Set([...state.expanded, ...childIds])],
                  lastAction: action,
                };
              } else {
                state = {
                  ...state,
                  expanded: state.expanded.filter((x) => !childIds.includes(x)),
                  lastAction: action,
                };
              }
            } else {
              state = baseReducer(state, action);
            }
          } else {
            state = baseReducer(state, action);
          }
        } else {
          state = baseReducer(state, action);
        }

        const started = log.append('interaction-started', instanceId, undefined, action);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, action);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        if (action.type === 'filter' || action.type === 'clear-filter') {
          const payload = action.payload as { categories?: string[] } | undefined;
          const categories = Array.isArray(payload?.categories) ? payload.categories : [];
          state = {
            ...state,
            filter: action.type === 'clear-filter' ? [] : categories,
            lastAction: action,
          };
          recompute();
          if (action.type === 'filter') {
            const nsEvent = log.append('diagram.filter-applied', instanceId, { categories }, action);
            emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
          }
        }

        if (entityPayload) {
          const isEdge = (() => {
            const targetId = action.target?.id;
            if (!targetId) return false;
            const node = laidOut.semantics[targetId];
            if (node?.kind === 'edge') return true;
            if (node?.metadata?.fromNodeId !== undefined) return true;
            const byMeta = Object.values(laidOut.semantics).find((n) => n.metadata?.nodeId === targetId);
            return byMeta?.kind === 'edge';
          })();
          if (action.type === 'select') {
            const evtName = isEdge ? DIAGRAM_EVENT_EDGE_SELECTED : DIAGRAM_EVENT_SELECTED;
            const nsEvent = log.append(evtName, instanceId, entityPayload as Record<string, unknown>, {
              ...action,
              payload: entityPayload,
            });
            emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
          } else if (action.type === 'focus') {
            const nsEvent = log.append(DIAGRAM_EVENT_FOCUSED, instanceId, entityPayload as Record<string, unknown>, {
              ...action,
              payload: entityPayload,
            });
            emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
          } else if (action.type === 'follow') {
            const nsEvent = log.append(DIAGRAM_EVENT_FOLLOWED, instanceId, entityPayload as Record<string, unknown>, {
              ...action,
              payload: entityPayload,
            });
            emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
          }
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
          alternative: svgResult.alternative,
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