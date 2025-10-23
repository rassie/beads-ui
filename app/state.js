/**
 * Minimal app state store with subscription.
 */

/**
 * @typedef {'all'|'open'|'in_progress'|'closed'|'ready'} StatusFilter
 */

/**
 * @typedef {{ status: StatusFilter, search: string }} Filters
 */

/**
 * @typedef {'issues'|'epics'|'board'} ViewName
 */

/**
 * @typedef {{ selected_id: string | null, view: ViewName, filters: Filters }} AppState
 */

/**
 * Create a simple store for application state.
 * @param {Partial<AppState>} [initial]
 * @returns {{ getState: () => AppState, setState: (patch: { selected_id?: string | null, filters?: Partial<Filters> }) => void, subscribe: (fn: (s: AppState) => void) => () => void }}
 */
export function createStore(initial = {}) {
  /** @type {AppState} */
  let state = {
    selected_id: /** @type {any} */ (initial).selected_id ?? null,
    view: /** @type {any} */ (initial).view ?? 'issues',
    filters: {
      status: /** @type {any} */ (initial).filters?.status ?? 'all',
      search: /** @type {any} */ (initial).filters?.search ?? ''
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
     * @param {{ selected_id?: string | null, filters?: Partial<Filters> }} patch
     */
    setState(patch) {
      /** @type {AppState} */
      const next = {
        ...state,
        ...patch,
        filters: { ...state.filters, ...(patch.filters || {}) }
      };
      // Avoid emitting if nothing changed (shallow compare)
      if (
        next.selected_id === state.selected_id &&
        next.view === state.view &&
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
    }
  };
}
