import type { Scene, SceneNode } from '../scene/types.js';
import type { LayoutContext } from '../layout/engine.js';
import type { SvgResult, RelRow } from './types.js';
import { adjacency, detectCycles } from '../layout/graph.js';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function nodeToSvg(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  let attrs = `id="${escapeXml(node.id)}" data-oedu-role="${escapeXml(node.role)}"`;
  if (node.interactive) {
    attrs += ` data-oedu-interactive="true"`;
  }
  if (node.label) {
    attrs += ` aria-label="${escapeXml(node.label)}"`;
  }
  if (node.description) {
    attrs += ` title="${escapeXml(node.description)}"`;
  }

  if (node.children.length > 0) {
    const children = node.children.map((c) => nodeToSvg(c, indent + 1)).join('\n');
    return `${pad}<g ${attrs}>\n${children}\n${pad}</g>`;
  }

  if (node.kind === 'edge') {
    const geo = node.metadata?.edgeGeometry as { path?: string; points?: Array<{ x: number; y: number }> } | undefined;
    const rel = node.metadata?.relationship as string ?? "";
    const relationshipAttr = `data-oedu-relationship="${escapeXml(rel)}"`;

    if (geo?.path) {
      return `${pad}<path ${attrs} ${relationshipAttr} d="${escapeXml(geo.path)}" marker-end="url(#arrowhead)" stroke="currentColor" stroke-width="2" fill="none"/>`;
    }

    const points = geo?.points ?? [];
    if (points.length === 2) {
      const p1 = points[0]!;
      const p2 = points[1]!;
      return `${pad}<line ${attrs} ${relationshipAttr} x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="currentColor" stroke-width="2" marker-end="url(#arrowhead)"/>`;
    }

    throw new Error(`edge "${node.id}" has no geometry: expected edgeGeometry with path or points`);
  }

  const b = node.bounds ?? { x: 0, y: 0, width: 100, height: 50 };
  const { x, y, width, height } = b;
  const cx = x + width / 2;
  const cy = y + height / 2;

  return `${pad}<rect ${attrs} x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="currentColor" opacity="0.85" stroke="currentColor" stroke-width="1.5"/>\n${pad}<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="white">${escapeXml(node.label ?? '')}</text>`;
}

export function svgFrom(
  scene: Scene,
  ctx: LayoutContext,
  label?: string,
  desc?: string,
): SvgResult {
  const width = ctx.width;
  const height = ctx.height;

  const root = scene.nodes.find((n) => n.kind === 'diagram');
  const childrenSvg = root ? root.children.filter((n) => !n.hidden).map((n) => nodeToSvg(n, 2)).join('\n') : '';

  const title = label ?? 'Diagram';
  const description = desc ?? 'An interactive diagram showing structural relationships';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  <title>${escapeXml(title)}</title>
  <desc>${escapeXml(description)}</desc>
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="currentColor"/>
    </marker>
  </defs>
  <g id="diagram-root">
    <g id="diagram-nodes">
${childrenSvg}
    </g>
  </g>
</svg>\n`;

  const a11y: SvgResult['a11y'] = [];
  const interactive: SvgResult['interactive'] = [];
  const alternative: RelRow[] = [];

  const nodeChildren = root ? root.children.filter((n) => n.kind === 'node' && !n.hidden) : [];
  const edgeChildren = root ? root.children.filter((n) => n.kind === 'edge' && !n.hidden) : [];

  // Node roster
  for (const n of nodeChildren) {
    const nodeId = n.metadata?.nodeId as string ?? n.id;
    a11y.push({
      id: n.id,
      role: 'button',
      label: n.label ?? nodeId,
      children: [],
    });
    if (n.acceptsActions) {
      for (const action of n.acceptsActions) {
        interactive.push({ id: n.id, action });
      }
    }
    alternative.push({
      kind: 'node',
      id: n.id,
      nodeId,
      label: n.label,
      description: n.description,
    });
  }

  // Edge roster
  for (const e of edgeChildren) {
    const fromNodeId = e.metadata?.fromNodeId as string ?? '';
    const toNodeId = e.metadata?.toNodeId as string ?? '';
    const rel = e.metadata?.relationship as string ?? '';
    const fromNode = nodeChildren.find((n) => (n.metadata?.nodeId as string) === fromNodeId);
    const toNode = nodeChildren.find((n) => (n.metadata?.nodeId as string) === toNodeId);
    const fromLabel = fromNode?.label ?? fromNodeId;
    const toLabel = toNode?.label ?? toNodeId;

    a11y.push({
      id: e.id,
      role: 'link',
      label: `${fromLabel} ${rel} ${toLabel}`,
      children: [],
    });
    interactive.push({ id: e.id, action: 'follow' });
    alternative.push({
      kind: 'edge',
      id: e.id,
      from: fromNodeId,
      relationship: rel,
      to: toNodeId,
      fromLabel,
      toLabel,
    });
  }

  // Detect cycles for alternative
  const nodeIds = nodeChildren.map((n) => n.metadata?.nodeId as string ?? n.id);
  const edgePairs = edgeChildren.map((e) => ({
    from: e.metadata?.fromNodeId as string,
    to: e.metadata?.toNodeId as string,
  }));
  const g = adjacency(nodeIds, edgePairs);
  const { cycles } = detectCycles(g);
  for (const cycle of cycles) {
    alternative.push({
      kind: 'cycle',
      id: `cycle-${cycle.join('-')}`,
      members: cycle,
      label: `Cycle: ${cycle.join(' → ')}`,
    });
  }

  return { svg, a11y, interactive, alternative };
}