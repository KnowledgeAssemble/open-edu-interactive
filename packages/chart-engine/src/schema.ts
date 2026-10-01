import { z } from 'zod';

export const CHART_KINDS = ['bar', 'line'] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export const SOURCE_CLASSES = ['authoritative', 'illustrative', 'simulated'] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
export const DIMENSION_TYPES = ['ordinal', 'categorical', 'quantitative', 'time'] as const;
export type DimensionType = (typeof DIMENSION_TYPES)[number];

export const DimensionSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    type: z.enum(DIMENSION_TYPES),
  })
  .strict();

export const MeasureSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    type: z.literal('quantitative'),
    unit: z.string().optional(),
  })
  .strict();

export const DataRowSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

export const ChartContentSchema = z
  .object({
    kind: z.enum(CHART_KINDS),
    dimensions: z.array(DimensionSchema).min(1),
    measures: z.array(MeasureSchema).min(1),
    data: z.array(DataRowSchema).min(1),
  })
  .strict();

export type ChartContent = z.infer<typeof ChartContentSchema>;
export type Dimension = z.infer<typeof DimensionSchema>;
export type Measure = z.infer<typeof MeasureSchema>;

export interface ChartSpec {
  type: string;
  version: string;
  id: string;
  content: ChartContent;
  interaction?: { mode?: string; actions?: string[] };
  metadata?: { title?: string };
  accessibility?: { label: string; description?: string };
  sources?: Array<{ class: SourceClass; title?: string; citation?: string; url?: string }>;
  [key: string]: unknown;
}

export function validateChartContent(input: unknown): {
  valid: boolean;
  issues: Array<{ path: string; message: string }>;
} {
  const result = ChartContentSchema.safeParse(input);
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