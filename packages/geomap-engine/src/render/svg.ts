import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';
import type { SvgResult, EntityRow } from './types.js';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function polylinePoints(pts: Array<{ x: number; y: number }>): string {
  return pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
}

function nodeToSvg(node: SceneNode, indent: number, minTouchTarget: number): string {
  const pad = '  '.repeat(indent);
  let attrs = `id="${escapeXml(node.id)}" data-oedu-role="${escapeXml(node.role)}"`;
  if (node.interactive) {
    attrs += ` data-oedu-interactive="true"`;
  }
  if (node.role === 'route-completed') {
    attrs += ` data-oedu-state="completed"`;
  } else if (node.role === 'route-active') {
    attrs += ` data-oedu-state="active"`;
  }
  const encodingBucket = node.metadata?.encodingBucket as string | undefined;
  if (encodingBucket) {
    attrs += ` data-oedu-encoding="${escapeXml(encodingBucket)}"`;
  }
  if (node.label) {
    attrs += ` aria-label="${escapeXml(node.label)}"`;
  }
  if (node.description) {
    attrs += ` title="${escapeXml(node.description)}"`;
  }

  if (node.kind === 'route' && node.points && node.points.length > 0) {
    const dots = node.children.map((c) => nodeToSvg(c, indent + 1, minTouchTarget)).join('\n');
    const line = `${pad}  <polyline ${attrs} points="${polylinePoints(node.points)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `${pad}<g ${attrs}>\n${line}\n${dots}\n${pad}</g>`;
  }

  if (node.children.length > 0) {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1, minTouchTarget)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  const b = node.bounds ?? { x: 0, y: 0, width: 40, height: 24 };
  const { x, y, width, height } = b;
  const cx = x + width / 2;
  const cy = y + height / 2;

  switch (node.kind) {
    case 'region': {
      const rings = node.rings && node.rings.length > 0 ? node.rings : node.path ? [node.path] : [];
      const encodingType = node.metadata?.encodingType as string | undefined;
      let opacity = 0.3;
      if (encodingType === 'fill' && encodingBucket) {
        const idx = parseInt(encodingBucket.split('-').pop() ?? '1', 10);
        opacity = 0.15 + idx * 0.15;
      }
      if (rings.length > 0) {
        const d = rings
          .map((ring) => `${ring.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fmt(p.x)} ${fmt(p.y)}`).join(' ')} Z`)
          .join(' ');
        return `${pad}<path ${attrs} d="${d}" fill="currentColor" opacity="${fmt(opacity)}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`;
      }
      return `${pad}<rect ${attrs} x="${x}" y="${y}" width="${width}" height="${height}" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1.5" rx="2"/>`;
    }
    case 'marker': {
      const encodingType = node.metadata?.encodingType as string | undefined;
      let r = Math.max(4, Math.min(width, height) / 2);
      if (encodingType === 'size' && encodingBucket) {
        const idx = parseInt(encodingBucket.split('-').pop() ?? '1', 10);
        r = Math.min(26, Math.max(6, 6 + (idx - 1) * 5));
      }
      return `${pad}<circle ${attrs} cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="currentColor" opacity="0.7" stroke="currentColor" stroke-width="1.5"/>`;
    }
    case 'label':
      return `${pad}<text ${attrs} x="${fmt(cx)}" y="${fmt(cy)}" text-anchor="middle" dominant-baseline="central" font-size="12">${escapeXml(node.label ?? '')}</text>`;
    case 'legend-item':
      return `${pad}<text ${attrs} x="${fmt(x + 6)}" y="${fmt(cy)}" text-anchor="start" dominant-baseline="central" font-size="12">${escapeXml(node.label ?? '')}</text>`;
    case 'route-segment':
      return `${pad}<circle ${attrs} cx="${fmt(cx)}" cy="${fmt(cy)}" r="3" fill="currentColor" opacity="0.5"/>`;
    case 'scale-bar': {
      const x0 = x + 2;
      const y0 = y + 18;
      const x1 = x0 + width - 4;
      const line = `<line x1="${fmt(x0)}" y1="${fmt(y0)}" x2="${fmt(x1)}" y2="${fmt(y0)}" stroke="currentColor" stroke-width="2"/>`;
      const tickL = `<line x1="${fmt(x0)}" y1="${fmt(y0 - 4)}" x2="${fmt(x0)}" y2="${fmt(y0 + 4)}" stroke="currentColor" stroke-width="1.5"/>`;
      const tickR = `<line x1="${fmt(x1)}" y1="${fmt(y0 - 4)}" x2="${fmt(x1)}" y2="${fmt(y0 + 4)}" stroke="currentColor" stroke-width="1.5"/>`;
      return `${pad}<g ${attrs}>\n${pad}  ${line}\n${pad}  ${tickL}\n${pad}  ${tickR}\n${pad}</g>`;
    }
    case 'compass': {
      const r = Math.min(width, height) / 2;
      const cxr = x + width / 2;
      const cyr = y + height / 2;
      const n = `${pad}  <line x1="${fmt(cxr)}" y1="${fmt(cyr - r)}" x2="${fmt(cxr)}" y2="${fmt(cyr + r)}" stroke="currentColor" stroke-width="1.5"/>`;
      const e = `${pad}  <line x1="${fmt(cxr - r)}" y1="${fmt(cyr)}" x2="${fmt(cxr + r)}" y2="${fmt(cyr)}" stroke="currentColor" stroke-width="1.5"/>`;
      const dot = `${pad}  <circle cx="${fmt(cxr)}" cy="${fmt(cyr)}" r="2" fill="currentColor"/>`;
      return `${pad}<g ${attrs}>\n${n}\n${e}\n${dot}\n${pad}</g>`;
    }
    case 'period-slice': {
      const cxr = x + width / 2;
      const cyr = y + height / 2;
      const r = Math.min(width, height) / 3;
      const circle = `${pad}  <circle cx="${fmt(cxr)}" cy="${fmt(cyr)}" r="${fmt(r)}" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
      const tick = `${pad}  <line x1="${fmt(cxr)}" y1="${fmt(cyr - r)}" x2="${fmt(cxr)}" y2="${fmt(cyr - r / 2)}" stroke="currentColor" stroke-width="1.5"/>`;
      const label = `${pad}  <text x="${fmt(cxr)}" y="${fmt(cyr + r + 10)}" text-anchor="middle" font-size="9">${escapeXml(node.label ?? '')}</text>`;
      return `${pad}<g ${attrs}>\n${circle}\n${tick}\n${label}\n${pad}</g>`;
    }
    default:
      return `${pad}<g ${attrs}></g>`;
  }
}

function locationString(node: SceneNode): string {
  const meta = node.metadata;
  if (!meta) return '';
  const lat = meta.lat as number | undefined;
  const lon = meta.lon as number | undefined;
  if (lat !== undefined && lon !== undefined) {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
  const source = meta.source as string | undefined;
  const featureId = meta.featureId as string | undefined;
  if (source && featureId) {
    return `${source}#${featureId}`;
  }
  return '';
}

export function svgFrom(scene: Scene, ctx: LayoutContext, label?: string, desc?: string): SvgResult {
  const width = ctx.width;
  const height = ctx.height;

  const childrenSvg = scene.nodes.filter((n) => !n.hidden).map((n) => nodeToSvg(n, 1, ctx.minTouchTarget)).join('\n');

  const title = label ?? 'GeoMap';
  const description = desc ?? 'An interactive geographic map';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <title>${escapeXml(title)}</title>
  <desc>${escapeXml(description)}</desc>
  <g id="map-root">
    <g id="map-layers">
${childrenSvg}
    </g>
  </g>
</svg>\n`;

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];
  const alternative: EntityRow[] = [];
  const seenEntityIds = new Set<string>();

  function walk(node: SceneNode): void {
    if (!node.hidden && node.interactive && node.acceptsActions) {
      a11y.push({
        id: node.id,
        role: 'button',
        label: node.label ?? node.id,
        children: [],
      });
      for (const action of node.acceptsActions) {
        interactive.push({ id: node.id, action });
      }
    }

    if (node.metadata && !node.hidden) {
      const entityId = node.metadata.entityId as string | undefined;
      if (entityId && !seenEntityIds.has(entityId)) {
        seenEntityIds.add(entityId);
        alternative.push({
          entityId,
          type: (node.metadata.entityType as string) ?? '',
          name: (node.metadata.name as string) ?? entityId,
          description: node.metadata.description as string | undefined,
          location: locationString(node),
          sourceClass: node.metadata.sourceClass as string | undefined,
          adjacentTo: node.metadata.adjacentTo as string[] | undefined,
          measureValue: node.metadata.measureValue as number | undefined,
          encodingBucket: node.metadata.encodingBucket as string | undefined,
          bearing: node.metadata.bearing as number | undefined,
          bearingInWindow: node.metadata.bearingInWindow as boolean | undefined,
        });
      }
      if (node.kind === 'scale-bar') {
        alternative.push({
          entityId: node.id,
          type: 'scale-bar',
          name: String(node.metadata.label ?? ''),
          description: undefined,
          location: `${String(node.metadata.lengthKm)} ${String(node.metadata.unit).toUpperCase()}`,
          sourceClass: undefined,
        });
      }
      if (node.kind === 'compass') {
        alternative.push({
          entityId: node.id,
          type: 'compass',
          name: String(node.metadata.windowLabel ?? ''),
          description: `Reference: ${String(node.metadata.referenceEntityId)}`,
          location: `Window ${String(node.metadata.windowFrom)}-${String(node.metadata.windowTo)}`,
          sourceClass: undefined,
        });
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  for (const node of scene.nodes) {
    walk(node);
  }

  return { svg, a11y, interactive, alternative };
}