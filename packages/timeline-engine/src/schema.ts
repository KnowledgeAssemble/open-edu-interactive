import { z } from 'zod';

export const TIMELINE_EVENT_SELECTED = 'timeline.event-selected';
export const TIMELINE_EVENT_FOCUSED = 'timeline.event-focused';

export const DATE_GRAMMAR = /^[+-]?\d{1,6}(-\d{2}){0,2}$/;

export const SOURCE_CLASSES = ['authoritative', 'illustrative', 'simulated'] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

export const TimelineEventSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    label: z.string().min(1),
    date: z.string().min(1).regex(DATE_GRAMMAR, 'date must match Timeline-D3 grammar: ^[+-]?\\d{1,6}(-\\d{2}){0,2}$'),
    duration: z.string().min(1).regex(DATE_GRAMMAR, 'duration must match Timeline-D3 grammar: ^[+-]?\\d{1,6}(-\\d{2}){0,2}$').optional(),
    links: z.record(z.string()).optional(),
    trackId: z.string().min(1).max(128).regex(ID_PATTERN).optional(),
  })
  .strict();

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const STYLE_ROLES = ['primary-period', 'secondary-period', 'highlight', 'selected'] as const;
export type StyleRole = (typeof STYLE_ROLES)[number];

export const TimelinePeriodSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    label: z.string().min(1),
    from: z.string().min(1).regex(DATE_GRAMMAR, 'from must match Timeline-D3 grammar'),
    to: z.string().min(1).regex(DATE_GRAMMAR, 'to must match Timeline-D3 grammar'),
    description: z.string().optional(),
    style: z
      .object({
        role: z.enum(STYLE_ROLES).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type TimelinePeriod = z.infer<typeof TimelinePeriodSchema>;

export const TimelineTrackSchema = z
  .object({
    id: z.string().min(1).max(128).regex(ID_PATTERN),
    label: z.string().min(1),
    events: z.array(z.string().min(1)),
  })
  .strict();

export type TimelineTrack = z.infer<typeof TimelineTrackSchema>;

export const TimelineContentSchema = z
  .object({
    kind: z.literal('events'),
    events: z
      .array(TimelineEventSchema)
      .min(1, 'events must contain at least one event (Timeline-D1)')
      .superRefine((events, ctx) => {
        const seen = new Set<string>();
        for (const [index, event] of events.entries()) {
          if (seen.has(event.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `duplicate event id "${event.id}"`,
              path: [index, 'id'],
            });
          }
          seen.add(event.id);
        }
      }),
    periods: z.array(TimelinePeriodSchema).optional(),
    tracks: z.array(TimelineTrackSchema).optional(),
  })
  .strict();

export type TimelineContent = z.infer<typeof TimelineContentSchema>;

export interface TimelineSpec {
  type: string;
  version: string;
  id: string;
  content: TimelineContent;
  interaction?: { mode?: string; actions?: string[] };
  metadata?: { title?: string };
  accessibility?: { label: string; description?: string };
  sources?: Array<{ class: SourceClass; title?: string; citation?: string; url?: string }>;
  [key: string]: unknown;
}

export function validateTimelineContent(input: unknown): {
  valid: boolean;
  issues: Array<{ path: string; message: string }>;
} {
  const result = TimelineContentSchema.safeParse(input);
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