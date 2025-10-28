/**
 * Minimal app state store with subscription.
 */
import { debug } from './utils/logging.js';

/**
 * @typedef {'all'|'open'|'in_progress'|'closed'|'ready'} StatusFilter
 */

/**
 * @typedef {{ status: StatusFilter, search: string, type: string }} Filters
 */

/**
 * @typedef {'issues'|'epics'|'board'} ViewName
 */

/**
 * @typedef {'today'|'3'|'7'} ClosedFilter
 */

/**
 * @typedef {{ closed_filter: ClosedFilter }} BoardState
 */

/**
 * @typedef {{ selected_id: string | null, view: ViewName, filters: Filters, board: BoardState }} AppState
 */

/**
 * Create a simple store for application state.
 *
 * @param {Partial<AppState>} [initial]
 * @returns {{ getState: () => AppState, setState: (patch: { selected_id?: string | null, filters?: Partial<Filters> }) => void, subscribe: (fn: (s: AppState) => void) => () => void }}
 */
export function createStore(initial = {}) {
  const log = debug('state');
  /** @type {AppState} */
  let state = {
    selected_id: initial.selected_id ?? null,
    view: initial.view ?? 'issues',
    filters: {
      status: initial.filters?.status ?? 'all',
      search: initial.filters?.search ?? '',
      type:
        typeof initial.filters?.type === 'string' ? initial.filters?.type : ''
    },
    board: {
      closed_filter:
        initial.board?.closed_filter === '3' ||
        initial.board?.closed_filter === '7' ||
        initial.board?.closed_filter === 'today'
          ? initial.board?.closed_filter
          : 'today'
    }
  };

  /** @type {Set<(s: AppState) => void>} */
  const subs = new Set();

  function emit() {
    for (const fn of Array.from(subs)) {
      try {
        fn(state);
      } catch {
        // ignore
      }
    }
  }

  return {
    getState() {
      return state;
    },
    /**
     * Update state. Nested filters can be partial.
     *
     * @param {{ selected_id?: string | null, filters?: Partial<Filters>, board?: Partial<BoardState> }} patch
     */
    setState(patch) {
      /** @type {AppState} */
      const next = {
        ...state,
        ...patch,
        filters: { ...state.filters, ...(patch.filters || {}) },
        board: { ...state.board, ...(patch.board || {}) }
      };
      // Avoid emitting if nothing changed (shallow compare)
      if (
        next.selected_id === state.selected_id &&
        next.view === state.view &&
        next.filters.status === state.filters.status &&
        next.filters.search === state.filters.search &&
        next.filters.type === state.filters.type &&
        next.board.closed_filter === state.board.closed_filter
      ) {
        return;
      }
      state = next;
      log('state change %o', {
        selected_id: state.selected_id,
        view: state.view,
        filters: state.filters,
        board: state.board
      });
      emit();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    }
  };
}
