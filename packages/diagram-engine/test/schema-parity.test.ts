import { describe, it, expect } from 'vitest';
import {
  DIAGRAM_KINDS,
  PROFILES,
  RELATIONSHIPS,
  LAYOUT_TYPES,
  SOURCE_CLASSES,
  DiagramNodeSchema,
  DiagramEdgeSchema,
} from '../src/schema.js';
import schemaJson from '../src/schemas/diagram-spec.schema.json' with { type: 'json' };

describe('Schema ↔ Zod parity', () => {
  it('DIAGRAM_KINDS sorted match JSON Schema kind.enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.kind.enum;
    expect([...DIAGRAM_KINDS].sort()).toEqual([...schemaEnum].sort());
  });

  it('PROFILES sorted match JSON Schema profile.enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.profile.enum;
    expect([...PROFILES].sort()).toEqual([...schemaEnum].sort());
  });

  it('RELATIONSHIPS sorted match JSON Schema edges[].relationship.enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.content.properties.edges.items.properties.relationship.enum;
    expect([...RELATIONSHIPS].sort()).toEqual([...schemaEnum].sort());
  });

  it('LAYOUT_TYPES sorted match JSON Schema layout.type.enum sorted', () => {
    const schemaEnum: string[] = schemaJson.properties.layout.properties.type.enum;
    expect([...LAYOUT_TYPES].sort()).toEqual([...schemaEnum].sort());
  });

  it('content has additionalProperties: false', () => {
    expect(schemaJson.properties.content.additionalProperties).toBe(false);
  });

  it('nodes[] has additionalProperties: false', () => {
    expect(schemaJson.properties.content.properties.nodes.items.additionalProperties).toBe(false);
  });

  it('edges[] has additionalProperties: false', () => {
    expect(schemaJson.properties.content.properties.edges.items.additionalProperties).toBe(false);
  });

  it('layout has additionalProperties: false', () => {
    expect(schemaJson.properties.layout.additionalProperties).toBe(false);
  });

  it('edges[].relationship is required', () => {
    expect(schemaJson.properties.content.properties.edges.items.required).toContain('relationship');
  });

  it('no LLM-pleaser or geometry keys in content surface', () => {
    const contentProps = Object.keys(schemaJson.properties.content.properties);
    const banned = ['makeItPretty', 'svgMagic', 'x', 'y', 'position', 'width', 'height', 'fill', 'stroke'];
    for (const b of banned) {
      expect(contentProps).not.toContain(b);
    }
  });

  it('SOURCE_CLASSES match envelope sources class enum', () => {
    const schemaEnum: string[] = schemaJson.properties.sources.items.properties.class.enum;
    expect([...SOURCE_CLASSES].sort()).toEqual([...schemaEnum].sort());
  });

  it('node property keys match between zod and JSON Schema', () => {
    const zodKeys = Object.keys(DiagramNodeSchema.shape).sort();
    const jsonKeys = Object.keys(schemaJson.properties.content.properties.nodes.items.properties).sort();
    expect(jsonKeys).toEqual(zodKeys);
  });

  it('edge property keys match between zod and JSON Schema', () => {
    const zodKeys = Object.keys(DiagramEdgeSchema.shape).sort();
    const jsonKeys = Object.keys(schemaJson.properties.content.properties.edges.items.properties).sort();
    expect(jsonKeys).toEqual(zodKeys);
  });
});