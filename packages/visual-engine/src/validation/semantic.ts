import type { ValidationResult } from '@knowledgeassemble/interactive-engine';
import { ACTION_TYPES } from '@knowledgeassemble/interactive-engine';
import { VISUAL_KINDS } from '../schema.js';
import type { VisualSpec } from '../schema.js';

const VALID_HANDS = new Set(['hour', 'minute', 'both']);

export function validateSemantic(spec: VisualSpec): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  const kind = spec.content?.kind;
  if (!kind) {
    return {
      valid: false,
      issues: [{ level: 'L2', code: 'INVALID_ENTITY', message: 'content.kind is required' }],
    };
  }

  if (!(VISUAL_KINDS as readonly string[]).includes(kind)) {
    issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `unknown content.kind "${kind}"` });
  }

  const allIds = new Set<string>();
  if (spec.content?.elements) {
    for (const elem of spec.content.elements) {
      allIds.add(elem.id);
    }
  }
  if (spec.content?.components) {
    for (const comp of spec.content.components) {
      allIds.add(comp.id);
    }
  }
  if (spec.content?.entities) {
    for (const entity of spec.content.entities) {
      allIds.add(entity.id);
    }
  }

  if (spec.content?.relationships) {
    for (const rel of spec.content.relationships) {
      if (!allIds.has(rel.source)) {
        issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `relationship source "${rel.source}" not found` });
      }
      if (!allIds.has(rel.target)) {
        issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `relationship target "${rel.target}" not found` });
      }
    }
  }

  const d5Set = new Set(ACTION_TYPES);
  if (spec.content?.elements) {
    for (const elem of spec.content.elements) {
      if (elem.acceptsActions) {
        for (const action of elem.acceptsActions) {
          if (!d5Set.has(action as typeof ACTION_TYPES[number])) {
            issues.push({ level: 'L2', code: 'INVALID_ACTION', message: `entity "${elem.id}" accepts invalid action "${action}"` });
          }
        }
      }
    }
  }

  if (kind === 'number-line') {
    const range = spec.content?.range;
    if (range) {
      if (range.max <= range.min) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'number-line: max must be greater than min' });
      }
      if (range.step <= 0) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'number-line: step must be positive' });
      }
    }
  }

  if (kind === 'clock' && spec.content?.components) {
    for (const comp of spec.content.components) {
      const props = comp.props ?? {};
      const highlightHand = props.highlightHand as string | undefined;
      if (highlightHand && !VALID_HANDS.has(highlightHand)) {
        issues.push({ level: 'L2', code: 'INVALID_SPEC', message: `clock: invalid highlightHand "${highlightHand}"` });
      }
    }
  }

  if (kind === 'coordinate-grid' && spec.content?.components) {
    for (const comp of spec.content.components) {
      const props = comp.props ?? {};
      const points = props.points as Array<{ x: number; y: number; id?: string }> | undefined;
      const highlightPoints = props.highlightPoints as string[] | undefined;
      const interactive = (props.interactive as boolean | undefined) ?? false;
      if (interactive || (highlightPoints != null && highlightPoints.length > 0)) {
        if (points) {
          const idSet = new Set<string>();
          for (const pt of points) {
            if (!pt.id) {
              issues.push({ level: 'L2', code: 'INVALID_SPEC', message: 'coordinate-grid: points must have id when interactive or highlightPoints is set' });
            } else {
              idSet.add(pt.id);
            }
          }
          if (highlightPoints) {
            for (const hp of highlightPoints) {
              if (!idSet.has(hp)) {
                issues.push({ level: 'L2', code: 'INVALID_REFERENCE', message: `coordinate-grid: highlightPoints "${hp}" not found in points` });
              }
            }
          }
        }
      }
    }
  }

  if (kind === 'geometry' && spec.content?.components) {
    for (const comp of spec.content.components) {
      const props = comp.props ?? {};
      const highlight = props.highlight as boolean | undefined;
      const highlightVertices = props.highlightVertices as boolean | undefined;
      const highlightSides = props.highlightSides as boolean | undefined;
      const showVertices = props.showVertices as boolean | undefined;
      const flagCount = [highlight, highlightVertices, highlightSides].filter(Boolean).length;
      if (flagCount > 1) {
        issues.push({ level: 'L2', code: 'INVALID_SPEC', message: 'geometry: at most one of highlight, highlightVertices, highlightSides may be true' });
      }
      if (highlightVertices && !showVertices) {
        issues.push({ level: 'L2', code: 'INVALID_SPEC', message: 'geometry: highlightVertices requires showVertices: true' });
      }
    }
  }

  if (kind === 'counting-set' && spec.content?.components) {
    for (const comp of spec.content.components) {
      const props = comp.props ?? {};
      const maxSelection = props.maxSelection as number | undefined;
      if (maxSelection !== undefined && (!Number.isInteger(maxSelection) || maxSelection < 0)) {
        issues.push({ level: 'L2', code: 'INVALID_SPEC', message: 'counting-set: maxSelection must be a non-negative integer' });
      }
    }
  }

  if (kind === 'fraction-circle' && spec.content?.components) {
    for (const comp of spec.content.components) {
      const props = comp.props ?? {};
      const denominator = props.denominator as number | undefined;
      const numerator = props.numerator as number | undefined;
      const highlightedParts = props.highlightedParts as number[] | undefined;
      const allowImproper = props.allowImproper as boolean | undefined;
      if (denominator !== undefined && denominator < 2) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'fraction-circle: denominator must be at least 2' });
      }
      if (numerator !== undefined && numerator < 0) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'fraction-circle: numerator must not be negative' });
      }
      if (numerator !== undefined && denominator !== undefined && !allowImproper && numerator > denominator) {
        issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: 'fraction-circle: numerator must not exceed denominator (allow improper fractions)' });
      }
      if (highlightedParts && denominator !== undefined) {
        for (const idx of highlightedParts) {
          if (idx < 0 || idx >= denominator) {
            issues.push({ level: 'L2', code: 'INVALID_ENTITY', message: `fraction-circle: highlightedParts index ${idx} out of range [0, ${denominator})` });
          }
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
