import type { ValidationIssue } from '@knowledgeassemble/interactive-engine';
import { DATE_GRAMMAR } from '../schema.js';
import { isValidCalendarDate, parseDate } from '../layout/time.js';

function isInvalidDate(dateString: string): boolean {
  return !DATE_GRAMMAR.test(dateString) || !isValidCalendarDate(dateString);
}

export function validateTemporal(content: {
  events?: Array<{ date: string; duration?: string }>;
  periods?: Array<{ from: string; to: string }>;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (content.events) {
    for (const [i, event] of content.events.entries()) {
      if (!DATE_GRAMMAR.test(event.date)) {
        issues.push({
          level: 'L2' as const,
          code: 'INVALID_ENTITY',
          message: `timeline: event at index ${i} has invalid date "${event.date}" (must match Timeline-D3 grammar)`,
        });
      } else if (!isValidCalendarDate(event.date)) {
        issues.push({
          level: 'L2' as const,
          code: 'INVALID_ENTITY',
          message: `timeline: event at index ${i} has out-of-range calendar date "${event.date}"`,
        });
      }
      if (event.duration !== undefined) {
        if (!DATE_GRAMMAR.test(event.duration)) {
          issues.push({
            level: 'L2' as const,
            code: 'INVALID_ENTITY',
            message: `timeline: event at index ${i} has invalid duration "${event.duration}" (must match Timeline-D3 grammar)`,
          });
        } else if (!isValidCalendarDate(event.duration)) {
          issues.push({
            level: 'L2' as const,
            code: 'INVALID_ENTITY',
            message: `timeline: event at index ${i} has out-of-range calendar duration "${event.duration}"`,
          });
        } else if (!isInvalidDate(event.date) && parseDate(event.duration) <= parseDate(event.date)) {
          issues.push({
            level: 'L2' as const,
            code: 'INVALID_ENTITY',
            message: `timeline: event at index ${i} has duration "${event.duration}" not after date "${event.date}"`,
          });
        }
      }
    }
  }

  if (content.periods) {
    for (const [i, period] of content.periods.entries()) {
      const badFromReason = DATE_GRAMMAR.test(period.from)
        ? isValidCalendarDate(period.from) ? '' : 'out-of-range calendar date'
        : 'date does not match Timeline-D3 grammar';
      if (badFromReason) {
        issues.push({
          level: 'L2' as const,
          code: 'INVALID_ENTITY',
          message: `timeline: period at index ${i} has invalid from "${period.from}" (${badFromReason})`,
        });
      }
      const badToReason = DATE_GRAMMAR.test(period.to)
        ? isValidCalendarDate(period.to) ? '' : 'out-of-range calendar date'
        : 'date does not match Timeline-D3 grammar';
      if (badToReason) {
        issues.push({
          level: 'L2' as const,
          code: 'INVALID_ENTITY',
          message: `timeline: period at index ${i} has invalid to "${period.to}" (${badToReason})`,
        });
      }
      if (!isInvalidDate(period.from) && !isInvalidDate(period.to)) {
        const fromDay = parseDate(period.from);
        const toDay = parseDate(period.to);
        if (fromDay > toDay) {
          issues.push({
            level: 'L2' as const,
            code: 'INVALID_ENTITY',
            message: `timeline: period at index ${i} has from > to ("${period.from}" > "${period.to}")`,
          });
        }
      }
    }
  }

  return issues;
}