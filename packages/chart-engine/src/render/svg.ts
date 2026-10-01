import { nodeAttrs, svgShell, escapeXml, centerOf, a11yButton, pushInteractiveEntries } from '@knowledgeassemble/svg-kit';
import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';
import type { SvgResult, TabularRow } from './types.js';

function nodeToSvg(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  const attrs = nodeAttrs(node, { value: true, bounds: true });

  if (node.children.length > 0) {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  const b = node.bounds ?? { x: 0, y: 0, width: 40, height: 24 };
  const { cx, cy } = centerOf(b);

  switch (node.kind) {
    case 'bar':
      return `${pad}<rect ${attrs} x="${b.x}" y="${b.y}" width="${b.width}" height="${Math.max(b.height, 1)}" fill="currentColor" opacity="0.7" stroke="currentColor" stroke-width="1"/>`;
    case 'point':
      return `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="${Math.max(4, Math.min(b.width, b.height) / 2)}" fill="currentColor" stroke="currentColor" stroke-width="2"/>`;
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
  const height = ctx.height;

  const points = scene.nodes.filter((n) => n.kind === 'point' && n.bounds);
  let seriesSvg = '';
  if (points.length >= 2) {
    const coords = points.map((n) => {
      const b = n.bounds!;
      return `${centerOf(b).cx},${centerOf(b).cy}`;
    });
    seriesSvg = `  <polyline id="series-line" data-oedu-role="series" points="${coords.join(' ')}" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"/>\n`;
  }

  const childrenSvg = seriesSvg + scene.nodes.map((n) => nodeToSvg(n, 1)).join('\n');

  const title = label ?? 'Chart';
  const description = desc ?? 'An interactive chart visualization';

  const svg = svgShell({ width, height, rootId: 'chart-root', title, desc: description, children: childrenSvg });

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];
  const tabularRows: TabularRow[] = [];
  const rowMap = new Map<string, TabularRow>();

  for (const node of scene.nodes) {
    if (node.interactive && node.acceptsActions) {
      a11y.push(a11yButton(node));
      pushInteractiveEntries(interactive, node);
    } else if (node.role === 'axis' || node.role === 'label' || node.role === 'tick') {
      a11y.push({
        id: node.id,
        role: 'text',
        label: node.label ?? String(node.value ?? ''),
        children: [],
      });
    }

    if ((node.kind === 'bar' || node.kind === 'point') && node.metadata) {
      const rId = node.metadata.rowId as string;
      const measId = node.metadata.measureId as string;
      const dv = node.metadata.dimensionValue as string;
      const mv = node.metadata.measureValue as number;
      if (!rowMap.has(rId)) {
        rowMap.set(rId, { rowLabel: dv, values: [] });
      }
      rowMap.get(rId)?.values.push({ measureId: measId, value: mv });
    }
  }

  for (const row of rowMap.values()) {
    tabularRows.push(row);
  }

  return { svg, a11y, interactive, tabular: tabularRows };
}