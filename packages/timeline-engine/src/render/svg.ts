import { nodeAttrs, svgShell, escapeXml, centerOf, a11yButton, pushInteractiveEntries } from '@knowledgeassemble/svg-kit';
import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';
import type { SvgResult, TimeRow } from './types.js';

function nodeToSvg(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  const attrs = nodeAttrs(node, {
    value: true,
    bounds: true,
    mid: node.acceptsActions && node.acceptsActions.length > 0 ? { 'data-oedu-actions': node.acceptsActions.join(' ') } : undefined,
  });

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

  const childrenSvg = `    <g id="timeline-tracks">\n${scene.nodes.map((n) => nodeToSvg(n, 1)).join('\n')}\n    </g>`;

  const title = label ?? 'Timeline';
  const description = desc ?? 'An interactive timeline visualization';

  const svg = svgShell({ width, height, rootId: 'timeline-root', title, desc: description, children: childrenSvg });

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];
  const linear: TimeRow[] = [];

  for (const node of scene.nodes) {
    if (node.interactive && node.acceptsActions) {
      a11y.push(a11yButton(node));
      pushInteractiveEntries(interactive, node);
    } else if ((node.role === 'period-band' || node.role === 'label' || node.role === 'tick' || node.role === 'axis') && node.label) {
      a11y.push({
        id: node.id,
        role: 'text',
        label: node.label,
        children: [],
      });
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