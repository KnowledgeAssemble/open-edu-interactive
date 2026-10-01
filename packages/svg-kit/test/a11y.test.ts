import { describe, expect, it } from 'vitest';
import { a11yButton, pushInteractiveEntries } from '../src/a11y.js';
import type { A11yNode, InteractiveEntry } from '../src/a11y.js';

interface NestedNode extends A11yNode {
  children: NestedNode[];
}

describe('a11yButton', () => {
  it('returns a button row labelled from node.label, falling back to node.id', () => {
    expect(a11yButton({ id: 'n1', label: 'Alpha' })).toEqual({ id: 'n1', role: 'button', label: 'Alpha', children: [] });
    expect(a11yButton({ id: 'n1' })).toEqual({ id: 'n1', role: 'button', label: 'n1', children: [] });
  });
});

describe('pushInteractiveEntries', () => {
  it('fans out one entry per accepted action for interactive nodes', () => {
    const list: InteractiveEntry[] = [];
    pushInteractiveEntries(list, { id: 'n1', interactive: true, acceptsActions: ['select', 'focus'] });
    expect(list).toEqual([
      { id: 'n1', action: 'select' },
      { id: 'n1', action: 'focus' },
    ]);
  });

  it('ignores non-interactive nodes and nodes without acceptsActions', () => {
    const list: InteractiveEntry[] = [];
    pushInteractiveEntries(list, { id: 'n1', acceptsActions: ['select'] });
    pushInteractiveEntries(list, { id: 'n2', interactive: true });
    pushInteractiveEntries(list, { id: 'n3' });
    expect(list).toEqual([]);
  });

  it('does not recurse into children', () => {
    const list: InteractiveEntry[] = [];
    const node: NestedNode = {
      id: 'parent',
      interactive: true,
      acceptsActions: ['select'],
      children: [{ id: 'child', interactive: true, acceptsActions: ['focus'], children: [] }],
    };
    pushInteractiveEntries(list, node);
    expect(list).toEqual([{ id: 'parent', action: 'select' }]);
  });
});