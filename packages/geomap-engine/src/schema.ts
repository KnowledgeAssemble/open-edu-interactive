import { z } from 'zod';

export const ENTITY_TYPES = [
  'country', 'state', 'province', 'region',
  'city', 'town', 'village',
  'river', 'lake', 'mountain',
  'landmark', 'place',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const LAYER_TYPES = ['region', 'marker', 'route', 'label'] as const;
export type LayerType = (typeof LAYER_TYPES)[number];

export const ROLE_TYPES = [
  'primary-region', 'secondary-region', 'marker', 'route',
  'label', 'highlight', 'selected', 'approximate',
] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export const SOURCE_CLASSES = ['authoritative', 'illustrative', 'simulated'] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

const CoordinateSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  })
  .strict();

export const GeoSourceSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    type: z.literal('geojson'),
    class: z.enum(SOURCE_CLASSES),
    data: z.record(z.unknown()).optional(),
    uri: z.string().optional(),
  })
  .strict()
  .refine(
    (s) => s.data !== undefined || s.uri !== undefined,
    { message: 'source requires either data or uri' },
  );

export const EntitySchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    type: z.enum(ENTITY_TYPES),
    name: z.string().min(1),
    description: z.string().optional(),
    location: z.union([
      z
        .object({ source: z.string(), featureId: z.string() })
        .strict(),
      z
        .object({ coordinates: CoordinateSchema })
        .strict(),
    ]),
    links: z.record(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    adjacentTo: z.array(z.string()).optional(),
  })
  .strict();

const ItemSchema = z
  .object({
    entity: z.string(),
    label: z.boolean().optional(),
    interactive: z.boolean().optional(),
    measure: z.object({ attribute: z.string(), value: z.number() }).strict().optional(),
  })
  .strict();

const RouteItemSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    path: z.array(z.string()).min(2),
    interactive: z.boolean().optional(),
    label: z.boolean().optional(),
  })
  .strict();

export const LayerSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    type: z.enum(LAYER_TYPES),
    title: z.string().optional(),
    visible: z.boolean().optional(),
    style: z
      .object({
        role: z.enum(ROLE_TYPES).optional(),
      })
      .strict()
      .optional(),
    encoding: z.object({
      attribute: z.string(),
      type: z.enum(['fill', 'size']),
      breakpoints: z.array(z.tuple([z.number(), z.number()])).min(1),
    }).strict().optional(),
    items: z.array(z.union([ItemSchema, RouteItemSchema])).min(1),
  })
  .strict();

const ViewportSpecSchema = z
  .object({
    fit: z.literal('content').optional(),
    padding: z.number().min(0).max(0.5).optional(),
    center: CoordinateSchema.optional(),
    zoom: z.number().min(0).max(20).optional(),
  })
  .strict();

export const CompassSchema = z
  .object({
    referenceEntityId: z.string().min(1).max(128).regex(ID_PATTERN),
    window: z
      .object({
        label: z.string().min(1),
        from: z.number().min(0).max(360),
        to: z.number().min(0).max(360),
      })
      .strict(),
  })
  .strict();

export const PeriodSourceSchema = z
  .object({
    class: z.enum(SOURCE_CLASSES),
    title: z.string().optional(),
    citation: z.string().optional(),
    url: z.string().optional(),
  })
  .strict();

export const PeriodSliceSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    label: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1),
    sources: z.array(PeriodSourceSchema).min(1),
    regionEntityIds: z.array(z.string()).min(1),
  })
  .strict();

export const GeoMapContentSchema = z
  .object({
    viewport: ViewportSpecSchema.optional(),
    projection: z
      .object({
        type: z.enum(['equirectangular', 'mercator', 'albers']),
      })
      .strict()
      .optional(),
    scaleBar: z
      .object({
        visible: z.boolean().optional(),
        unit: z.enum(['km', 'mi']).optional(),
      })
      .strict()
      .optional(),
    compass: CompassSchema.optional(),
    periods: z.array(PeriodSliceSchema).optional(),
    geography: z
      .object({
        sources: z.array(GeoSourceSchema).min(1),
      })
      .strict()
      .optional(),
    entities: z.array(EntitySchema).optional(),
    layers: z.array(LayerSchema).optional(),
    legend: z
      .object({
        visible: z.boolean().optional(),
        items: z
          .array(
            z
              .object({
                role: z.string().min(1),
                label: z.string().min(1),
                linkedEntities: z.array(z.string()).optional(),
                interactive: z.boolean().optional(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type GeoMapContent = z.infer<typeof GeoMapContentSchema>;
export type ViewportSpec = z.infer<typeof ViewportSpecSchema>;
export type EntitySpec = z.infer<typeof EntitySchema>;
export type GeoSourceSpec = z.infer<typeof GeoSourceSchema>;
export type LayerSpec = z.infer<typeof LayerSchema>;
export type CompassSpec = z.infer<typeof CompassSchema>;
export type PeriodSliceSpec = z.infer<typeof PeriodSliceSchema>;

export interface GeoMapSpec {
  type: string;
  version: string;
  id: string;
  content?: GeoMapContent;
  interaction?: { mode?: string; actions?: string[] };
  metadata?: { title?: string; description?: string; author?: string };
  accessibility?: { label: string; description?: string };
  sources?: Array<{ class: SourceClass }>;
  questions?: unknown[];
  [key: string]: unknown;
}

export function validateGeoMapContent(input: unknown): {
  valid: boolean;
  issues: Array<{ path: string; message: string }>;
} {
  const result = GeoMapContentSchema.safeParse(input);
  if (result.success) {
    return { valid: true, issues: [] };
  }
  return {
    valid: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}