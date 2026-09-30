import { EngineError } from '@knowledgeassemble/interactive-engine';
import type { DiagramContent, DiagramNodeEntry } from '../schema.js';
import type { Scene, SceneNode } from './types.js';

function assertUnique(seen: Set<string>, id: string, msg: string): void {
  if (seen.has(id)) {
    throw new EngineError('INVALID_ENTITY', msg);
  }
  seen.add(id);
}

export function buildScene(content: DiagramContent): Scene {
  const seen = new Set<string>();
  const semantics: Record<string, SceneNode> = {};
  const nodes: SceneNode[] = [];

  const nodeById = new Map<string, DiagramNodeEntry>();
  for (const node of content.nodes) {
    assertUnique(seen, node.id, `diagram: duplicate node id "${node.id}"`);
    nodeById.set(node.id, node);
  }

  // Build node scene nodes
  const nodeSceneNodes: SceneNode[] = [];
  for (const entry of content.nodes) {
    const hasSubtree = content.edges.some(
      (e) => e.from === entry.id && (e.relationship === 'contains' || e.relationship === 'part-of'),
    );
    const acceptsActions: string[] = [];
    if (hasSubtree) {
      acceptsActions.push('select', 'focus', 'expand', 'collapse');
    } else {
      acceptsActions.push('select', 'focus');
    }

    const sn: SceneNode = {
      id: `node-${entry.id}`,
      role: 'selectable',
      kind: 'node',
      label: entry.label,
      description: entry.description,
      interactive: entry.interactive !== false,
      acceptsActions: entry.interactive === false ? undefined : acceptsActions,
      metadata: {
        nodeId: entry.id,
        label: entry.label,
        description: entry.description,
        links: entry.links ?? undefined,
        categories: entry.categories ?? undefined,
      },
      children: [],
    };
    semantics[sn.id] = sn;
    semantics[entry.id] = sn; // register under authored id too for direct id resolution
    nodeSceneNodes.push(sn);
  }

  // Build edge scene nodes
  const edgeSceneNodes: SceneNode[] = [];
  for (const entry of content.edges) {
    const edgeId = entry.id ?? `edge-${entry.from}-${entry.to}`;
    assertUnique(seen, edgeId, `diagram: duplicate edge id "${edgeId}"`);

    if (entry.from === entry.to) {
      throw new EngineError('INVALID_ENTITY', `diagram: self-loop edge "${edgeId}" from "${entry.from}" to itself`);
    }

    if (!nodeById.has(entry.from)) {
      throw new EngineError(
        'INVALID_REFERENCE',
        `diagram: edge "${edgeId}" references unknown node "${entry.from}"`,
      );
    }
    if (!nodeById.has(entry.to)) {
      throw new EngineError(
        'INVALID_REFERENCE',
        `diagram: edge "${edgeId}" references unknown node "${entry.to}"`,
      );
    }

    const en: SceneNode = {
      id: edgeId,
      role: 'selectable',
      kind: 'edge',
      label: `${entry.from} ${entry.relationship} ${entry.to}`,
      interactive: entry.interactive !== false,
      acceptsActions: entry.interactive === false ? undefined : ['select', 'focus', 'follow'],
      metadata: {
        fromNodeId: entry.from,
        toNodeId: entry.to,
        relationship: entry.relationship,
        labels: entry.labels ?? [],
        edgeId,
        gated: entry.gated === true,
        strength: entry.strength,
      },
      children: [],
    };
    semantics[en.id] = en;
    edgeSceneNodes.push(en);
  }

  // Build root group
  const root: SceneNode = {
    id: 'diagram-root',
    role: 'group',
    kind: 'diagram',
    label: 'Diagram',
    interactive: false,
    children: [...nodeSceneNodes, ...edgeSceneNodes],
  };
  semantics[root.id] = root;

  nodes.push(root);

  return { nodes, semantics };
}