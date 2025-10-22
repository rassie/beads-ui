/**
 * Minimal app state store with subscription.
 */

/**
 * @typedef {'all'|'open'|'in_progress'|'closed'} StatusFilter
 */

/**
 * @typedef {{ status: StatusFilter, search: string }} Filters
 */

/**
 * @typedef {{ selectedId: string | null, filters: Filters }} AppState
 */

/**
 * Create a simple store for application state.
 * @param {Partial<AppState>} [initial]
 * @returns {{ getState: () => AppState, setState: (patch: { selectedId?: string | null, filters?: Partial<Filters> }) => void, subscribe: (fn: (s: AppState) => void) => () => void }}
 */
export function createStore(initial = {}) {
  /** @type {AppState} */
  let state = {
    selectedId: initial.selectedId ?? null,
    filters: {
      status: initial.filters?.status ?? 'all',
      search: initial.filters?.search ?? '',
    },
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
     * @param {{ selectedId?: string | null, filters?: Partial<Filters> }} patch
     */
    setState(patch) {
      /** @type {AppState} */
      const next = {
        ...state,
        ...patch,
        filters: { ...state.filters, ...(patch.filters || {}) },
      };
      // Avoid emitting if nothing changed (shallow compare)
      if (
        next.selectedId === state.selectedId &&
        next.filters.status === state.filters.status &&
        next.filters.search === state.filters.search
      ) {
        return;
      }
      state = next;
      emit();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
