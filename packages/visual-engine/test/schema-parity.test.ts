import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VISUAL_KINDS, validateVisualSpec } from '../src/schema.js';

const SCHEMA_URL = new URL('../src/schemas/visual-spec.schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(SCHEMA_URL, 'utf8')) as {
  additionalProperties?: boolean;
  required?: string[];
  properties?: Record<string, Record<string, unknown>>;
};

describe('schema parity guardrail — visual', () => {
  it('includes fraction-circle in VISUAL_KINDS', () => {
    expect(VISUAL_KINDS).toContain('fraction-circle');
  });

  it('content.kind.enum (sorted) matches VISUAL_KINDS (sorted)', () => {
    const kinds: string[] = (schema.properties?.kind as { enum?: string[] })?.enum ?? [];
    expect([...kinds].sort()).toEqual([...VISUAL_KINDS].sort());
  });

  it('content.kind is required', () => {
    expect(schema.required).toContain('kind');
  });

  it('content has additionalProperties === false', () => {
    expect(schema.additionalProperties).toBe(false);
  });

  it('content.entities exists for illustration entities', () => {
    const entities = schema.properties?.entities as
      | { items?: { additionalProperties?: boolean; required?: string[] } }
      | undefined;
    expect(entities).toBeDefined();
    expect(entities!.items?.additionalProperties).toBe(false);
    expect(entities!.items?.required).toContain('id');
    expect(entities!.items?.required).toContain('label');
  });

  it('schema text does not contain LLM-pleaser props', () => {
    const text = readFileSync(SCHEMA_URL, 'utf8');
    expect(text).not.toMatch(/makeItPretty/);
    expect(text).not.toMatch(/svgMagic/);
    expect(text).not.toMatch(/drawNicely/);
  });
});

// The prose specs enumerate the Visual closed set by hand, so they drift. This PR
// existed because three such enumerations had gone stale independently: DESIGN §82
// named eight kinds including 'geometry-shape' (never a runtime kind), PROJECT.md §8
// repeated the same two stale names under a "closed set — DESIGN D9" heading, and
// SPEC §9 listed eleven names including two that appear nowhere in the runtime.
// Spec §82 had a fourth copy that also smuggled Timeline and Diagram kinds.
// Guard the copies that remain so the prose cannot drift from VISUAL_KINDS silently.
describe('closed-set enumeration parity — visual docs', () => {
  const sorted = (values: string[]): string[] => [...values].sort();

  const firstTextBlockAfter = (doc: string, heading: string): string => {
    const at = doc.indexOf(`\n# ${heading}`);
    expect(at, `heading "# ${heading}" not found`).toBeGreaterThan(-1);
    const block = doc.slice(at).match(/```text\n([\s\S]*?)```/);
    expect(block, `no text block after "# ${heading}"`).not.toBeNull();
    return block![1] ?? '';
  };

  it('SPEC §9 initial vocabulary matches VISUAL_KINDS', () => {
    const spec = readFileSync(new URL('../../../docs/engines/visual/SPEC.md', import.meta.url), 'utf8');
    const listed = firstTextBlockAfter(spec, '9. `content.kind`')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    expect(sorted(listed)).toEqual(sorted([...VISUAL_KINDS]));
  });

  it('PROJECT §8 educational components match VISUAL_KINDS', () => {
    const project = readFileSync(
      new URL('../../../docs/engines/visual/PROJECT.md', import.meta.url),
      'utf8',
    );
    const section = project.slice(project.indexOf('\n# 8.'));
    const listed = [...section.matchAll(/^\d+\. `([a-z-]+)`/gm)].map((m) => m[1] ?? '');
    expect(sorted(listed)).toEqual(sorted([...VISUAL_KINDS]));
  });

  it('SPEC §82 does not regrow a second copy of the registry', () => {
    // §82 previously listed eleven kinds itself and drifted. It now points at §9.
    // Exact-set parity above already keeps foreign kinds out of §9 and PROJECT §8,
    // so this guards the remaining hazard: a new hand-maintained list appearing here.
    const spec = readFileSync(new URL('../../../docs/engines/visual/SPEC.md', import.meta.url), 'utf8');
    const start = spec.indexOf('\n# 82.');
    expect(start, 'heading "# 82." not found').toBeGreaterThan(-1);
    // slice past the leading newline, otherwise the split below matches this very
    // heading and yields an empty section — an assertion that can never fail.
    const section = spec.slice(start + 1).split(/\n# \d+\./)[0] ?? '';
    expect(section).not.toMatch(/```text/);
  });
});

describe('ValidateVisualSpec', () => {
  it('parses a minimal number-line content', () => {
    const result = validateVisualSpec({
      kind: 'number-line',
      range: { min: 0, max: 10, step: 1 },
      highlight: [7],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects unknown kind "timeline"', () => {
    const result = validateVisualSpec({ kind: 'timeline' });
    expect(result.valid).toBe(false);
  });

  it('rejects an unknown key on content', () => {
    const result = validateVisualSpec({
      kind: 'number-line',
      makeItPretty: true,
    } as never);
    expect(result.valid).toBe(false);
  });
});
