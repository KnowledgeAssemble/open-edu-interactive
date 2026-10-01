import { describe, expect, it } from 'vitest';
import { nodeAttrs } from '../src/attrs.js';
import type { AttrsNode } from '../src/attrs.js';

const N: AttrsNode = {
  id: 'N1',
  role: 'spark',
  value: 7,
  interactive: true,
  label: 'Al & Co',
  bounds: { x: 1, y: 2, width: 3, height: 4 },
};

describe('nodeAttrs', () => {
  it('emits the base attr order with value and bounds', () => {
    expect(nodeAttrs(N, { value: true, bounds: true })).toBe(
      'id="N1" data-oedu-role="spark" data-oedu-value="7" data-oedu-interactive="true" aria-label="Al &amp; Co" data-oedu-bounds="1,2,3,4"',
    );
  });

  it('emits mid extras before aria-label', () => {
    expect(nodeAttrs(N, { value: true, bounds: true, mid: { 'data-oedu-actions': 'select focus' } })).toBe(
      'id="N1" data-oedu-role="spark" data-oedu-value="7" data-oedu-interactive="true" data-oedu-actions="select focus" aria-label="Al &amp; Co" data-oedu-bounds="1,2,3,4"',
    );
  });

  it('emits mid and tail extras preserving insertion order', () => {
    expect(nodeAttrs(N, { mid: { 'data-oedu-state': 'active', 'data-oedu-encoding': 'low' }, tail: { title: 'D' } })).toBe(
      'id="N1" data-oedu-role="spark" data-oedu-interactive="true" data-oedu-state="active" data-oedu-encoding="low" aria-label="Al &amp; Co" title="D"',
    );
  });

  it('emits tail extras after aria-label', () => {
    expect(nodeAttrs(N, { tail: { 'data-oedu-what-if': 'deemphasized', title: 'D' } })).toBe(
      'id="N1" data-oedu-role="spark" data-oedu-interactive="true" aria-label="Al &amp; Co" data-oedu-what-if="deemphasized" title="D"',
    );
  });

  it('emits only id and role when no extras are requested', () => {
    expect(nodeAttrs(N)).toBe('id="N1" data-oedu-role="spark" data-oedu-interactive="true" aria-label="Al &amp; Co"');
    expect(nodeAttrs({ id: 'N2', role: 'spark' })).toBe('id="N2" data-oedu-role="spark"');
  });
});