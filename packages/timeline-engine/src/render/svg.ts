import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';
import type { SvgResult, TimeRow } from './types.js';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function centerOf(b: { x: number; y: number; width: number; height: number }): { cx: number; cy: number } {
  return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
}

function nodeToSvg(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  let attrs = `id="${escapeXml(node.id)}" data-oedu-role="${escapeXml(node.role)}"`;
  if (node.value !== undefined) {
    attrs += ` data-oedu-value="${node.value}"`;
  }
  if (node.interactive) {
    attrs += ` data-oedu-interactive="true"`;
  }
  if (node.acceptsActions && node.acceptsActions.length > 0) {
    attrs += ` data-oedu-actions="${escapeXml(node.acceptsActions.join(' '))}"`;
  }
  if (node.label) {
    attrs += ` aria-label="${escapeXml(node.label)}"`;
  }
  if (node.bounds) {
    attrs += ` data-oedu-bounds="${node.bounds.x},${node.bounds.y},${node.bounds.width},${node.bounds.height}"`;
  }

  if (node.children.length > 0) {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  const b = node.bounds ?? { x: 0, y: 0, width: 40, height: 24 };
  const { cx, cy } = centerOf(b);

  switch (node.kind) {
    case 'event-marker':
      return `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="${Math.max(6, Math.min(b.width, b.height) / 2)}" fill="currentColor" stroke="currentColor" stroke-width="2"/>`;
    case 'period-band':
      return `${pad}<rect ${attrs} x="${b.x}" y="${b.y}" width="${Math.max(b.width, 2)}" height="${b.height}" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1"/>`;
    case 'event-span':
      return `${pad}<rect ${attrs} x="${b.x}" y="${b.y}" width="${Math.max(b.width, 2)}" height="${b.height}" fill="currentColor" opacity="0.35" stroke="currentColor" stroke-width="1"/>`;
    case 'track-lane':
      return `${pad}<rect ${attrs} x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="none" stroke="currentColor" stroke-width="0.5" stroke-dasharray="4,2"/>`;
    case 'line':
      return `${pad}<line ${attrs} x1="${b.x}" y1="${b.y}" x2="${b.x + b.width}" y2="${b.y + b.height}" stroke="currentColor" stroke-width="1"/>`;
    case 'tick':
      return `${pad}<line ${attrs} x1="${b.x}" y1="${b.y}" x2="${b.x + b.width}" y2="${b.y + b.height}" stroke="currentColor" stroke-width="1"/>`;
    case 'text':
      return `${pad}<text ${attrs} x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central">${escapeXml(node.label ?? String(node.value ?? ''))}</text>`;
    case 'group':
    default:
      return `${pad}<g ${attrs}></g>`;
  }
}

export function svgFrom(scene: Scene, ctx: LayoutContext, label?: string, desc?: string): SvgResult {
  const width = ctx.width;
  const height = Math.max(ctx.height, ctx.minTouchTarget * 2);

  const childrenSvg = scene.nodes.map((n) => nodeToSvg(n, 1)).join('\n');

  const title = label ?? 'Timeline';
  const description = desc ?? 'An interactive timeline visualization';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <title>${escapeXml(title)}</title>
  <desc>${escapeXml(description)}</desc>
  <g id="timeline-root">
    <g id="timeline-tracks">
${childrenSvg}
    </g>
  </g>
</svg>`;

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];
  const linear: TimeRow[] = [];

  for (const node of scene.nodes) {
    if (node.interactive && node.acceptsActions) {
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

    if (node.kind === 'event-marker' && node.metadata) {
      const day = node.metadata.date as number | undefined;
      const dateStr = node.metadata.dateString as string | undefined;
      const trackId = node.metadata.trackId as string | undefined;
      const trackLabel = node.metadata.trackLabel as string | undefined;
      linear.push({
        kind: 'event',
        id: node.id,
        label: node.label ?? '',
        date: dateStr,
        day,
        trackId,
        trackLabel,
      });
    }

    if (node.kind === 'period-band' && node.metadata) {
      const fromStr = node.metadata.from as string | undefined;
      const toStr = node.metadata.to as string | undefined;
      linear.push({
        kind: 'period',
        id: node.id,
        label: node.label ?? '',
        from: fromStr,
        to: toStr,
        description: node.metadata.description as string | undefined,
      });
    }

    if (node.kind === 'event-span' && node.metadata) {
      const fromStr = node.metadata.from as string | undefined;
      const toStr = node.metadata.to as string | undefined;
      const eventId = node.metadata.eventId as string | undefined;
      linear.push({
        kind: 'span',
        id: eventId ?? node.id,
        label: node.label ?? '',
        from: fromStr,
        to: toStr,
      });
    }
  }

  linear.sort((a, b) => {
    const aDay = a.day ?? (a.kind === 'period' ? 0 : 0);
    const bDay = b.day ?? (b.kind === 'period' ? 0 : 0);
    if (aDay !== bDay) return aDay - bDay;
    return a.id.localeCompare(b.id);
  });

  return { svg, a11y, interactive, linear };
}