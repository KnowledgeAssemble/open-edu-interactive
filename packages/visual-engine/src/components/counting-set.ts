import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { SceneNode } from '../scene/types.js';

export interface CountingSetProps {
  count: number;
  object: 'circle' | 'square' | 'star';
  arrangement: 'grid' | 'row' | 'column';
  rows?: number;
  columns?: number;
  highlight?: number[];
  labels?: string[];
  maxSelection?: number;
}

const VALID_OBJECTS = ['circle', 'square', 'star'] as const;

export function createCountingSet(props: Record<string, unknown>, parentId: string): SceneNode[] {
  const count = props.count as number;
  const object = props.object as string;
  const arrangement = props.arrangement as string;
  const rows = props.rows as number | undefined;
  const columns = props.columns as number | undefined;
  const highlight = props.highlight as number[] | undefined;
  const labels = props.labels as string[] | undefined;
  const maxSelection = props.maxSelection as number | undefined;
  const discovery = (props.interactive as boolean | undefined) ?? false;

  if (!Number.isInteger(count) || count <= 0) {
    throw new EngineError('INVALID_ENTITY', 'counting-set: count must be a positive integer');
  }

  if (maxSelection !== undefined && (!Number.isInteger(maxSelection) || maxSelection < 0)) {
    throw new EngineError('INVALID_SPEC', 'counting-set: maxSelection must be a non-negative integer');
  }

  if (!VALID_OBJECTS.includes(object as typeof VALID_OBJECTS[number])) {
    throw new EngineError('INVALID_ENTITY', `counting-set: unknown object type "${object}"`);
  }

  if (arrangement !== 'grid' && arrangement !== 'row' && arrangement !== 'column') {
    throw new EngineError('INVALID_ENTITY', `counting-set: unknown arrangement "${arrangement}"`);
  }

  const highlightSet = highlight ? new Set(highlight) : null;
  const layoutMeta = { arrangement, rows, columns };

  const nodes: SceneNode[] = [];

  for (let i = 0; i < count; i++) {
    const id = `${parentId}-object-${i}`;
    const isHighlighted = highlightSet?.has(i) ?? false;
    const isSelectable = discovery || isHighlighted;

    nodes.push({
      id,
      role: 'counting-object',
      kind: object,
      label: labels?.[i] ?? `${object.charAt(0).toUpperCase() + object.slice(1)} ${i + 1}`,
      interactive: isSelectable || undefined,
      acceptsActions: isSelectable ? ['select', 'focus'] : undefined,
      metadata: layoutMeta,
      children: [],
    });
  }

  return nodes;
}

export const countingSetComponent = {
  kind: 'counting-set' as const,
  create(props: Record<string, unknown>, parentId: string): SceneNode[] {
    return createCountingSet(props, parentId);
  },
};