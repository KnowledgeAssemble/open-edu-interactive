import { nodeAttrs, svgShell, escapeXml, centerOf, polygonPoints, starPoints, pushInteractiveEntries } from '@knowledgeassemble/svg-kit';
import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/types.js';
import type { SvgResult } from './types.js';

export type { SvgResult };

function nodeToSvg(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  const attrs = nodeAttrs(node, { value: true, bounds: true });

  if (node.kind === 'shape') {
    const b = node.bounds ?? { x: 0, y: 0, width: 100, height: 100 };
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const meta = node.metadata as { shape?: string; sides?: number } | undefined;
    const shapeKind = meta?.shape;
    const sides = meta?.sides ?? 0;
    const r = Math.max(4, Math.min(b.width, b.height) / 2);
    if (shapeKind === 'circle') {
      return `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>`;
    }
    const pts = polygonPoints(cx, cy, r, sides);
    return `${pad}<polygon ${attrs} points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>`;
  }

  if (node.children.length > 0 && node.kind !== 'wedge') {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  const b = node.bounds ?? { x: 0, y: 0, width: 40, height: 24 };
  const { cx, cy } = centerOf(b);

  switch (node.kind) {
    case 'line': {
      const pts = node.geometry?.points as Array<{ x: number; y: number }> | undefined;
      if (Array.isArray(pts) && pts.length >= 2) {
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        return `${pad}<path ${attrs} d="${d}" stroke="currentColor" stroke-width="2" fill="none"/>`;
      }
      return `${pad}<line ${attrs} x1="${b.x}" y1="${cy}" x2="${b.x + b.width}" y2="${cy}" stroke="currentColor" stroke-width="2"/>`;
    }
    case 'tick': {
      const tickLine = `${pad}  <line x1="${cx}" y1="${b.y}" x2="${cx}" y2="${b.y + b.height}" stroke="currentColor" stroke-width="1"/>`;
      if (node.interactive) {
        return `${pad}<g ${attrs}>
${pad}  <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="transparent" data-oedu-hit-target="true" aria-hidden="true"/>
${tickLine}
${pad}</g>`;
      }
      return `${pad}<line ${attrs} x1="${cx}" y1="${b.y}" x2="${cx}" y2="${b.y + b.height}" stroke="currentColor" stroke-width="1"/>`;
    }
    case 'text': {
      const isEmphasized = (node.metadata as Record<string, unknown> | undefined)?.emphasized === true;
      const label = escapeXml(node.label ?? String(node.value ?? ''));
      const textInner = `${pad}  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"${isEmphasized ? ' font-weight="bold"' : ''}>${label}</text>`;
      if (node.interactive) {
        return `${pad}<g ${attrs}>
${pad}  <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="transparent" data-oedu-hit-target="true" aria-hidden="true"/>
${textInner}
${pad}</g>`;
      }
      return `${pad}<text ${attrs} x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"${isEmphasized ? ' font-weight="bold"' : ''}>${label}</text>`;
    }
    case 'circle':
      return `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="${Math.max(4, Math.min(b.width, b.height) / 2)}" fill="${node.interactive ? 'currentColor' : 'transparent'}" stroke="currentColor" stroke-width="2"/>`;
    case 'rect': {
      const isFilled = (node.metadata as Record<string, unknown> | undefined)?.filled === true;
      if (isFilled) {
        return `${pad}<rect ${attrs} data-oedu-filled="true" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="currentColor" opacity="0.6"/>`;
      }
      return `${pad}<rect ${attrs} x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="currentColor" opacity="0.2"/>`;
    }
    case 'square':
      return `${pad}<rect ${attrs} x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>`;
    case 'star': {
      const r = Math.max(4, Math.min(b.width, b.height) / 2);
      const points = starPoints(cx, cy, r, r * 0.4, 5);
      const d = points.map((p) => `${p.x},${p.y}`).join(' L');
      return `${pad}<path ${attrs} d="M${d} Z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>`;
    }
    case 'entity': {
      const labelText = node.label ?? '';
      return `${pad}<g ${attrs}>
${pad}  <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
${pad}  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="currentColor">${escapeXml(labelText)}</text>
${pad}</g>`;
    }
    case 'wedge': {
      const meta = node.metadata as { cx?: number; cy?: number; r?: number; startAngle?: number; endAngle?: number } | undefined;
      if (meta && meta.cx !== undefined && meta.cy !== undefined && meta.r !== undefined && meta.startAngle !== undefined && meta.endAngle !== undefined) {
        const { cx: wcx, cy: wcy, r: wr, startAngle, endAngle } = meta;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = wcx + wr * Math.cos(startRad);
        const y1 = wcy + wr * Math.sin(startRad);
        const x2 = wcx + wr * Math.cos(endRad);
        const y2 = wcy + wr * Math.sin(endRad);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        const d = `M${wcx},${wcy} L${x1},${y1} A${wr},${wr} 0 ${largeArc} 1 ${x2},${y2} Z`;
        const fillOpacity = node.interactive ? '0.35' : '0.15';
        return `${pad}<path ${attrs} d="${d}" fill="currentColor" opacity="${fillOpacity}" stroke="currentColor" stroke-width="1.5"/>`;
      }
      return `${pad}<g ${attrs}></g>`;
    }
    case 'fraction-circle': {
      const r = Math.max(4, Math.min(b.width, b.height) / 2);
      const value = typeof node.value === 'number' ? Math.max(0, Math.min(1, node.value)) : 0;
      const outline = `${pad}<circle ${attrs} cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="2"/>`;
      if (value <= 0) {
        return outline;
      }
      if (value >= 1) {
        const fillR = Math.max(2, r - 2);
        return `${outline}\n${pad}<circle cx="${cx}" cy="${cy}" r="${fillR}" fill="currentColor" opacity="0.35"/>`;
      }
      const sweep = 2 * Math.PI * value - Math.PI / 2;
      const ex = cx + r * Math.cos(sweep);
      const ey = cy + r * Math.sin(sweep);
      const largeArc = value > 0.5 ? 1 : 0;
      const d = `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc} 1 ${ex},${ey} Z`;
      return `${outline}\n${pad}<path d="${d}" fill="currentColor" opacity="0.35"/>`;
    }
    case 'group':
    default:
      return `${pad}<g ${attrs}></g>`;
  }
}

function sceneNodeToA11y(node: SceneNode): SvgResult['a11y'][number] {
  return {
    id: node.id,
    role: node.interactive ? 'button' : node.children.length > 0 ? 'group' : 'img',
    label: node.label ?? node.id,
    children: node.children.map((c) => sceneNodeToA11y(c)),
  };
}

export function svgFrom(scene: Scene, ctx: LayoutContext, label?: string, desc?: string): SvgResult {
  const width = ctx.width;
  const height = ctx.height;

  const childrenSvg = scene.nodes.map((n) => nodeToSvg(n, 1)).join('\n');

  const title = label ?? 'Visual';
  const description = desc ?? 'An interactive educational visualization';

  const svg = svgShell({ width, height, rootId: 'visual-root', title, desc: description, children: childrenSvg }) + '\n';

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];

  function collect(nodes: SceneNode[]): void {
    for (const node of nodes) {
      a11y.push(sceneNodeToA11y(node));
      pushInteractiveEntries(interactive, node);
      collect(node.children);
    }
  }
  collect(scene.nodes);

  return { svg, a11y, interactive };
}