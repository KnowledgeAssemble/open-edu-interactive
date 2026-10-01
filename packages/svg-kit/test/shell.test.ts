import { describe, expect, it } from 'vitest';
import { svgShell } from '../src/shell.js';

describe('svgShell', () => {
  it('wraps children in a root group when rootId is provided', () => {
    expect(svgShell({ width: 100, height: 50, rootId: 'x-root', title: 'T', desc: 'D', children: '  <g/>' })).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50" role="img">\n  <title>T</title>\n  <desc>D</desc>\n  <g id="x-root">\n  <g/>\n  </g>\n</svg>',
    );
  });

  it('emits children at column 0 when rootId is omitted', () => {
    expect(svgShell({ width: 100, height: 50, title: 'T', desc: 'D', children: '  <defs/>\n  <g/>' })).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50" role="img">\n  <title>T</title>\n  <desc>D</desc>\n  <defs/>\n  <g/>\n</svg>',
    );
  });

  it('escapes the title and desc', () => {
    expect(svgShell({ width: 10, height: 10, title: 'A & B', children: '' })).toContain('<title>A &amp; B</title>');
    expect(svgShell({ width: 10, height: 10, title: 'A', desc: 'x < y', children: '' })).toContain('<desc>x &lt; y</desc>');
  });

  it('returns without a trailing newline', () => {
    const out = svgShell({ width: 10, height: 10, rootId: 'r', title: 'T', children: '  <g/>' });
    expect(out.endsWith('</svg>')).toBe(true);
    expect(out.endsWith('\n')).toBe(false);
  });
});