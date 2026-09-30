import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { ChartContent } from '../schema.js';
import type { Scene, SceneNode } from './types.js';

function assertUnique(seen: Set<string>, id: string): void {
  if (seen.has(id)) {
    throw new EngineError('INVALID_ENTITY', `chart: duplicate id "${id}"`);
  }
  seen.add(id);
}

function rowId(row: Record<string, string | number | boolean>, index: number): string {
  const id = row['id'];
  if (typeof id === 'string' && id) return id;
  return String(index).padStart(4, '0');
}

export function buildScene(content: ChartContent): Scene {
  const seen = new Set<string>();
  const semantics: Record<string, SceneNode> = {};
  const nodes: SceneNode[] = [];

  const dimIds = content.dimensions.map((d) => d.id);
  const measIds = content.measures.map((m) => m.id);

  for (const dim of content.dimensions) {
    assertUnique(seen, dim.id);
  }
  for (const meas of content.measures) {
    assertUnique(seen, meas.id);
  }

  for (const [i, row] of content.data.entries()) {
    const rId = rowId(row, i);
    assertUnique(seen, rId);

    for (const key of Object.keys(row)) {
      if (key === 'id' || key === 'links' || key === 'interactive') continue;
      if (!dimIds.includes(key) && !measIds.includes(key)) {
        throw new EngineError(
          'INVALID_ENTITY',
          `chart: row "${rId}" has undeclared key "${key}"`,
        );
      }
    }

    for (const dimId of dimIds) {
      if (!(dimId in row)) {
        throw new EngineError(
          'INVALID_ENTITY',
          `chart: row "${rId}" missing dimension "${dimId}"`,
        );
      }
    }

    for (const measId of measIds) {
      if (!(measId in row)) {
        throw new EngineError(
          'INVALID_ENTITY',
          `chart: row "${rId}" missing measure "${measId}"`,
        );
      }
    }

    const dimValue = String(row[dimIds[0] ?? ''] ?? '');
    const rowInteractive = (row as Record<string, unknown>).interactive !== false;

    for (const meas of content.measures) {
      const measValue = Number(row[meas.id] ?? 0);
      const barId = `${meas.id}-bar-${rId}`;
      const pointId = `${meas.id}-point-${rId}`;

      if (content.kind === 'bar') {
        const bar: SceneNode = {
          id: barId,
          role: 'selectable',
          kind: 'bar',
          value: measValue,
          label: `${dimValue}: ${measValue}${meas.unit ? ' ' + meas.unit : ''}`,
          interactive: rowInteractive,
          acceptsActions: rowInteractive ? ['select', 'focus'] : undefined,
          metadata: {
            dimensionValue: dimValue,
            measureValue: measValue,
            measureId: meas.id,
            rowId: rId,
            links: (row as Record<string, unknown>).links ?? undefined,
          },
          children: [],
        };
        semantics[barId] = bar;
        nodes.push(bar);
      }

      if (content.kind === 'line') {
        const point: SceneNode = {
          id: pointId,
          role: 'selectable',
          kind: 'point',
          value: measValue,
          label: `${dimValue}: ${measValue}${meas.unit ? ' ' + meas.unit : ''}`,
          interactive: rowInteractive,
          acceptsActions: rowInteractive ? ['select', 'focus'] : undefined,
          metadata: {
            dimensionValue: dimValue,
            measureValue: measValue,
            measureId: meas.id,
            rowId: rId,
            links: (row as Record<string, unknown>).links ?? undefined,
          },
          children: [],
        };
        semantics[pointId] = point;
        nodes.push(point);
      }
    }
  }

  const axisX: SceneNode = {
    id: 'axis-x',
    role: 'axis',
    kind: 'axis',
    label: dimIds[0] ?? 'x',
    children: [],
  };
  semantics[axisX.id] = axisX;
  nodes.push(axisX);

  const axisY: SceneNode = {
    id: 'axis-y',
    role: 'axis',
    kind: 'axis',
    label: measIds[0] ?? 'y',
    children: [],
  };
  semantics[axisY.id] = axisY;
  nodes.push(axisY);

  return { nodes, semantics };
}