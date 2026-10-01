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
import type { GeoMapSpec, GeoMapContent } from './schema.js';
import { validateSemantic } from './validation/semantic.js';
import { validateLayout } from './validation/layout.js';
import { validateAccessibility } from './validation/accessibility.js';
import { buildScene } from './scene/build.js';
import { bearingFrom } from './scene/build.js';
import { layout, fitScene } from './layout/engine.js';
import type { LayoutContext, ProjectorFit } from './layout/engine.js';
import { svgFrom } from './render/svg.js';
import type { Scene } from './scene/types.js';
import type { SvgResult } from './render/types.js';
import { deriveDisplay, emptyMaps, updateMapsFromToggle, updateMapsFromStep, updateMapsFromFilter, updateMapsFromClearFilter, updateMapsFromReset, computeScaleBar, makeScaleBarNode, type DisplayMaps, type ScaleBarConfig } from './scene/derive.js';
import type { ProjectionType } from './layout/projection.js';

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

function hasUriSources(content: GeoMapContent): boolean {
  return (content.geography?.sources ?? []).some((s) => s.uri !== undefined && s.data === undefined);
}

function getProjectionType(content: GeoMapContent): ProjectionType {
  return (content.projection?.type as ProjectionType) ?? 'equirectangular';
}

function renderForValidation(
  content: GeoMapContent,
  label?: string,
  description?: string,
): { scene: Scene; svgResult: SvgResult } | ValidationResult | null {
  if (hasUriSources(content)) {
    return null;
  }
  try {
    const scene = buildScene(content, (id: string) => id);
    const projectionType = getProjectionType(content);
    const laidOut = layout(scene, DEFAULT_LAYOUT, content.viewport, projectionType);
    const svgResult = svgFrom(laidOut, DEFAULT_LAYOUT, label, description);
    return { scene: laidOut, svgResult };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    return {
      valid: false,
      issues: [{
        level: 'L2',
        code: (err.code as ValidationResult['issues'][number]['code']) ?? 'INVALID_STATE',
        message: err.message ?? String(error),
      }],
    };
  }
}

export class GeoMapEngine implements Engine {
  readonly type: EngineType = 'geomap';

  validate(spec: EngineSpec): ValidationResult {
    const geomapSpec = spec as unknown as GeoMapSpec;
    let artifacts: { scene: Scene; svgResult: SvgResult } | null = null;
    return runPipeline(spec, {
      semantic: (s) => validateSemantic(s as unknown as GeoMapSpec),
      layout: () => {
        if (!artifacts && geomapSpec.content) {
          const rendered = renderForValidation(geomapSpec.content, geomapSpec.accessibility?.label, geomapSpec.accessibility?.description);
          if (rendered === null || 'valid' in rendered) {
            return rendered ?? { valid: true, issues: [] };
          }
          artifacts = rendered;
        }
        if (!artifacts) return { valid: true, issues: [] };
        return validateLayout(artifacts.scene, DEFAULT_LAYOUT);
      },
      accessibility: () => {
        if (!artifacts && geomapSpec.content) {
          const rendered = renderForValidation(geomapSpec.content, geomapSpec.accessibility?.label, geomapSpec.accessibility?.description);
          if (rendered === null || 'valid' in rendered) {
            return rendered ?? { valid: true, issues: [] };
          }
          artifacts = rendered;
        }
        if (!artifacts) return { valid: true, issues: [] };
        return validateAccessibility(geomapSpec, artifacts.svgResult);
      },
    });
  }

  instantiate(spec: EngineSpec, host: EngineHost, id?: string): EngineInstance {
    const validation = this.validate(spec);
    if (!validation.valid) {
      throw new EngineError(
        'INVALID_SPEC',
        `geomap engine validation failed: ${validation.issues.map((i) => i.message).join('; ')}`,
      );
    }

    const instanceId = id ?? spec.id;
    const geomapSpec = spec as unknown as GeoMapSpec;
    const content = geomapSpec.content as GeoMapContent;
    const ctx = layoutContextFrom(host.tokens);
    const log = new EventLog();
    const listeners = new Set<Parameters<EngineInstance['subscribe']>[0]>();

    let state: EngineState = { ...initialState(instanceId, this.type), phase: 'running' };
    const projectionType = getProjectionType(content);

    const authoredScene = buildScene(content, host.resolveAsset);
    const laidOutBase = layout(authoredScene, ctx, content.viewport, projectionType);
    const maps: DisplayMaps = emptyMaps();
    const fit: ProjectorFit = fitScene(authoredScene, ctx, content.viewport, projectionType);

    const scaleBarUnit = content.scaleBar?.unit ?? 'km';
    const centerLat = content.viewport?.center?.lat ?? fit.centerLat;
    const scaleBarVisible = content.scaleBar?.visible !== false;
    const scaleBarConfig: ScaleBarConfig = computeScaleBar(ctx, centerLat, fit.projector, scaleBarUnit);
    const scaleBarNode = scaleBarVisible
      ? makeScaleBarNode(scaleBarConfig, ctx.minTouchTarget, ctx.height)
      : undefined;

    let displayScene = deriveDisplay(maps, laidOutBase, scaleBarNode);
    let svgResult: SvgResult = svgFrom(displayScene, ctx, geomapSpec.accessibility?.label, geomapSpec.accessibility?.description);

    const periods = content.periods ?? [];
    let periodIndex = 0;

    if (periods.length > 0) {
      rederive();
    }

    function activePeriod(): { id: string; label: string; regionEntityIds: string[] } | undefined {
      return periods[periodIndex];
    }

    function rederive(): void {
      displayScene = deriveDisplay(maps, laidOutBase, scaleBarNode);
      const period = activePeriod();
      if (period) {
        const regionIds = new Set(period.regionEntityIds);
        for (const node of displayScene.nodes) {
          walkPeriod(node, (n) => {
            if (n.role === 'region' && n.metadata) {
              const entityId = n.metadata.entityId as string | undefined;
              if (entityId && !regionIds.has(entityId)) {
                n.hidden = true;
              }
            }
          });
        }
      }
      svgResult = svgFrom(displayScene, ctx, geomapSpec.accessibility?.label, geomapSpec.accessibility?.description);
    }

    function walkPeriod(node: import('./scene/types.js').SceneNode, fn: (n: import('./scene/types.js').SceneNode) => void): void {
      fn(node);
      for (const child of node.children) {
        walkPeriod(child, fn);
      }
    }

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

    function findEntityPayload(action: EngineAction): Record<string, unknown> | undefined {
      if (action.type !== 'select' && action.type !== 'focus') return undefined;
      const targetId = action.target?.id;
      if (!targetId) return undefined;
      const node = displayScene.semantics[targetId];
      if (!node) return undefined;
      return node.metadata as Record<string, unknown>;
    }

    function resolveFilterIds(payload: Record<string, unknown>): string[] {
      const ids = payload.ids as string[] | undefined;
      if (Array.isArray(ids) && ids.length > 0) return ids;
      const categories = payload.categories as string[] | undefined;
      if (Array.isArray(categories) && categories.length > 0) {
        const resolved: string[] = [];
        for (const nodeId in displayScene.semantics) {
          const node = displayScene.semantics[nodeId]!;
          const nodeCategories = node.metadata?.categories as string[] | undefined;
          if (Array.isArray(nodeCategories) && nodeCategories.some((c: string) => categories.includes(c))) {
            resolved.push(nodeId);
          }
        }
        return resolved;
      }
      return [];
    }

    return {
      id: instanceId,
      engine: this.type,
      dispatch(action: EngineAction): void {
        let normalizedAction = action;

        if (action.type === 'filter') {
          const payload = action.payload as Record<string, unknown> | undefined;
          const resolvedIds = resolveFilterIds(payload ?? {});
          const categories = payload?.categories as string[] | undefined;
          if (categories && categories.length > 0) {
            normalizedAction = { ...action, payload: { ids: resolvedIds, categories } };
          }
        } else if (action.type === 'clear-filter') {
          normalizedAction = { ...action, payload: { ids: [] } };
        }

        const entityPayload = findEntityPayload(action);
        const reduced = baseReducer(state, normalizedAction);
        state = reduced;

        const started = log.append('interaction-started', instanceId, undefined, normalizedAction);
        emit(started as Parameters<EngineHost['onEvent']>[0]);

        const changed = log.append('state-changed', instanceId, undefined, normalizedAction);
        emit(changed as Parameters<EngineHost['onEvent']>[0]);

        if (action.type === 'toggle') {
          const targetId = action.target?.id;
          if (targetId) {
            const layerNode = displayScene.semantics[targetId];
            if (layerNode && layerNode.kind === 'layer') {
              const isHidden = layerNode.hidden === true;
              const result = updateMapsFromToggle(maps, targetId, isHidden);
              rederive();
              const nsEvent = log.append('geomap.layer-toggled', instanceId, { layerId: targetId, hidden: result.hidden }, action);
              emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
            }
          }
        } else if (action.type === 'step' || action.type === 'scrub') {
          const targetId = action.target?.id;
          if (targetId === 'geom-period-slice' && periods.length > 0) {
            if (action.type === 'scrub') {
              const stepPayload = Number((action.payload as Record<string, unknown> | undefined)?.step);
              periodIndex = Number.isFinite(stepPayload) ? Math.max(0, Math.min(periods.length - 1, stepPayload)) : periodIndex;
            } else {
              periodIndex = (periodIndex + 1) % periods.length;
            }
            rederive();
            const period = activePeriod();
            const nsEvent = log.append('geomap.period-step', instanceId, { periodIndex, periodId: period?.id }, action);
            emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
          } else if (targetId) {
            const routeNode = displayScene.semantics[targetId];
            if (routeNode && routeNode.role === 'route') {
              const stepPayload = action.type === 'scrub' ? Number((action.payload as Record<string, unknown> | undefined)?.step) : undefined;
              const result = updateMapsFromStep(maps, targetId, stepPayload);
              rederive();
              const authoredRouteId = (routeNode.metadata?.routeId as string) ?? targetId;
              const nsEvent = log.append('geomap.route-step', instanceId, { routeId: authoredRouteId, step: result.step }, action);
              emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
            }
          }
        } else if (action.type === 'focus') {
          const targetId = action.target?.id;
          if (targetId) {
            const node = displayScene.semantics[targetId];
            if (node && node.role === 'legend-item') {
              const linked = (node.metadata?.linkedEntities as string[] | undefined) ?? [];
              maps.legendEntities = linked;
              rederive();
              const nsEvent = log.append('geomap.legend-linked', instanceId, { legendItemId: targetId, entityIds: linked }, action);
              emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
            }
          }
        } else if (action.type === 'filter') {
          const payload = action.payload as Record<string, unknown> | undefined;
          const resolvedIds = resolveFilterIds(payload ?? {});
          const categories = payload?.categories as string[] | undefined;
          updateMapsFromFilter(maps, resolvedIds, categories);
          rederive();
          const eventPayload: Record<string, unknown> = { ids: resolvedIds };
          if (Array.isArray(categories) && categories.length > 0) {
            eventPayload.categories = categories;
          }
          const nsEvent = log.append('geomap.filter-applied', instanceId, eventPayload, action);
          emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
        } else if (action.type === 'clear-filter') {
          updateMapsFromClearFilter(maps);
          rederive();
          const nsEvent = log.append('geomap.filter-applied', instanceId, { ids: [] }, action);
          emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
        } else if (action.type === 'reset') {
          updateMapsFromReset(maps);
          rederive();
        } else if (action.type === 'bearing') {
          const targetId = action.target?.id;
          if (targetId) {
            const node = displayScene.semantics[targetId];
            const compassNode = displayScene.semantics['geom-compass'];
            if (node && compassNode) {
              const lat = node.metadata?.lat as number | undefined;
              const lon = node.metadata?.lon as number | undefined;
              const refLat = compassNode.metadata?.referenceLat as number | undefined;
              const refLon = compassNode.metadata?.referenceLon as number | undefined;
              const windowFrom = compassNode.metadata?.windowFrom as number | undefined;
              const windowTo = compassNode.metadata?.windowTo as number | undefined;
              if (lat !== undefined && lon !== undefined && refLat !== undefined && refLon !== undefined) {
                const bearing = bearingFrom(refLat, refLon, lat, lon);
                const inWindow = windowFrom !== undefined && windowTo !== undefined
                  ? windowFrom <= windowTo
                    ? bearing >= windowFrom && bearing <= windowTo
                    : bearing >= windowFrom || bearing <= windowTo
                  : false;
                const nsEvent = log.append('geomap.bearing-computed', instanceId, {
                  entityId: targetId,
                  referenceEntityId: compassNode.metadata?.referenceEntityId,
                  bearing,
                  inWindow,
                }, action);
                emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
              }
            }
          }
        }

        if (entityPayload && (action.type === 'select' || action.type === 'focus')) {
          const suffix = resultSuffix[action.type] ?? action.type;
          const evtName = `geomap.entity-${suffix}`;
          const nsEvent = log.append(evtName, instanceId, entityPayload as Record<string, unknown>, {
            ...action,
            payload: entityPayload,
          });
          emit(nsEvent as Parameters<EngineHost['onEvent']>[0]);
        }

        const completed = log.append('interaction-completed', instanceId, undefined, normalizedAction);
        emit(completed as Parameters<EngineHost['onEvent']>[0]);

        if (host.reducedMotion && action.type === 'select') {
          host.announce(`Selected ${action.target?.id ?? 'unknown'}`);
        }
      },
      snapshot() {
        const hiddenLayerIds: string[] = [];
        function collectHidden(nodes: import('./scene/types.js').SceneNode[]): void {
          for (const n of nodes) {
            if (n.kind === 'layer' && n.hidden) hiddenLayerIds.push(n.id);
            collectHidden(n.children);
          }
        }
        collectHidden(displayScene.nodes);
        const displayState = {
          hiddenLayerIds,
          activeRouteSteps: { ...maps.activeRouteSteps },
          filterCategories: [...maps.filterCategories],
        };
        return {
          ...state,
          scene: displayScene,
          svgResult,
          alternative: svgResult.alternative,
          displayState,
          scaleBar: scaleBarVisible ? scaleBarConfig : null,
          activePeriod: activePeriod() ?? null,
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