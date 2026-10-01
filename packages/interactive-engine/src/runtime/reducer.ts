import { EngineError } from '../core/errors.js';
import type { EngineAction } from '../core/action.js';
import type { EngineState } from '../core/state.js';
import { initialState } from '../core/state.js';

function requireTarget(action: EngineAction): string {
  const id = action.target?.id;
  if (!id) {
    throw new EngineError('INVALID_ACTION', `action "${action.type}" requires a target.id`);
  }
  return id;
}

function appendUnique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export function baseReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'select': {
      const id = requireTarget(action);
      return { ...state, selection: appendUnique(state.selection, id), lastAction: action };
    }
    case 'deselect': {
      const id = requireTarget(action);
      return { ...state, selection: state.selection.filter((x) => x !== id), lastAction: action };
    }
    case 'focus': {
      const id = requireTarget(action);
      return { ...state, focus: id, lastAction: action };
    }
    case 'unfocus':
      return { ...state, focus: null, lastAction: action };
    case 'filter': {
      const payload = action.payload as { ids?: unknown } | undefined;
      const ids = Array.isArray(payload?.ids) ? (payload?.ids as string[]) : [];
      return { ...state, filter: [...ids], lastAction: action };
    }
    case 'clear-filter':
      return { ...state, filter: [], lastAction: action };
    case 'open-annotation':
    case 'close-annotation': {
      const id = requireTarget(action);
      const status = action.type === 'open-annotation' ? 'open' : 'closed';
      return {
        ...state,
        annotations: { ...state.annotations, [id]: status },
        lastAction: action,
      };
    }
    case 'toggle': {
      const id = requireTarget(action);
      const open = state.expanded.includes(id);
      return {
        ...state,
        expanded: open ? state.expanded.filter((x) => x !== id) : [...state.expanded, id],
        lastAction: action,
      };
    }
    case 'expand': {
      const id = requireTarget(action);
      return {
        ...state,
        expanded: state.expanded.includes(id) ? state.expanded : [...state.expanded, id],
        lastAction: action,
      };
    }
    case 'collapse': {
      const id = requireTarget(action);
      return {
        ...state,
        expanded: state.expanded.filter((x) => x !== id),
        lastAction: action,
      };
    }
    case 'play-pause': {
      const playback = state.playback === 'playing' ? 'paused' : 'playing';
      return { ...state, playback, lastAction: action };
    }
    case 'step': {
      const step = state.playback === 'paused' ? state.step + 1 : state.step;
      return { ...state, step, lastAction: action };
    }
    case 'reset': {
      const fresh = initialState(state.instanceId, state.engine);
      return { ...fresh, phase: 'running', lastAction: action };
    }
    case 'zoom':
    case 'pan':
    case 'scrub':
    case 'jump-to':
    case 'drag':
    case 'drop':
    case 'place':
    case 'move':
    case 'connect':
    case 'disconnect':
    case 'follow':
    case 'bearing':
    case 'answer':
    case 'compare':
      return { ...state, lastAction: action };
    default:
      throw new EngineError(
        'UNSUPPORTED_ACTION',
        `action type "${String(action.type)}" is not supported`,
      );
  }
}
