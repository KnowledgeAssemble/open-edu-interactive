import type { Scene, SceneNode, XY } from '../scene/types.js';
import type { ViewportSpec } from '../schema.js';
import { bboxOf, fitViewport, makeProjector, type Projector, type ProjectionType } from './projection.js';
import { rect, union, type Rect } from './geometry.js';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

export interface ProjectorFit {
  projector: Projector;
  centerLat: number;
  centerLon: number;
}

function outerRings(geometry?: { type: string; coordinates: unknown }): Array<Array<[number, number]>> {
  if (!geometry) return [];
  const coords = geometry.coordinates as unknown;
  const type = geometry.type;
  if (type === 'Polygon' && Array.isArray(coords) && coords.length > 0) {
    const ring = coords[0] as unknown[];
    return [ring.filter((p) => Array.isArray(p) && p.length >= 2) as Array<[number, number]>];
  }
  if (type === 'MultiPolygon' && Array.isArray(coords)) {
    return coords
      .filter((poly) => Array.isArray(poly) && poly.length > 0 && Array.isArray(poly[0]))
      .map((poly) => {
        const ring = poly[0] as unknown[];
        return ring.filter((p) => Array.isArray(p) && p.length >= 2) as Array<[number, number]>;
      });
  }
  return [];
}

function expandToMin(r: Rect, min: number): Rect {
  const width = Math.max(min, r.width);
  const height = Math.max(min, r.height);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  return rect(cx - width / 2, cy - height / 2, width, height);
}

export function fitScene(
  scene: Scene,
  ctx: LayoutContext,
  viewport?: ViewportSpec,
  projectionType: ProjectionType = 'equirectangular',
): ProjectorFit {
  const allLons: number[] = [];
  const allLats: number[] = [];

  function collectDegrees(node: SceneNode): void {
    const meta = node.metadata;
    if (meta) {
      const lat = meta.lat as number | undefined;
      const lon = meta.lon as number | undefined;
      if (lat !== undefined && lon !== undefined) {
        allLons.push(lon);
        allLats.push(lat);
      }
    }
    for (const ring of outerRings(node.geometry)) {
      for (const pt of ring) {
        allLons.push(pt[0]!);
        allLats.push(pt[1]!);
      }
    }
    for (const child of node.children) {
      collectDegrees(child);
    }
  }

  for (const node of scene.nodes) {
    collectDegrees(node);
  }

  if (allLons.length === 0) {
    const project = makeProjector(projectionType, ctx.width, ctx.height, { scale: Math.min(ctx.width, ctx.height) / (2 * Math.PI) });
    return { projector: project, centerLat: 0, centerLon: 0 };
  }

  const bbox = bboxOf(allLons, allLats);
  const padding = viewport?.padding ?? 0.08;
  const fitted = fitViewport(bbox, { width: ctx.width, height: ctx.height }, padding);
  const center = viewport?.center ?? { lat: fitted.cy, lon: fitted.cx };
  const scale =
    viewport?.zoom !== undefined ? fitted.scale * Math.pow(2, viewport.zoom / 10) : fitted.scale;

  const project = makeProjector(projectionType, ctx.width, ctx.height, { center, scale });
  return { projector: project, centerLat: center.lat, centerLon: center.lon };
}

export function layout(
  scene: Scene,
  ctx: LayoutContext,
  viewport?: ViewportSpec,
  projectionType?: ProjectionType,
): Scene {
  const { projector } = fitScene(scene, ctx, viewport, projectionType ?? 'equirectangular');
  const project = projector;

  function projectRings(node: SceneNode): XY[][] | undefined {
    const rings = outerRings(node.geometry);
    if (rings.length === 0) return undefined;
    return rings
      .map((ring) => ring.map(([lon, lat]) => project(lon, lat)) as XY[])
      .filter((ring) => {
        if (ring.length < 3) return false;
        const l = Math.min(...ring.map((p) => p.x));
        const r = Math.max(...ring.map((p) => p.x));
        const t = Math.min(...ring.map((p) => p.y));
        const b = Math.max(...ring.map((p) => p.y));
        return r - l > 1e-6 || b - t > 1e-6;
      });
  }

  function assignBounds(node: SceneNode): void {
    const meta = node.metadata;
    const lat = meta?.lat as number | undefined;
    const lon = meta?.lon as number | undefined;

    if (node.kind === 'region') {
      const projected = projectRings(node);
      if (projected && projected.length > 0) {
        node.rings = projected;
        node.path = projected[0];
        const allRects = projected.flatMap((ring) => ring.map((p) => rect(p.x, p.y, 0, 0)));
        const r = union(...allRects);
        node.bounds = expandToMin(r, node.interactive ? ctx.minTouchTarget : 8);
        return;
      }
    }

    if (lat !== undefined && lon !== undefined) {
      const pt = project(lon, lat);
      if (node.kind === 'marker') {
        const size = Math.max(8, ctx.minTouchTarget);
        node.bounds = rect(pt.x - size / 2, pt.y - size / 2, size, size);
        return;
      }
      if (node.kind === 'label' || node.kind === 'route-segment') {
        const size = node.interactive ? ctx.minTouchTarget : 8;
        node.bounds = rect(pt.x - size / 2, pt.y - size / 2, size, size);
        return;
      }
      node.bounds = rect(pt.x - 4, pt.y - 4, 8, 8);
      return;
    }

    if (node.kind === 'legend') {
      let width = 0;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]!;
        const label = child.label ?? String(i);
        width = Math.max(width, label.length * 7);
      }
      const x = 8;
      const y = 8;
      const legendWidth = Math.max(40, width + 16);
      node.bounds = rect(x, y, legendWidth, node.children.length * 18 + 10);
      for (let i = 0; i < node.children.length; i++) {
        node.children[i]!.bounds = rect(x + 8, y + 6 + i * 18, legendWidth - 16, 16);
      }
      return;
    }

    if (node.kind === 'compass') {
      node.bounds = rect(ctx.width - 70, 8, 60, 60);
      return;
    }

    for (const child of node.children) {
      assignBounds(child);
    }
  }

  for (const node of scene.nodes) {
    assignBounds(node);
  }

  function walkRoutePoints(node: SceneNode): void {
  if (node.kind === 'route') {
    const ordered = [...node.children]
      .sort((a, b) => Number(a.metadata?.entityIndex) - Number(b.metadata?.entityIndex))
      .filter((c) => c.bounds);
    if (ordered.length > 0) {
      node.points = ordered.map((c) => ({
        x: c.bounds!.x + c.bounds!.width / 2,
        y: c.bounds!.y + c.bounds!.height / 2,
      }));
      node.bounds = union(...ordered.map((c) => c.bounds!));
    }
  }
  for (const child of node.children) {
    walkRoutePoints(child);
  }
}

  for (const node of scene.nodes) {
    walkRoutePoints(node);
  }

  return scene;
}