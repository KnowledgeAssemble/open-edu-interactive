import { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import { ENTITY_TYPES, LAYER_TYPES, ROLE_TYPES, SOURCE_CLASSES, GeoMapContentSchema } from '../schema.js';
import type { GeoMapSpec, GeoMapContent } from '../schema.js';
import { validateGeography } from './geographic.js';

function isFiniteNumber(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v);
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

export function validateSemantic(spec: GeoMapSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];
  const content = spec.content;

  if (!content) {
    return { valid: false, issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'content is required' }] };
  }

  const schemaCheck = GeoMapContentSchema.safeParse(content);
  if (!schemaCheck.success) {
    for (const issue of schemaCheck.error.issues) {
      issues.push({
        level: 'L2',
        code: 'INVALID_SPEC',
        path: `content.${issue.path.join('.')}`,
        message: `content schema error: ${issue.message}`,
      });
    }
  }

  const geomapContent = content as GeoMapContent;

  const projection = content.projection;
  if (projection && !['equirectangular', 'mercator', 'albers'].includes(projection.type)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `projection.type must be "equirectangular", "mercator", or "albers", got "${projection.type}"` });
  }

  const geography = content.geography;
  if (geography) {
    const sourceIds = new Set<string>();
    for (const src of geography.sources) {
      if (sourceIds.has(src.id)) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate source id "${src.id}"` });
      }
      sourceIds.add(src.id);
      if (!(SOURCE_CLASSES as readonly string[]).includes(src.class)) {
        issues.push({ level: 'L2', code: 'INVALID_SPEC', message: `invalid source class "${src.class}"` });
      }
    }
  }

  const entities = content.entities ?? [];
  const entityIds = new Set<string>();
  for (const entity of entities) {
    if (entityIds.has(entity.id)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate entity id "${entity.id}"` });
    }
    entityIds.add(entity.id);

    if (!(ENTITY_TYPES as readonly string[]).includes(entity.type)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown entity type "${entity.type}"` });
    }

    if (!isNonEmptyString(entity.name)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `entity "${entity.id}" name is required and must be non-empty` });
    }

    const loc = entity.location;
    if ('coordinates' in loc) {
      const coords = loc.coordinates as { lat: number; lon: number };
      if (!isFiniteNumber(coords.lat) || coords.lat < -90 || coords.lat > 90) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `entity "${entity.id}" lat ${coords.lat} out of range [-90,90]` });
      }
      if (!isFiniteNumber(coords.lon) || coords.lon < -180 || coords.lon > 180) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `entity "${entity.id}" lon ${coords.lon} out of range [-180,180]` });
      }
    } else if ('source' in loc && 'featureId' in loc) {
      const srcId = loc.source as string;
      if (geography && !geography.sources.some((s) => s.id === srcId)) {
        issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `entity "${entity.id}" references unknown source "${srcId}"` });
      }
    }
  }

  const layers = content.layers ?? [];
  const layerIds = new Set<string>();
  for (const layer of layers) {
    if (layerIds.has(layer.id)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `duplicate layer id "${layer.id}"` });
    }
    layerIds.add(layer.id);

    if (!(LAYER_TYPES as readonly string[]).includes(layer.type)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown layer type "${layer.type}"` });
    }

    if (layer.style?.role && !(ROLE_TYPES as readonly string[]).includes(layer.style.role)) {
      issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown style role "${layer.style.role}"` });
    }

    for (const item of layer.items) {
      const itemRecord = item as Record<string, unknown>;
      const entityId = itemRecord.entity as string | undefined;
      const path = itemRecord.path as string[] | undefined;

      if (layer.type === 'route') {
        if (!path || path.length < 2) {
          issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `route layer "${layer.id}" item path must have at least 2 entries` });
        }
        if (path) {
          const distinct = new Set(path);
          if (distinct.size < 2) {
            issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `route layer "${layer.id}" item path must have at least 2 distinct entities` });
          }
          for (const ref of path) {
            if (!entityIds.has(ref)) {
              issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `route layer "${layer.id}" path references unknown entity "${ref}"` });
            }
          }
        }
      } else if (entityId) {
        if (!entityIds.has(entityId)) {
          issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `layer "${layer.id}" references unknown entity "${entityId}"` });
        }
      }
    }
  }

  const actions = spec.interaction?.actions;
  if (Array.isArray(actions)) {
    for (const action of actions) {
      if (!(ACTION_TYPES as readonly string[]).includes(action)) {
        issues.push({ level: 'L2', code: 'INVALID_ACTION', message: `interaction.actions contains non-D5 action "${action}"` });
      }
    }
  }

  const compass = content.compass;
  if (compass) {
    const referenceId = compass.referenceEntityId;
    if (!entityIds.has(referenceId)) {
      issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `compass referenceEntityId "${referenceId}" not found in entities` });
    } else {
      const referenceEntity = entities.find((e) => e.id === referenceId);
      if (referenceEntity && !('coordinates' in referenceEntity.location)) {
        issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `compass referenceEntityId "${referenceId}" must have explicit coordinates` });
      }
    }
    if (compass.window.from < 0 || compass.window.from > 360 || compass.window.to < 0 || compass.window.to > 360) {
      issues.push({ level: 'L2', code: 'INVALID_SPEC', message: 'compass window from/to must be within [0, 360]' });
    }
    for (const layer of layers) {
      for (const item of layer.items) {
        const itemRecord = item as Record<string, unknown>;
        const entityId = itemRecord.entity as string | undefined;
        if (entityId === referenceId) {
          issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `compass reference cannot be the candidate itself (entity "${referenceId}")` });
        }
      }
    }
  }

  validateGeography(geomapContent, issues);

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
        issues.push({ level: 'L2', code: 'INVALID_SPEC', message: `invalid envelope source class "${src.class}"` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}