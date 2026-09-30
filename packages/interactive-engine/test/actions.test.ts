import { describe, expect, it } from 'vitest';
import { ACTION_TYPES } from '../src/schemas/actions.js';

describe('ACTION_TYPES', () => {
  it('is the closed D5 semantic action set', () => {
    expect(ACTION_TYPES).toEqual([
      'select',
      'deselect',
      'focus',
      'unfocus',
      'filter',
      'clear-filter',
      'open-annotation',
      'close-annotation',
      'answer',
      'compare',
      'toggle',
      'expand',
      'collapse',
      'zoom',
      'pan',
      'scrub',
      'jump-to',
      'play-pause',
      'step',
      'drag',
      'drop',
      'place',
      'move',
      'connect',
      'disconnect',
      'follow',
      'bearing',
      'reset',
    ]);
  });

  it('contains no duplicate entries', () => {
    expect(new Set(ACTION_TYPES).size).toBe(ACTION_TYPES.length);
  });
});
