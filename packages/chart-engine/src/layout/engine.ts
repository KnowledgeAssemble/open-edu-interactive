import type { Scene, SceneNode } from '../scene/types.js';
import type { ChartContent } from '../schema.js';
import { linearScale, bandScale, niceTicks, barDomain, lineDomain } from './scales.js';
import { rect } from './geometry.js';

export interface LayoutContext {
  width: number;
  height: number;
  minTouchTarget: number;
  textStyle: string;
}

export function layout(scene: Scene, content: ChartContent, ctx: LayoutContext): Scene {
  const pad = { top: 20, right: 20, bottom: 60, left: 50 };
  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = ctx.width - pad.left - pad.right;
  const plotH = ctx.height - pad.top - pad.bottom;

  const bars = scene.nodes.filter((n) => n.kind === 'bar');
  const points = scene.nodes.filter((n) => n.kind === 'point');
  const axes = scene.nodes.filter((n) => n.role === 'axis');
  for (const axis of axes) {
    if (axis.id === 'axis-x') {
      axis.bounds = rect(plotX, plotY + plotH, plotW, 2);
    } else if (axis.id === 'axis-y') {
      axis.bounds = rect(plotX, plotY, 2, plotH);
    }
  }
  const nodes = [...bars, ...points];

  const categories: string[] = [];
  const seen = new Set<string>();
  for (const node of [...bars, ...points]) {
    const dv = node.metadata?.dimensionValue as string | undefined;
    if (dv && !seen.has(dv)) {
      categories.push(dv);
      seen.add(dv);
    }
  }

  const values = [...bars, ...points].map((n) => n.value ?? 0);

  const xScale = bandScale(categories, [plotX, plotX + plotW]);
  const yDomain =
    content.kind === 'bar' ? barDomain(values) : lineDomain(values);
  const yNice = niceTicks(yDomain[0], yDomain[1]);
  const yScale = linearScale(yNice.domain, [plotY + plotH, plotY]);

  const measureIds = content.measures.map((m) => m.id);
  const grouped = content.kind === 'bar' && measureIds.length > 1;

  for (const node of bars) {
    const dv = node.metadata?.dimensionValue as string | undefined;
    const cat = dv ?? '';
    const x = xScale(cat);
    const bw = xScale.bandwidth();
    const y0 = yScale(0);
    const y1 = yScale(node.value ?? 0);
    const barH = Math.abs(y1 - y0);
    const barY = node.value && node.value >= 0 ? y1 : y0;
    const measureIndex = measureIds.indexOf(node.metadata?.measureId as string);
    const size = Math.min(bw / (grouped ? measureIds.length : 1), ctx.minTouchTarget);
    const offset = grouped && measureIndex >= 0 ? (measureIndex - (measureIds.length - 1) / 2) * size : 0;
    const cx = x + bw / 2 + offset;
    node.bounds = rect(cx - size / 2, barY, size, Math.max(barH, 1));
  }

  for (const node of points) {
    const dv = node.metadata?.dimensionValue as string | undefined;
    const cat = dv ?? '';
    const x = xScale(cat) + xScale.bandwidth() / 2;
    const y = yScale(node.value ?? 0);
    const size = Math.max(ctx.minTouchTarget, 12);
    node.bounds = rect(x - size / 2, y - size / 2, size, size);
  }

  const yTicks = yNice.ticks;
  const gridNodes: SceneNode[] = [];
  const tickNodes: SceneNode[] = [];
  const labelNodes: SceneNode[] = [];

  for (const [i, t] of yTicks.entries()) {
    const y = yScale(t);
    const gId = `gridline-${i}`;
    gridNodes.push({
      id: gId,
      role: 'gridline',
      kind: 'line',
      value: t,
      children: [],
    });
    const tkId = `tick-y-${i}`;
    tickNodes.push({
      id: tkId,
      role: 'tick',
      kind: 'tick',
      value: t,
      bounds: rect(plotX - 6, y - 1, 6, 2),
      children: [],
    });
    const lbId = `label-y-${i}`;
    labelNodes.push({
      id: lbId,
      role: 'label',
      kind: 'text',
      value: t,
      label: String(t),
      bounds: rect(plotX - 50, y - 8, 44, 16),
      children: [],
    });
  }

  for (const [i, cat] of categories.entries()) {
    const x = xScale(cat) + xScale.bandwidth() / 2;
    const tkId = `tick-x-${i}`;
    tickNodes.push({
      id: tkId,
      role: 'tick',
      kind: 'tick',
      label: cat,
      bounds: rect(x - 1, plotY + plotH, 2, 6),
      children: [],
    });
    const lbId = `label-x-${i}`;
    labelNodes.push({
      id: lbId,
      role: 'label',
      kind: 'text',
      label: cat,
      bounds: rect(x - 30, plotY + plotH + 8, 60, 18),
      children: [],
    });
  }

  scene.nodes = [
    ...gridNodes,
    ...tickNodes,
    ...labelNodes,
    ...nodes,
  ];

  if (grouped) {
    const legendNodes: SceneNode[] = [];
    for (const [i, measureId] of measureIds.entries()) {
      legendNodes.push({
        id: `legend-${measureId}`,
        role: 'legend',
        kind: 'text',
        label: measureId,
        value: i,
        bounds: rect(plotX + i * 120, 8, 110, 16),
        children: [],
      });
    }
    scene.nodes = [...legendNodes, ...scene.nodes];
  }

  return scene;
}