import { describe, expect, it } from 'vitest';
import { mediaSlot, MEDIA_BOX, MEDIA_LABEL_GAP } from '../src/media-slot.js';
import type { MediaSlot } from '../src/media-slot.js';

const NODE: MediaSlot = {
  id: 'media-1',
  role: 'selectable',
  interactive: true,
  label: 'Froglet',
  bounds: { x: 10, y: 20, width: 220, height: 120 },
};

describe('mediaSlot', () => {
  it('emits the media marker and bounds', () => {
    const out = mediaSlot(NODE);
    expect(out).toContain('data-oedu-media="slot"');
    expect(out).toContain('data-oedu-bounds="10,20,220,120"');
  });

  it('emits a faint frame, never the solid 0.85 fill or white ink', () => {
    const out = mediaSlot(NODE);
    expect(out).toContain('opacity="0.15"');
    expect(out).not.toContain('opacity="0.85"');
    expect(out).not.toContain('fill="white"');
  });

  it('places the label below the box on the default baseline', () => {
    const out = mediaSlot(NODE);
    const text = out.match(/<text[^>]*y="([^"]+)"[^>]*>/);
    expect(text).not.toBeNull();
    const y = Number(text![1]);
    expect(y).toBeGreaterThan(20 + 120);
    expect(out).not.toContain('dominant-baseline');
  });

  it('composes nodeAttrs: id, role, interactive, aria-label all present', () => {
    const out = mediaSlot(NODE);
    expect(out).toContain('id="media-1"');
    expect(out).toContain('data-oedu-role="selectable"');
    expect(out).toContain('data-oedu-interactive="true"');
    expect(out).toContain('aria-label="Froglet"');
  });

  it('sits data-oedu-media between data-oedu-interactive and aria-label (mid ordering)', () => {
    const out = mediaSlot(NODE);
    const interactive = out.indexOf('data-oedu-interactive="true"');
    const media = out.indexOf('data-oedu-media="slot"');
    const aria = out.indexOf('aria-label="Froglet"');
    expect(interactive).toBeGreaterThanOrEqual(0);
    expect(media).toBeGreaterThan(interactive);
    expect(aria).toBeGreaterThan(media);
  });

  it('forwards tail entries last, after data-oedu-bounds', () => {
    const out = mediaSlot({ ...NODE, tail: { title: 'A caption' } });
    expect(out).toContain('title="A caption"');
    expect(out.indexOf('title="A caption"')).toBeGreaterThan(out.indexOf('data-oedu-bounds'));
  });

  it('prefixes the group, inner lines, and closing tag with the caller indent', () => {
    const out = mediaSlot(NODE, 2);
    expect(out.startsWith('    <g ')).toBe(true);
    expect(out).toContain('\n      <rect ');
    expect(out).toContain('\n      <text ');
    expect(out.endsWith('\n    </g>')).toBe(true);
  });

  it('omits font-size when undefined and emits it when passed', () => {
    expect(mediaSlot(NODE)).not.toContain('font-size');
    expect(mediaSlot({ ...NODE, fontSize: 11 })).toContain('font-size="11"');
  });

  it('forwards a numeric value as data-oedu-value', () => {
    expect(mediaSlot({ ...NODE, value: 99 })).toContain('data-oedu-value="99"');
  });

  it('exposes the shared box constants', () => {
    expect(MEDIA_BOX).toEqual({ width: 220, height: 120 });
    expect(MEDIA_LABEL_GAP).toBe(14);
  });
});