import { describe, expect, it } from 'vitest';
import {
  bindSvgInteraction,
  applySelectionState,
  syncSvgSurface,
  ensureInteractivePointerStyle,
  INTERACTIVE_POINTER_STYLE_ID,
  renderSvgInto,
} from '../src/svg-surface.js';
import type { EngineAction } from '@knowledgeassemble/interactive-engine';

describe('bindSvgInteraction', () => {
  it('dispatches select when interactive element clicked', () => {
    const root = document.createElement('div');
    root.innerHTML = `<svg><g id="nl-label-7" data-oedu-interactive="true"><text>7</text></g></svg>`;
    const dispatched: EngineAction[] = [];
    const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
    root.querySelector('text')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dispatched).toEqual([{ type: 'select', target: { id: 'nl-label-7' } }]);
    unbind();
  });

  it('dispatches deselect on second click of a selected element', () => {
    const root = document.createElement('div');
    root.innerHTML = `<svg><g id="nl-label-7" data-oedu-interactive="true" data-oedu-selected="true"><text>7</text></g></svg>`;
    const dispatched: EngineAction[] = [];
    const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
    root.querySelector('text')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dispatched).toEqual([{ type: 'deselect', target: { id: 'nl-label-7' } }]);
    unbind();
  });

  it('selects a different element even when another is already selected', () => {
    const root = document.createElement('div');
    root.innerHTML = `<svg><g id="a" data-oedu-interactive="true" data-oedu-selected="true"><text>A</text></g><g id="b" data-oedu-interactive="true"><text>B</text></g></svg>`;
    const dispatched: EngineAction[] = [];
    const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
    root.querySelector('#b text')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dispatched).toEqual([{ type: 'select', target: { id: 'b' } }]);
    unbind();
  });

  it('dispatches select on Enter keydown for a focused interactive element', () => {
    const root = document.createElement('div');
    root.innerHTML = `<svg><g id="nl-label-7" data-oedu-interactive="true"><text>7</text></g></svg>`;
    const dispatched: EngineAction[] = [];
    const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
    root
      .querySelector('#nl-label-7')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(dispatched).toEqual([{ type: 'select', target: { id: 'nl-label-7' } }]);
    unbind();
  });

  it('dispatches deselect on Enter keydown for a selected element', () => {
    const root = document.createElement('div');
    root.innerHTML = `<svg><g id="nl-label-7" data-oedu-interactive="true" data-oedu-selected="true"><text>7</text></g></svg>`;
    const dispatched: EngineAction[] = [];
    const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
    root
      .querySelector('#nl-label-7')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(dispatched).toEqual([{ type: 'deselect', target: { id: 'nl-label-7' } }]);
    unbind();
  });

  it('dispatches select on Space keydown and prevents page scroll', () => {
    const root = document.createElement('div');
    root.innerHTML = `<svg><g id="nl-label-7" data-oedu-interactive="true"><text>7</text></g></svg>`;
    const dispatched: EngineAction[] = [];
    const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    root.querySelector('#nl-label-7')!.dispatchEvent(event);
    expect(dispatched).toEqual([{ type: 'select', target: { id: 'nl-label-7' } }]);
    expect(event.defaultPrevented).toBe(true);
    unbind();
  });

  it('does nothing on non-interactive element click', () => {
    const root = document.createElement('div');
    root.innerHTML = `<svg><g id="nl-tick-0"><line /></g></svg>`;
    const dispatched: EngineAction[] = [];
    const unbind = bindSvgInteraction(root, (a) => dispatched.push(a));
    root.querySelector('line')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dispatched).toHaveLength(0);
    unbind();
  });
});

describe('applySelectionState', () => {
  it('sets data-oedu-selected on target id', () => {
    const container = document.createElement('div');
    container.innerHTML = `<svg><g id="nl-marker-7"><circle /></g></svg>`;
    applySelectionState(container, ['nl-marker-7'], null);
    const el = container.querySelector('#nl-marker-7')!;
    expect(el.getAttribute('data-oedu-selected')).toBe('true');
    expect(el.getAttribute('aria-pressed')).toBe('true');
  });

  it('clears previous selection before applying new', () => {
    const container = document.createElement('div');
    container.innerHTML = `<svg><g id="a" data-oedu-selected="true"><circle /></g><g id="b"><circle /></g></svg>`;
    applySelectionState(container, ['b'], null);
    expect(container.querySelector('#a')!.getAttribute('data-oedu-selected')).toBeNull();
    expect(container.querySelector('#b')!.getAttribute('data-oedu-selected')).toBe('true');
  });

  it('sets data-oedu-focused on focus target', () => {
    const container = document.createElement('div');
    container.innerHTML = `<svg><g id="nl"><circle /></g></svg>`;
    applySelectionState(container, [], 'nl');
    expect(container.querySelector('#nl')!.getAttribute('data-oedu-focused')).toBe('true');
  });
});

describe('ensureInteractivePointerStyle', () => {
  it('injects style element once', () => {
    const root = document.createElement('div');
    ensureInteractivePointerStyle(root);
    const style = root.querySelector(`#${INTERACTIVE_POINTER_STYLE_ID}`);
    expect(style).toBeTruthy();
    expect(style!.textContent).toContain('cursor: pointer');

    ensureInteractivePointerStyle(root);
    const styles = root.querySelectorAll(`#${INTERACTIVE_POINTER_STYLE_ID}`);
    expect(styles).toHaveLength(1);
  });

  it('styles focus via :focus-visible, never a [tabindex] selector', () => {
    const root = document.createElement('div');
    ensureInteractivePointerStyle(root);
    const style = root.querySelector(`#${INTERACTIVE_POINTER_STYLE_ID}`)!;
    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).not.toMatch(/\[tabindex\]/);
  });
});

describe('renderSvgInto', () => {
  it('sets innerHTML from svg string', () => {
    const container = document.createElement('div');
    renderSvgInto(container, '<svg><text>hello</text></svg>');
    expect(container.innerHTML).toBe('<svg><text>hello</text></svg>');
  });
});

describe('syncSvgSurface', () => {
  it('renders svg and applies selection state from snapshot', () => {
    const container = document.createElement('div');
    syncSvgSurface(container, {
      svgResult: { svg: '<svg><g id="x" data-oedu-interactive="true"><text>X</text></g></svg>' },
      selection: ['x'],
      focus: null,
    });
    expect(container.innerHTML).toContain('<text>X</text>');
    expect(container.querySelector('#x')!.getAttribute('data-oedu-selected')).toBe('true');
  });

  it('applies aria-pressed from selection snapshot', () => {
    const container = document.createElement('div');
    syncSvgSurface(container, {
      svgResult: { svg: '<svg><g id="x"><text>X</text></g></svg>' },
      selection: ['x'],
      focus: null,
    });
    expect(container.querySelector('#x')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('sets tabindex on interactive nodes and keeps it after a re-render', () => {
    const container = document.createElement('div');
    const svg = '<svg><g id="x" data-oedu-interactive="true"><text>X</text></g></svg>';
    syncSvgSurface(container, { svgResult: { svg }, selection: [], focus: null });
    expect(container.querySelector('#x')!.getAttribute('tabindex')).toBe('0');

    syncSvgSurface(container, { svgResult: { svg }, selection: ['x'], focus: null });
    expect(container.querySelector('#x')!.getAttribute('tabindex')).toBe('0');
  });

  it('does not set tabindex on non-interactive nodes', () => {
    const container = document.createElement('div');
    syncSvgSurface(container, {
      svgResult: { svg: '<svg><g id="x"><text>X</text></g></svg>' },
      selection: [],
      focus: null,
    });
    expect(container.querySelector('#x')!.getAttribute('tabindex')).toBeNull();
  });
});