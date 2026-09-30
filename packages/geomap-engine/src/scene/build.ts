import { EngineError } from '@knowledgeassemble/interactive-engine';
import { geoCentroid, geoArea } from 'd3-geo';
import type { GeoGeometryObjects } from 'd3-geo';
import type { GeoMapContent, GeoSourceSpec, EntitySpec } from '../schema.js';
import type { Scene, SceneNode } from './types.js';

function assertUnique(seen: Set<string>, id: string): void {
  if (seen.has(id)) {
    throw new EngineError('INVALID_ENTITY', `geomap: duplicate id "${id}"`);
  }
  seen.add(id);
}

export function bearingFrom(referenceLat: number, referenceLon: number, lat: number, lon: number): number {
  const dLat = lat - referenceLat;
  const dLon = lon - referenceLon;
  const angle = Math.atan2(dLon, dLat);
  let degrees = (angle * 180) / Math.PI;
  if (degrees < 0) degrees += 360;
  return Number(degrees.toFixed(1));
}

function resolveSourceData(source: GeoSourceSpec, resolveAsset: (id: string) => string | Uint8Array): Record<string, unknown> | undefined {
  if (source.data) return source.data as Record<string, unknown>;
  if (source.uri) {
    const resolved = resolveAsset(source.uri);
    if (typeof resolved === 'string') {
      try {
        return JSON.parse(resolved) as Record<string, unknown>;
      } catch {
        throw new EngineError('RESOURCE_ERROR', `geomap: source "${source.id}" uri "${source.uri}" is not valid JSON`);
      }
    }
    throw new EngineError('RESOURCE_ERROR', `geomap: source "${source.id}" uri "${source.uri}" could not be resolved`);
  }
  throw new EngineError('INVALID_SPEC', `geomap: source "${source.id}" has neither data nor uri`);
}

function centroidOf(geom: Record<string, unknown> | undefined): { lat: number; lon: number } | undefined {
  if (!geom) return undefined;
  const geomType = String(geom.type ?? '');
  const coords = geom.coordinates as unknown;
  if (geomType === 'Point' && Array.isArray(coords) && coords.length >= 2) {
    return { lon: Number(coords[0] ?? 0), lat: Number(coords[1] ?? 0) };
  }
  try {
    const geomObj: Record<string, unknown> = geom as Record<string, unknown>;
    let g = { ...geomObj };
    const innerType = String(g.type ?? '');
    if (geoArea(g as unknown as GeoGeometryObjects) > 2 * Math.PI && (innerType === 'Polygon' || innerType === 'MultiPolygon')) {
      g = { ...g, coordinates: reverseRings(g.coordinates, innerType) };
    }
    const pt = geoCentroid(g as unknown as GeoGeometryObjects);
    if (Array.isArray(pt) && pt.length >= 2) {
      return { lon: pt[0] as number, lat: pt[1] as number };
    }
  } catch {
  }
  return undefined;
}

function reverseRings(coords: unknown, type: string): unknown {
  if (type === 'Polygon' && Array.isArray(coords)) {
    return coords.map((ring: unknown) => {
      if (Array.isArray(ring)) return [...ring].reverse();
      return ring;
    });
  }
  if (type === 'MultiPolygon' && Array.isArray(coords)) {
    return coords.map((poly: unknown) => {
      if (Array.isArray(poly)) {
        return poly.map((ring: unknown) => {
          if (Array.isArray(ring)) return [...ring].reverse();
          return ring;
        });
      }
      return poly;
    });
  }
  return coords;
}

export function buildScene(
  content: GeoMapContent,
  resolveAsset: (id: string) => string | Uint8Array,
): Scene {
  const seen = new Set<string>();
  const semantics: Record<string, SceneNode> = {};
  const nodes: SceneNode[] = [];

  const geography = content.geography;
  const sources = geography?.sources ?? [];
  const entities = content.entities ?? [];
  const layers = content.layers ?? [];

  const sourceById = new Map<string, { source: GeoSourceSpec; featureIndex: Map<string, Record<string, unknown>> }>();

  for (const source of sources) {
    assertUnique(seen, source.id);
    const data = resolveSourceData(source, resolveAsset);
    const features = (data?.features as Array<Record<string, unknown>>) ?? [];
    const featureIndex = new Map<string, Record<string, unknown>>();
    for (const f of features) {
      const fid = f.id as string | undefined;
      if (fid) {
        if (featureIndex.has(fid)) {
          throw new EngineError('INVALID_ENTITY', `geomap: duplicate feature id "${fid}" in source "${source.id}"`);
        }
        featureIndex.set(fid, f);
      }
    }
    sourceById.set(source.id, { source, featureIndex });
  }

  const entityById = new Map<string, EntitySpec>();
  for (const entity of entities) {
    assertUnique(seen, entity.id);
    entityById.set(entity.id, entity);
  }

  const resolvedPos = new Map<string, { lat: number; lon: number }>();
  const resolvedGeom = new Map<string, { type: string; coordinates: unknown }>();
  const resolvedClass = new Map<string, string>();

  for (const entity of entities) {
    const loc = entity.location;
    if ('coordinates' in loc) {
      resolvedPos.set(entity.id, { lat: loc.coordinates.lat, lon: loc.coordinates.lon });
      resolvedGeom.set(entity.id, { type: 'Point', coordinates: [loc.coordinates.lon, loc.coordinates.lat] });
      continue;
    }
    const src = sourceById.get(loc.source);
    if (!src) {
      throw new EngineError('INVALID_REFERENCE', `geomap: entity "${entity.id}" references unknown source "${loc.source}"`);
    }
    const feature = src.featureIndex.get(loc.featureId);
    if (!feature) {
      throw new EngineError('INVALID_REFERENCE', `geomap: entity "${entity.id}" references unknown featureId "${loc.featureId}" in source "${loc.source}"`);
    }
    const geom = feature.geometry as Record<string, unknown> | undefined;
    resolvedGeom.set(entity.id, { type: String(geom?.type ?? ''), coordinates: geom?.coordinates });
    resolvedClass.set(entity.id, src.source.class);
    const centroid = centroidOf(geom);
    if (centroid) {
      resolvedPos.set(entity.id, centroid);
    }
  }

  const compass = content.compass;
  let referenceLat: number | undefined;
  let referenceLon: number | undefined;
  if (compass) {
    const reference = entityById.get(compass.referenceEntityId);
    const referencePos = reference ? resolvedPos.get(reference.id) : undefined;
    referenceLat = referencePos?.lat;
    referenceLon = referencePos?.lon;
  }

  for (const layer of layers) {
    assertUnique(seen, layer.id);
    const layerId = layer.id;
    const layerHidden = layer.visible === false;
    const layerChildren: SceneNode[] = [];

    const layerEncoding = layer.encoding;
    const encodingMeta: Record<string, unknown> = {};
    if (layerEncoding) {
      encodingMeta.encodingAttribute = layerEncoding.attribute;
      encodingMeta.encodingType = layerEncoding.type;
      encodingMeta.encodingBreakpoints = layerEncoding.breakpoints;
    }

    for (const item of layer.items) {
      const itemRecord = item as Record<string, unknown>;
      const entityId = itemRecord.entity as string | undefined;
      const routeId = itemRecord.id as string | undefined;
      const path = itemRecord.path as string[] | undefined;

      if (layer.type === 'route') {
        if (!routeId || !path) continue;
        const routeNodeId = `geom-${layerId}-${routeId}`;
        assertUnique(seen, routeNodeId);

        const routeInteractive = itemRecord.interactive === true;
        const segmentNodes: SceneNode[] = [];
        for (let i = 0; i < path.length; i++) {
          const segId = `geom-${layerId}-${routeId}-seg-${i}`;
          const entity = entityById.get(path[i]!);
          if (!entity) {
            throw new EngineError('INVALID_REFERENCE', `geomap: route "${routeId}" path references unknown entity "${path[i]}"`);
          }
          const pos = resolvedPos.get(entity.id);
          const segInteractive = routeInteractive;
          const segNode: SceneNode = {
            id: segId,
            role: 'route-segment',
            kind: 'route-segment',
            label: entity.name,
            description: entity.description,
            interactive: segInteractive,
            acceptsActions: segInteractive ? ['select', 'focus'] : undefined,
            hidden: layerHidden,
            metadata: {
              entityId: entity.id,
              entityType: entity.type,
              name: entity.name,
              entityIndex: i,
              location: entity.location,
              links: entity.links ?? undefined,
              lat: pos?.lat,
              lon: pos?.lon,
              categories: entity.categories ?? undefined,
              adjacentTo: entity.adjacentTo ?? undefined,
              ...encodingMeta,
            },
            children: [],
          };
          segmentNodes.push(segNode);
        }

        const routeNode: SceneNode = {
          id: routeNodeId,
          role: 'route',
          kind: 'route',
          label: layer.title ?? routeId,
          interactive: false,
          hidden: layerHidden,
          metadata: { layerId: layer.id, routeId },
          children: segmentNodes,
        };
        semantics[routeNodeId] = routeNode;
        layerChildren.push(routeNode);

        if (routeInteractive) {
          for (const seg of segmentNodes) {
            semantics[seg.id] = seg;
          }
        }
        continue;
      }

      if (entityId) {
        const entity = entityById.get(entityId);
        if (!entity) {
          throw new EngineError('INVALID_REFERENCE', `geomap: layer "${layer.id}" item references unknown entity "${entityId}"`);
        }

        const nodeId = `geom-${layerId}-${entityId}`;
        assertUnique(seen, nodeId);

        const interactive = !layerHidden && itemRecord.interactive !== false;
        const isLabel = layer.type === 'label';
        const isMarker = layer.type === 'marker';

        const geometry = resolvedGeom.get(entity.id);
        const pos = resolvedPos.get(entity.id);

        const itemMeasure = (itemRecord.measure as { attribute: string; value: number } | undefined);

        let bearing: number | undefined;
        let bearingInWindow: boolean | undefined;
        if (compass && referenceLat !== undefined && referenceLon !== undefined && pos) {
          bearing = bearingFrom(referenceLat, referenceLon, pos.lat, pos.lon);
          const from = compass.window.from;
          const to = compass.window.to;
          bearingInWindow = from <= to
            ? bearing >= from && bearing <= to
            : bearing >= from || bearing <= to;
        }

        const node: SceneNode = {
          id: nodeId,
          role: isLabel ? 'label' : isMarker ? 'marker' : 'region',
          kind: isLabel ? 'label' : isMarker ? 'marker' : 'region',
          label: entity.name,
          description: entity.description,
          interactive,
          acceptsActions: interactive ? ['select', 'focus'] : undefined,
          hidden: layerHidden,
          metadata: {
            entityId: entity.id,
            entityType: entity.type,
            name: entity.name,
            description: entity.description,
            location: entity.location,
            sourceClass: resolvedClass.get(entity.id),
            links: entity.links ?? undefined,
            lat: pos?.lat,
            lon: pos?.lon,
            categories: entity.categories ?? undefined,
            adjacentTo: entity.adjacentTo ?? undefined,
            bearing,
            bearingInWindow,
            ...(itemMeasure ? { measureValue: itemMeasure.value, measureAttribute: itemMeasure.attribute } : {}),
            ...encodingMeta,
          },
          children: [],
        };

        if (geometry) {
          node.geometry = geometry;
        }

        semantics[nodeId] = node;
        layerChildren.push(node);
      }
    }

    const layerNodeId = `geom-${layerId}`;
    assertUnique(seen, layerNodeId);
    const layerNode: SceneNode = {
      id: layerNodeId,
      role: 'layer',
      kind: 'layer',
      label: layer.title ?? layerId,
      hidden: layerHidden,
      interactive: false,
      metadata: { layerId },
      children: layerChildren,
    };
    semantics[layerNodeId] = layerNode;
    nodes.push(layerNode);
  }

  if (compass) {
    const compassNodeId = 'geom-compass';
    assertUnique(seen, compassNodeId);
    const reference = entityById.get(compass.referenceEntityId);
    const referencePos = reference ? resolvedPos.get(reference.id) : undefined;
    const compassNode: SceneNode = {
      id: compassNodeId,
      role: 'compass',
      kind: 'compass',
      label: compass.window.label,
      interactive: true,
      acceptsActions: ['select', 'focus', 'bearing'],
      metadata: {
        referenceEntityId: compass.referenceEntityId,
        referenceLat: referencePos?.lat,
        referenceLon: referencePos?.lon,
        windowLabel: compass.window.label,
        windowFrom: compass.window.from,
        windowTo: compass.window.to,
      },
      children: [],
    };
    semantics[compassNodeId] = compassNode;
    nodes.push(compassNode);
  }

  const legend = content.legend;
  if (legend && legend.visible !== false && legend.items && legend.items.length > 0) {
    const legendNodeId = 'geom-legend';
    assertUnique(seen, legendNodeId);
    const legendItems: SceneNode[] = legend.items.map((item, i) => {
      const itemId = `geom-legend-item-${i}`;
      assertUnique(seen, itemId);
      const node: SceneNode = {
        id: itemId,
        role: 'legend-item',
        kind: 'legend-item',
        label: item.label,
        metadata: {
          role: item.role,
          linkedEntities: item.linkedEntities ?? undefined,
          interactive: item.interactive ?? undefined,
        },
        children: [],
      };
      semantics[itemId] = node;
      return node;
    });
    const legendNode: SceneNode = {
      id: legendNodeId,
      role: 'legend',
      kind: 'legend',
      label: 'Legend',
      children: legendItems,
    };
    semantics[legendNodeId] = legendNode;
    nodes.push(legendNode);
  }

  return { nodes, semantics };
}