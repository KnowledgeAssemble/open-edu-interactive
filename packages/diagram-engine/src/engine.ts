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
  revealedEdges?: string[],
  followedChain?: string[],
  deemphasizedNodes?: string[],
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
  const revealed = new Set(revealedEdges ?? []);
  for (const node of laidOut.nodes) {
    walkHide(node, (n) => {
      if (n.kind === 'edge' && n.metadata?.gated === true && n.metadata) {
        const edgeId = (n.metadata.edgeId as string) ?? n.id;
        if (!revealed.has(edgeId)) {
          n.metadata = { ...n.metadata, relationship: undefined, gatedLabel: 'hidden' };
        }
      }
    });
  }
  if (followedChain && followedChain.length > 0) {
    const lastEdge = followedChain[followedChain.length - 1]!;
    for (const node of laidOut.nodes) {
      walkHide(node, (n) => {
        if (n.kind === 'edge' && (n.metadata?.edgeId === lastEdge || n.id === lastEdge)) {
          n.metadata = { ...n.metadata, chainStep: followedChain.length, chainActive: true };
        }
      });
    }
  }
  if (deemphasizedNodes && deemphasizedNodes.length > 0) {
    const deemph = new Set(deemphasizedNodes);
    for (const node of laidOut.nodes) {
      walkHide(node, (n) => {
        if (n.kind === 'node') {
          const authored = (n.metadata?.nodeId as string) ?? n.id.replace(/^node-/, '');
          if (deemph.has(authored) || deemph.has(n.id)) {
            n.metadata = { ...n.metadata, whatIf: 'deemphasized', whatIfDeemphasized: true };
          }
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

function validateConstructOrder(content: DiagramContent, order: string[]): boolean {
  const nodes = new Set(content.nodes.map((n) => n.id));
  if (order.length === 0 || order.length !== nodes.size) return false;
  const edges = new Map<string, Set<string>>();
  for (const edge of content.edges) {
    const list = edges.get(edge.from) ?? new Set<string>();
    list.add(edge.to);
    edges.set(edge.from, list);
  }
  for (let i = 0; i < order.length - 1; i++) {
    if (!edges.get(order[i]!)?.has(order[i + 1]!)) return false;
  }
  return true;
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
    const revealedEdges: string[] = [];
    const followedChain: string[] = [];
    const deemphasizedNodes: string[] = [];
    let lastConstructOrder: { order: string[]; valid: boolean } | null = null;

    let laidOut: Scene = { nodes: [], semantics: {} };
    let svgResult: SvgResult = { svg: '', a11y: [], interactive: [], alternative: [] };

    function recompute(): void {
    const filter = state.filter as string[] | undefined;
    const result = render(content, ctx, diagramSpec, diagramSpec.accessibility?.label, diagramSpec.accessibility?.description, filter, revealedEdges, followedChain, deemphasizedNodes);
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
        } else if (action.type === 'answer') {
          const targetId = action.target?.id;
          const payload = action.payload as { whatIf?: boolean; whatIfNode?: string; construct?: string; order?: string[] } | undefined;
          if (payload?.construct === 'order' && Array.isArray(payload.order)) {
            const valid = validateConstructOrder(content, payload.order);
            lastConstructOrder = { order: [...payload.order], valid };
            state = { ...state, lastAction: action };
            const nsEvent = log.append('diagram.construct-order', instanceId, { order: payload.order, valid }, action);
            emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
          } else if (payload?.whatIf && payload.whatIfNode) {
            const authored = payload.whatIfNode;
            if (!deemphasizedNodes.includes(authored)) {
              deemphasizedNodes.push(authored);
            }
            state = { ...state, lastAction: action };
            recompute();
            const nsEvent = log.append('diagram.what-if', instanceId, { nodeId: authored, deemphasizedNodes: [...deemphasizedNodes] }, action);
            emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
          } else if (targetId && !revealedEdges.includes(targetId)) {
            revealedEdges.push(targetId);
            state = { ...state, lastAction: action };
            recompute();
          } else {
            state = { ...state, lastAction: action };
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
            const targetId = action.target?.id;
            if (targetId && !followedChain.includes(targetId)) {
              followedChain.push(targetId);
            }
            recompute();
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
          revealedEdges: [...revealedEdges],
          followedChain: [...followedChain],
          deemphasizedNodes: [...deemphasizedNodes],
          constructOrder: lastConstructOrder,
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