import { z } from 'zod';

export const DIAGRAM_KINDS = ['concept-map', 'cycle', 'flow', 'hierarchy'] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export const PROFILES = ['cause-effect', 'concept', 'process', 'system'] as const;
export type Profile = (typeof PROFILES)[number];

export const RELATIONSHIPS = [
  'connected-to', 'contains', 'influences', 'is-a', 'leads-to', 'part-of',
  'feeds-on', 'transforms-to', 'produces', 'weathers-into',
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const LAYOUT_TYPES = ['grid', 'hierarchical', 'radial'] as const;
export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const SOURCE_CLASSES = ['authoritative', 'illustrative', 'simulated'] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

export const DIAGRAM_EVENT_SELECTED = 'diagram.node-selected';
export const DIAGRAM_EVENT_FOCUSED = 'diagram.node-focused';
export const DIAGRAM_EVENT_FOLLOWED = 'diagram.relationship-followed';
export const DIAGRAM_EVENT_EDGE_SELECTED = 'diagram.edge-selected';

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

export const DiagramNodeSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    label: z.string().min(1),
    description: z.string().optional(),
    links: z.record(z.string()).optional(),
    interactive: z.boolean().optional(),
    categories: z.array(z.string()).optional(),
    media: z.object({ kind: z.literal('figure') }).strict().optional(),
  })
  .strict();

export type DiagramNodeSpec = z.infer<typeof DiagramNodeSchema>;

export const DiagramEdgeSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN).optional(),
    from: z.string().min(1).max(128).regex(ID_PATTERN),
    to: z.string().min(1).max(128).regex(ID_PATTERN),
    relationship: z.enum(RELATIONSHIPS),
    labels: z.array(z.string()).optional(),
    interactive: z.boolean().optional(),
    gated: z.boolean().optional(),
    strength: z.number().optional(),
  })
  .strict();

export type DiagramEdgeSpec = z.infer<typeof DiagramEdgeSchema>;

export const DiagramContentSchema = z
  .object({
    kind: z.enum(DIAGRAM_KINDS),
    profile: z.enum(PROFILES).optional(),
    nodes: z
      .array(DiagramNodeSchema)
      .min(1)
      .superRefine((nodes, ctx) => {
        const seen = new Set<string>();
        for (const [index, node] of nodes.entries()) {
          if (seen.has(node.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate node id "${node.id}"`,
              path: [index, 'id'],
            });
          }
          seen.add(node.id);
        }
      }),
    edges: z
      .array(DiagramEdgeSchema)
      .superRefine((edges, ctx) => {
        const seen = new Set<string>();
        for (const [index, edge] of edges.entries()) {
          const edgeId = edge.id ?? `edge-${edge.from}-${edge.to}`;
          if (seen.has(edgeId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate edge id "${edgeId}"`,
              path: [index, 'id'],
            });
          }
          seen.add(edgeId);
          const tripleKey = `${edge.from}|${edge.to}|${edge.relationship}`;
          if (edge.from === edge.to) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `self-loop edge from "${edge.from}" to "${edge.to}"`,
              path: [index],
            });
          }
          void tripleKey;
        }
      }),
  })
  .strict();

export type DiagramContent = z.infer<typeof DiagramContentSchema>;
export type DiagramNodeEntry = z.infer<typeof DiagramNodeSchema>;
export type DiagramEdgeEntry = z.infer<typeof DiagramEdgeSchema>;

export interface DiagramSpec {
  type: string;
  version: string;
  id: string;
  content: DiagramContent;
  layout?: { type: LayoutType };
  interaction?: { mode?: string; actions?: string[] };
  metadata?: { title?: string; description?: string; author?: string };
  accessibility?: { label: string; description?: string };
  sources?: Array<{ class: SourceClass; title?: string; citation?: string }>;
  questions?: unknown[];
  [key: string]: unknown;
}

export function validateDiagramContent(input: unknown): {
  valid: boolean;
  issues: Array<{ path: string; message: string }>;
} {
  const result = DiagramContentSchema.safeParse(input);
  if (result.success) {
    // Additional edge-level checks beyond Zod
    const issues: Array<{ path: string; message: string }> = [];
    const edges = (input as Record<string, unknown>).edges as Array<Record<string, unknown>> | undefined;
    if (edges) {
      const tripleSet = new Set<string>();
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i]!;
        const from = String(e.from ?? '');
        const to = String(e.to ?? '');
        const rel = String(e.relationship ?? '');
        const key = `${from}|${to}|${rel}`;
        if (tripleSet.has(key)) {
          issues.push({ path: `edges[${i}]`, message: `duplicate edge triple (${from}, ${to}, ${rel})` });
        }
        tripleSet.add(key);
      }
    }
    return issues.length > 0 ? { valid: false, issues } : { valid: true, issues: [] };
  }
  return {
    valid: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

export function defaultLayoutType(kind: DiagramKind): string {
  switch (kind) {
    case 'cycle': return 'radial';
    case 'flow':
    case 'hierarchy': return 'hierarchical';
    case 'concept-map': return 'grid';
  }
}