import { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import { CHART_KINDS, SOURCE_CLASSES } from '../schema.js';
import type { ChartSpec } from '../schema.js';

function isFiniteNumber(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function isIso8601String(v: unknown): boolean {
  return typeof v === 'string' && ISO_DATE_PATTERN.test(v) && !Number.isNaN(Date.parse(v));
}

export function validateSemantic(spec: ChartSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const content = spec.content;

  if (!content) {
    return { valid: false, issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'content is required' }] };
  }

  const kind = content.kind;
  if (!kind) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'content.kind is required' });
  } else if (!(CHART_KINDS as readonly string[]).includes(kind)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown content.kind "${kind}"` });
  }

  const dims = content.dimensions ?? [];
  const meas = content.measures ?? [];
  const data = content.data ?? [];

  if (dims.length === 0) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'dimensions[] requires at least 1 entry' });
  }
  if (meas.length === 0) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'measures[] requires at least 1 entry' });
  }
  if (data.length === 0) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'data[] requires at least 1 row' });
  }

  const dimById = new Map<string, string>();
  const allIds = new Set<string>();
  for (const d of dims) {
    if (allIds.has(d.id)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate dimension id "${d.id}"` });
    }
    allIds.add(d.id);
    dimById.set(d.id, d.type);
  }
  for (const m of meas) {
    if (allIds.has(m.id)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate measure id "${m.id}"` });
    }
    allIds.add(m.id);
  }

  const dimIds = dims.map((d) => d.id);
  const measIds = meas.map((m) => m.id);
  const knownIds = new Set([...dimIds, ...measIds]);

  const rowIds = new Set<string>();
  for (const [i, row] of data.entries()) {
    const rowRecord = row as Record<string, unknown>;
    const rId = typeof rowRecord['id'] === 'string' && rowRecord['id'] ? rowRecord['id'] : String(i).padStart(4, '0');
    if (rowIds.has(rId)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate row id "${rId}"` });
    }
    rowIds.add(rId);
  }

  for (const [i, row] of data.entries()) {
    const rowRecord = row as Record<string, unknown>;
    const rId = typeof rowRecord['id'] === 'string' && rowRecord['id'] ? rowRecord['id'] : String(i).padStart(4, '0');

    for (const key of Object.keys(rowRecord)) {
      if (key === 'id' || key === 'links' || key === 'interactive') continue;
      if (!knownIds.has(key)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": undeclared key "${key}"`,
        });
      }
    }

    for (const dimId of dimIds) {
      const value = rowRecord[dimId];
      if (value === undefined) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": missing dimension "${dimId}"`,
        });
        continue;
      }
      const dimType = dimById.get(dimId);
      if (dimType === 'ordinal' || dimType === 'categorical') {
        if (!isNonEmptyString(value)) {
          issues.push({
            level: 'L2',
            code: 'INVALID_ENTITY',
            message: `row "${rId}": dimension "${dimId}" (${dimType}) requires a non-empty string, got ${describe(value)}`,
          });
        }
      } else if (dimType === 'quantitative') {
        if (!isFiniteNumber(value)) {
          issues.push({
            level: 'L2',
            code: 'INVALID_ENTITY',
            message: `row "${rId}": dimension "${dimId}" (quantitative) requires a finite number, got ${describe(value)}`,
          });
        }
      } else if (dimType === 'time' && !isFiniteNumber(value) && !isIso8601String(value)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": dimension "${dimId}" (time) requires a finite number or ISO-8601 string, got ${describe(value)}`,
        });
      }
    }

    for (const measId of measIds) {
      const value = rowRecord[measId];
      if (value === undefined) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": missing measure "${measId}"`,
        });
      } else if (!isFiniteNumber(value)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ENTITY',
          message: `row "${rId}": measure "${measId}" requires a finite number, got ${describe(value)}`,
        });
      }
    }

    const links = rowRecord['links'];
    if (links !== undefined) {
      if (typeof links !== 'object' || links === null || Array.isArray(links)) {
        issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `row "${rId}": links must be an object` });
      } else {
        for (const [target, refId] of Object.entries(links as Record<string, unknown>)) {
          if (typeof refId === 'string' && !rowIds.has(refId)) {
            issues.push({
              level: 'L2',
              code: 'INVALID_REFERENCE',
              message: `row "${rId}": link "${target}" targets undeclared row id "${refId}"`,
            });
          }
        }
      }
    }
  }

  if (kind === 'line' && data.length < 2) {
    issues.push({
      level: 'L2',
      code: 'INVALID_ENTITY',
      message: 'line chart requires at least 2 data points',
    });
  }

  const actions = spec.interaction?.actions;
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!(ACTION_TYPES as readonly string[]).includes(action)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_ACTION',
          message: `interaction.actions contains non-D5 action "${action}"`,
        });
      }
    }
  }

  const sources = spec.sources;
  if (!sources || sources.length === 0) {
    issues.push({
      level: 'L2',
      code: 'INVALID_SPEC',
      message: 'sources[] is required (provenance, DESIGN §9)',
    });
  }

  if (sources) {
    for (const src of sources) {
      if (!(SOURCE_CLASSES as readonly string[]).includes(src.class)) {
        issues.push({
          level: 'L2',
          code: 'INVALID_SPEC',
          message: `invalid source class "${src.class}"`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

function describe(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v.length > 32 ? `${v.slice(0, 32)}…` : v);
  if (v === null) return 'null';
  if (typeof v === 'object') return 'an object';
  return String(v);
}